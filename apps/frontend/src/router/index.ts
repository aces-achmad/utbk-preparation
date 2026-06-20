import { createRouter, createWebHistory } from "vue-router";

import { useAuthStore } from "../stores/auth";

const routes = [
  {
    path: "/login",
    component: () => import("../modules/auth/LoginView.vue"),
    meta: {
      requiresGuest: true,
    },
  },
  {
    path: "/",
    component: () => import("../modules/auth/RequireAuthLayout.vue"),
    meta: {
      requiresAuth: true,
    },
    children: [
      {
        path: "",
        component: () => import("../modules/practice/HomeView.vue"),
      },
    ],
  },
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach(async (to) => {
  const authStore = useAuthStore();

  if (authStore.status === "idle") {
    await authStore.restoreSession();
  }

  if (to.meta.requiresAuth && authStore.status !== "authenticated") {
    return "/login";
  }

  if (to.meta.requiresGuest && authStore.status === "authenticated") {
    return "/";
  }

  return true;
});
