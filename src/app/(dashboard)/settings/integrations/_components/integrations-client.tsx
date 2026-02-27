"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import {
  Calendar,
  Link2,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionLabel } from "@/components/ui/section-label";
import { SettingsToggle } from "@/components/ui/settings-toggle";
import { ColoredBadge } from "@/components/ui/colored-badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  getGoogleOAuthUrl,
  getOutlookOAuthUrl,
  getHubSpotOAuthUrl,
} from "@/lib/integrations/oauth";
import {
  disconnectCalendar,
  disconnectCrm,
  updateCrmSyncToggles,
} from "@/lib/actions/integrations";
import type { Integration, CalendarConnection } from "@/types";

// ── Types ──────────────────────────────────────────────────────────

interface CalendarConnectionWithIntegration extends CalendarConnection {
  integrations: {
    id: string;
    service_name: string;
    account_email: string | null;
    status: string;
  } | null;
}

interface IntegrationsClientProps {
  calendarIntegrations: Integration[];
  calendarConnections: CalendarConnectionWithIntegration[];
  crmIntegration: Integration | null;
}

// ── Provider helpers ──────────────────────────────────────────────

function providerLabel(serviceName: string): string {
  switch (serviceName) {
    case "google_calendar":
      return "Google Calendar";
    case "outlook_calendar":
      return "Outlook Calendar";
    case "hubspot":
      return "HubSpot";
    default:
      return serviceName;
  }
}

function providerIcon(serviceName: string): string {
  switch (serviceName) {
    case "google_calendar":
      return "G";
    case "outlook_calendar":
      return "O";
    case "hubspot":
      return "H";
    default:
      return "?";
  }
}

// ── Main component ────────────────────────────────────────────────

