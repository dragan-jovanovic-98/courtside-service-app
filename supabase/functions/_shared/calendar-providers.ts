/**
 * Calendar provider abstraction for Google and Outlook.
 * Unified interface for busy periods, event CRUD, and calendar listing.
 *
 * Extracts existing provider-specific code from check-availability and
 * calendar-oauth-callback into a clean, extensible interface.
 */

// ── Fetch with timeout + retry ─────────────────────────────────────

const CALENDAR_API_TIMEOUT_MS = 5_000;
const MAX_RETRIES = 1;

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number = CALENDAR_API_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  timeoutMs: number = CALENDAR_API_TIMEOUT_MS
): Promise<Response> {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetchWithTimeout(url, options, timeoutMs);
      // Retry on 5xx errors
      if (response.status >= 500 && attempt < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
        continue;
      }
      return response;
    } catch (err) {
      if (attempt >= MAX_RETRIES) throw err;
      // Brief backoff before retry
      await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
    }
  }
  // Should not reach here, but satisfy TS
  throw new Error("fetchWithRetry exhausted retries");
}

// ── Types ──────────────────────────────────────────────────────────

export interface BusyPeriod {
  start: Date;
  end: Date;
}

export interface CalendarEventInput {
  summary: string;
  description?: string;
  startDateTime: string; // ISO 8601
  endDateTime: string;   // ISO 8601
  timezone: string;
  attendees?: Array<{ email: string; name?: string }>;
  location?: string;
}

export interface CalendarInfo {
  id: string;
  name: string;
  color: string;
  isDefault: boolean;
}

export interface CalendarProvider {
  getBusyPeriods(
    accessToken: string,
    calendarId: string,
    dateStart: string,
    dateEnd: string,
    timezone: string
  ): Promise<BusyPeriod[]>;

  createEvent(
    accessToken: string,
    calendarId: string,
    event: CalendarEventInput
  ): Promise<{ eventId: string }>;

  updateEvent(
    accessToken: string,
    calendarId: string,
    eventId: string,
    updates: Partial<CalendarEventInput>
  ): Promise<void>;

  deleteEvent(
    accessToken: string,
    calendarId: string,
    eventId: string
  ): Promise<void>;

  listCalendars(
    accessToken: string
  ): Promise<CalendarInfo[]>;
}

// ── Google Calendar Provider ────────────────────────────────────────

const googleProvider: CalendarProvider = {
  async getBusyPeriods(
    accessToken: string,
    calendarId: string,
    dateStart: string,
    dateEnd: string,
    timezone: string
  ): Promise<BusyPeriod[]> {
    const response = await fetchWithRetry(
      "https://www.googleapis.com/calendar/v3/freeBusy",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          timeMin: `${dateStart}T00:00:00`,
          timeMax: `${dateEnd}T23:59:59`,
          timeZone: timezone,
          items: [{ id: calendarId }],
        }),
      }
    );

    if (!response.ok) {
      const err = await response.text();
      console.error("Google FreeBusy API error:", err);
      return [];
    }

    const data = await response.json();
    const busySlots = data.calendars?.[calendarId]?.busy ?? [];

    return busySlots.map((slot: { start: string; end: string }) => ({
      start: new Date(slot.start),
      end: new Date(slot.end),
    }));
  },

  async createEvent(
    accessToken: string,
    calendarId: string,
    event: CalendarEventInput
  ): Promise<{ eventId: string }> {
    const body: Record<string, unknown> = {
      summary: event.summary,
      start: {
        dateTime: event.startDateTime,
        timeZone: event.timezone,
      },
      end: {
        dateTime: event.endDateTime,
        timeZone: event.timezone,
      },
    };

    if (event.description) body.description = event.description;
    if (event.location) body.location = event.location;
    if (event.attendees?.length) {
      body.attendees = event.attendees.map((a) => ({
        email: a.email,
        displayName: a.name,
      }));
    }

    const response = await fetchWithRetry(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Google createEvent failed: ${err}`);
    }

    const data = await response.json();
    return { eventId: data.id };
  },

  async updateEvent(
    accessToken: string,
    calendarId: string,
    eventId: string,
    updates: Partial<CalendarEventInput>
  ): Promise<void> {
    const body: Record<string, unknown> = {};

    if (updates.summary) body.summary = updates.summary;
    if (updates.description) body.description = updates.description;
    if (updates.location) body.location = updates.location;
    if (updates.startDateTime) {
      body.start = {
        dateTime: updates.startDateTime,
        timeZone: updates.timezone,
      };
    }
    if (updates.endDateTime) {
      body.end = {
        dateTime: updates.endDateTime,
        timeZone: updates.timezone,
      };
    }
    if (updates.attendees?.length) {
      body.attendees = updates.attendees.map((a) => ({
        email: a.email,
        displayName: a.name,
      }));
    }

    const response = await fetchWithRetry(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Google updateEvent failed: ${err}`);
    }
  },

  async deleteEvent(
    accessToken: string,
    calendarId: string,
    eventId: string
  ): Promise<void> {
    const response = await fetchWithRetry(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Google deleteEvent failed: ${err}`);
    }
  },

  async listCalendars(
    accessToken: string
  ): Promise<CalendarInfo[]> {
    const response = await fetchWithRetry(
      "https://www.googleapis.com/calendar/v3/users/me/calendarList",
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Google calendar list fetch failed: ${err}`);
    }

    const data = await response.json();
    const items = data.items ?? [];

    return items.map(
      (cal: { id: string; summary?: string; backgroundColor?: string; primary?: boolean }) => ({
        id: cal.id,
        name: cal.summary ?? cal.id,
        color: cal.backgroundColor ?? "#4285f4",
        isDefault: cal.primary ?? false,
      })
    );
  },
};

