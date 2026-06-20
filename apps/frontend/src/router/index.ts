import { createRouter, createWebHistory } from "vue-router";

const routes = [
  {
    path: "/",
    component: () => import("../app/App.vue"),
  },
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
});

