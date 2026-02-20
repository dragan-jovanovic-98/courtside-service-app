# Courtside AI — Email Templates

> Branded HTML email templates for all emails sent by the platform.
> Copy and paste the HTML into the appropriate system (Supabase Auth dashboard, deliver-notification edge function, N8N workflows).

---

## Email Inventory

| # | Email | Source | When Sent |
|---|---|---|---|
| 1 | **Confirm Signup** | Supabase Auth | User signs up with email/password |
| 2 | **Magic Link** | Supabase Auth | User requests passwordless login |
| 3 | **Password Reset** | Supabase Auth | User clicks "Forgot Password" |
| 4 | **Team Invite** | Supabase Auth (`inviteUserByEmail`) | Admin invites a team member |
| 5 | **Email Change Confirmation** | Supabase Auth | User changes their email address |
| 6 | **Appointment Booked** | deliver-notification (SendGrid) | AI books an appointment during a call |
| 7 | **Hot Lead Alert** | deliver-notification (SendGrid) | AI identifies a highly interested lead |
| 8 | **SMS Reply Received** | deliver-notification (SendGrid) | Contact replies to an SMS |
| 9 | **Payment Failed** | deliver-notification (SendGrid) | Stripe invoice payment fails |
| 10 | **Campaign Completed** | deliver-notification (SendGrid) | All leads in a campaign have been called |
| 11 | **Appointment Reminder** | N8N (SendGrid) | Reminder to lead about upcoming appointment |

---

## Shared Base Layout

All emails use this wrapper. Individual templates replace `{{CONTENT}}`.

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Courtside AI</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0a0d12; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0d12; padding: 40px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width: 480px; width: 100%;">
          <!-- Logo -->
          <tr>
            <td align="center" style="padding: 0 0 32px 0;">
              <span style="font-family: Georgia, 'Times New Roman', serif; font-size: 20px; font-weight: 600; color: #e8eaed; letter-spacing: 0.01em;">Courtside AI</span>
            </td>
          </tr>
          <!-- Card -->
          <tr>
            <td style="background-color: #0e1117; border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; padding: 36px 32px;">
              {{CONTENT}}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td align="center" style="padding: 24px 0 0 0;">
              <p style="margin: 0; font-size: 11px; color: rgba(255,255,255,0.25); line-height: 1.6;">
                Courtside AI &middot; Intelligent voice agents for service businesses
              </p>
              <p style="margin: 4px 0 0 0; font-size: 11px; color: rgba(255,255,255,0.15);">
                You're receiving this because you have an account at court-side.ai
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

---

## 1. Confirm Signup

**Supabase dashboard:** Authentication → Email Templates → "Confirm signup"

Available variables: `{{ .ConfirmationURL }}`

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Confirm your email</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0a0d12; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0d12; padding: 40px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width: 480px; width: 100%;">
          <tr>
            <td align="center" style="padding: 0 0 32px 0;">
              <span style="font-family: Georgia, 'Times New Roman', serif; font-size: 20px; font-weight: 600; color: #e8eaed; letter-spacing: 0.01em;">Courtside AI</span>
            </td>
          </tr>
          <tr>
            <td style="background-color: #0e1117; border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; padding: 36px 32px;">
              <h1 style="margin: 0 0 8px 0; font-size: 22px; font-weight: 700; color: #e8eaed;">Confirm your email</h1>
              <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: rgba(255,255,255,0.55);">
                Thanks for signing up. Click the button below to verify your email address and get started.
              </p>
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 0 24px 0;">
                <tr>
                  <td style="border-radius: 8px; background-color: #059669;">
                    <a href="{{ .ConfirmationURL }}" target="_blank" style="display: inline-block; padding: 12px 28px; font-size: 14px; font-weight: 600; color: #ffffff; text-decoration: none;">Confirm Email</a>
                  </td>
                </tr>
              </table>
              <p style="margin: 0; font-size: 12px; line-height: 1.5; color: rgba(255,255,255,0.3);">
                If you didn't create an account, you can safely ignore this email.
              </p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding: 24px 0 0 0;">
              <p style="margin: 0; font-size: 11px; color: rgba(255,255,255,0.25); line-height: 1.6;">Courtside AI &middot; Intelligent voice agents for service businesses</p>
              <p style="margin: 4px 0 0 0; font-size: 11px; color: rgba(255,255,255,0.15);">You're receiving this because someone signed up at court-side.ai</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

---

## 2. Magic Link

**Supabase dashboard:** Authentication → Email Templates → "Magic Link"

