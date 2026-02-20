import { getBillingData } from "@/lib/queries/settings";
import { BillingClient } from "./_components/billing-client";

export default async function BillingPage() {
  const data = await getBillingData();
  return (
    <BillingClient
      subscription={data?.subscription ?? null}
      invoices={data?.invoices ?? []}
      phoneNumbers={data?.phoneNumbers ?? []}
      usage={data?.usage ?? { callMinutes: 0, phoneNumberCount: 0 }}
    />
  );
}