export function IntegrationsClient({
  calendarIntegrations,
  calendarConnections,
  crmIntegration,
}: IntegrationsClientProps) {
  const searchParams = useSearchParams();
  const [toast, setToast] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [disconnectTarget, setDisconnectTarget] = useState<{
    type: "calendar" | "crm";
    id: string;
    name: string;
    blockingCampaigns?: string;
  } | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);

  // CRM sync toggle state
  const crmConfig = (crmIntegration?.config ?? {}) as Record<string, unknown>;
  const [syncToggles, setSyncToggles] = useState({
    sync_calls: crmConfig.sync_calls !== false,
    sync_sms_sent: crmConfig.sync_sms_sent !== false,
    sync_sms_received: crmConfig.sync_sms_received !== false,
    sync_emails: crmConfig.sync_emails !== false,
    sync_appointments: crmConfig.sync_appointments !== false,
  });

  // Read success/error from URL params (OAuth callback redirects)
  useEffect(() => {
    const success = searchParams.get("success");
    const error = searchParams.get("error");
    if (success) {
      setToast({ type: "success", message: success });
    } else if (error) {
      setToast({ type: "error", message: error });
    }
  }, [searchParams]);

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(timer);
  }, [toast]);

  // Group calendar connections by integration
  const calendarsByIntegration = calendarIntegrations.map((integration) => ({
    integration,
    calendars: calendarConnections.filter(
      (cc) => cc.integration_id === integration.id
    ),
  }));

  // ── Handlers ──

  function handleConnectGoogle() {
    try {
      const url = getGoogleOAuthUrl();
      window.location.href = url;
    } catch {
      setToast({ type: "error", message: "Google OAuth is not configured" });
    }
  }

  function handleConnectOutlook() {
    try {
      const url = getOutlookOAuthUrl();
      window.location.href = url;
    } catch {
      setToast({ type: "error", message: "Outlook OAuth is not configured" });
    }
  }

  function handleConnectHubSpot() {
    try {
      const url = getHubSpotOAuthUrl();
      window.location.href = url;
    } catch {
      setToast({ type: "error", message: "HubSpot OAuth is not configured" });
    }
  }

  async function handleDisconnect() {
    if (!disconnectTarget) return;
    setDisconnecting(true);

    try {
      if (disconnectTarget.type === "calendar") {
        const result = await disconnectCalendar(disconnectTarget.id);
        if (result.error) {
          // Check if it's a blocking campaigns error
          if (result.error.includes("active campaigns")) {
            setDisconnectTarget({
              ...disconnectTarget,
              blockingCampaigns: result.error,
            });
            setDisconnecting(false);
            return;
          }
          setToast({ type: "error", message: result.error });
        } else {
          setToast({
            type: "success",
            message: `${disconnectTarget.name} disconnected`,
          });
        }
      } else {
        const result = await disconnectCrm(disconnectTarget.id);
        if (result.error) {
          setToast({ type: "error", message: result.error });
        } else {
          setToast({ type: "success", message: "HubSpot disconnected" });
        }
      }
    } catch {
      setToast({ type: "error", message: "Failed to disconnect" });
    }

    setDisconnecting(false);
    setDisconnectTarget(null);
  }

  async function handleToggleChange(
    key: keyof typeof syncToggles,
    value: boolean
  ) {
    if (!crmIntegration) return;

    setSyncToggles((prev) => ({ ...prev, [key]: value }));

    const result = await updateCrmSyncToggles(crmIntegration.id, {
      [key]: value,
    });

    if (result.error) {
      // Revert on error
      setSyncToggles((prev) => ({ ...prev, [key]: !value }));
      setToast({ type: "error", message: result.error });
    }
  }

  return (
    <div className="max-w-[580px]">
      {/* Toast notification */}
      {toast && (
        <div
          className={`mb-4 flex items-center gap-2 rounded-lg border px-4 py-3 text-sm ${
            toast.type === "success"
              ? "border-emerald-dark/30 bg-emerald-bg text-emerald-light"
              : "border-red-500/30 bg-red-bg text-red-light"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          ) : (
            <AlertTriangle className="h-4 w-4 shrink-0" />
          )}
          {toast.message}
        </div>
      )}

      <Tabs defaultValue="calendar">
        <TabsList variant="line" className="mb-6">
          <TabsTrigger value="calendar" className="gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            Calendar
          </TabsTrigger>
          <TabsTrigger value="crm" className="gap-1.5">
            <Link2 className="h-3.5 w-3.5" />
            CRM
          </TabsTrigger>
        </TabsList>

        {/* ── Calendar Tab ── */}
        <TabsContent value="calendar">
          <CalendarTab
            integrations={calendarsByIntegration}
            onConnectGoogle={handleConnectGoogle}
            onConnectOutlook={handleConnectOutlook}
            onDisconnect={(id, name) =>
              setDisconnectTarget({ type: "calendar", id, name })
            }
          />
        </TabsContent>

        {/* ── CRM Tab ── */}
        <TabsContent value="crm">
          <CrmTab
            integration={crmIntegration}
            syncToggles={syncToggles}
            onConnectHubSpot={handleConnectHubSpot}
            onToggleChange={handleToggleChange}
            onDisconnect={(id) =>
              setDisconnectTarget({ type: "crm", id, name: "HubSpot" })
            }
          />
        </TabsContent>
      </Tabs>

      {/* ── Disconnect Confirmation Dialog ── */}
      <Dialog
        open={!!disconnectTarget}
        onOpenChange={(open) => !open && setDisconnectTarget(null)}
      >
        <DialogContent className="border-border-default bg-[#141820]">
          <DialogHeader>
            <DialogTitle className="text-text-primary">
              Disconnect {disconnectTarget?.name}?
            </DialogTitle>
            <DialogDescription className="text-text-muted">
              {disconnectTarget?.blockingCampaigns ? (
                <span className="text-amber-light">
                  {disconnectTarget.blockingCampaigns}
                </span>
              ) : disconnectTarget?.type === "calendar" ? (
                <>
                  This will remove the calendar connection and all associated
                  calendars. Campaigns using these calendars will switch to
                  Courtside Calendar mode.
                </>
              ) : (
                <>
                  Disconnecting HubSpot will stop activity sync for all
                  CRM-linked contacts. CRM record IDs will be cleared from all
                  contacts. This cannot be undone.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setDisconnectTarget(null)}
              className="border border-border-default text-text-muted"
            >
              Cancel
            </Button>
            {!disconnectTarget?.blockingCampaigns && (
              <Button
                variant="destructive"
                onClick={handleDisconnect}
                disabled={disconnecting}
                className="bg-red-600 hover:bg-red-700"
              >
                {disconnecting ? "Disconnecting..." : "Disconnect"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Calendar Tab ──────────────────────────────────────────────────

function CalendarTab({
  integrations,
  onConnectGoogle,
  onConnectOutlook,
  onDisconnect,
}: {
  integrations: Array<{
    integration: Integration;
    calendars: CalendarConnectionWithIntegration[];
  }>;
  onConnectGoogle: () => void;
  onConnectOutlook: () => void;
  onDisconnect: (id: string, name: string) => void;
}) {
  const hasGoogle = integrations.some(
    (i) => i.integration.service_name === "google_calendar"
  );
  const hasOutlook = integrations.some(
    (i) => i.integration.service_name === "outlook_calendar"
  );

  return (
    <div className="space-y-6">
      {/* Connect buttons */}
      <div>
        <SectionLabel>Connect Calendar</SectionLabel>
        <div className="flex gap-2">
          <Button
            onClick={onConnectGoogle}
            variant="ghost"
            className="border border-border-default bg-[rgba(255,255,255,0.03)] text-sm text-text-muted hover:bg-[rgba(255,255,255,0.06)]"
          >
            <span className="mr-1.5 flex h-5 w-5 items-center justify-center rounded bg-[rgba(255,255,255,0.08)] text-[11px] font-bold text-text-primary">
              G
            </span>
            {hasGoogle ? "Add Another Google Account" : "Connect Google Calendar"}
          </Button>
          <Button
            onClick={onConnectOutlook}
            variant="ghost"
            className="border border-border-default bg-[rgba(255,255,255,0.03)] text-sm text-text-muted hover:bg-[rgba(255,255,255,0.06)]"
          >
            <span className="mr-1.5 flex h-5 w-5 items-center justify-center rounded bg-[rgba(255,255,255,0.08)] text-[11px] font-bold text-blue-light">
              O
            </span>
            {hasOutlook
              ? "Add Another Outlook Account"
              : "Connect Outlook Calendar"}
          </Button>
        </div>
      </div>

      {/* Connected accounts */}
      {integrations.length > 0 ? (
        <div>
          <SectionLabel>Connected Accounts</SectionLabel>
          <div className="space-y-3">
            {integrations.map(({ integration, calendars }) => (
              <div
                key={integration.id}
                className="rounded-xl border border-border-default bg-surface-card"
              >
                {/* Account header */}
                <div className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[rgba(255,255,255,0.06)] text-sm font-bold text-text-primary">
                      {providerIcon(integration.service_name)}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-text-primary">
                          {providerLabel(integration.service_name)}
                        </span>
                        <ColoredBadge color="emerald">Connected</ColoredBadge>
                      </div>
                      {integration.account_email && (
                        <div className="text-xs text-text-dim">
                          {integration.account_email}
                        </div>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      onDisconnect(
                        integration.id,
                        providerLabel(integration.service_name)
                      )
                    }
                    className="text-xs text-red-light/70 hover:text-red-light hover:bg-red-bg/30"
                  >
                    Disconnect
                  </Button>
                </div>

                {/* Calendar list */}
                {calendars.length > 0 && (
                  <div className="border-t border-border-default px-4 py-3">
                    <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.15em] text-text-dim">
                      Calendars
                    </div>
                    <div className="space-y-1.5">
                      {calendars.map((cal) => (
                        <div
                          key={cal.id}
                          className="flex items-center justify-between rounded-lg px-2 py-1.5"
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className="h-2.5 w-2.5 rounded-full"
                              style={{
                                backgroundColor: cal.color ?? "#34d399",
                              }}
                            />
                            <span className="text-[13px] text-text-primary">
                              {cal.calendar_name}
                            </span>
                          </div>
                          {cal.is_enabled_for_display && (
                            <span className="text-[10px] text-text-dim">
                              Displayed
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border-default bg-surface-card p-8 text-center">
          <Calendar className="mx-auto mb-3 h-8 w-8 text-text-dim" />
          <div className="text-sm text-text-muted">
            No calendar accounts connected
          </div>
          <div className="mt-1 text-xs text-text-dim">
            Connect a Google or Outlook account to sync appointments and check
            availability
          </div>
        </div>
      )}

      {/* Info note */}
      <div className="text-xs text-text-dim">
        Calendar display settings (which calendars show on the Calendar page) can
        be managed from the Calendar page sidebar.
      </div>
    </div>
  );
}

// ── CRM Tab ──────────────────────────────────────────────────────

function CrmTab({
  integration,
  syncToggles,
  onConnectHubSpot,
  onToggleChange,
  onDisconnect,
}: {
  integration: Integration | null;
  syncToggles: {
    sync_calls: boolean;
    sync_sms_sent: boolean;
    sync_sms_received: boolean;
    sync_emails: boolean;
    sync_appointments: boolean;
  };
  onConnectHubSpot: () => void;
  onToggleChange: (key: keyof typeof syncToggles, value: boolean) => void;
  onDisconnect: (id: string) => void;
}) {
  const config = (integration?.config ?? {}) as Record<string, unknown>;

  if (!integration) {
    return (
      <div className="space-y-6">
        <SectionLabel>Connect CRM</SectionLabel>

        {/* HubSpot */}
        <div className="flex items-center justify-between rounded-xl border border-border-default bg-surface-card p-4">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#ff7a59]/10 text-sm font-bold text-[#ff7a59]">
              H
            </span>
            <div>
              <div className="text-sm font-medium text-text-primary">
                HubSpot
              </div>
              <div className="text-xs text-text-dim">
                Import contacts, push call outcomes and activities
              </div>
            </div>
          </div>
          <Button
            onClick={onConnectHubSpot}
            variant="ghost"
            className="border border-border-default bg-[rgba(255,255,255,0.03)] text-xs text-text-muted hover:bg-[rgba(255,255,255,0.06)]"
          >
            Connect
          </Button>
        </div>

        {/* Salesforce — Coming Soon */}
        <div className="flex items-center justify-between rounded-xl border border-border-default bg-surface-card p-4 opacity-55">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#00a1e0]/10 text-sm font-bold text-[#00a1e0]">
              S
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-text-primary">
                  Salesforce
                </span>
                <span className="rounded bg-amber-bg px-1.5 py-0.5 text-[9px] font-bold tracking-[0.05em] text-amber-light">
                  COMING SOON
                </span>
              </div>
              <div className="text-xs text-text-dim">
                Bi-directional contact sync, log activities
              </div>
            </div>
          </div>
        </div>

        {/* GoHighLevel — Coming Soon */}
        <div className="flex items-center justify-between rounded-xl border border-border-default bg-surface-card p-4 opacity-55">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#4caf50]/10 text-sm font-bold text-[#4caf50]">
              G
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-text-primary">
                  GoHighLevel
                </span>
                <span className="rounded bg-amber-bg px-1.5 py-0.5 text-[9px] font-bold tracking-[0.05em] text-amber-light">
                  COMING SOON
                </span>
              </div>
              <div className="text-xs text-text-dim">
                Sync leads, triggers, and appointments
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // CRM is connected
  return (
    <div className="space-y-6">
      {/* Connected CRM card */}
      <div>
        <SectionLabel>Connected CRM</SectionLabel>
        <div className="rounded-xl border border-border-default bg-surface-card p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#ff7a59]/10 text-sm font-bold text-[#ff7a59]">
                H
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-text-primary">
                    HubSpot
                  </span>
                  <ColoredBadge
                    color={
                      integration.status === "connected"
                        ? "emerald"
                        : integration.status === "needs_reauth"
                          ? "amber"
                          : "red"
                    }
                  >
                    {integration.status === "connected"
                      ? "Connected"
                      : integration.status === "needs_reauth"
                        ? "Needs Re-auth"
                        : "Error"}
                  </ColoredBadge>
                </div>
                <div className="flex items-center gap-2 text-xs text-text-dim">
                  {integration.account_email && (
                    <span>{integration.account_email}</span>
                  )}
                  {config.portal_id ? (
                    <span>
                      Portal: {String(config.portal_id)}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {integration.status === "needs_reauth" && (
                <Button
                  onClick={onConnectHubSpot}
                  variant="ghost"
                  size="sm"
                  className="border border-amber-dark/40 bg-amber-bg/30 text-xs text-amber-light hover:bg-amber-bg/50"
                >
                  Re-authorize
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDisconnect(integration.id)}
                className="text-xs text-red-light/70 hover:text-red-light hover:bg-red-bg/30"
              >
                Disconnect
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Activity Sync Toggles */}
      <div>
        <SectionLabel>Activity Sync</SectionLabel>
        <div className="rounded-xl border border-border-default bg-surface-card px-4">
          <SettingsToggle
            label="Calls"
            subtitle="Push call summaries to HubSpot"
            enabled={syncToggles.sync_calls}
            onChange={(v) => onToggleChange("sync_calls", v)}
          />
          <SettingsToggle
            label="SMS Sent"
            subtitle="Push outbound SMS to HubSpot"
            enabled={syncToggles.sync_sms_sent}
            onChange={(v) => onToggleChange("sync_sms_sent", v)}
          />
          <SettingsToggle
            label="SMS Received"
            subtitle="Push inbound SMS to HubSpot"
            enabled={syncToggles.sync_sms_received}
            onChange={(v) => onToggleChange("sync_sms_received", v)}
          />
          <SettingsToggle
            label="Emails Sent"
            subtitle="Push emails to HubSpot"
            enabled={syncToggles.sync_emails}
            onChange={(v) => onToggleChange("sync_emails", v)}
          />
          <SettingsToggle
            label="Appointments Booked"
            subtitle="Push appointment bookings to HubSpot"
            enabled={syncToggles.sync_appointments}
            onChange={(v) => onToggleChange("sync_appointments", v)}
            className="border-b-0"
          />
        </div>
        <div className="mt-2 text-xs text-text-dim">
          Only contacts imported from HubSpot will have activities synced back.
        </div>
      </div>

      {/* Other CRMs — Coming Soon */}
      <div>
        <SectionLabel>Other CRMs</SectionLabel>
        <div className="space-y-2">
          <div className="flex items-center justify-between rounded-xl border border-border-default bg-surface-card p-4 opacity-55">
            <div className="flex items-center gap-3">
              <span className="flex h-6 w-6 items-center justify-center rounded bg-[#00a1e0]/10 text-[10px] font-bold text-[#00a1e0]">
                S
              </span>
              <span className="text-sm text-text-primary">Salesforce</span>
              <span className="rounded bg-amber-bg px-1.5 py-0.5 text-[9px] font-bold tracking-[0.05em] text-amber-light">
                COMING SOON
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between rounded-xl border border-border-default bg-surface-card p-4 opacity-55">
            <div className="flex items-center gap-3">
              <span className="flex h-6 w-6 items-center justify-center rounded bg-[#4caf50]/10 text-[10px] font-bold text-[#4caf50]">
                G
              </span>
              <span className="text-sm text-text-primary">GoHighLevel</span>
              <span className="rounded bg-amber-bg px-1.5 py-0.5 text-[9px] font-bold tracking-[0.05em] text-amber-light">
                COMING SOON
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