Available variables: `{{ .ConfirmationURL }}`

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Your sign-in link</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0a0d12; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0d12; padding: 40px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width: 480px; width: 100%;">
          <tr>
            <td align="center" style="padding: 0 0 32px 0;">
              <span style="font-family: Georgia, 'Times New Roman', serif; font-size: 20px; font-weight: 600; color: #e8eaed; letter-spacing: 0.01em;">Courtside AI</span>
            </td>
          </tr>
          <tr>
            <td style="background-color: #0e1117; border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; padding: 36px 32px;">
              <h1 style="margin: 0 0 8px 0; font-size: 22px; font-weight: 700; color: #e8eaed;">Sign in to Courtside</h1>
              <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: rgba(255,255,255,0.55);">
                Click the button below to securely sign in. This link expires in 10 minutes.
              </p>
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 0 24px 0;">
                <tr>
                  <td style="border-radius: 8px; background-color: #059669;">
                    <a href="{{ .ConfirmationURL }}" target="_blank" style="display: inline-block; padding: 12px 28px; font-size: 14px; font-weight: 600; color: #ffffff; text-decoration: none;">Sign In</a>
                  </td>
                </tr>
              </table>
              <p style="margin: 0; font-size: 12px; line-height: 1.5; color: rgba(255,255,255,0.3);">
                If you didn't request this link, you can safely ignore this email.
              </p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding: 24px 0 0 0;">
              <p style="margin: 0; font-size: 11px; color: rgba(255,255,255,0.25); line-height: 1.6;">Courtside AI &middot; Intelligent voice agents for service businesses</p>
              <p style="margin: 4px 0 0 0; font-size: 11px; color: rgba(255,255,255,0.15);">You're receiving this because you have an account at court-side.ai</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

---

## 3. Password Reset

**Supabase dashboard:** Authentication → Email Templates → "Reset Password"

Available variables: `{{ .ConfirmationURL }}`

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Reset your password</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0a0d12; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0d12; padding: 40px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width: 480px; width: 100%;">
          <tr>
            <td align="center" style="padding: 0 0 32px 0;">
              <span style="font-family: Georgia, 'Times New Roman', serif; font-size: 20px; font-weight: 600; color: #e8eaed; letter-spacing: 0.01em;">Courtside AI</span>
            </td>
          </tr>
          <tr>
            <td style="background-color: #0e1117; border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; padding: 36px 32px;">
              <h1 style="margin: 0 0 8px 0; font-size: 22px; font-weight: 700; color: #e8eaed;">Reset your password</h1>
              <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: rgba(255,255,255,0.55);">
                We received a request to reset your password. Click below to choose a new one.
              </p>
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 0 24px 0;">
                <tr>
                  <td style="border-radius: 8px; background-color: #059669;">
                    <a href="{{ .ConfirmationURL }}" target="_blank" style="display: inline-block; padding: 12px 28px; font-size: 14px; font-weight: 600; color: #ffffff; text-decoration: none;">Reset Password</a>
                  </td>
                </tr>
              </table>
              <p style="margin: 0; font-size: 12px; line-height: 1.5; color: rgba(255,255,255,0.3);">
                If you didn't request a password reset, no action is needed. Your password will remain unchanged.
              </p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding: 24px 0 0 0;">
              <p style="margin: 0; font-size: 11px; color: rgba(255,255,255,0.25); line-height: 1.6;">Courtside AI &middot; Intelligent voice agents for service businesses</p>
              <p style="margin: 4px 0 0 0; font-size: 11px; color: rgba(255,255,255,0.15);">You're receiving this because you have an account at court-side.ai</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

---

## 4. Team Invite

**Supabase dashboard:** Authentication → Email Templates → "Invite user"

Available variables: `{{ .ConfirmationURL }}`

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>You're invited to Courtside AI</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0a0d12; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0d12; padding: 40px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width: 480px; width: 100%;">
          <tr>
            <td align="center" style="padding: 0 0 32px 0;">
              <span style="font-family: Georgia, 'Times New Roman', serif; font-size: 20px; font-weight: 600; color: #e8eaed; letter-spacing: 0.01em;">Courtside AI</span>
            </td>
          </tr>
          <tr>
            <td style="background-color: #0e1117; border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; padding: 36px 32px;">
              <h1 style="margin: 0 0 8px 0; font-size: 22px; font-weight: 700; color: #e8eaed;">You've been invited</h1>
              <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: rgba(255,255,255,0.55);">
                A team member has invited you to join their organization on Courtside AI. Accept the invitation to get started.
              </p>
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 0 24px 0;">
                <tr>
                  <td style="border-radius: 8px; background-color: #059669;">
                    <a href="{{ .ConfirmationURL }}" target="_blank" style="display: inline-block; padding: 12px 28px; font-size: 14px; font-weight: 600; color: #ffffff; text-decoration: none;">Accept Invitation</a>
                  </td>
                </tr>
              </table>
              <p style="margin: 0; font-size: 12px; line-height: 1.5; color: rgba(255,255,255,0.3);">
                If you weren't expecting this invitation, you can safely ignore this email.
              </p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding: 24px 0 0 0;">
              <p style="margin: 0; font-size: 11px; color: rgba(255,255,255,0.25); line-height: 1.6;">Courtside AI &middot; Intelligent voice agents for service businesses</p>
              <p style="margin: 4px 0 0 0; font-size: 11px; color: rgba(255,255,255,0.15);">You're receiving this because someone invited you to court-side.ai</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

