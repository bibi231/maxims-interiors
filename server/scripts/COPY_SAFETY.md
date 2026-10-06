# Mongo-to-MariaDB copy safeguards

This tooling is conservative, not evidence that production data has been preserved.
Only offline fixtures have been exercised for this change. No live migration,
database connection, secret inspection or deployment forms part of its acceptance.

## Modes and reports

Run from `server`; supply configuration privately through the caller's environment.
The CLI does **not** load an environment file. Do not put credentials in commands,
reports or source control. These commands are examples, not execution authorisation:

```text
node scripts/copy-from-mongo.js --report=NEW-plan.json
node scripts/copy-from-mongo.js --reconcile --report=NEW-reconciliation.json
```

The default and `--dry-run` are read-only plans. `--reconcile` is read-only and
exits non-zero unless every mapped row and field is canonically equal. A plan can
exit successfully with missing rows: `canApply: true` is not `equal: true`.
`--apply` is a separate, explicitly authorised write operation, prohibited during
this preflight. There is no truncate, overwrite, lenient or partial-collection mode.

Reports are exclusively created, never overwrite pre-existing files, and contain
row IDs, field names, nested JSON Pointer differences, counts, defaulted fields and
SHA-256 row digests, not field values or native database error text. Treat these
metadata as private too. POSIX mode 0600 does not replace Windows ACL review.
Each report write completes all bytes and synchronises the file before proceeding.

- `NEW-plan.json`: complete pre-insert plan, persisted before any inserts.
- `NEW-plan.json.result.json`: read-only outcome, failure, or field-level equality
  recorded inside the transaction with `verified_before_commit`, `committed: null`.
- `NEW-plan.json.commit.json`: reserved only for apply; `committed: true` means
  the database acknowledged COMMIT. The pre-commit result alone is not that proof.

An empty/incomplete acknowledgement or `commit_outcome_unknown` /
`rollback_outcome_unknown` requires authorised read-only reconciliation and secure
diagnostics. Never assume rollback succeeded, or blindly retry after lost COMMIT
acknowledgement. A filesystem failure after acknowledged COMMIT cannot undo it.

## Exact source mapping and loss policy

| Mongo collection | Model | MariaDB table |
| --- | --- | --- |
| users | User | users |
| products | Product | products |
| orders | Order | orders |
| bulkrequests | BulkRequest | bulk_requests |
| appointments | Appointment | appointments |
| messages | Message | messages |
| galleries | Gallery | gallery |
| testimonials | Testimonial | testimonials |
| teammembers | TeamMember | team_members |
| settings | Setting | settings |
| activities | Activity | activity |
| newsletters | Newsletter | newsletter |
| transactions | Transaction | transactions |
| blogposts | BlogPost | blog_posts |

Blog mapping includes title, slug, excerpt, HTML content, cover image, tags, status,
published timestamp, SEO title/description, author ID/name, reading minutes, ID and
creation/update timestamps. Every current model field is mapped and reconciled;
adding an unmapped model fails rather than silently skipping it.

Unknown collection names (even empty, system or alternate names such as
`blog_posts`) and unknown top-level source fields **halt the whole copy**. This
includes Mongoose `__v`; there is no preservation envelope and no silent metadata
discard. Do not strip unknown fields from the source to make a run pass. Obtain an
explicitly reviewed mapping or separate lossless archival design first. Missing
known collections are reported as absent, not proof of a complete source inventory.

Only `_id`/`id`, `created_at`/`createdAt`, `updated_at`/`updatedAt` are recognised
source metadata. Conflicting aliases halt. Any explicitly null creation/update
alias halts with `null_timestamp`, even if its snake/camel partner is populated;
null is never treated as missing. Defaults apply only when both aliases are absent;
explicit undefined or invalid timestamp values halt too. IDs/references must be
24-character lower-case hexadecimal IDs. Missing creation timestamps use the
ObjectId timestamp; missing update timestamps use creation time. Missing model fields use existing
model defaults, all listed under `defaultedFields`; review those transformations.
Existing explicit fields cannot silently change under model normalisation, including
trimming/lowercasing or replacement by defaults.

Mapped JSON preserves nested keys and array ordering under the documented BSON to
JSON conversion: ObjectIds become hexadecimal strings and dates become UTC ISO
strings. Unsupported BSON, nested Decimal128, unsafe integers, undefined values,
ambiguous dates and lossy coercions halt. DECIMAL(14,2) is compared in exact cents;
non-zero excess precision and out-of-range values halt. Canonical comparison ignores
JSON object key ordering but not array ordering, normalises UTC timestamps and
recognised boolean representations, and checks every column, not just IDs/counts.
This is canonical equivalence, not byte-identical BSON preservation.

