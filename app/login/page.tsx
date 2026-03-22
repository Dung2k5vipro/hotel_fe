"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Eye,
  EyeOff,
  Hotel,
  LoaderCircle,
  LockKeyhole,
  UserCircle2,
} from "lucide-react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ACCOUNT_LOCKED_MESSAGE,
  getAuthCookie,
  getRememberMePreference,
  hasStoredSession,
  login,
  logout,
  resolveLoginErrorMessage,
  setAuthCookie,
  setStoredAuth,
} from "@/services/auth";

export default function LoginPage() {
  const router = useRouter();
  const [tenDangNhap, setTenDangNhap] = useState("");
  const [matKhau, setMatKhau] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  useEffect(() => {
    setRememberMe(getRememberMePreference());

    const cookieToken = getAuthCookie();
    const storedSessionValid = hasStoredSession();

    if (cookieToken && storedSessionValid) {
      router.replace("/dashboard");
      return;
    }

    if (cookieToken || storedSessionValid) {
      logout();
    }

    setIsCheckingSession(false);
  }, [router]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    const normalizedTenDangNhap = tenDangNhap.trim();

    if (!normalizedTenDangNhap) {
      setError("Vui lòng nhập tên đăng nhập.");
      return;
    }

    if (!matKhau) {
      setError("Vui lòng nhập mật khẩu.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const session = await login({
        tenDangNhap: normalizedTenDangNhap,
        matKhau,
      });

      if (session.user.trangThai === false) {
        logout();
        setError(ACCOUNT_LOCKED_MESSAGE);
        return;
      }

      setStoredAuth(session.token, session.user, rememberMe);
      setAuthCookie(session.token, rememberMe);
      router.replace("/dashboard");
      router.refresh();
    } catch (requestError) {
      logout();
      setError(resolveLoginErrorMessage(requestError));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isCheckingSession) {
    return (
      <main className="grid min-h-screen place-items-center bg-[linear-gradient(180deg,#f8fafc_0%,#eef2f7_100%)] px-4">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm text-slate-600 shadow-sm">
          <LoaderCircle className="size-4 animate-spin text-slate-500" />
          Đang kiểm tra phiên đăng nhập...
        </div>
      </main>
    );
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[linear-gradient(180deg,#f8fafc_0%,#eef2f7_100%)] px-4 py-8">
      <section className="w-full max-w-[440px] rounded-[28px] border border-slate-200/90 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] sm:p-8">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-sm">
          <Hotel className="size-6" />
        </div>

        <div className="mt-6 text-center">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Đăng nhập hệ thống</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Vui lòng nhập tên đăng nhập và mật khẩu để tiếp tục.
          </p>
        </div>

        <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label
              className="block text-sm font-medium text-slate-700"
              htmlFor="tenDangNhap"
            >
              Tên đăng nhập
            </label>
            <div className="relative">
              <UserCircle2 className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <Input
                autoComplete="username"
                className="pl-11"
                id="tenDangNhap"
                onChange={(event) => setTenDangNhap(event.target.value)}
                placeholder="Nhập tên đăng nhập"
                value={tenDangNhap}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label
              className="block text-sm font-medium text-slate-700"
              htmlFor="matKhau"
            >
              Mật khẩu
            </label>
            <div className="relative">
              <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <Input
                autoComplete="current-password"
                className="pl-11 pr-12"
                id="matKhau"
                onChange={(event) => setMatKhau(event.target.value)}
                placeholder="Nhập mật khẩu"
                type={showPassword ? "text" : "password"}
                value={matKhau}
              />
              <button
                aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                className="absolute right-3 top-1/2 inline-flex size-9 -translate-y-1/2 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                onClick={() => setShowPassword((current) => !current)}
                type="button"
              >
                {showPassword ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </button>
            </div>
          </div>

          <label className="flex cursor-pointer items-center gap-3 text-sm text-slate-600">
            <input
              checked={rememberMe}
              className="size-4 rounded border-slate-300 text-slate-900 focus:ring-slate-300"
              onChange={(event) => setRememberMe(event.target.checked)}
              type="checkbox"
            />
            Ghi nhớ đăng nhập
          </label>

          {error ? <Alert tone="error">{error}</Alert> : null}

          <Button
            className="h-12 w-full rounded-2xl text-base"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? (
              <span className="inline-flex items-center gap-2">
                <LoaderCircle className="size-4 animate-spin" />
                Đang đăng nhập...
              </span>
            ) : (
              "Đăng nhập"
            )}
          </Button>
        </form>
      </section>
    </main>
  );
}