---

## 5. Email Change Confirmation

**Supabase dashboard:** Authentication → Email Templates → "Change Email Address"

Available variables: `{{ .ConfirmationURL }}`

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Confirm email change</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0a0d12; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0d12; padding: 40px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width: 480px; width: 100%;">
          <tr>
            <td align="center" style="padding: 0 0 32px 0;">
              <span style="font-family: Georgia, 'Times New Roman', serif; font-size: 20px; font-weight: 600; color: #e8eaed; letter-spacing: 0.01em;">Courtside AI</span>
            </td>
          </tr>
          <tr>
            <td style="background-color: #0e1117; border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; padding: 36px 32px;">
              <h1 style="margin: 0 0 8px 0; font-size: 22px; font-weight: 700; color: #e8eaed;">Confirm your new email</h1>
              <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: rgba(255,255,255,0.55);">
                You requested to change your email address. Click below to confirm the update.
              </p>
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 0 24px 0;">
                <tr>
                  <td style="border-radius: 8px; background-color: #059669;">
                    <a href="{{ .ConfirmationURL }}" target="_blank" style="display: inline-block; padding: 12px 28px; font-size: 14px; font-weight: 600; color: #ffffff; text-decoration: none;">Confirm Email Change</a>
                  </td>
                </tr>
              </table>
              <p style="margin: 0; font-size: 12px; line-height: 1.5; color: rgba(255,255,255,0.3);">
                If you didn't request this change, please secure your account immediately.
              </p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding: 24px 0 0 0;">
              <p style="margin: 0; font-size: 11px; color: rgba(255,255,255,0.25); line-height: 1.6;">Courtside AI &middot; Intelligent voice agents for service businesses</p>
              <p style="margin: 4px 0 0 0; font-size: 11px; color: rgba(255,255,255,0.15);">You're receiving this because you have an account at court-side.ai</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

---

## 6–10. App Notification Emails (deliver-notification)

These are sent via the `deliver-notification` edge function through SendGrid. The function calls `buildNotificationEmail(title, body)` — we replace that with a proper template function.

### Updated `buildNotificationEmail` function

Replace the existing `buildNotificationEmail` function in `supabase/functions/deliver-notification/index.ts` with:

```typescript
function buildNotificationEmail(title: string, body: string, type: string): string {
  // Accent color based on notification type
  const accentColors: Record<string, string> = {
    appointment_booked: "#34d399",   // emerald
    hot_lead_alert: "#f87171",       // red
    sms_reply: "#60a5fa",            // blue
    payment_failed: "#fbbf24",       // amber
    campaign_completed: "#a78bfa",   // purple
  };
  const accent = accentColors[type] || "#34d399";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin: 0; padding: 0; background-color: #0a0d12; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0d12; padding: 40px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width: 480px; width: 100%;">
          <tr>
            <td align="center" style="padding: 0 0 32px 0;">
              <span style="font-family: Georgia, 'Times New Roman', serif; font-size: 20px; font-weight: 600; color: #e8eaed; letter-spacing: 0.01em;">Courtside AI</span>
            </td>
          </tr>
          <tr>
            <td style="background-color: #0e1117; border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; padding: 0; overflow: hidden;">
              <div style="height: 3px; background-color: ${accent};"></div>
              <div style="padding: 32px 32px 36px 32px;">
                <h1 style="margin: 0 0 12px 0; font-size: 18px; font-weight: 700; color: ${accent};">${title}</h1>
                <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.65; color: rgba(255,255,255,0.6);">${body}</p>
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="border-radius: 8px; background-color: rgba(255,255,255,0.06);">
                      <a href="\${Deno.env.get('APP_URL') || 'https://court-side.ai'}/dashboard" target="_blank" style="display: inline-block; padding: 10px 22px; font-size: 13px; font-weight: 600; color: #e8eaed; text-decoration: none;">Open Dashboard</a>
                    </td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding: 24px 0 0 0;">
              <p style="margin: 0; font-size: 11px; color: rgba(255,255,255,0.25); line-height: 1.6;">Courtside AI &middot; Intelligent voice agents for service businesses</p>
              <p style="margin: 4px 0 0 0; font-size: 11px; color: rgba(255,255,255,0.15);">Manage your notification preferences in Settings</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
```

