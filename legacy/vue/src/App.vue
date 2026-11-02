<template>
  <ContextProvider context="desktop">
    <Aside position="left" aria-label="Sound settings">
      <h2>Sound</h2>
      <Volume></Volume>
      <Sound context="desktop"></Sound>
      <FirstBeat></FirstBeat>
      <Footer></Footer>
    </Aside>
  </ContextProvider>

  <main>
    <h1>Metronome</h1>
    <section>
      <BeatIndicator></BeatIndicator>
      <Rythm></Rythm>
    </section>
    <section>
      <TempoControls />
      <ProgressTrack :progress="(bpm - min) / (max - min || 1)">
        <Wheel
          :value="bpm"
          :min="min"
          :max="max"
          @change="commit('setBpmValue', $event)"
        />
        <PlayButton class="play-button" />
      </ProgressTrack>
    </section>
  </main>

  <Aside position="right" aria-label="BPM settings">
    <h2>BPM</h2>
    <LargeIncrement></LargeIncrement>
    <BpmRange></BpmRange>
  </Aside>

  <ContextProvider context="mobile">
    <MobileSettings></MobileSettings>
  </ContextProvider>
</template>

<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount } from "vue";
import PlayButton from "./components/bpm/PlayButton.vue";
import TempoControls from "./components/bpm/TempoControls.vue";
import ProgressTrack from "./components/bpm/ProgressTrack.vue";
import Wheel from "./components/bpm/Wheel.vue";
import { useStore } from "vuex";
import BeatIndicator from "./components/beat/BeatIndicator.vue";
import Aside from "./components/Aside.vue";
import Volume from "./components/settings/Volume.vue";
import Sound from "./components/settings/Sound.vue";
import FirstBeat from "./components/settings/FirstBeat.vue";
import LargeIncrement from "./components/settings/LargeIncrement.vue";
import BpmRange from "./components/settings/BpmRange.vue";
import MobileSettings from "./components/settings/MobileSettings.vue";
import Footer from "./components/Footer.vue";
import Rythm from "./components/beat/Rythm.vue";
import ContextProvider from "./components/ContextProvider.vue";

const { state, commit } = useStore();
const bpm = computed(() => state.bpm.value);
const min = computed(() => state.bpm.min);
const max = computed(() => state.bpm.max);

let disposed = false;
let wakeLock: { release(): Promise<void> } | undefined;
async function requestWakeLock() {
  if (disposed || !navigator.wakeLock || document.visibilityState !== "visible")
    return;
  try {
    const lock = await navigator.wakeLock.request("screen");
    if (disposed) await lock?.release();
    else wakeLock = lock;
  } catch {
    /* Unsupported or denied by the browser; playback still works. */
  }
}
onMounted(() => {
  requestWakeLock();
  document.addEventListener("visibilitychange", requestWakeLock);
});
onBeforeUnmount(() => {
  disposed = true;
  document.removeEventListener("visibilitychange", requestWakeLock);
  wakeLock?.release().catch(() => {});
});
</script>

<style lang="scss" scoped>
main {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  margin: auto;
  align-items: center;
  height: 100%;
  max-height: 950px;
  padding: 4vh 0;
}

@include big-desktop-up {
  main {
    transform: scale(1.25);
  }
}

.progress-track {
  margin-top: 10px;

  @include tablet-portrait-up {
    margin-top: 20px;
  }
}

.play-button {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

footer {
  display: none;

  @include laptop-up {
    display: initial;
  }
}
</style>
