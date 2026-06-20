import { createPinia } from "pinia";
import PrimeVue from "primevue/config";
import { createApp } from "vue";

import App from "./app/App.vue";
import { router } from "./router";
import "./styles/main.css";

const app = createApp(App);

app.use(createPinia());
app.use(router);
app.use(PrimeVue);

app.mount("#app");

