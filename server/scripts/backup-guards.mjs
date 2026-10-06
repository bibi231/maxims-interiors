// Injected dependencies let the guards be tested without files or a host.
export function verifyToolIntegrity(fs, createHash) {
  const root='/home/gadzamac/.local/maxims-backup-tools-20261006'
  const folder=root+'/mongodb-database-tools-rhel88-x86_64-100.19.1'
  const tool=folder+'/bin/mongodump'
  const uid=fs.statSync('/home/gadzamac').uid
  for(const p of [root,folder,folder+'/bin',root+'/tools.tgz',tool]) {
    const s=fs.lstatSync(p)
    if(s.isSymbolicLink() || s.uid!==uid || (s.mode & 0o022)!==0
      || !((p===tool || p.endsWith('.tgz'))?s.isFile():s.isDirectory()))throw new Error('Backup tool rejected')
  }
  if((fs.statSync(tool).mode & 0o111)===0)throw new Error('Backup tool rejected')
  if(fs.statSync(root+'/tools.tgz').size>128*1024*1024 || fs.statSync(tool).size>64*1024*1024)throw new Error('Backup tool rejected')
  const bundle=fs.readFileSync(root+'/tools.tgz')
  const executable=fs.readFileSync(tool)
  if(bundle.length>128*1024*1024 || executable.length>64*1024*1024
    || createHash('sha256').update(bundle).digest('hex')!=='6c04444b5bcc3d4a1a02ec5f93d29386aa374aab70cd00ebaba334e4f0f2e77c'
    || createHash('sha256').update(executable).digest('hex')!=='e2b1ef87ad7a6eed8d62afe5c4e85098d1e3d4d4cb22b5242ee6a1f6ff2dca33')throw new Error('Backup tool rejected')
  return tool
}

export function validatePrivateAcl(acl, directory) {
  const allowed=new Set([acl?.currentSid,'S-1-5-18','S-1-5-32-544'])
  if(!/^S-1-5-21-(?:\d+-){3}\d+$/.test(acl?.currentSid || '') || acl.ownerSid!==acl.currentSid
    || acl.reparsePoint!==false || acl.directory!==directory || acl.protected!==directory
    || !Array.isArray(acl.rules) || acl.rules.length!==3)throw new Error('Private folder rejected')
  const seen=new Set()
  for(const r of acl.rules) {
    if(!allowed.has(r.sid) || seen.has(r.sid) || r.allow!==true || r.fullControl!==true
      || r.propagationNone!==true || r.inherited!==!directory
      || r.objectInherit!==directory || r.containerInherit!==directory)throw new Error('Private folder rejected')
    seen.add(r.sid)
  }
  return true
}

export async function readBoundedPrivateFile(fs, filename, limit, checkAcl) {
  let fd,bytes
  const reject=()=>{throw new Error('Private backup file rejected')}
  const identity=(a,b)=>a.dev===b.dev && a.ino===b.ino
  const normal=(s)=>s.isFile() && !s.isSymbolicLink() && Number.isSafeInteger(s.size) && s.size>0 && s.size<=limit
  try {
    if(!Number.isSafeInteger(limit) || limit<1 || limit>64*1024*1024+33 || typeof checkAcl!=='function')reject()
    const initial=fs.lstatSync(filename)
    if(!normal(initial))reject()
    fd=fs.openSync(filename,'r')
    const opened=fs.fstatSync(fd)
    if(!normal(opened) || !identity(initial,opened) || initial.size!==opened.size)reject()
    await checkAcl(filename,false)
    const afterAcl=fs.lstatSync(filename)
    if(!normal(afterAcl) || !identity(afterAcl,opened) || afterAcl.size!==opened.size)reject()
    // Never use readFileSync(path): ACL/size validation binds to the held file.
    bytes=Buffer.alloc(opened.size+1)
    let offset=0
    while(offset<bytes.length) {
      const n=fs.readSync(fd,bytes,offset,bytes.length-offset,offset)
      if(!n)break
      offset+=n
    }
    const final=fs.fstatSync(fd),atPath=fs.lstatSync(filename)
    if(offset!==opened.size || !normal(final) || !normal(atPath) || !identity(final,atPath)
      || final.size!==opened.size || final.mtimeMs!==opened.mtimeMs || final.ctimeMs!==opened.ctimeMs
      || atPath.size!==final.size || atPath.mtimeMs!==final.mtimeMs || atPath.ctimeMs!==final.ctimeMs)reject()
    return Buffer.from(bytes.subarray(0,offset))
  } catch {reject()}
  finally {bytes?.fill(0);if(fd!==undefined)fs.closeSync(fd)}
}
