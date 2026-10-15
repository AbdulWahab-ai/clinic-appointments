"use client";

import { CalendarDays, ClipboardList, Settings, Sun, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

const ITEMS = [
  { key: "today", path: "", icon: Sun },
  { key: "calendar", path: "/calendar", icon: CalendarDays },
  { key: "queue", path: "/queue", icon: ClipboardList },
  { key: "patients", path: "/patients", icon: Users },
  { key: "settings", path: "/settings", icon: Settings },
] as const;

export function StaffNav({ clinicSlug }: { clinicSlug: string }) {
  const t = useTranslations("staff.nav");
  const pathname = usePathname();
  const base = `/app/${clinicSlug}`;

  return (
    <nav aria-label="Staff" className="flex gap-1 overflow-x-auto px-2 pb-2 md:flex-col md:pb-0">
      {ITEMS.map(({ key, path, icon: Icon }) => {
        const href = `${base}${path}`;
        const active = path === "" ? pathname === base : pathname.startsWith(href);
        return (
          <Link
            key={key}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex shrink-0 items-center gap-3 rounded-md px-3 py-2 text-sm",
              active
                ? "bg-primary text-primary-foreground font-medium"
                : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            <Icon aria-hidden className="size-4" />
            {t(key)}
          </Link>
        );
      })}
    </nav>
  );
}
