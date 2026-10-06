// This source is transmitted over SSH stdin. No credentials are embedded in it.
import { verifyToolIntegrity } from './backup-guards.mjs'
export const memoryConfigBridge = `
import ctypes, os, sys
try:
    config = sys.stdin.buffer.read(65537)
    if not config or len(config) > 65536:
        raise ValueError()
    libc = ctypes.CDLL(None, use_errno=True)
    libc.memfd_create.argtypes = [ctypes.c_char_p, ctypes.c_uint]
    libc.memfd_create.restype = ctypes.c_int
    fd = libc.memfd_create(b'maxims-backup-config', 0)
    if fd < 0:
        raise ValueError()
    while config:
        written = os.write(fd, config)
        if written <= 0:
            raise ValueError()
        config = config[written:]
    os.lseek(fd, 0, os.SEEK_SET)
    os.set_inheritable(fd, True)
    tool = sys.argv[1]
    os.execve(tool, [tool, '--config=/proc/self/fd/' + str(fd)] + sys.argv[2:],
              {'PATH': '/usr/bin:/bin', 'LANG': 'C.UTF-8'})
except Exception:
    sys.exit(93)
`

export function buildRemoteSource(snapshotMongo, mode = 'preflight') {
  if (typeof snapshotMongo !== 'function' || !['preflight', 'export'].includes(mode)) {
    throw new Error('Invalid backup request')
  }
  return `
const fs = require('node:fs');
const crypto = require('node:crypto');
const {spawn} = require('node:child_process');
const {createRequire} = require('node:module');
const snapshotMongo = (${snapshotMongo.toString()});
const verifyToolIntegrity = (${verifyToolIntegrity.toString()});
const bridge = ${JSON.stringify(memoryConfigBridge)};
const MODE = ${JSON.stringify(mode)};
const ROOT = '/home/gadzamac/.local/maxims-backup-tools-20261006';
const TOOL = ROOT + '/mongodb-database-tools-rhel88-x86_64-100.19.1/bin/mongodump';
const MAX = 64 * 1024 * 1024;
let client, archive, config, stage='tool-integrity';
function run(command,args,input,limit=MAX,timeout=180000) {
 return new Promise((resolve,reject)=>{
  const child=spawn(command,args,{stdio:['pipe','pipe','pipe'],env:{PATH:'/usr/bin:/bin',LANG:'C.UTF-8'}});
  const parts=[],errors=[]; let bytes=0,errorBytes=0,failed=false;
  const timer=setTimeout(()=>{failed=true;child.kill('SIGKILL')},timeout);
  child.stdout.on('data',x=>{bytes+=x.length;if(bytes>limit){failed=true;child.kill('SIGKILL')}else parts.push(x)});
  child.stderr.on('data',x=>{errorBytes+=x.length;if(errorBytes<=65536)errors.push(x);else{failed=true;child.kill('SIGKILL')}});
  child.on('error',()=>{failed=true});
  child.stdin.on('error',()=>{failed=true});
  child.on('close',code=>{clearTimeout(timer);if(failed)reject(new Error('Backup subprocess failed'));else resolve({code,output:Buffer.concat(parts),diagnostic:Buffer.concat(errors)})});
  child.stdin.end(input);
 });
}
(async()=>{
 if(verifyToolIntegrity(fs,crypto.createHash)!==TOOL)throw new Error();
 stage='tool-version';
 const version=await run(TOOL,['--version'],Buffer.alloc(0),65536,10000);
 if(version.code!==0 || !version.output.toString().includes('mongodump version: 100.19.1'))throw new Error();
 // Harmless loopback refusal proves Go can read the anonymous-memory config.
 // Native diagnostic text stays internal, including option-parser errors.
 stage='memory-config';
 const probe=await run('python3',['-c',bridge,TOOL,'--archive','--gzip'],
   Buffer.from('uri: "mongodb://127.0.0.1:1/maxims_fixture?serverSelectionTimeoutMS=1000&connectTimeoutMS=1000"\\n'),65536,10000);
 const diagnostic=probe.diagnostic.toString();
 if(probe.code===0 || !/connection refused|server selection|failed to connect/i.test(diagnostic)
   || /error reading config|cannot parse|cannot unmarshal/i.test(diagnostic))throw new Error();
 probe.diagnostic.fill(0);probe.output.fill(0);
 if(MODE==='preflight'){process.stdout.write(JSON.stringify({tool:'100.19.1',memoryConfig:true}));return}
 stage='source-preflight';
 const requireApp=createRequire('/home/gadzamac/maxims-deploy/server/package.json');
 const {MongoClient,BSON}=requireApp('mongodb');
 const env=requireApp('dotenv').parse(fs.readFileSync('/home/gadzamac/maxims-deploy/server/.env'));
 const uri=env.MONGODB_URI;
 if(typeof uri!=='string' || !/^mongodb(?:\\+srv)?:\\/\\//.test(uri) || Buffer.byteLength(uri)>60000)throw new Error();
 client=new MongoClient(uri,{appName:'maxims-read-only-preservation',serverSelectionTimeoutMS:10000,
   connectTimeoutMS:10000,socketTimeoutMS:15000,maxPoolSize:2,retryWrites:false,readPreference:'primary'});
 await client.connect();
 const db=client.db();
 if(!/^[A-Za-z0-9_-]{1,63}$/.test(db.databaseName) || ['admin','config','local','test'].includes(db.databaseName))throw new Error();
 const server=await db.admin().command({buildInfo:1});
 if(server.version!=='8.0.34')throw new Error();
 const startedAt=new Date().toISOString();
 stage='source-inventory';
 const before=await snapshotMongo(db,BSON,crypto.createHash);
 if(before.collections.length!==13 || before.collections.reduce((n,c)=>n+c.count,0)===0)throw new Error();
 config=Buffer.from('uri: '+JSON.stringify(uri)+'\\n');
 stage='source-export';
 const dumped=await run('python3',['-c',bridge,TOOL,'--archive','--gzip','--quiet',
   '--db='+db.databaseName,'--numParallelCollections=1','--readPreference=primary'],config,MAX-1048580);
 config.fill(0);config=null;
 dumped.diagnostic.fill(0);
 if(dumped.code!==0 || dumped.output.length<32 || dumped.output[0]!==0x1f || dumped.output[1]!==0x8b)throw new Error();
 archive=dumped.output;
 stage='source-comparison';
 const after=await snapshotMongo(db,BSON,crypto.createHash);
 if(JSON.stringify(before)!==JSON.stringify(after))throw new Error();
 const manifest={format:'maxims-mongo-preservation-1',createdAt:new Date().toISOString(),startedAt,
   serverVersion:server.version,toolsVersion:'100.19.1',snapshot:before,
   archiveBytes:archive.length,archiveSha256:crypto.createHash('sha256').update(archive).digest('hex'),
   observedStable:true,writeFreeze:false,pointInTime:false,restoreVerified:false,mediaVerified:false};
 const json=Buffer.from(JSON.stringify(manifest));
 if(json.length>1048576 || json.length+4+archive.length>MAX)throw new Error();
 const header=Buffer.alloc(4);header.writeUInt32BE(json.length);
 await client.close();client=null;
 process.stdout.write(Buffer.concat([header,json,archive]));
})().catch(()=>{process.stderr.write('Private backup aborted at '+stage+'\\n');process.exitCode=1})
 .finally(async()=>{config?.fill(0);archive?.fill(0);if(client)await client.close().catch(()=>{})});
`
}
