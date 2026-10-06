// Deliberately limited to the reviewed Maxims source and a protected local folder.
// Does not import application boot code, modify a database or perform a restore.
import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { buildRemoteSource } from './backup-remote.mjs'
import { snapshotMongo } from './mongo-preservation-snapshot.mjs'
import { encryptBuffer, decryptBuffer, unpackPayload } from './backup-envelope.mjs'
import { validatePrivateAcl, readBoundedPrivateFile } from './backup-guards.mjs'

const ROOT = 'C:\\Users\\bgadz\\.private\\maxims-preservation-20261006'
const MAX = 64 * 1024 * 1024
const POWERSHELL = 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe'
const SSH = 'C:\\Windows\\System32\\OpenSSH\\ssh.exe'
const ENTROPY = 'Maxims-preservation-MXBK1'
const fail = () => new Error('Private backup operation failed')

export function validateManifest(manifest, archive) {
  const mapped = new Set(['activities','appointments','blogposts','bulkrequests','galleries',
    'messages','newsletters','orders','products','settings','teammembers','testimonials','transactions','users'])
  const digest = (s) => typeof s === 'string' && /^[a-f0-9]{64}$/.test(s)
  if (manifest?.format !== 'maxims-mongo-preservation-1'
    || manifest.serverVersion !== '8.0.34' || manifest.toolsVersion !== '100.19.1'
    || manifest.observedStable !== true || manifest.pointInTime !== false
    || manifest.writeFreeze !== false || manifest.restoreVerified !== false || manifest.mediaVerified !== false
    || !Number.isFinite(Date.parse(manifest.createdAt)) || !Number.isFinite(Date.parse(manifest.startedAt))
    || !/^[A-Za-z0-9_-]{1,63}$/.test(manifest.snapshot?.database || '')
    || ['admin','config','local','test'].includes(manifest.snapshot.database)
    || !Array.isArray(manifest.snapshot.collections) || manifest.snapshot.collections.length !== 13
    || !Buffer.isBuffer(archive) || archive.length < 32 || archive.length > MAX
    || archive[0] !== 0x1f || archive[1] !== 0x8b || manifest.archiveBytes !== archive.length
    || !digest(manifest.archiveSha256)
    || !timingSafeEqual(Buffer.from(manifest.archiveSha256,'hex'), createHash('sha256').update(archive).digest())) throw fail()
  const names = new Set()
  for (const c of manifest.snapshot.collections) {
    if (!mapped.has(c?.name) || names.has(c.name) || !Number.isSafeInteger(c.count)
      || c.count < 0 || c.count > 10000 || !digest(c.documentDigest) || !digest(c.metadataDigest)) throw fail()
    names.add(c.name)
  }
  const records = manifest.snapshot.collections.reduce((n,c) => n+c.count,0)
  if (!records) throw fail()
  return { collections:names.size, records, archiveBytes:archive.length,
    serverVersion:manifest.serverVersion, observedStable:true, pointInTime:false,
    restoreVerified:false, mediaVerified:false }
}

export function boundedProcess(command,args,input,{limit=MAX+33,timeout=240000}={}) {
  return new Promise((resolve,reject) => {
    const env={...process.env}
    // A PowerShell 7 parent exports its module search path. PS 5 must load its
    // own signed security module for Get-Acl, not an incompatible PS 7 module.
    if(command===POWERSHELL)env.PSModulePath='C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\Modules'
    const child=spawn(command,args,{stdio:['pipe','pipe','pipe'],windowsHide:true,env})
    const chunks=[];let bytes=0,diagnosticBytes=0,failed=false
    const timer=setTimeout(()=>{failed=true;child.kill()},timeout)
    child.stdout.on('data',chunk=>{bytes+=chunk.length;if(bytes>limit){failed=true;child.kill()}else chunks.push(chunk)})
    // Never forward native diagnostics: they can include private configuration.
    child.stderr.on('data',chunk=>{diagnosticBytes+=chunk.length;if(diagnosticBytes>65536){failed=true;child.kill()}})
    child.on('error',()=>{failed=true})
    child.stdin.on('error',()=>{failed=true})
    child.on('close',code=>{
      clearTimeout(timer)
      if(failed || code!==0){for(const chunk of chunks)chunk.fill(0);reject(fail());return}
      const result=Buffer.concat(chunks)
      for(const chunk of chunks)chunk.fill(0)
      resolve(result)
    })
    child.stdin.end(input)
  })
}

