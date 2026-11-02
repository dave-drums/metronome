# Dave Drums metronome

The free React metronome from Practice Vault, maintained independently here.
No login, Firebase, subscription, external React runtime, runtime Babel or eval is required.

## Development and verification

Use Node 22.22.2 or newer within Node 22 (the pinned tools require it).

```sh
npm ci
npm run dev
npm test
npm run build:pages
npx playwright install chromium
npm run test:browser
```

On Windows with Microsoft Edge installed, set `PLAYWRIGHT_CHANNEL=msedge` for the
browser tests instead of downloading Chromium. On Linux CI the workflow installs
Chromium and its system dependencies.

`build` produces the standalone PWA; `build:embed` produces the independent embed
under `dist/embed/`. Always use `build:pages` for publication: the standalone build
clears dist before the embed is added. Both outputs include locally bundled React.
The verifier checks original audio hashes, offline assets, licence files and the
absence of authentication, storage and service-worker code from the embed.

Tests compare the migration with the unmodified, pinned Vault component, including
screenshots of the card and all dialogs, real Web Audio scheduling, reset-on-reload,
offline playback, keyboard handling, cleanup and CSS isolation. The reference page
is built only for tests under `.tools/reference/`; it is never deployed.

## Deployment

The repository's GitHub Pages source must remain **GitHub Actions**. The workflow
builds/tests migration branches and pull requests without deploying them. Only
successful builds on `main` deploy, and deployment waits for unit tests, production
artifact verification and browser tests. The entire `dist/` directory is published.

The current migration has not been pushed, merged or deployed. To release after review:

1. Push `legacy/vue` and tag `vue-preserved-2026-11-03` to preserve the Vue checkpoint remotely.
2. Commit the migration on `migration/practice-vault-react`, push that branch, and
   open a pull request into `main`.
3. Review the changes and successful CI results, then merge into `main`.
4. Wait for both `build` and `deploy` in **Build and deploy metronome** to succeed.
5. Check the standalone URL, both embed files, and an offline reload after the new
   service worker has activated.

URLs after release:

- Standalone: https://dave-drums.github.io/metronome/
- Module: https://dave-drums.github.io/metronome/embed/metronome.js
- Styles: https://dave-drums.github.io/metronome/embed/metronome.css

See [EMBEDDING.md](EMBEDDING.md) for the host-page integration. The main Dave Drums
website and Practice Vault source repository are not changed by this migration.

## Behaviour and provenance

The original 1–300 BPM range, ±5 hold buttons, tap tempo, keyboard shortcuts, 1–16
beats, eight subdivisions, per-beat accents/muting, elapsed timer, popups and tempo
trainer are retained. Trainer “Stop at” caps tempo changes; it does not stop playback.
As in Vault, reloading resets controls to their defaults. No browser preferences
are read, written or cleared; existing Vue storage is left alone.

Standalone keyboard shortcuts remain page-wide except while editing inputs. Embedded
shortcuts apply only inside the focused metronome. Mounting/unmounting releases its
audio context, sources, delayed display/tap callbacks, repeat timers and listeners.
The scheduler retains Vault's 25ms lookahead polling and 100ms scheduling horizon.

The standalone worker is scoped to `/metronome/`. All three original samples and
self-hosted fonts are precached. One successful online visit and worker installation
are needed before offline use. The embed never registers a worker.

Source: `dave-drums/vault` commit `44b400a690b498a90f822b1678fb3f196b5802c0`.
Original HTML, component, CSS and audio were inspected against the live Vault site.
See [NOTICE.md](NOTICE.md) and [MIGRATION.md](MIGRATION.md).

## Recovering Vue

The complete original Git history remains intact. The preserved checkpoint is
`ac3afcf37f2c6729989bbaf9dc20cd009d4275f2`, retained by branch `legacy/vue` and
tag `vue-preserved-2026-11-03`. A source archive also remains in `legacy/vue/` with
its original package files, tests, GPL-3.0 licence and Julien Sulpis attribution.

For an exact checkout use a separate worktree:

```sh
git worktree add ../metronome-vue legacy/vue
```

The preservation refs are local until explicitly pushed. They do not trigger the
React deployment workflow. Use the restored branch for a complete historical build;
the archived folder's original workflow is preserved in Git at that checkpoint.
