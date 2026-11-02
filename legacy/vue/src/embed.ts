// SPDX-License-Identifier: GPL-3.0-only
// Original metronome design and code: Julien Sulpis.
import { createApp } from "vue";
import App from "./App.vue";
import { createMetronomeStore } from "./store";
import "./styles/main.scss";
import "./styles/embed.scss";

const mounted = new WeakSet<HTMLElement>();
const ownedShadows = new WeakMap<HTMLElement, ShadowRoot>();
// Keep the module URL separate: Vite 2 rewrites literal new URL(..., import.meta.url)
// expressions as imported assets, but this CSS file is emitted only during build.
const moduleUrl = import.meta.url;
let fontReady: Promise<unknown> | undefined;

function loadFont() {
  if (typeof FontFace === "undefined") return Promise.resolve();
  if (!fontReady) {
    const font = new FontFace(
      "DaveDrumsMetronomeInter",
      `url(${import.meta.env.BASE_URL}fonts/InterVariable.woff2)`,
      { weight: "100 900" }
    );
    fontReady = font
      .load()
      .then((loaded) => document.fonts.add(loaded))
      .catch(() => {
        fontReady = undefined; // Use sans-serif if unavailable; retry on the next mount.
      });
  }
  return fontReady;
}

/** Load isolated styles before rendering. Call unmount() before removing the host. */
export async function mountMetronome(
  target: string | HTMLElement = "#metronome-app"
) {
  const host =
    typeof target === "string"
      ? document.querySelector<HTMLElement>(target)
      : target;
  if (!host) throw new Error("Metronome container not found");
  if (mounted.has(host) || (host.shadowRoot && !ownedShadows.has(host)))
    throw new Error("Metronome container already mounted");
  mounted.add(host);
  const shadow = ownedShadows.get(host) || host.attachShadow({ mode: "open" });
  ownedShadows.set(host, shadow);
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = new URL("./metronome.css", moduleUrl).href;
  const frame = document.createElement("div");
  frame.className = "metronome-frame";
  frame.tabIndex = -1;
  const root = document.createElement("div");
  root.id = "app";
  frame.append(root);
  const ready = new Promise<void>((resolve, reject) => {
    link.onload = () => resolve();
    link.onerror = () =>
      reject(new Error(`Unable to load metronome CSS: ${link.href}`));
  });
  shadow.append(link, frame);
  try {
    await Promise.all([ready, loadFont()]);
  } catch (error) {
    shadow.replaceChildren();
    mounted.delete(host);
    throw error;
  }
  const app = createApp(App);
  app.provide("themeRoot", frame);
  app.provide("keyboardRoot", frame);
  app.use(createMetronomeStore("dave-drums-metronome")).mount(root);
  return {
    unmount() {
      app.unmount();
      shadow.replaceChildren();
      mounted.delete(host);
    },
  };
}
