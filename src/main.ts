import { createApp } from "vue";
import App from "./App.vue";
import "./styles/main.scss";
import store from "./store";
import { registerSW } from "virtual:pwa-register";

registerSW({ immediate: true });
createApp(App).use(store).mount("#app");