// ── Outlook Calendar Provider ───────────────────────────────────────

const outlookProvider: CalendarProvider = {
  async getBusyPeriods(
    accessToken: string,
    calendarId: string,
    dateStart: string,
    dateEnd: string,
    _timezone: string
  ): Promise<BusyPeriod[]> {
    const allEvents: Array<{ start: Date; end: Date }> = [];
    let url: string | null =
      `https://graph.microsoft.com/v1.0/me/calendars/${encodeURIComponent(calendarId)}/calendarView` +
      `?startDateTime=${dateStart}T00:00:00.000Z` +
      `&endDateTime=${dateEnd}T23:59:59.000Z` +
      `&$select=start,end,isCancelled` +
      `&$top=100`;

    while (url) {
      const response = await fetchWithRetry(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const err = await response.text();
        console.error("Outlook CalendarView API error:", err);
        return allEvents;
      }

      const data = await response.json();
      const events = data.value ?? [];

      for (const e of events) {
        if (e.isCancelled) continue;
        allEvents.push({
          start: new Date(e.start.dateTime + "Z"),
          end: new Date(e.end.dateTime + "Z"),
        });
      }

      url = data["@odata.nextLink"] ?? null;
    }

    return allEvents;
  },

  async createEvent(
    accessToken: string,
    calendarId: string,
    event: CalendarEventInput
  ): Promise<{ eventId: string }> {
    const body: Record<string, unknown> = {
      subject: event.summary,
      start: {
        dateTime: event.startDateTime,
        timeZone: event.timezone,
      },
      end: {
        dateTime: event.endDateTime,
        timeZone: event.timezone,
      },
    };

    if (event.description) {
      body.body = { contentType: "text", content: event.description };
    }
    if (event.location) {
      body.location = { displayName: event.location };
    }
    if (event.attendees?.length) {
      body.attendees = event.attendees.map((a) => ({
        emailAddress: { address: a.email, name: a.name ?? a.email },
        type: "required",
      }));
    }

    const response = await fetchWithRetry(
      `https://graph.microsoft.com/v1.0/me/calendars/${encodeURIComponent(calendarId)}/events`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Outlook createEvent failed: ${err}`);
    }

    const data = await response.json();
    return { eventId: data.id };
  },

  async updateEvent(
    accessToken: string,
    calendarId: string,
    eventId: string,
    updates: Partial<CalendarEventInput>
  ): Promise<void> {
    const body: Record<string, unknown> = {};

    if (updates.summary) body.subject = updates.summary;
    if (updates.description) {
      body.body = { contentType: "text", content: updates.description };
    }
    if (updates.location) {
      body.location = { displayName: updates.location };
    }
    if (updates.startDateTime) {
      body.start = {
        dateTime: updates.startDateTime,
        timeZone: updates.timezone,
      };
    }
    if (updates.endDateTime) {
      body.end = {
        dateTime: updates.endDateTime,
        timeZone: updates.timezone,
      };
    }
    if (updates.attendees?.length) {
      body.attendees = updates.attendees.map((a) => ({
        emailAddress: { address: a.email, name: a.name ?? a.email },
        type: "required",
      }));
    }

    const response = await fetchWithRetry(
      `https://graph.microsoft.com/v1.0/me/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Outlook updateEvent failed: ${err}`);
    }
  },

  async deleteEvent(
    accessToken: string,
    calendarId: string,
    eventId: string
  ): Promise<void> {
    const response = await fetchWithRetry(
      `https://graph.microsoft.com/v1.0/me/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Outlook deleteEvent failed: ${err}`);
    }
  },

  async listCalendars(
    accessToken: string
  ): Promise<CalendarInfo[]> {
    const response = await fetchWithRetry(
      "https://graph.microsoft.com/v1.0/me/calendars",
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Outlook calendar list fetch failed: ${err}`);
    }

    const data = await response.json();
    const calendars = data.value ?? [];

    return calendars.map(
      (cal: { id: string; name?: string; color?: string; isDefaultCalendar?: boolean }) => ({
        id: cal.id,
        name: cal.name ?? cal.id,
        color: cal.color ?? "#0078d4",
        isDefault: cal.isDefaultCalendar ?? false,
      })
    );
  },
};

// ── Factory ─────────────────────────────────────────────────────────

const providers: Record<string, CalendarProvider> = {
  google: googleProvider,
  outlook: outlookProvider,
};

export function getCalendarProvider(provider: "google" | "outlook"): CalendarProvider {
  const p = providers[provider];
  if (!p) {
    throw new Error(`Unknown calendar provider: ${provider}`);
  }
  return p;
}
