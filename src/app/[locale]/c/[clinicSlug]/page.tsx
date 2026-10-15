import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { formatMoney } from "@/lib/format";
import { getTenantDb } from "@/server/db/tenant";
import { getClinicBySlug } from "@/server/tenancy/staff";

export async function generateMetadata({ params }: { params: Promise<{ clinicSlug: string }> }) {
  const { clinicSlug } = await params;
  const clinic = await getClinicBySlug(clinicSlug);
  return { title: clinic?.name };
}

/** Public clinic page. Phase 3 turns this into the full booking entry point. */
export default async function ClinicPage({
  params,
}: {
  params: Promise<{ locale: string; clinicSlug: string }>;
}) {
  const { locale, clinicSlug } = await params;
  setRequestLocale(locale);
  const clinic = await getClinicBySlug(clinicSlug);
  if (!clinic || clinic.status !== "ACTIVE") notFound();

  const db = getTenantDb(clinic.id);
  const [branches, providers] = await Promise.all([
    db.branch.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    db.provider.findMany({
      where: { status: "ACTIVE" },
      orderBy: { displayName: "asc" },
      select: {
        id: true,
        displayName: true,
        displayNameUr: true,
        title: true,
        defaultFee: true,
        languages: true,
        specialties: { select: { name: true, nameUr: true } },
      },
    }),
  ]);
  const t = await getTranslations("clinic");
  const ur = locale === "ur";

  return (
    <div className="brand-scope" style={{ ["--brand" as string]: clinic.brandColor }}>
      <SiteHeader />
      <main id="main" className="mx-auto max-w-5xl px-4 py-10">
        <h1 className="text-4xl font-bold">{ur && clinic.nameUr ? clinic.nameUr : clinic.name}</h1>
        <p className="text-muted-foreground mt-3">{t("bookingSoon")}</p>

        <section className="mt-10">
          <h2 className="text-xl font-bold">{t("branches")}</h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {branches.map((b) => (
              <li key={b.id} className="bg-card rounded-lg border p-4">
                <p className="font-medium">{ur && b.nameUr ? b.nameUr : b.name}</p>
                {b.address && <p className="text-muted-foreground mt-1 text-sm">{b.address}</p>}
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-10">
          <h2 className="text-xl font-bold">{t("doctors")}</h2>
          <ul className="bg-card mt-4 divide-y rounded-lg border">
            {providers.map((p) => (
              <li
                key={p.id}
                className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-3"
              >
                <div>
                  <p className="font-medium">
                    {ur && p.displayNameUr ? p.displayNameUr : p.displayName}
                  </p>
                  <p className="text-muted-foreground text-sm">
                    {p.specialties.map((s) => (ur && s.nameUr ? s.nameUr : s.name)).join(", ")}
                  </p>
                </div>
                <p className="figures text-sm">
                  {t("fee", { amount: formatMoney(p.defaultFee, clinic.currency, locale) })}
                </p>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}
