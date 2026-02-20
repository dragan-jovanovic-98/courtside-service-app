import { getComplianceData, getComplianceSettings } from "@/lib/queries/settings";
import { ComplianceClient } from "./_components/compliance-client";

export default async function CompliancePage() {
  const data = await getComplianceData();
  const settings = data ? await getComplianceSettings(data.orgId) : null;

  return (
    <ComplianceClient
      dncCount={data?.dncCount ?? 0}
      dncLastUpdated={data?.dncLastUpdated ?? null}
      dncAutoAdded={data?.dncAutoAdded ?? 0}
      settings={settings}
    />
  );
}
