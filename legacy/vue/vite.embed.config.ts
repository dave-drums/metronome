import { defineConfig } from "vite";
import Vue from "@vitejs/plugin-vue";
import { resolve } from "path";

// This build deliberately has no PWA plugin or standalone entry point.
export default defineConfig({
  base: "https://dave-drums.github.io/metronome/",
  plugins: [Vue()],
  resolve: { alias: { "@": resolve(__dirname, "src") } },
  css: {
    preprocessorOptions: {
      scss: { additionalData: '@use "src/styles/abstract" as *;' },
    },
    postcss: {
      plugins: [
        {
          postcssPlugin: "metronome-shadow-layout",
          Rule(rule) {
            rule.selector = rule.selector
              .replace(/:root/g, ".metronome-frame")
              .replace(/\b(html|body)\b/g, ".metronome-frame");
          },
          Declaration(decl) {
            // rem otherwise resolves against the main website's document root.
            decl.value = decl.value.replace(
              /([\d.]+)rem\b/g,
              (_, n) => `${Number(n) * 10}px`
            );
            if (decl.prop === "position" && decl.value === "fixed")
              decl.value = "absolute";
            if (decl.prop === "width" && decl.value === "100vw")
              decl.value = "100%";
            if (decl.prop === "top" && decl.value === "100vh")
              decl.value = "100%";
            if (decl.prop === "height" && decl.value === "94vh")
              decl.value = "94%";
          },
          AtRule(rule) {
            if (
              rule.name === "media" &&
              /^\((min|max)-width:/.test(rule.params)
            )
              rule.name = "container";
          },
        },
      ],
    },
  },
  build: {
    target: "es2020",
    outDir: "dist/embed",
    emptyOutDir: true,
    lib: {
      entry: resolve(__dirname, "src/embed.ts"),
      formats: ["es"],
      fileName: () => "metronome.js",
    },
    rollupOptions: {
      output: {
        banner:
          "/*! Metronome: original design and code by Julien Sulpis. GPL-3.0. Source: https://github.com/dave-drums/metronome; licence: ../LICENSE */",
        assetFileNames: (asset) =>
          asset.name?.endsWith(".css")
            ? "metronome.css"
            : "assets/[name]-[hash][extname]",
      },
    },
  },
});