async function checkPrivateRoot() {
  if(process.platform!=='win32' || !fs.existsSync(ROOT)
    || path.resolve(fs.realpathSync(ROOT)).toLowerCase()!==ROOT.toLowerCase()) throw fail()
  await checkPrivateAcl(ROOT,true)
}

async function checkPrivateAcl(filename,directory) {
  if(!filename.startsWith(ROOT) || filename.includes("'"))throw fail()
  const script=`$ErrorActionPreference='Stop';
  try {
    $p='${filename}'; $item=Get-Item -LiteralPath $p -Force;
    $acl=Get-Acl -LiteralPath $p;
    $sid=[Security.Principal.WindowsIdentity]::GetCurrent().User.Value;
    $ownerSid=$acl.GetOwner([Security.Principal.SecurityIdentifier]).Value;
    $rules=@(foreach($r in $acl.Access){[pscustomobject]@{
      sid=$r.IdentityReference.Translate([Security.Principal.SecurityIdentifier]).Value;
      allow=($r.AccessControlType -eq 'Allow'); fullControl=($r.FileSystemRights -eq 'FullControl');
      propagationNone=($r.PropagationFlags -eq 'None');inherited=$r.IsInherited;
      objectInherit=[bool]($r.InheritanceFlags -band [Security.AccessControl.InheritanceFlags]::ObjectInherit);
      containerInherit=[bool]($r.InheritanceFlags -band [Security.AccessControl.InheritanceFlags]::ContainerInherit);
    }});
    $result=[pscustomobject]@{currentSid=$sid;ownerSid=$ownerSid;rules=$rules;
      protected=$acl.AreAccessRulesProtected;directory=$item.PSIsContainer;
      reparsePoint=[bool]($item.Attributes -band [IO.FileAttributes]::ReparsePoint)};
    [Console]::Out.Write(($result | ConvertTo-Json -Depth 5 -Compress));
  } catch { exit 1 }`
  const result=await boundedProcess(POWERSHELL,['-NoProfile','-NonInteractive','-Command',script],Buffer.alloc(0),{limit:8192,timeout:15000})
  validatePrivateAcl(JSON.parse(result.toString()),directory)
}

async function protectKey(bytes,unprotect=false) {
  const script=`$ErrorActionPreference='Stop'; try {
    Add-Type -AssemblyName System.Security;
    $data=[Convert]::FromBase64String([Console]::In.ReadToEnd().Trim());
    $entropy=[Text.Encoding]::UTF8.GetBytes('${ENTROPY}');
    $result=[Security.Cryptography.ProtectedData]::${unprotect?'Unprotect':'Protect'}(
      $data,$entropy,[Security.Cryptography.DataProtectionScope]::CurrentUser);
    [Console]::Out.Write([Convert]::ToBase64String($result));
    [Array]::Clear($data,0,$data.Length);[Array]::Clear($result,0,$result.Length);
  } catch { exit 1 }`
  const input=Buffer.from(bytes.toString('base64'))
  try {
    const encoded=await boundedProcess(POWERSHELL,['-NoProfile','-NonInteractive','-Command',script],input,{limit:8192,timeout:15000})
    const text=encoded.toString();encoded.fill(0)
    if(!/^[A-Za-z0-9+/]+={0,2}$/.test(text))throw fail()
    const result=Buffer.from(text,'base64')
    if(unprotect && result.length!==32)throw fail()
    return result
  } finally {input.fill(0)}
}

