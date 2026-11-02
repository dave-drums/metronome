# Practice Vault React migration

## Preserved checkpoints

- React source: https://github.com/dave-drums/vault/tree/44b400a690b498a90f822b1678fb3f196b5802c0
- Vue checkpoint: `ac3afcf37f2c6729989bbaf9dc20cd009d4275f2`
- Preservation branch: `legacy/vue`
- Preservation tag: `vue-preserved-2026-11-03`
- Working migration branch: `migration/practice-vault-react`

No history rewriting or force push is needed. Practice Vault, the main website
and live deployment settings were not modified. All current work remains local.

## Source-preserving adaptations

The original `React.createElement` rendering, inline design values, beat splitting,
tap averaging, subdivisions, gain values, trainer semantics, elapsed-time display
and scheduler are retained. The original HTML's responsive rules and component's
style block are consolidated, in their original cascade order, into `src/styles.css`.
Necessary reset, inherited body styling and hero rules were extracted from Vault CSS.

The React globals become module imports; `window.Metronome` becomes a normal export.
Audio URLs resolve against the correct independently hosted base. Fonts and samples
are self-hosted; binary sample hashes are checked against the source Git blobs.
The application never reads or writes saved settings, matching Vault's reset behaviour.

Embedding adds a Shadow DOM mount wrapper and scoped keyboard target. Standalone
shortcuts stay global. Audio resumes after user-started playback where required by
browser policy. Cleanup now also covers scheduled UI/tap callbacks, held-button
repeat timers, active sources and pending sample requests. Invisible accessible
labels identify controls without changing their appearance.

Removed page dependencies: Firebase compat SDKs/init, the auth-state render gate,
Vault navigation/footer/account components, Firestore practice-session logger,
account metrics/error helpers, CDN React, runtime Babel and eval. The metronome's
own elapsed timer and trainer remain. No subscription enforcement is added.

## Verification

- `npm test`: control ranges, hold-repeat, all beats/subdivisions, emphasis/gains,
  keyboard handling, tap tempo, trainer limits, reset behaviour and cleanup.
- `npm run build:pages`: both production builds plus output verification.
- `npm run test:browser`: pixel comparisons against the pinned unmodified Vault
  component at desktop/mobile sizes and for all dialogs; actual Web Audio scheduling;
  offline reloads of all three samples; true hosted-module paths; Shadow DOM isolation;
  no embed worker; storage preservation; repeated mount/unmount.

The fixture files under `tests/fixtures/vault/` retain the source component and CSS
for comparison and are not shipped in `dist/`. Browser evidence is emitted under
`test-results/` and can be uploaded by CI when verification fails.

Safari/iOS installation, background execution and physical-device audio policy
still require a device smoke test. Browser automation checks decoded/scheduled
audio rather than listening through speakers. These browser restrictions are not
grounds to add account dependencies or change Vault's trainer/timing semantics.
