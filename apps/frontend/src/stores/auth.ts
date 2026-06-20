import { defineStore } from "pinia";

import { apiFetch } from "../services/api";

type AuthUser = {
  adminUserId: number;
  adminUsername: string;
};

export const useAuthStore = defineStore("auth", {
  state: () => ({
    status: "idle" as "idle" | "loading" | "authenticated" | "guest",
    user: null as AuthUser | null,
  }),
  actions: {
    async login(username: string, password: string) {
      this.status = "loading";

      const response = await apiFetch<AuthUser>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });

      this.user = response.data;
      this.status = "authenticated";
    },
    async logout() {
      await apiFetch<null>("/auth/logout", {
        method: "POST",
        body: JSON.stringify({}),
      });

      this.user = null;
      this.status = "guest";
    },
    async restoreSession() {
      try {
        this.status = "loading";
        const response = await apiFetch<{ ok: true; adminUserId?: number }>("/protected");
        this.status = "authenticated";
        this.user = this.user ?? {
          adminUserId: response.data.adminUserId ?? 0,
          adminUsername: "admin",
        };
      } catch {
        this.user = null;
        this.status = "guest";
      }
    },
  },
});

