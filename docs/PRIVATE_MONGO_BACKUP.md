# Maxims private preservation checkpoint — 6 October 2026

This is backup tooling and a preservation rehearsal, not a production release or
permission to replace the live database. The legacy Maxims API and its MongoDB
source remain unchanged. Do not seed over the existing catalogue or staff.

## Accepted export evidence

- Read-only source: MongoDB **8.0.34**, **85 documents in 13 ordinary collections**.
  Collection options are empty; the inspected inventory has 20 indexes, including
  seven explicit unique indexes. No customer documents or credentials are in this
  report, source control or command output.
- Official MongoDB Database Tools **100.19.1** produced a gzip archive containing
  **8,692 bytes**. Complete document and index/collection-option digests match the
  readbacks before and after the export. Compound-index key order is significant.
- The resulting **11,754-byte encrypted envelope** was exclusively written outside
  Git and read back through descriptor-bound size/identity/ACL checks. AES-256-GCM
  authentication, payload framing, archive SHA-256 and exact archive/manifest
  equality passed. The ciphertext SHA-256 is
  `925e21c71e22d177d65b1263539d96cfdc9183c15589c098ed827eee43c230ef`.
- Private storage: `C:\Users\bgadz\.private\maxims-preservation-20261006`.
  The directory has protected inheritance, the current owner, and exactly current
  user/SYSTEM/Administrators FullControl rules. Child-file ownership and effective
  inherited ACLs are checked before writing and after flushing.
- The random encryption key is sealed using **Windows CurrentUser DPAPI**, with
  purpose-bound entropy. It was never persisted as a plaintext key. Decryption was
  verified in the current profile. The pair is **not independently portable disaster
  recovery**; an owner-protected recovery copy/key-custody arrangement remains a
  separate gate. Keep the original database and retained source release.

## Consistency and media boundaries

The source was not frozen. Matching before/after reads establish observed stability,
not an atomic point-in-time snapshot, a guarantee against intervening/reverted
writes, or readiness for cutover. The immutable encrypted manifest deliberately
records `writeFreeze:false`, `pointInTime:false`, `restoreVerified:false` and
`mediaVerified:false`. A later restore receipt does not rewrite those capture facts.

The product/gallery inventory found **87 URL occurrences / 68 distinct Cloudinary
image references**, all under the Maxims prefix. This is not an asset count or a
provider backup. No Cloudinary Admin API call or media download occurred. Credentials
were unavailable in the checked configuration; user/testimonial/free-form settings
media were outside that inventory. Asset existence, ownership, versions, bytes and
completeness are not certified. Database backup does not preserve those files.

## Credential and tool handling

The producer transmits reviewed source over SSH stdin to the existing host account.
It privately parses the existing API's `MONGODB_URI`; the native driver selects the
same URI database, without importing app boot code or Mongoose auto-indexing. Unknown
collections, non-collections, the wrong server version, empty source, limits or
observed drift stop the export. It never changes the database.

MongoDB's YAML credential configuration is supplied through a Linux anonymous-memory
file (`memfd_create` / `/proc/self/fd`) and reclaimed on process exit. The actual tool
passed a harmless loopback-refusal test before source access. No production URI or
password is put in command arguments, process environment, a plaintext file or a
log. Native diagnostics are bounded and suppressed; only controlled stage markers
can escape. There is no insecure credential fallback.

Both the verified official tools package and the actual launched executable are
SHA-pinned. Regular-file, ownership, executable and non-group/world-writable checks
precede invocation. The new vendor directory is outside the live application:
`/home/gadzamac/.local/maxims-backup-tools-20261006`. Staging tools and hardening their
permissions did not restart or deploy the API.

All backup payloads remain in bounded process memory until encrypted persistence.
Plaintext payloads and keys are cleared on their managed lifetimes; this does not
promise process-wide or OS-wide zeroisation. The source/SSH/archive stages must all
complete successfully. Partial file pairs are never accepted, replaced or deleted.

## Reviewed entry points

Run only from this isolated checkout on the reviewed laptop/host. Do not put secrets
in these commands:

```text
node server/scripts/private-mongo-backup.mjs --preflight
node server/scripts/private-mongo-backup.mjs --export
```

