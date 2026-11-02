# Embedding on Dave Drums

The standalone Vue/PWA application and embedded module share the same components.
The embed bundles Vue, Vuex and Howler; the host needs no framework, login or iframe.
All changes and built assets belong to this repository.

## Build and publish

```sh
npm ci
npm test
npm run build:pages
npm run test:embed-build
```

Publish the **entire `dist/` directory** to this repository's GitHub Pages site.
`build` still builds the standalone PWA; `build:embed` builds only `dist/embed/`.
Run `build:pages` to build both in the right order (the standalone build clears dist).
The included Pages workflow does this on pushes to `main` or manual dispatch.
It builds and verifies both versions before uploading `dist/` as a single Pages
artifact. A separate deployment job publishes that exact artifact after the build
succeeds, preserving the standalone app at the site root and the module in `embed/`.

**Required repository setting:** [Settings > Pages](https://github.com/dave-drums/metronome/settings/pages)

Under **Build and deployment**, **Source** must be **GitHub Actions**, rather than
**Deploy from a branch > main > /(root)**. Publishing the source branch root does
not run Vite or expose the generated `dist/embed/` files at `/embed/`.
The repository has been switched to GitHub Actions and verified through the Pages
API (`build_type: workflow`); keep this setting when changing deployment options.
The workflow continues to build from `main`; generated files do not need to be
committed to the source branch. The workflow itself cannot switch an existing
branch-based Pages site to Actions using its default token.

After pushing all source and workflow changes to `main`, check the
**Build and deploy metronome** run under Actions. Both `build` and `deploy` must
succeed before expecting the URLs below to be available. A successful local build
alone does not publish them.
These local changes have not been pushed or deployed.

Production URLs after deployment:

- Standalone: https://dave-drums.github.io/metronome/
- JavaScript module: https://dave-drums.github.io/metronome/embed/metronome.js
- CSS: https://dave-drums.github.io/metronome/embed/metronome.css
- Audio: https://dave-drums.github.io/metronome/sounds/{click,hi-hat,kick,sticks}.mp3
- Public images/icons: https://dave-drums.github.io/metronome/ (original filenames)
- GPL licence: https://dave-drums.github.io/metronome/LICENSE
- Source and attribution: https://github.com/dave-drums/metronome

The module uses the absolute production base URL for audio. Imported assets are
handled by Vite. The CSS URL resolves relative to the module URL, not the host page.
GitHub Pages must serve the JavaScript module with cross-origin access (CORS).
For a local cross-origin preview, intercept/proxy the production asset URLs or
serve a temporary build with its base changed to your local asset server.

## Main website integration (for a later change)

Keep the website's existing shared stylesheet. Add this container and module:

```html
<div id="metronome-app"></div>
<script type="module">
  import { mountMetronome } from "https://dave-drums.github.io/metronome/embed/metronome.js";

  try {
    const metronome = await mountMetronome("#metronome-app");
    // If removing the metronome dynamically, call metronome.unmount() first.
  } catch (error) {
    console.error(error);
    document.getElementById("metronome-app").textContent =
      "The metronome could not load. Please try again.";
  }
</script>
```

**Do not add the metronome CSS to the host page's head.** `mountMetronome()` loads
the exact CSS URL above inside its Shadow DOM and waits for it before rendering.
Its legacy global reset is intentionally isolated there. Mounting also accepts
an HTMLElement and rejects missing containers or duplicate live mounts.
Unmounting stops playback and releases listeners/wake locks; the container can
then be mounted again. This integration is intended for one metronome per page.

## Isolation and appearance

The original layout, controls, themes, subdivisions, sound samples, volume, tempo
limits and attribution are retained. The embedded panel fills the available width
and is at least 640px tall (otherwise 85vh). Its responsive layouts use container
width rather than the entire website viewport. Rem sizes are compiled to their
original 10px-root equivalents so the website's font size cannot resize controls.
Fixed panels are positioned within the metronome; website scrolling stays enabled.
Inter is hosted with the metronome at `fonts/InterVariable.woff2` (its SIL Open
Font License is in `fonts/OFL.txt`). The FontFace API registers a unique family
name, `DaveDrumsMetronomeInter`, so it does not replace any host website fonts.
There is a sans-serif fallback if the font cannot load. The embed requires a
modern browser with Shadow DOM, ES modules and CSS container query support.

Theme changes affect only the embedded frame. The spacebar shortcut is local to
the frame and leaves interactive controls' keyboard handling intact. The embedded
settings use the localStorage key `dave-drums-metronome`, separate from the original
standalone key `vuex`. The embed does not import the PWA entry, generate/register a
service worker, alter host navigation, or modify document styles/theme attributes.
The standalone app keeps its own PWA registration under `/metronome/`.

The original GPL-3.0 LICENSE and Julien Sulpis attribution remain in the source
and UI. Distributions must retain the licence and provide corresponding source;
keep this repository public and distribute the source matching each deployed build.
