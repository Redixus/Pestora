import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminActionForm } from "@/components/admin/AdminActionForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { refundPurchase } from "@/lib/admin/actions";
import { getAdminContext, getAdminLead } from "@/lib/admin/data";
import { localizeStatus } from "@/lib/admin/presentation";
import { formatAbsoluteDate } from "@/lib/i18n/formatDate";
import { t } from "@/lib/i18n/locale";
import { formatMoney } from "@/lib/money/formatMoney";
import { formatPhotoCount } from "@/lib/portal/extraData";

export default async function AdminLeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase, locale } = await getAdminContext();
  const data = await getAdminLead(supabase, id);
  if (!data) notFound();

  const serviceName = data.service
    ? locale === "fr-BE"
      ? data.service.name_fr
      : data.service.name_nl
    : t(locale, "common.noValue");

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link className="text-sm text-muted-foreground" href="/admin/leads">
        ← {t(locale, "common.back")}
      </Link>
      <div>
        <p className="text-sm text-muted-foreground">{data.brand?.name}</p>
        <h1 className="text-2xl font-semibold">{t(locale, "admin.leadDetail")}</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{serviceName}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
          <p>
            {t(locale, "common.postalCode")}: {data.lead.postal_code}
          </p>
          <p>
            {t(locale, "common.city")}: {data.lead.city}
          </p>
          <p>
            {t(locale, "common.status")}: {localizeStatus(data.lead.status, locale)}
          </p>
          <p>
            {t(locale, "leads.price")}: {formatMoney(data.lead.price_cents, locale)}
          </p>
          <p>
            {t(locale, "admin.photoCount")}: {formatPhotoCount(data.lead.photo_count, locale)}
          </p>
          <p>
            {t(locale, "admin.createdAt")}: {formatAbsoluteDate(data.lead.created_at, locale)}
          </p>
          <p>
            {t(locale, "admin.source")}: {data.lead.source ?? t(locale, "common.noValue")}
          </p>
          <p className="sm:col-span-2">
            {t(locale, "leads.description")}: {data.lead.description ?? t(locale, "common.noValue")}
          </p>
          <div className="sm:col-span-2">
            <p>{t(locale, "admin.extraData")}</p>
            <pre className="mt-1 overflow-x-auto rounded-lg bg-muted p-3 text-xs">
              {JSON.stringify(data.lead.extra_data, null, 2)}
            </pre>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{t(locale, "admin.contact")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm">
          <p>{data.contact?.name}</p>
          <p>{data.contact?.phone}</p>
          <p>{data.contact?.email ?? t(locale, "common.noValue")}</p>
          <p>{data.contact?.full_address ?? t(locale, "common.noValue")}</p>
          <p>
            {t(locale, "admin.consentAt")}:{" "}
            {data.contact
              ? formatAbsoluteDate(data.contact.consent_at, locale)
              : t(locale, "common.noValue")}
          </p>
          <p>
            {t(locale, "admin.privacyVersion")}:{" "}
            {data.contact?.privacy_version ?? t(locale, "common.noValue")}
          </p>
        </CardContent>
      </Card>
      {data.purchase ? (
        <Card>
          <CardHeader>
            <CardTitle>{t(locale, "admin.purchases")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              {data.buyer ? (
                <>
                  <span>{t(locale, "admin.buyer")}: </span>
                  <Link className="underline" href={`/admin/partners/${data.buyer.id}`}>
                    {data.buyer.company_name}
                  </Link>
                </>
              ) : (
                t(locale, "common.noValue")
              )}{" "}
              · {formatMoney(data.purchase.price_paid_cents, locale)}
            </p>
            {data.purchase.refunded_at ? (
              <p className="text-sm text-muted-foreground">
                {t(locale, "admin.refundedNotice")}
              </p>
            ) : (
              <AdminActionForm
                action={refundPurchase}
                submitLabel={t(locale, "admin.refund")}
                pendingLabel={t(locale, "common.loading")}
              >
                <input type="hidden" name="purchaseId" value={data.purchase.id} />
                <input type="hidden" name="leadId" value={id} />
                <label className="grid gap-1 text-sm">
                  <span>{t(locale, "admin.reason")}</span>
                  <textarea className="min-h-20 rounded-lg border p-2" name="reason" required />
                </label>
              </AdminActionForm>
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