async function writeExclusive(filename,buffer) {
  const fd=fs.openSync(filename,'wx',0o600)
  try {
    // Windows mode bits are not an ACL. Validate the empty file before writing.
    await checkPrivateAcl(filename,false)
    let offset=0
    while(offset<buffer.length){const written=fs.writeSync(fd,buffer,offset,buffer.length-offset);if(!written)throw fail();offset+=written}
    fs.fsyncSync(fd)
    await checkPrivateAcl(filename,false)
  } finally {fs.closeSync(fd)}
}

export async function readPrivateBackup(baseName) {
  let key,plain
  try {
    if(typeof baseName!=='string' || !/^backup-[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/.test(baseName))throw fail()
    await checkPrivateRoot()
    const base=path.join(ROOT,baseName)
    const sealed=await readBoundedPrivateFile(fs,base+'.key.dpapi',8192,checkPrivateAcl)
    key=await protectKey(sealed,true)
    const encrypted=await readBoundedPrivateFile(fs,base+'.mxb',MAX+33,checkPrivateAcl)
    plain=decryptBuffer(encrypted,key)
    const unpacked=unpackPayload(plain)
    try {validateManifest(unpacked.manifest,unpacked.archive)}
    catch {unpacked.archive.fill(0);throw fail()}
    return unpacked
  } catch {throw fail()}
  finally {key?.fill(0);plain?.fill(0)}
}

async function remote(mode) {
  return boundedProcess(SSH,['-T','-i','C:\\Users\\bgadz\\.ssh\\agent_migrate_rsa','-p','8408',
    '-o','BatchMode=yes','-o','StrictHostKeyChecking=yes','-o','ConnectTimeout=15',
    'gadzamac@da32.host-ww.net','/opt/alt/alt-nodejs20/root/usr/bin/node'],
  Buffer.from(buildRemoteSource(snapshotMongo,mode)))
}

export async function main(args=process.argv.slice(2)) {
  let key,plain,archive,unsealed,readBack,stage='private-folder'
  try {
    if(args.length!==1 || !['--preflight','--export'].includes(args[0]))throw fail()
    await checkPrivateRoot()
    stage='key-custody'
    key=randomBytes(32)
    const sealed=await protectKey(key)
    unsealed=await protectKey(sealed,true)
    if(!timingSafeEqual(key,unsealed))throw fail()
    unsealed.fill(0);unsealed=null
    if(args[0]==='--preflight') {
      stage='host-preflight'
      const checked=JSON.parse((await remote('preflight')).toString())
      if(checked.memoryConfig!==true || checked.tool!=='100.19.1')throw fail()
      return {privateFolder:true,dpapiRoundtrip:true,...checked,exported:false}
    }
    stage='source-export'
    plain=await remote('export')
    stage='archive-validation'
    const unpacked=unpackPayload(plain);archive=unpacked.archive
    const result=validateManifest(unpacked.manifest,archive)
    const encrypted=encryptBuffer(plain,key)
    // Seal both files only after a successful dump and unchanged readbacks.
    // Partial pairs remain unaccepted; never overwrite or remove an old backup.
    stage='encrypted-persistence'
    const id=randomUUID(),base=path.join(ROOT,'backup-'+id)
    await writeExclusive(base+'.key.dpapi',sealed)
    await writeExclusive(base+'.mxb',encrypted)
    const checked=await readPrivateBackup('backup-'+id)
    readBack=checked.archive
    if(JSON.stringify(checked.manifest)!==JSON.stringify(unpacked.manifest)
      || readBack.length!==archive.length || !timingSafeEqual(readBack,archive))throw fail()
    return {...result,encryptedReadback:true,backupFile:base+'.mxb',
      encryptedSha256:createHash('sha256').update(encrypted).digest('hex'),
      keyCustody:'Windows CurrentUser DPAPI; not independently portable'}
  } catch {throw new Error('Private backup operation failed at '+stage)}
  finally {key?.fill(0);plain?.fill(0);archive?.fill(0);unsealed?.fill(0);readBack?.fill(0)}
}

if(process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  main().then(result=>process.stdout.write(JSON.stringify(result)+'\n'))
    .catch(error=>{process.stderr.write(error.message+'; no restore or cutover accepted.\n');process.exitCode=1})
}
