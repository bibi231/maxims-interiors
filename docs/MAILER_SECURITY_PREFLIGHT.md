# Mailer security preflight — patched offline candidate

Checked 5 October 2026 on `codex/maxims-mailer-security-2026-10-05`, implementation
base `e7e0ddd4aa6433aa0ae0a874bb5a86c9233a28fc`. **Dependency candidate checked
offline; actual host/runtime and SMTP/mailbox acceptance remain release gates.**

## Selected release and bounded changes

Both manifests now pin **Nodemailer `10.0.15` exactly**, replacing root `^6.9.15`
and server `^6.10.1`; both prior locks resolved `6.10.1`. Both lockfiles and clean
installed packages now resolve `10.0.15`. The
[official release](https://github.com/nodemailer/nodemailer/releases/tag/v10.0.15)
and registry `latest` were checked; the
[versioned package](https://github.com/nodemailer/nodemailer/blob/v10.0.15/package.json)
requires **Node `>=20.0.0`** and adds no runtime dependencies.

Registry verification:

```powershell
npm view nodemailer version engines dist.integrity --registry=https://registry.npmjs.org --json
npm view nodemailer@10.0.15 version engines dependencies dist.tarball dist.integrity gitHead --registry=https://registry.npmjs.org --json
```

Both locks use the official registry tarball and verified registry integrity:
`sha512-EUqp5PhtcsYXs9Fq/lS7s/8zlTrnBqmzZWzFFROrNikMiz+om/YRKMwqN907t+0A1KKyT8jd39CBUbFZmaZmcA==`.
All resolved lock diffs were reviewed and compared programmatically with the
base: only the root dependency pin and `node_modules/nodemailer` entry changed
in each lock (587 root / 155 server package entries). No other package versions,
lock metadata, production modules, fixtures or mail configuration changed.

Lock generation and clean installs succeeded in **each** root/server directory:

```powershell
npm install --package-lock-only --ignore-scripts --audit=false --fund=false --registry=https://registry.npmjs.org
npm ci --ignore-scripts --audit=false --fund=false --registry=https://registry.npmjs.org
```

No lifecycle scripts, forced audit fixes or unrelated upgrades were used.

## Advisory and audit delta

The [maintainer advisory index](https://github.com/nodemailer/nodemailer/security/advisories)
was refreshed alongside registry audits. Reviewed fix floors include:

| Advisory | Severity / affected range | Individual fix floor |
| --- | --- | --- |
| [GHSA-rcmh-qjqh-p98v / CVE-2025-14874](https://github.com/advisories/GHSA-rcmh-qjqh-p98v): recursive address-parser denial of service | High / `>=3.0.0, <=7.0.10` | `7.0.11` |
| [GHSA-2x7j-588g-ccc2](https://github.com/advisories/GHSA-2x7j-588g-ccc2): quadratic address-list parsing | High / `<9.1.0` | `9.1.0` |
| [GHSA-v53p-9fqp-m79j](https://github.com/advisories/GHSA-v53p-9fqp-m79j): quadratic free-text fallback | High / `<=10.0.5` | `10.0.6` |
| [GHSA-39m8-27wv-hr27](https://github.com/nodemailer/nodemailer/security/advisories/GHSA-39m8-27wv-hr27): DKIM folded-header parsing | Moderate / `>=3.0.0, <=10.0.9` | `10.0.10` |
| [GHSA-4g23-2xm8-66gc](https://github.com/nodemailer/nodemailer/security/advisories/GHSA-4g23-2xm8-66gc): SMTP multiline-reply parsing | Moderate / `>=3.0.0, <=10.0.9` | `10.0.10` |
| [GHSA-4ffr-jq9g-5ffx](https://github.com/nodemailer/nodemailer/security/advisories/GHSA-4ffr-jq9g-5ffx): SMTP AUTH regex | Moderate / `>=3.0.0, <=10.0.12` | `10.0.13` |
| [GHSA-g73g-hqqh-jr95](https://github.com/nodemailer/nodemailer/security/advisories/GHSA-g73g-hqqh-jr95): malformed recipient/comment parsing | Moderate / `>=3.0.0, <=10.0.12` | `10.0.13` |

`10.0.15` is above these floors. This table is a selected advisory record, not a
claim of permanent safety; registry and maintainer disclosure timing can differ.
Parser work may precede SMTP timeouts, so timeouts alone are not mitigation.

`npm audit --json --ignore-scripts --registry=https://registry.npmjs.org` in each
directory reported the following full dependency-tree counts in this pass:

| Tree | Before (`6.10.1`) | After (`10.0.15`) |
| --- | --- | --- |
| Root | 39: 8 High, 31 Moderate | 38: 7 High, 31 Moderate |
| Server | 1 High (Nodemailer) | 0 |

Nodemailer is absent from both final audit reports. Root audit still exits 1;
server audit exits 0. The remaining root findings concern Tiptap, Vite/esbuild,
React Router and Tailwind/glob dependencies; they are unchanged and outside this
pass. Neither the audit nor these tests certify production exposure or deployment.

## Offline contract evidence

From the repository root:

```powershell
node --experimental-vm-modules --test --test-reporter=spec server/test/mailer.offline.test.js server/test/dependencies.offline.test.js server/test/copy-from-mongo.test.js
npm run lint
node --input-type=module -e "import { build } from 'vite'; await build({ envFile: false });"
```

Results with `10.0.15`: **53/53 passed** (15 mail, 9 dependency, 29 copy), with no
skips, on both **Node 22.19.0** and disposable **Node 20.20.2** Windows x64. The
same test command was run with the Node 20 executable explicitly; no system or
host runtime was changed. Its archive was downloaded from the
[official version directory](https://nodejs.org/dist/v20.20.2/) and its SHA-256
matched the official `SHASUMS256.txt` before use. The expected experimental
VM-module warning remains. No fixture or production-source repair was needed.

Syntax checks passed for all **45 JavaScript files** under `server/src`,
`server/test`, `server/scripts`, plus `vite.config.js`. Root/server installed
CommonJS and ESM default Nodemailer APIs were also checked. **Lint passed**;
**Vite 5.4.21 production build passed** (2,107 modules, 47.16s). The build used
`envFile: false`, whose installed Vite implementation bypasses `loadEnv`; no
public/secret environment file was read or injected. This is an offline compile,
not a release-configured artefact. This JavaScript project declares no separate
typecheck or server-build script.

**Node 20 compatibility is not runtime support certification.** The package's
engine allows Node 20 and the suites passed on 20.20.2, but
[Node's release status](https://nodejs.org/en/about/previous-releases) now lists
Node 20 as **EOL**. The actual host's exact patch version, operating system,
application runner and deployment dependency tree were not inspected. A supported
host runtime and final release compatibility remain separate release gates.

The test evaluates unchanged `mailer`, `templates`, `notify`, `staffInvite` and
the auth route inside an allowlisted VM, with synthetic configuration/model
imports. Real Nodemailer compiles MIME to an in-memory Buffer; the real SMTP
constructor is checked for API shape but **never sent through or verified**.
TCP/TLS/DNS/HTTP(S)/HTTP2/UDP/fetch entry points are blocked; env-file reads and
file-content streams are guarded. Recorded blocked-I/O attempts: **zero**.
No app/bootstrap, dotenv, database pool, real account or SMTP session is used.
Dependency metadata/downloads used only the official registry/vendor sources;
the fixtures used no network or live database. No real mail was sent.

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

1. **Confirm the release runtime.** The authorised source/dependency change is
   complete offline. Before release, verify the actual host's exact Node version
   against `>=20.0.0`, and address Node 20's EOL status separately. Reproduce the
   clean server install and checks in the release runtime; Windows Node 20/22
   fixture results do not certify a different host/runner or enable deployment.
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
