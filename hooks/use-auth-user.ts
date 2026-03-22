"use client";

import { useEffect, useState } from "react";

import {
  AUTH_CHANGE_EVENT,
  getStoredUser,
} from "@/services/auth";
import type { TaiKhoan } from "@/types/tai-khoan";

export function useAuthUser() {
  const [user, setUser] = useState<TaiKhoan | null>(null);

  useEffect(() => {
    const syncUser = () => {
      setUser(getStoredUser());
    };

    syncUser();
    window.addEventListener("storage", syncUser);
    window.addEventListener(AUTH_CHANGE_EVENT, syncUser);

    return () => {
      window.removeEventListener("storage", syncUser);
      window.removeEventListener(AUTH_CHANGE_EVENT, syncUser);
    };
  }, []);

  return user;
}
