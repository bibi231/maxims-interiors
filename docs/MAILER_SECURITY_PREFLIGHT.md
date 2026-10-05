# Mailer security preflight — offline baseline

Checked 5 October 2026 on `codex/maxims-mailer-security-2026-10-05`, base
`ed0525abcba32b4746afca5ed02b7e87181104c1`. **Compatibility baseline only;
dependency remediation and SMTP/mailbox acceptance remain separate gates.**

## Baseline and outstanding advisories

Both root/server lockfiles and the installed server package resolve **Nodemailer
6.10.1**. Root manifest: `^6.9.15`; server manifest: `^6.10.1`. No manifest,
lockfile, installed dependency, production module or configuration was changed.

Official GitHub advisories confirm the baseline is affected:

| Advisory | Severity / affected range | Individual fix floor |
| --- | --- | --- |
| [GHSA-rcmh-qjqh-p98v / CVE-2025-14874](https://github.com/advisories/GHSA-rcmh-qjqh-p98v): recursive address-parser denial of service | High / `>=3.0.0, <=7.0.10` | `7.0.11` |
| [GHSA-2x7j-588g-ccc2](https://github.com/advisories/GHSA-2x7j-588g-ccc2): quadratic address-list parsing | High / `<9.1.0` | `9.1.0` |
| [GHSA-v53p-9fqp-m79j](https://github.com/advisories/GHSA-v53p-9fqp-m79j): quadratic free-text fallback | High / `<=10.0.5` | `10.0.6` |

These are verified examples, **not a complete current advisory inventory**.
`7.0.11` fixes the historical High advisory, not every subsequent issue. No
upgrade target is approved here; do not use `npm audit fix --force`. Parser work
can occur before SMTP timeouts, so those timeouts do not establish mitigation.
Production exposure and deployment versions have not been certified.

## Offline contract evidence

From the repository root:

```powershell
node --experimental-vm-modules --test server/test/mailer.offline.test.js
node --experimental-vm-modules --test server/test/mailer.offline.test.js server/test/dependencies.offline.test.js
node --check server/test/mailer.offline.test.js
```

Result on Node **22.19.0**: **15 passed, 0 failed**; syntax check passed. Node emits
the expected experimental VM-module warning. The combined run with the existing
9 dependency fixtures passed **24/24**. The original 13 test scenarios
were retained. Its initial run was 12/13: the fixture's MIME decoder incorrectly
counted whitespace between adjacent encoded words. The repair follows RFC 2047
folding semantics without collapsing ordinary subject whitespace.

The test evaluates unchanged `mailer`, `templates`, `notify`, `staffInvite` and
the auth route inside an allowlisted VM, with synthetic configuration/model
imports. Real Nodemailer compiles MIME to an in-memory Buffer; the real SMTP
constructor is checked for API shape but **never sent through or verified**.
TCP/TLS/DNS/HTTP(S)/HTTP2/UDP/fetch entry points are blocked; env-file reads and
file-content streams are guarded. Recorded blocked-I/O attempts: **zero**.
No app/bootstrap, dotenv, database client, real account or SMTP session is used.

Covered contracts:

- Cached transport; host/port/auth, 15s/10s/20s timeouts, sender, `to` arrays,
  `cc`, `replyTo`, structured/boolean results, creation/send/verify failures.
- Real MIME: UTF-8 subject/HTML, branded shell, envelope recipients and a small
  CRLF-header regression. Extra `raw`, attachment and header options remain
  excluded by the existing mailer API.
- Real helpers: escaped staff-invite text and 72h signed setup link; 1h reset
  link and identical non-enumerating response for success, mail failure, absent
  and inactive fixture users; notification defaults/custom deduplicated list.
- File/URL content rejection in the stream fixture. Its `disableFileAccess` and
  `disableUrlAccess` flags are **test-only**, not production protection claims.

The model lookup is an in-memory stub. Password changes, token single-use after
a database update, rate-limit middleware and all transactional route templates
are not integration-tested. Stream compilation is not SMTP acceptance or inbox
delivery. See [official stream transport documentation](https://nodemailer.com/transports/stream).

## Exact compatibility and owner gates

1. **Prepare a separate dependency change.** Select and pin a candidate after
   refreshing the complete official advisory/registry audit. Review Node engine
   requirements against the actual host runtime; reconcile both manifests and
   lockfiles, perform reproducible clean installs, then rerun this baseline and
   the existing dependency fixtures. No candidate/major upgrade is certified by
   the Nodemailer 6 run.
2. **Preserve API and failure behaviour.** Compare `createTransport`, promise
   `sendMail`/`verify`, MIME/recipient output, sender defaults, helper links and
   failure handling. Keep ordinary whitespace and UTF-8 intact; do not bypass
   changed parser behaviour to make old tests pass.
3. **Review SMTP settings with the mailbox owner.** Port 465 uses implicit TLS
   (`secure=true`); port 587 normally uses `secure=false` with STARTTLS. The
   baseline defaults `SMTP_SECURE` to true even when only the port changes to
   587, and does not set `requireTLS`. Confirm the intended port/TLS policy and
   certificate hostname; never disable certificate verification. Credentials
   must be checked by the owner through the approved secret channel, not copied
   into tests/docs. See [official SMTP documentation](https://nodemailer.com/smtp).
4. **Review untrusted inputs separately.** Trace and bound every recipient,
   display-name, subject and content-object input; validate recipient count and
   length, and require strings/trusted HTML at the mailer boundary. Template
   shells accept HTML; helper escaping tests do not certify every route. Assess
   production file/URL restrictions against the selected version's advisories.
   Do not run large parser-denial-of-service payloads on shared systems.
5. **Authorise controlled SMTP and mailbox acceptance separately.** Use a
   designated test mailbox/capture service and synthetic data. Obtain approval
   before network verification or sending; validate certificate/auth, accepted
   and rejected recipients, visible UTF-8/links, inbox/spam and SPF/DKIM/DMARC as
   applicable. No production password resets/invites or customer/staff messages
   are authorised by this offline handoff.
6. **Release only after verified compatibility and scoped acceptance.** Record
   the tested dependency/runtime and checksums, preserve a rollback artefact,
   and keep the deployment within the user's authorised release scope.
   Local tests, a successful SMTP `verify`, SMTP acceptance and mailbox delivery
   are distinct evidence stages.