> **Note:** Update the function call from `buildNotificationEmail(record.title, record.body)` to `buildNotificationEmail(record.title, record.body, record.type)`.

### What each notification looks like:

**6. Appointment Booked** (emerald accent)
- Title: "Appointment Booked"
- Body: "New appointment with John Smith on Feb 26 at 2:00 PM. Campaign: Refinance Q1."

**7. Hot Lead Alert** (red accent)
- Title: "Hot Lead Alert"
- Body: "Sarah Mitchell showed strong interest during today's call. Sentiment: positive, engagement: high."

**8. SMS Reply Received** (blue accent)
- Title: "New SMS from +14165551234"
- Body: "Hello I have a question about my rate"

**9. Payment Failed** (amber accent)
- Title: "Payment Failed"
- Body: "Payment of $299.00 failed. Please update your payment method."

**10. Campaign Completed** (purple accent)
- Title: "Campaign Completed"
- Body: "Refinance Q1 has finished. 150 calls made, 23 appointments booked."

---

## 11. Appointment Reminder (N8N → SendGrid)

This is sent by the N8N appointment reminders workflow directly via the SendGrid node. Update the HTML body expression in the "Send an email" node:

```html
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin: 0; padding: 0; background-color: #0a0d12; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0d12; padding: 40px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width: 480px; width: 100%;">
          <tr>
            <td align="center" style="padding: 0 0 32px 0;">
              <span style="font-family: Georgia, 'Times New Roman', serif; font-size: 20px; font-weight: 600; color: #e8eaed; letter-spacing: 0.01em;">Courtside AI</span>
            </td>
          </tr>
          <tr>
            <td style="background-color: #0e1117; border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; padding: 0; overflow: hidden;">
              <div style="height: 3px; background-color: #34d399;"></div>
              <div style="padding: 32px 32px 36px 32px;">
                <h1 style="margin: 0 0 12px 0; font-size: 18px; font-weight: 700; color: #34d399;">Appointment Reminder</h1>
                <p style="margin: 0 0 6px 0; font-size: 14px; line-height: 1.65; color: rgba(255,255,255,0.6);">
                  Hi {{CONTACT_FIRST_NAME}},
                </p>
                <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.65; color: rgba(255,255,255,0.6);">
                  This is a friendly reminder that you have an appointment <strong style="color: #e8eaed;">{{LABEL}}</strong> at <strong style="color: #e8eaed;">{{TIME}}</strong> with {{ORG_NAME}}.
                </p>
                <div style="background-color: rgba(52,211,153,0.08); border: 1px solid rgba(52,211,153,0.15); border-radius: 8px; padding: 16px; margin: 0 0 20px 0;">
                  <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                    <tr>
                      <td style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: rgba(52,211,153,0.6); padding: 0 0 6px 0;">When</td>
                    </tr>
                    <tr>
                      <td style="font-size: 15px; font-weight: 600; color: #e8eaed;">{{LABEL}} at {{TIME}}</td>
                    </tr>
                  </table>
                </div>
                <p style="margin: 0; font-size: 13px; color: rgba(255,255,255,0.4);">
                  We look forward to speaking with you.
                </p>
              </div>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding: 24px 0 0 0;">
              <p style="margin: 0; font-size: 11px; color: rgba(255,255,255,0.25); line-height: 1.6;">Sent on behalf of {{ORG_NAME}} via Courtside AI</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

**N8N expression version** (for the SendGrid node HTML body field):

Replace `{{CONTACT_FIRST_NAME}}` with `{{ $('Loop Over Appointments').item.json.contact_first_name }}`
Replace `{{LABEL}}` with `{{ $('Loop Over Appointments').item.json.label }}`
Replace `{{TIME}}` with `{{ $('Loop Over Appointments').item.json.formatted_time }}`
Replace `{{ORG_NAME}}` with `{{ $('Loop Over Appointments').item.json.org_name }}`

---

## Where to Apply Each Template

| # | Template | Where to paste |
|---|---|---|
| 1 | Confirm Signup | Supabase → Auth → Email Templates → "Confirm signup" |
| 2 | Magic Link | Supabase → Auth → Email Templates → "Magic Link" |
| 3 | Password Reset | Supabase → Auth → Email Templates → "Reset Password" |
| 4 | Team Invite | Supabase → Auth → Email Templates → "Invite user" |
| 5 | Email Change | Supabase → Auth → Email Templates → "Change Email Address" |
| 6–10 | Notification emails | Update `buildNotificationEmail()` in `supabase/functions/deliver-notification/index.ts` |
| 11 | Appointment Reminder | Update HTML body in N8N "Send an email" node |