Preflight checks private-folder ACLs, an in-memory DPAPI roundtrip and the host tool /
anonymous-memory configuration. It does not load the source configuration or query
the source. Export is an explicit, separate read-only source operation.

`readPrivateBackup(baseName)` accepts only a generated backup UUID basename, verifies
the same protected folder/files, holds read-only descriptors through ACL validation,
and bounds reads to the validated size plus one byte. Growth, truncation, replacement,
symlinks and final metadata drift fail before DPAPI/decryption acceptance. Only
authenticated, policy-valid manifest/archive buffers can reach a restore caller.

## Restore rehearsal gate

**Actual isolated restore accepted on 6 October:** the encrypted archive was read
through the guarded DPAPI/GCM reader and restored into a newly created authenticated
loopback-only MongoDB **8.0.32** fixture. All **85 documents / 13 collections** and
complete BSON-document/index/collection-option digests match the 8.0.34 capture.
The original MongoDB 8.3.2 service/data were not used. The owned fixture process is
stopped, its port 33318 is closed, and its temporary credential configuration is
removed. Backup/key and restricted fixture database files are retained. This is
version-qualified recovery evidence, not exact production compatibility, a
point-in-time snapshot or media preservation.

The matching public Windows 8.0.34 artifact was not found in inspected official
metadata; the direct artifact request returned 403. The official **8.0.32** Windows
fixture is separately downloaded and SHA-verified, not the laptop's existing MongoDB
8.3.2 service/data. A successful 8.0.32 restore will be explicitly version-qualified,
not certification of an exact production profile. Database Tools remain 100.19.1.

The fixture runner must use a fresh UUID directory under the protected root, an
auth-enabled loopback-only private process, trusted binary pins, the localhost
bootstrap exception and freshly generated fixture credentials. Verify process/port /
runtime identity before writes. Never adopt an existing service, data directory or
occupied port. Restore metadata/indexes with no `--drop`, `--oplogReplay` or index /
option suppression. Compare every complete BSON-document and collection/index
digest, including empty collections, then stop only the owned process and verify
the port is closed. No Maxims application, email, payment or provider job is run.

Restored database files contain customer data protected by ACLs, **not by the backup's
GCM envelope**. Keep them outside Git/public/synced folders. Only the runner's own
new transient fixture-credential file may be removed; backup/source/fixture data
remain retained. Report cleanup failure as a failure, not a successful rehearsal.

## Verification and remaining launch gates

The full combined offline run passes **313 tests**: 146 producer/guard tests,
89 isolated-restore tests and 78 existing copy/mail/dependency/profile tests.
Explicit zero-warning MJS lint and syntax checks pass. Independent review caught
shutdown after listener-ownership loss and unconfirmed native-tool exit before
actual restore; both were fixed with unchanged negative assertions. An initial
legacy mail-test invocation omitted its required VM-module flag; the corrected
combined invocation passes without weakening tests:

```text
node --experimental-vm-modules --test --test-reporter=spec server/test/backup-envelope.offline.test.mjs server/test/mongo-preservation-snapshot.offline.test.mjs server/test/backup-runner.offline.test.mjs server/test/private-mongo-restore.offline.test.mjs server/test/copy-from-mongo.test.js server/test/mailer.offline.test.js server/test/dependencies.offline.test.js server/test/rehearsal-profile.offline.test.js
```

The producer suite currently passes **146 offline tests** (25 envelope, 49 BSON /
metadata inventory and 72 runner/guard cases), plus explicit MJS lint/syntax checks.
These cover binary tampering, ACL inheritance/ownership, authenticated encryption,
credential isolation, bounded binary transport, source drift, failed export, file
growth/replacement and cleanup. They are not themselves a restored-data acceptance.

Remaining: source field/default/reference inventory,
`__v` and other unknown-field preservation policy, Cloudinary preservation, actual
MariaDB destination/version/permissions and supported runtime, data-preserving
rehearsal on restored copies, separate protected disaster-recovery custody,
coordinated write freeze, final reconciliation, guarded cutover and rollback.
Blog/editor/pricing/staff mail/Squad acceptance remains separate. No migration,
production restart, deployment, mail or provider spending was made in this batch.

Primary references: [mongodump](https://www.mongodb.com/docs/database-tools/mongodump/)
and [mongorestore](https://www.mongodb.com/docs/database-tools/mongorestore/).
