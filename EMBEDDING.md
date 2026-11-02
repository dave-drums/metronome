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

The main site's typography, buttons and navigation are isolated from the metronome.
The card preserves its original Inter typography and responsive rules. Standalone
hero typography retains Oswald; the embedded panel excludes Vault's surrounding
navigation, account UI and hero header. Dialogs retain viewport overlays.

FontFace registers uniquely named self-hosted font families so existing host fonts
are not replaced. Embedded shortcuts work only inside the focused metronome; input
editing retains its own keys. Unmounting stops audio and releases timers/listeners.

The embed registers no service worker, does not touch browser preferences, and
does not provide offline caching for the host website. Offline support is provided
by the independently installed standalone PWA only, under `/metronome/` on GitHub Pages.

The integration shown here is documentation only: the main Dave Drums repository
has not been edited. See [README.md](README.md) for gated deployment instructions.
