// Copy this file to secrets.h (which is gitignored) and fill it in. Never commit secrets.h.
#pragma once

#define WIFI_SSID "your-wifi-name"
#define WIFI_PASSWORD "your-wifi-password"

// From the web app: Settings -> Desk display -> Register. Shown only once.
#define DEVICE_TOKEN "paste-the-device-token-here"

// https://<project-ref>.supabase.co/functions/v1/device-summary
#define SUMMARY_URL "https://YOUR-PROJECT-REF.supabase.co/functions/v1/device-summary"

// Root certificate of the server's TLS chain, in PEM format. Certificate checking is never skipped.
// Get it with:  openssl s_client -showcerts -connect YOUR-PROJECT-REF.supabase.co:443 </dev/null
// and copy the LAST certificate block (the root), or export the root from your browser's padlock menu.
// Roots last for years, but if the host changes CA you must update this (see docs/device.md).
static const char ROOT_CA[] = R"PEM(
-----BEGIN CERTIFICATE-----
...paste the root certificate here...
-----END CERTIFICATE-----
)PEM";

// Your UTC offset in seconds, used only to show the clock. Bangkok = 7 * 3600.
#define UTC_OFFSET_SECONDS (7 * 3600)
