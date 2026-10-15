import { notFound } from "next/navigation";

import { devOutboxEnabled, listDevOutbox } from "@/server/dev/outbox";

export const dynamic = "force-dynamic";

/** Development only: messages "sent" by mock providers (OTP codes, reminders…). */
export default async function DevOutboxPage() {
  if (!devOutboxEnabled()) notFound();
  const messages = await listDevOutbox(100);

  return (
    <main id="main" className="mx-auto max-w-3xl px-4 py-10" dir="ltr" lang="en">
      <h1 className="text-2xl font-bold">Dev outbox</h1>
      <p className="text-muted-foreground mt-1 text-sm">
        Messages from mock providers. Real emails go to Mailpit at http://localhost:8025.
      </p>
      {messages.length === 0 ? (
        <p className="mt-6">Nothing sent yet. Request a phone sign-in code to see one here.</p>
      ) : (
        <ul className="mt-6 grid gap-3">
          {messages.map((m) => (
            <li key={m.id} className="bg-card rounded-lg border p-4">
              <p className="text-muted-foreground figures text-xs">
                {m.channel} to {m.to} at {m.createdAt.toISOString()}
              </p>
              {m.subject && <p className="mt-1 font-medium">{m.subject}</p>}
              <p className="mt-1 whitespace-pre-wrap">{m.body}</p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
