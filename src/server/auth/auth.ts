import "server-only";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { phoneNumber, twoFactor } from "better-auth/plugins";
import { env } from "@/env";
import { normalizePhone } from "@/lib/phone";
import { systemDb } from "@/server/db/client";
import { emailProvider, smsProvider } from "@/server/providers/registry";

const e = env();

/** Placeholder email for accounts created by phone OTP; never receives mail. */
export const PHONE_ONLY_EMAIL_DOMAIN = "phone.clinic.invalid";

export const auth = betterAuth({
  appName: "Clinic Appointments",
  baseURL: e.APP_URL,
  secret: e.BETTER_AUTH_SECRET,
  database: prismaAdapter(systemDb, { provider: "postgresql" }),

  emailAndPassword: {
    enabled: true,
    minPasswordLength: 10,
    maxPasswordLength: 128,
    async sendResetPassword({ user, url }) {
      await emailProvider().send({
        to: user.email,
        subject: "Reset your password",
        text: `Use this link to reset your password. It expires in 1 hour.\n\n${url}\n\nIf you didn't ask for this, ignore this email.`,
        meta: { event: "password_reset" },
      });
    },
  },

  emailVerification: {
    sendOnSignUp: true,
    async sendVerificationEmail({ user, url }) {
      if (user.email.endsWith(`@${PHONE_ONLY_EMAIL_DOMAIN}`)) return;
      await emailProvider().send({
        to: user.email,
        subject: "Verify your email",
        text: `Confirm your email address:\n\n${url}`,
        meta: { event: "email_verification" },
      });
    },
  },

  socialProviders:
    e.GOOGLE_CLIENT_ID && e.GOOGLE_CLIENT_SECRET
      ? { google: { clientId: e.GOOGLE_CLIENT_ID, clientSecret: e.GOOGLE_CLIENT_SECRET } }
      : {},

  session: {
    // Patients stay signed in for a week; staff are additionally cut off after
    // STAFF_IDLE_TIMEOUT_MINUTES of inactivity (see src/server/auth/idle.ts).
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },

  user: {
    additionalFields: {
      isSuperAdmin: { type: "boolean", defaultValue: false, input: false },
      locale: { type: "string", defaultValue: "en", input: true },
    },
  },

  rateLimit: {
    enabled: e.AUTH_RATE_LIMIT === "on",
    window: 60,
    max: 100,
    customRules: {
      "/sign-in/email": { window: 60, max: 10 },
      "/phone-number/send-otp": { window: 60, max: 3 },
      "/phone-number/verify": { window: 60, max: 10 },
      "/two-factor/verify-totp": { window: 60, max: 10 },
    },
  },

  advanced: {
    cookiePrefix: "clinic",
    useSecureCookies: e.NODE_ENV === "production",
  },

  plugins: [
    phoneNumber({
      otpLength: 6,
      expiresIn: 300,
      allowedAttempts: 5,
      phoneNumberValidator: (value) => normalizePhone(value) === value,
      async sendOTP({ phoneNumber: to, code }) {
        await smsProvider().send({
          to,
          body: `Your verification code is ${code}. It expires in 5 minutes. Don't share it with anyone.`,
          meta: { event: "otp" },
        });
      },
      signUpOnVerification: {
        getTempEmail: (phone) => `${phone.replace(/\D/g, "")}@${PHONE_ONLY_EMAIL_DOMAIN}`,
        getTempName: (phone) => phone,
      },
    }),
    twoFactor({ issuer: "Clinic Appointments" }),
    // Must be last: lets server actions set auth cookies.
    nextCookies(),
  ],
});

export type Auth = typeof auth;
export type AuthSession = typeof auth.$Infer.Session;
