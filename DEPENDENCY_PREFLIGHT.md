# Maxims compatible dependency preflight — 5 October 2026

## Scope and result

Base commit: `9160e200fc25110f89e27e492a73110b6f8e342d`.
Branch: `codex/maxims-dependencies-2026-10-05`.
Worktree: `C:\Users\bgadz\Projects\Client-Sites\Maxims Interiors\maxims-dependency-preflight`.
Local runtime: Node 22.19.0, npm 10.9.3, Windows.

The backend-security-coder skill was read completely and used to constrain updates
to an explicit security-related package set and verify offline compatibility.
No production calls, DB connections, mail operations, environment-file reads,
migration execution, deployment, commit or push were performed.
The release-preflight worktree remains tracked-clean with its existing untracked
`.preflight/` preserved. No lint source or migration safeguards were edited.

Only `package-lock.json` and `server/package-lock.json` change existing tracked
files. New files are this report and `server/test/dependencies.offline.test.js`.
Both manifests and their intended dependency ranges are unchanged. Lockfile v3,
root lock metadata, scripts and optional Mongo dependency intent are preserved.

## Fresh audit results

Counts below are npm's **affected-package** counts, including inherited findings;
they are not counts of unique advisories or a proof of runtime exploitability.

| Audit | Before | After |
| --- | --- | --- |
| Server, `npm audit --omit=dev --json` | 6: 2 high, 4 moderate | 1: 1 high, 0 moderate |
| Root, `npm audit --omit=dev --json` | 32: 2 high, 30 moderate | 31: 1 high, 30 moderate |
| Root, `npm audit --json` | 44: 12 high, 32 moderate | 39: 8 high, 31 moderate |

All three audits returned findings (expected non-zero audit exits); none was
reported as clean. Across the union of server/root direct advisory records,
21 of 44 unique advisory IDs cleared; 23 remain. Counts are this run's registry
snapshot, not memory. Upstream labels may differ: for example, Tiptap's maintainer
labels GHSA-cp6q-959q-f8rh high, while this npm snapshot labels it moderate.
That difference does not remove the release gate.

## Exact version changes

Server lock (5 package versions):

| Package | Before | After |
| --- | --- | --- |
| nanoid | 5.1.11 | 5.1.16 |
| express | 4.22.2 | 4.22.3 |
| body-parser | 1.20.5 | 1.20.8 |
| morgan | 1.11.0 | 1.12.1 |
| qs | 6.15.2 | 6.16.0 |

Root lock (12 package versions):

| Package | Before | After |
| --- | --- | --- |
| postcss | 8.5.15 | 8.5.28 |
| react-router-dom | 6.30.4 | 6.30.6 |
| react-router | 6.30.4 | 6.30.6 |
| @remix-run/router | 1.23.3 | 1.23.4 |
| baseline-browser-mapping | 2.10.38 | 2.11.27 |
| brace-expansion | 1.1.15 | 1.1.21 |
| browserslist | 4.28.2 | 4.29.3 |
| js-yaml | 4.2.0 | 4.3.2 |
| caniuse-lite | 1.0.30001799 | 1.0.30001814 |
| electron-to-chromium | 1.5.375 | 1.5.444 |
| node-releases | 2.0.47 | 2.0.57 |
| update-browserslist-db | 1.2.3 | 1.3.3 |

The final four root entries are supporting Browserslist dependencies updated by
npm's compatible resolution. No package was added/removed and no changed version
crosses a major boundary. Direct root Nanoid/Express/Morgan were already fixed at
the base commit and were not changed again. Nodemailer remains **6.10.1** in both
locks; no override, force fix or major upgrade was used.

## Compatibility evidence

- Targeted lock updates used `npm update ... --package-lock-only --ignore-scripts
  --no-audit --no-fund`; no general `npm audit fix` was run.
- Both root/server `npm ci --ignore-scripts --no-audit --no-fund` passed, providing
  manifest/lock installation consistency without lifecycle hooks.