## Destination and transaction guards

Any non-identical same-ID destination row, destination-only row, unexpected/missing
mapped-table column, non-InnoDB mapped table or visible trigger blocks all inserts.
Identical rows are untouched. Missing rows use plain parameterised INSERT, never
UPSERT, UPDATE, REPLACE, IGNORE or DELETE. Constraints or natural-key collisions
fail; no automatic merge is offered. Unmapped destination tables are not modified
or certified by this tooling.

Apply uses one SERIALIZABLE transaction with locked destination reads. After all
inserts, it reads destination and source again, requires field-level canonical
equality and persists that verification before COMMIT. Presence of every known
source collection is captured from the first snapshot and compared with the second.
Addition or disappearance, including an empty collection with no row differences,
blocks verification with `source_collection_presence_drift` and rolls back when
rollback is acknowledged. Unchanged absent collections remain reported as absent,
not certified as a complete inventory. Observed source drift,
verification/report failure or insert errors roll back when rollback is acknowledged.
There is a 10,000-row cap **per collection/table**; snapshots/reports are in memory,
not streaming or byte-bounded. Larger datasets need a separately reviewed design.
A source write freeze or immutable consistent snapshot is still essential: two
reads are not an atomic cross-database snapshot and cannot prevent later writes.

## Migration 004 and required ordering

004 fills an address only for SQL NULL or a JSON object **without** an `address`
property. Any existing property, including blank, whitespace or JSON null, is
preserved; arrays/scalars/JSON null roots are left alone. Existing other object
properties remain intact. No heuristic distinguishes an old default from an admin
edit. The ledger guard remains; this cannot restore data an older 004 overwrote.
A fresh contact row uses a plain INSERT so an unrelated fixed-ID collision raises
an error rather than being silently ignored.

For a new destination, prepare reviewed schema 001–003 first, copy and reconcile,
then separately approve/test/apply 004 and record its intended transformation.
The existing `applySchema.js` runs all migrations; **do not use it unchanged as the
pre-copy preparation step**. Running 004 first can create a fixed-ID contact row
whose key/identity conflicts with the Mongo row. If it has already run, halt on any
conflict; resolve through an approved preservation plan, not automatic deletion or
overwrite. After 004 intentionally adds an address, direct source equality may
differ: keep pre-migration reconciliation and record the approved delta separately.
The schema runner and its non-transactional DDL behaviour have not been changed.

## Remaining real MariaDB cutover gates

1. Authorised inventory and immutable backups of the correct Mongo database, all
   collection names/fields (including `__v`), MariaDB destination, uploads/media and
   settings. Verify backup restoration and retain originals/rollback artefacts.
2. Rehearse on restored, isolated MariaDB/Mongo copies with the actual server and
   driver versions, SQL mode, UTC handling, collations, field types/nullability,
   indexes, constraints and permission-complete trigger inventory. Column-name
   checks alone do not certify schema type/collation compatibility or hidden triggers.
3. Exercise actual transaction isolation/locking, late unique-key collision,
   truncation/normalisation, source drift, rollback and lost acknowledgement scenarios.
   Confirm read-back equality and secure durable reports. Fake tests are not engine
   integration tests or proof of commit/rollback under network failures.
4. Execute 004 **only on a disposable restored database** to verify JSON SQL
   semantics, all existing-address fixtures, ledger rerun and fixed-ID collision.
   The offline predicate evaluator is not a SQL parser or database engine.
5. Approve missing-field defaults, BSON conversions, source completeness, reference
   integrity and natural keys. Confirm destination-only data/edits are preserved by
   an explicit resolution plan. Unknown fields/collections must not be discarded.
6. Separately authorise a write freeze, copy, post-copy reconciliation, 004 ordering,
   runtime cutover, read-only acceptance and rollback plan. Preserve source data;
   this tool does not delete it. Database migration is not deployment acceptance.

## Offline check

```text
npm run test:copy
```

The suite uses fake source/destination fixtures and real model casting only. It
opens no database pool, calls no production endpoint, loads no environment file and
replaces the former destructive copy-test setup. Dependency manifests and locks
are unchanged. Existing dependency/security release blockers are a separate gate.
