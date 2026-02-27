import { getConnectedCalendars, getCalendarConnections, getConnectedCrm } from "@/lib/queries/integrations";
import { IntegrationsClient } from "./_components/integrations-client";

export default async function IntegrationsPage() {
  const [calendarIntegrations, calendarConnections, crmIntegration] =
    await Promise.all([
      getConnectedCalendars(),
      getCalendarConnections(),
      getConnectedCrm(),
    ]);

  return (
    <IntegrationsClient
      calendarIntegrations={calendarIntegrations}
      calendarConnections={calendarConnections}
      crmIntegration={crmIntegration}
    />
  );
}