- Both `npm ls --all --json` passed with no dependency-tree problems.
- Automated comparison against Git HEAD verified identical lock-root manifest
  metadata, no added/removed package entries, and zero major-version changes.
- The [Nanoid 5.1.16 release](https://github.com/ai/nanoid/releases/tag/5.1.16)
  fixes negative-size non-secure generation. Maxims imports secure `nanoid(12)`;
  both that API and patched negative-size behaviour were tested offline.
- Express 4.22.3's installed upstream `History.md` records qs ~6.16.0.
  Body-parser's installed `HISTORY.md` records invalid-limit validation in 1.20.6,
  qs ~6.16.0 in 1.20.7, and the same code base in 1.20.8.
  The internal Express 4 Layer API used by Maxims's async wrapper remains present.
- New offline fixtures test route parameters, JSON/raw webhook bytes, valid size
  enforcement, invalid-limit rejection, extended forms, actual Express repeated
  query arrays, qs guards and Morgan separator/quote escaping. No application
  server, socket listener, real request, database pool or mail transport is started.
- qs's raw default array representation can differ beyond its default threshold;
  the first fixture incorrectly assumed raw defaults matched Express. It was
  corrected to exercise Express's actual query configuration, which passed.
  No application configuration was changed to force a green test.
- React Router 6.30.6 clears the specific 6.x redirect advisory, but not the later
  advisories whose upstream fixes require 7.18.0. PostCSS 8.5.28 is above both
  reported fixed thresholds. Frontend lint/build passed with these versions.

## Checks performed

| Check | Result |
| --- | --- |
| `npm --prefix server run test:copy` | 29/29 offline tests pass, none skipped |
| `node --test server/test/dependencies.offline.test.js` | 9/9 offline compatibility/security tests pass |
| `node --check` on 43 tracked server JS/MJS files | Pass |
| `node --check server/test/dependencies.offline.test.js` | Pass |
| `npm run lint` | Pass, zero errors/warnings |
| `npm run build` | Pass, Vite 5.4.21, 2,107 modules |
| Frontend typecheck | Not configured: no typecheck script/compiler; `jsconfig.json` has `checkJs: false` |
| `git diff --check` | Pass |
| Application source, manifests, migration code | Unchanged |
| Staged diff | Empty |

Build output is local ignored `dist/`, not a deployed artefact. Environment files
were checked for absence by path only; no contents were read. No compiler or
other dependency was added to invent a typecheck result.

## Exact fresh advisory catalogue

This is the deduplicated set of direct advisory objects returned by the fresh npm
audits. Ranges/severity are the npm snapshot's values. Inherited package findings
are represented in the audit counts above, not duplicated here. Remediation
thresholds and major gates were cross-checked with upstream security advisories,
release notes and installed upstream changelogs; links prefer the originating
repository where available. Nanoid/baseline and the unpatched braces report also
have upstream release/issue links in the evidence and gates sections.

| Package | Advisory | npm severity | npm affected range | After update | Finding |
| --- | --- | --- | --- | --- | --- |
| @tiptap/core | [GHSA-cp6q-959q-f8rh](https://github.com/ueberdosis/tiptap/security/advisories/GHSA-cp6q-959q-f8rh) | moderate | `>=2.0.0-alpha.0 <3.30.4` | Remains | Tiptap: mergeAttributes() turns an own __proto__ key into inherited executable DOM attributes |
| baseline-browser-mapping | [GHSA-w5vr-8v7q-w6rv](https://github.com/advisories/GHSA-w5vr-8v7q-w6rv) | moderate | `>=2.0.0 <2.11.0` | Cleared | baseline-browser-mapping process termination on invalid input causes denial of service |
| body-parser | [GHSA-v422-hmwv-36x6](https://github.com/expressjs/body-parser/security/advisories/GHSA-v422-hmwv-36x6) | low | `<1.20.6` | Cleared | body-parser vulnerable to denial of service when invalid limit value silently disables size enforcement |
| brace-expansion | [GHSA-3jxr-9vmj-r5cp](https://github.com/juliangruber/brace-expansion/security/advisories/GHSA-3jxr-9vmj-r5cp) | high | `<1.1.16` | Cleared | brace-expansion: DoS via exponential-time expansion of consecutive non-expanding {} groups |
| brace-expansion | [GHSA-6j4f-fj2g-mc7p](https://github.com/juliangruber/brace-expansion/security/advisories/GHSA-6j4f-fj2g-mc7p) | high | `<1.1.19` | Cleared | brace-expansion: DoS via uncontrolled recursion in parseCommaParts causing stack exhaustion |
| brace-expansion | [GHSA-mh99-v99m-4gvg](https://github.com/juliangruber/brace-expansion/security/advisories/GHSA-mh99-v99m-4gvg) | high | `<1.1.17` | Cleared | brace-expansion: DoS via unbounded expansion length causing an out-of-memory process crash |
| brace-expansion | [GHSA-q2hr-2g5m-vwhr](https://github.com/juliangruber/brace-expansion/security/advisories/GHSA-q2hr-2g5m-vwhr) | moderate | `<1.1.21` | Cleared | brace-expansion: Quadratic-time expansion of the `{a},b}` rewrite causes CPU denial of service |
| brace-expansion | [GHSA-qhr7-859c-m2p7](https://github.com/juliangruber/brace-expansion/security/advisories/GHSA-qhr7-859c-m2p7) | high | `<1.1.20` | Cleared | brace-expansion: DoS via uncontrolled recursion on nested brace groups causing stack exhaustion |
| brace-expansion | [GHSA-rgw5-rvv9-x895](https://github.com/juliangruber/brace-expansion/security/advisories/GHSA-rgw5-rvv9-x895) | high | `<1.1.18` | Cleared | brace-expansion: DoS via unbounded intermediate arrays, bypassing the CVE-2026-14257 mitigation |
| braces | [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) | high | `<=3.0.3` | Remains | braces vulnerable to stack-exhaustion denial of service through deeply nested patterns |
| browserslist | [GHSA-73wf-gq98-2v4g](https://github.com/browserslist/browserslist/security/advisories/GHSA-73wf-gq98-2v4g) | high | `<=4.28.6` | Cleared | Browserslist: Uncaught crash / prototype write via untrusted browserslist-stats.json custom stats (normalizeStats) |
| browserslist | [GHSA-c83g-rgw3-j3cx](https://github.com/browserslist/browserslist/security/advisories/GHSA-c83g-rgw3-j3cx) | high | `<=4.28.6` | Cleared | Browserslist: Unbounded memory growth (no cache eviction) via distinct query results, leading to eventual OOM |
| esbuild | [GHSA-67mh-4wv8-2f99](https://github.com/evanw/esbuild/security/advisories/GHSA-67mh-4wv8-2f99) | moderate | `<=0.24.2` | Remains | esbuild enables any website to send any requests to the development server and read the response |
| js-yaml | [GHSA-2883-xcg3-v3hh](https://github.com/nodeca/js-yaml/security/advisories/GHSA-2883-xcg3-v3hh) | high | `>=4.0.0 <4.3.2` | Cleared | js-yaml: maxTotalMergeKeys does not limit CPU use for empty merge sources |
| js-yaml | [GHSA-52cp-r559-cp3m](https://github.com/nodeca/js-yaml/security/advisories/GHSA-52cp-r559-cp3m) | high | `>=4.0.0 <4.3.0` | Cleared | js-yaml: YAML merge-key chains can force quadratic CPU consumption |
| js-yaml | [GHSA-5p4m-2wfm-xmqj](https://github.com/nodeca/js-yaml/security/advisories/GHSA-5p4m-2wfm-xmqj) | high | `>=4.0.0 <4.3.1` | Cleared | JS-YAML: Quadratic CPU consumption in !!omap resolution (3.x and 4.x) — CVE-2026-59870 fix not backported |
| morgan | [GHSA-9f6g-j8ch-79g4](https://github.com/expressjs/morgan/security/advisories/GHSA-9f6g-j8ch-79g4) | moderate | `<1.12.1` | Cleared | morgan vulnerable to Log Injection via unescaped double quote in quoted log fields |
| morgan | [GHSA-jxfw-x594-9x9m](https://github.com/expressjs/morgan/security/advisories/GHSA-jxfw-x594-9x9m) | moderate | `<1.12.0` | Cleared | morgan vulnerable to Log Forging via unescaped Unicode line separators |
| nanoid | [GHSA-28wg-ghj8-5hjv](https://github.com/advisories/GHSA-28wg-ghj8-5hjv) | high | `>=4.0.0 <5.1.16` | Cleared | nanoid: non-secure generators can loop indefinitely with negative size |
| nodemailer | [GHSA-268h-hp4c-crq3](https://github.com/nodemailer/nodemailer/security/advisories/GHSA-268h-hp4c-crq3) | moderate | `<=8.0.8` | Remains | Nodemailer: CRLF injection in Nodemailer List-* header comments allows arbitrary message header injection |
| nodemailer | [GHSA-2x7j-588g-ccc2](https://github.com/nodemailer/nodemailer/security/advisories/GHSA-2x7j-588g-ccc2) | high | `<9.1.0` | Remains | Nodemailer: Quadratic (O(n²)) time complexity in addressparser allows remote denial of service via a crafted address list |
| nodemailer | [GHSA-6vj9-mwq6-2f5v](https://github.com/nodemailer/nodemailer/security/advisories/GHSA-6vj9-mwq6-2f5v) | moderate | `>=5.0.0 <10.0.2` | Remains | Nodemailer: Process-global DNS cache reuses TLS `servername` across transports, enabling cross-tenant SMTP credential disclosure |
| nodemailer | [GHSA-8m3c-c648-2xjj](https://github.com/nodemailer/nodemailer/security/advisories/GHSA-8m3c-c648-2xjj) | moderate | `<=9.1.0` | Remains | Nodemailer: resolveContent() on a MailMessage bypasses disableFileAccess/disableUrlAccess when called with the legacy signature |
| nodemailer | [GHSA-8vvx-rff5-p5rq](https://github.com/nodemailer/nodemailer/security/advisories/GHSA-8vvx-rff5-p5rq) | moderate | `<10.0.2` | Remains | Nodemailer: Nested structured recipient arrays bypass the parser depth limit and cause stack exhaustion DoS |
| nodemailer | [GHSA-c7w3-x93f-qmm8](https://github.com/nodemailer/nodemailer/security/advisories/GHSA-c7w3-x93f-qmm8) | low | `<8.0.4` | Remains | Nodemailer has SMTP command injection due to unsanitized `envelope.size` parameter |
| nodemailer | [GHSA-cc9r-2j5m-2m83](https://github.com/nodemailer/nodemailer/security/advisories/GHSA-cc9r-2j5m-2m83) | moderate | `>=6.9.16 <9.1.0` | Remains | Nodemailer: Recipient-domain validation bypass via RFC 5322 comment mis-parsing leads to email delivery to an attacker-controlled domain |
| nodemailer | [GHSA-mm7p-fcc7-pg87](https://github.com/nodemailer/nodemailer/security/advisories/GHSA-mm7p-fcc7-pg87) | moderate | `<7.0.7` | Remains | Nodemailer: Email to an unintended domain can occur due to Interpretation Conflict |
| nodemailer | [GHSA-p6gq-j5cr-w38f](https://github.com/nodemailer/nodemailer/security/advisories/GHSA-p6gq-j5cr-w38f) | high | `<=9.0.0` | Remains | Nodemailer: Message-level raw option bypasses disableFileAccess/disableUrlAccess, enabling arbitrary file read and full-response SSRF in the delivered message |
| nodemailer | [GHSA-r7g4-qg5f-qqm2](https://github.com/nodemailer/nodemailer/security/advisories/GHSA-r7g4-qg5f-qqm2) | moderate | `<=8.0.7` | Remains | Nodemailer: Improper TLS Certificate Validation in OAuth2 Token Fetch Enables Credential Interception |
| nodemailer | [GHSA-rcmh-qjqh-p98v](https://github.com/nodemailer/nodemailer/security/advisories/GHSA-rcmh-qjqh-p98v) | high | `>=3.0.0 <=7.0.10` | Remains | Nodemailer’s addressparser is vulnerable to DoS caused by recursive calls |
| nodemailer | [GHSA-v53p-9fqp-m79j](https://github.com/nodemailer/nodemailer/security/advisories/GHSA-v53p-9fqp-m79j) | high | `<=10.0.5` | Remains | Nodemailer: Quadratic backtracking in the addressparser free-text fallback allows remote denial of service |
| nodemailer | [GHSA-vvjj-xcjg-gr5g](https://github.com/nodemailer/nodemailer/security/advisories/GHSA-vvjj-xcjg-gr5g) | moderate | `<=8.0.4` | Remains | Nodemailer Vulnerable to SMTP Command Injection via CRLF in Transport name Option (EHLO/HELO)  |
| nodemailer | [GHSA-wmmp-3585-3rmp](https://github.com/nodemailer/nodemailer/security/advisories/GHSA-wmmp-3585-3rmp) | moderate | `<9.1.0` | Remains | Nodemailer: IDN/Punycode domain allow-list bypass leads to email delivery to an attacker-controlled domain |
| nodemailer | [GHSA-wqvq-jvpq-h66f](https://github.com/nodemailer/nodemailer/security/advisories/GHSA-wqvq-jvpq-h66f) | moderate | `<=8.0.8` | Remains | Nodemailer jsonTransport bypasses disableFileAccess and disableUrlAccess during message normalization |
| postcss | [GHSA-fxqj-rqcc-2cmp](https://github.com/postcss/postcss/security/advisories/GHSA-fxqj-rqcc-2cmp) | moderate | `<=8.5.22` | Cleared | PostCSS: incomplete fix of GHSA-6g55-p6wh-862q — attacker-controlled sourceMappingURL reads arbitrary .map files when `from` is unset |
| postcss | [GHSA-r28c-9q8g-f849](https://github.com/postcss/postcss/security/advisories/GHSA-r28c-9q8g-f849) | high | `<=8.5.17` | Cleared | PostCSS: Path Traversal in Previous Source Map Auto-Loading (sourceMappingURL) leads to Arbitrary .map File Disclosure |
| qs | [GHSA-4mjr-xmp4-gh2g](https://github.com/ljharb/qs/security/advisories/GHSA-4mjr-xmp4-gh2g) | moderate | `>=2.2.5 <6.16.0` | Cleared | qs: Denial of Service via Attacker Controlled isBuffer |
| qs | [GHSA-x5fp-wj9c-mxmx](https://github.com/ljharb/qs/security/advisories/GHSA-x5fp-wj9c-mxmx) | moderate | `>=6.14.2 <=6.15.3` | Cleared | qs array-limit bypass via bracket-key comma parsing |
| react-router | [GHSA-337j-9hxr-rhxg](https://github.com/remix-run/react-router/security/advisories/GHSA-337j-9hxr-rhxg) | moderate | `>=6.4.0 <7.18.0` | Remains | React Router: Arbitrary Constructor Injection via deserializeErrors() in React Router SSR Hydration |
| react-router | [GHSA-wrjc-x8rr-h8h6](https://github.com/remix-run/react-router/security/advisories/GHSA-wrjc-x8rr-h8h6) | moderate | `>=6.0.0 <7.18.0` | Remains | React Router: Open redirect via backslash in <Link> and useNavigate (CVE-2025-68470 bypass) |
| react-router-dom | [GHSA-jjmj-jmhj-qwj2](https://github.com/remix-run/react-router/security/advisories/GHSA-jjmj-jmhj-qwj2) | moderate | `>=6.30.2 <=6.30.5` | Cleared | React Router: Open redirect leading to XSS |
| vite | [GHSA-4w7w-66w2-5vf9](https://github.com/vitejs/vite/security/advisories/GHSA-4w7w-66w2-5vf9) | moderate | `<=6.4.1` | Remains | Vite Vulnerable to Path Traversal in Optimized Deps `.map` Handling |
| vite | [GHSA-fx2h-pf6j-xcff](https://github.com/vitejs/vite/security/advisories/GHSA-fx2h-pf6j-xcff) | high | `<=6.4.2` | Remains | vite: `server.fs.deny` bypass on Windows alternate paths |
| vite | [GHSA-v6wh-96g9-6wx3](https://github.com/vitejs/launch-editor/security/advisories/GHSA-v6wh-96g9-6wx3) | moderate | `<=6.4.2` | Remains | launch-editor: NTLMv2 hash disclosure via UNC path handling on Windows |

## Remaining major/unpatched gates

1. **Nodemailer 6.x → separately reviewed supported major.** The fresh registry
   recommends 10.0.14. The remaining 15 direct advisory records include address
   parser denial of service, SMTP/header injection, content access restrictions,
   recipient-domain handling and TLS issues. Individual upstream fixes span
   7.x–10.x; no reviewed 6.x backport was established. Do not treat a package count
   of one as one issue. A separate change must review the actual mailer options,
   address/MIME handling, transport/TLS/runtime compatibility and offline regression
   evidence before any authorised mailbox/production acceptance.
2. **Tiptap 2.x → 3.x review.** The upstream mergeAttributes fix is in 3.30.4.
   The 28 npm package findings through this graph remain; no safe 2.x override or
   ad hoc source patch was introduced.
3. **React Router 6.x → 7.x review.** The 6.30.6 patch fixes one direct advisory,
   but external redirect/SSR-hydration advisories require 7.18.0. Both router
   packages still appear in npm's affected-package counts.
4. **Build tooling.** Vite 5.4.21/esbuild remain vulnerable in the full audit.
   Upstream Vite fixes are outside 5.x (for the later Windows issues, 6.4.3 or
   newer supported branches); npm recommends Vite 8.3.2. Do not expose dev servers.
   There is no reviewed compatible 5.x remediation in this task.
5. **Unpatched braces graph.** The [upstream report](https://github.com/micromatch/braces/issues/70)
   describes recursive tree walkers; no published patched braces version is
   reported. Its inherited high findings include chokidar, fast-glob, micromatch,
   Tailwind CSS and tailwindcss-animate. `fixAvailable: true` on an ancestor is not
   proof of a supported same-major fix when the underlying advisory has no patch.
6. **Deprecation/type/runtime acceptance.** npm still warns about Multer 1.x and
   older lint/build dependencies. These warnings are not silently counted as
   cleared advisories. Separate reviews are needed; no major package changes,
   new typecheck tooling, mail acceptance or production integration were performed.
   Real MariaDB/migration acceptance gates from the migration review remain open.

## Review integrity

Existing tracked diff: root lock +45/-45; server lock +20/-19.
Root lock SHA-256: `611ef769b793a3ef740fb0d266fc63443f743f4ad929907a6f62607c0456040b`.
Server lock SHA-256: `535b76fb210c8d94c855dff2514969dc6497d52d2448295f8c42587060817642`.
Use locked installs, review these two lock diffs plus the new test/report only.
Do not stage or regenerate anything from the release worktree's `.preflight`.

## Parent review

The parent independently reran all 38 combined copy/dependency tests, frontend
lint and build before committing and pushing this candidate. Production data,
mail and application deployment remain unchanged; the remaining gates above
still apply.

