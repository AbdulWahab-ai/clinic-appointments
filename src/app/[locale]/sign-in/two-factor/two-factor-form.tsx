"use client";

import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";

export function TwoFactorForm({ next }: { next: string }) {
  const t = useTranslations("auth");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const code = String(new FormData(e.currentTarget).get("code")).trim();
    setPending(true);
    setError(null);
    const { error: err } = await authClient.twoFactor.verifyTotp({ code });
    setPending(false);
    if (err) {
      setError(err.status === 429 ? t("tooManyAttempts") : t("invalidCode"));
      return;
    }
    window.location.assign(next);
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 grid gap-4">
      {error && (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
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
        {t("twoFactorSubmit")}
      </Button>
    </form>
  );
}
