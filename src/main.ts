import { createApp } from "vue";
import "./style.css";
import App from "./App.vue";
import router from "./router";
import { restoreSession } from "./lib/store";
restoreSession();
createApp(App).use(router).mount("#app");
