"use client";

import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
import { maskPhone, normalizePhone } from "@/lib/phone";
import { cn } from "@/lib/utils";

type Mode = "email" | "phone";

function errorKey(status?: number): "tooManyAttempts" | "genericError" {
  return status === 429 ? "tooManyAttempts" : "genericError";
}

export function SignInForm({ next }: { next: string }) {
  const t = useTranslations("auth");
  const [mode, setMode] = useState<Mode>("email");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [codeSentTo, setCodeSentTo] = useState<string | null>(null);

  const done = () => {
    window.location.assign(next);
  };

  async function onEmail(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setPending(true);
    setError(null);
    const { data, error: err } = await authClient.signIn.email({
      email: String(form.get("email")),
      password: String(form.get("password")),
    });
    setPending(false);
    if (err) {
      setError(err.status === 401 ? t("invalidCredentials") : t(errorKey(err.status)));
      return;
    }
    // Accounts with 2FA: the twoFactor client plugin is already navigating to the code screen.
    if (data && "twoFactorRedirect" in data && data.twoFactorRedirect) return;
    done();
  }

  async function onSendCode(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const raw = String(new FormData(e.currentTarget).get("phone"));
    const phone = normalizePhone(raw);
    if (!phone) {
      setError(t("invalidPhone"));
      return;
    }
    setPending(true);
    setError(null);
    const { error: err } = await authClient.phoneNumber.sendOtp({ phoneNumber: phone });
    setPending(false);
    if (err) {
      setError(t(errorKey(err.status)));
      return;
    }
    setCodeSentTo(phone);
  }

  async function onVerify(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!codeSentTo) return;
    const code = String(new FormData(e.currentTarget).get("code")).trim();
    setPending(true);
    setError(null);
    const { error: err } = await authClient.phoneNumber.verify({
      phoneNumber: codeSentTo,
      code,
    });
    setPending(false);
    if (err) {
      setError(err.status === 429 ? t("tooManyAttempts") : t("invalidCode"));
      return;
    }
    done();
  }

  const tab = (value: Mode, label: string) => (
    <button
      type="button"
      role="tab"
      aria-selected={mode === value}
      onClick={() => {
        setMode(value);
        setError(null);
      }}
      className={cn(
        "flex-1 rounded-md px-3 py-2 text-sm font-medium",
        mode === value ? "bg-card shadow-sm" : "text-muted-foreground",
      )}
    >
      {label}
    </button>
  );

  return (
    <div className="mt-8">
      <div role="tablist" className="bg-muted flex gap-1 rounded-lg p-1">
        {tab("email", t("tabEmail"))}
        {tab("phone", t("tabPhone"))}
      </div>

      {error && (
        <Alert variant="destructive" className="mt-6" role="alert">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {mode === "email" && (
        <form onSubmit={onEmail} className="mt-6 grid gap-4" noValidate={false}>
          <div className="grid gap-2">
            <Label htmlFor="email">{t("email")}</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="username"
              required
              dir="ltr"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">{t("password")}</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              dir="ltr"
            />
          </div>
          <Button type="submit" size="lg" disabled={pending}>
            {pending ? t("signingIn") : t("submit")}
          </Button>
        </form>
      )}

      {mode === "phone" && !codeSentTo && (
        <form onSubmit={onSendCode} className="mt-6 grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="phone">{t("phone")}</Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              required
              dir="ltr"
              aria-describedby="phone-hint"
            />
            <p id="phone-hint" className="text-muted-foreground text-sm">
              {t("phoneHint")}
            </p>
          </div>
          <Button type="submit" size="lg" disabled={pending}>
            {t("sendCode")}
          </Button>
        </form>
      )}

      {mode === "phone" && codeSentTo && (
        <form onSubmit={onVerify} className="mt-6 grid gap-4">
          <p className="text-muted-foreground text-sm" aria-live="polite">
            {t("codeSent", { phone: maskPhone(codeSentTo) })}
          </p>
          <div className="grid gap-2">
            <Label htmlFor="code">{t("code")}</Label>
            <Input
              id="code"
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              required
              dir="ltr"
              className="figures text-lg tracking-[0.3em]"
            />
          </div>
          <Button type="submit" size="lg" disabled={pending}>
            {pending ? t("signingIn") : t("verifyCode")}
          </Button>
        </form>
      )}
    </div>
  );
}
