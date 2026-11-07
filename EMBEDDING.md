# Direct HTML embedding

After the migration is released, use:

```html
<div id="metronome-app"></div>
<script type="module">
  import { mountMetronome } from "https://dave-drums.github.io/metronome/embed/metronome.js";
  const metronome = await mountMetronome("#metronome-app");
  // Call metronome.unmount() before removing the container dynamically.
</script>
```

The interface also accepts an HTMLElement. Missing containers, duplicate live
mounts and stylesheet load failures reject the returned promise. An unmounted
container can be reused; each mount starts with Vault's original default settings.

The module loads `https://dave-drums.github.io/metronome/embed/metronome.css`
inside an open Shadow DOM. **Do not load that stylesheet into the host document.**
React is bundled; no global React object, Babel script, eval, account SDK or iframe
is needed. All three original MP3s, fonts and other assets load independently from
`https://dave-drums.github.io/metronome/`, never from the main website or Vault.

The application is styled inside Shadow DOM so its selectors cannot affect the
host page. Its design matches Dave Drums: Inter for headings and tempo, DM Sans
for controls, layered graphite panels, recessed fields and shaded cyan actions. Standalone
and embedded versions use the same interface; the embed excludes the hero.

FontFace loads the same self-hosted variable Inter and DM Sans WOFF2 files used by
the website. The generated `src/dave-drums-theme.css` contains the website's
canonical tokens and tool components. Synchronize from the sibling main checkout
with `python scripts/sync-tool-theme.py`; `--check` detects changed styles or fonts.
Embedded shortcuts work only inside the focused metronome; input
editing retains its own keys. Unmounting stops audio and releases timers/listeners.

The embed registers no service worker, does not touch browser preferences, and
does not provide offline caching for the host website. Offline support is provided
by the independently installed standalone PWA only, under `/metronome/` on GitHub Pages.

Publish the updated main, Metronome and Groove Lab checkouts together to expose
the cohesive interface on the website. See [README.md](README.md) for deployment.
