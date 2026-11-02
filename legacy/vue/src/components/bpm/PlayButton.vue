<template>
  <button type="button" @click="togglePlay()">
    <IconStop v-show="isPlaying"></IconStop>
    <IconPlay v-show="!isPlaying"></IconPlay>
  </button>
</template>

<script setup lang="ts">
import IconPlay from "./IconPlay.vue";
import IconStop from "./IconStop.vue";
import usePlayer from "../../composables/usePlayer";
import { inject, onBeforeUnmount, onMounted } from "vue";

const { isPlaying, play, stop } = usePlayer();
const keyboardRoot = inject<HTMLElement | Document>("keyboardRoot", document);

function onKeyPress(e: KeyboardEvent) {
  const nothingInFocus =
    keyboardRoot === document
      ? !document.activeElement || document.activeElement === document.body
      : !(e.target instanceof HTMLElement) ||
        !e.target.closest(
          "button, input, select, textarea, a, [contenteditable]"
        );

  if (e.code === "Space" && nothingInFocus) {
    togglePlay();
  }
}

function togglePlay() {
  isPlaying.value ? stop() : play();
}

onMounted(() => {
  keyboardRoot.addEventListener("keypress", onKeyPress as EventListener);
});

onBeforeUnmount(() => {
  keyboardRoot.removeEventListener("keypress", onKeyPress as EventListener);
  stop();
});
</script>

<style lang="scss" scoped>
button {
  background: var(--grey-50);
  box-shadow: var(--shadow-02-inset);
  width: 50%;
  height: 50%;

  svg {
    width: 48px;
    height: 48px;
    color: inherit;
  }
}
</style>
