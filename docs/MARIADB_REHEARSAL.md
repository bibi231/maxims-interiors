# MariaDB preservation rehearsal — 6 October 2026

## Accepted scope

The copy tool now rejects explicitly null creation/update timestamp aliases and
known-collection presence drift between source reads. It does not replace null
timestamps with defaults or accept an empty collection disappearing during apply.
Missing timestamps still follow the documented ObjectId/creation-time defaults;
missing collections still require a separately reviewed completeness inventory.

An independent agent reviewed the source changes and harness. The parent ran:

```text
node --experimental-vm-modules --test --test-reporter=spec server/test/copy-from-mongo.test.js server/test/mailer.offline.test.js server/test/dependencies.offline.test.js server/test/rehearsal-profile.offline.test.js
node server/test/copy.mariadb.test.js --isolated-port=33316
node server/test/copy.mariadb.test.js --isolated-port=33317
```

**78 offline checks pass**: 44 copy, 15 mail, 9 dependency and 10 profile guards.
**31 engine cases pass on each of MariaDB 10.11.16 and 10.6.18** (62 executions).
Tests use synthetic in-memory BSON source fixtures, not a MongoDB server, restored
customer data or the production database. The installed host CLI is 10.6.18;
its version does not establish the actual database server version. The older
portable engine is a compatibility fixture, not a production upgrade recommendation.

## What the real engines established

- Schema 001–003 preparation and guarded rerun; no 004 pre-copy seeding.
- Default read-only plan; all fourteen synthetic collections copy and reconcile.
- A separate connection sees every committed table before the writer's rerun.
  Exact decimals, millisecond UTC timestamps, emoji, nested JSON and blog fields
  are checked; identical apply reruns cannot call INSERT.
- Existing destination edits/extra rows, unknown Mongoose metadata, visible
  triggers, a non-InnoDB table and an unexpected column block insertion.
- Duplicate slug/reference, case/accent/trailing-space collation collisions,
  string truncation and SQL-not-null failure roll back previously inserted rows.
- Verification callback failure, observed source changes and empty-collection
  disappearance roll back the whole copy. Offline coverage also checks empty
  collection addition across all fourteen mappings.
- Locked reads prevent both existing-row updates and phantom inserts in an
  empty mapped table and a populated-table gap. The same inserts succeed only
  after the transaction releases its locks.
- Migration 004 preserves edited, blank, whitespace and null address properties,
  JSON-null/scalar/array roots and unrelated settings. Only a missing property or
  SQL NULL is filled; reruns do not modify the row. A fixed-ID collision halts
  without replacing the unrelated record or recording the migration as applied.

`CAST(value AS CHAR)` is used for direct 004 assertions to distinguish raw JSON
text from mysql2's decoded JSON string scalars; the JSON-null case separately
asserts `JSON_TYPE(value) = 'NULL'`. This test correction does not relax equality.

## Containment and retained local fixtures

The harness never loads dotenv or uses DATABASE_URL. A Map-based argument gate
rejects unexpected ports, inherited-property names, missing and extra arguments
before connection creation. After connection it checks exact engine version,
port and dedicated datadir before any DDL. Profiles deliberately support only
this workspace's private fixture instances:

| Profile | Loopback port | Dedicated data directory |
| --- | --- | --- |
| 10.11.16 | 33316 | `C:\Users\bgadz\deploy-infra\maxims-mariadb-20261006\data` |
| 10.6.18 | 33317 | `C:\Users\bgadz\deploy-infra\maxims-mariadb-20261006\data106` |

Instances use fresh isolated bootstrap data, bind only 127.0.0.1, and register no
Windows service. Schemas are randomly named, created without IF NOT EXISTS,
and retained rather than deleting existing data. Each case emits its synthetic
schema identity immediately, including on failure. Connection credentials are
fixture-only, never application credentials. Shut down both temporary instances
after testing; do not leave a passwordless fixture listening between sessions.

Both official portable ZIPs were checked against the publisher's SHA-256 lists:

- 10.11.16: `b1659bd9fe816624632c6b445ce4ad1ed6758a199e35f89e2448aef99828527b`
- 10.6.18: `c901aa2ef2ade14b87884c77ac14b78abecfed6e09ec20692cdf5fc04817900f`

Sources: [MariaDB portable ZIP procedure](https://mariadb.com/docs/server/server-management/install-and-upgrade-mariadb/installing-mariadb/binary-packages/installing-mariadb-windows-zip-packages),
[10.11.16 official files](https://dlm.mariadb.com/browse/mariadb_server/10.11.16/winx64-packages/),
[10.6.18 official files](https://dlm.mariadb.com/browse/mariadb_server/10.6.18/winx64-packages/).

## Production is not cleared for cutover

Read-only checks establish that the configured legacy Mongo database is reachable
and non-empty, and that Cloudinary is the selected media driver. Sequential
collection counts are not an immutable snapshot or a backup. No customer
documents, asset contents, connection strings or secret values were disclosed.
No host file, database record, service configuration or mail delivery was changed.

Still required: verified Mongo backup and isolated restore; actual source field,
BSON/default and reference inventory; Cloudinary ownership/completeness and
asset preservation; actual MariaDB server/schema/permissions/collation/SQL-mode
acceptance; supported host runtime and compatible dependency installation; tested
service/database/media rollback; coordinated source freeze; pre/post-copy field
reconciliation; separately approved 004 delta; real SMTP/inbox and client-flow
acceptance. Lost COMMIT acknowledgements and restoration from real backups were
not exercised by these tests. Never seed or replace the live database as a shortcut.

The canonical checkout and existing release candidates remain preserved.
This branch is a source/test increment, not a production deployment.
