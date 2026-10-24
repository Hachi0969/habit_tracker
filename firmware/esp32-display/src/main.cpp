// Life Dashboard desk display.
// Fetches today's summary every 5 minutes and rotates three OLED pages every 5 seconds.
// Wiring (I2C): OLED SDA -> GPIO21, SCL -> GPIO22, VCC -> 3V3, GND -> GND.
#include <Arduino.h>
#include <U8g2lib.h>
#include <Wire.h>

#include "PageRenderer.h"
#include "PageScheduler.h"
#include "Summary.h"
#include "SummaryClient.h"
#include "WifiManager.h"
#include "secrets.h"  // copy include/secrets.example.h -> include/secrets.h

// 1.3" "OLED IIC" modules are usually SH1106. If the picture is shifted by 2 pixels or garbled,
// swap this line for:  U8G2_SSD1306_128X64_NONAME_F_HW_I2C display(U8G2_R0, U8X8_PIN_NONE);
U8G2_SH1106_128X64_NONAME_F_HW_I2C display(U8G2_R0, U8X8_PIN_NONE);

WifiManager wifi(WIFI_SSID, WIFI_PASSWORD);
SummaryClient client(SUMMARY_URL, DEVICE_TOKEN, ROOT_CA);
SummaryStore store;
PageRenderer renderer(display, UTC_OFFSET_SECONDS);
PageScheduler scheduler;

void setup() {
  Serial.begin(115200);
  renderer.begin();
  renderer.message("Life Dashboard", "connecting Wi-Fi...");
  wifi.begin();
}

void loop() {
  if (store.authError()) {
    // 401: the token is unknown or revoked. Stop polling until someone reboots the device.
    renderer.message("auth error", "re-register device");
    delay(1000);
    return;
  }

  const bool online = wifi.ensureConnected();

  if (scheduler.shouldFetch()) {
    if (!online || !wifi.clockReady()) {
      store.markStale();
      scheduler.fetched(false);
    } else {
      Summary fresh;
      const FetchStatus status = client.fetch(fresh);
      if (status == FetchStatus::Ok) {
        store.save(fresh);
        Serial.printf("[summary] %s study=%.1f streak=%d\n", fresh.date, fresh.studyHours, fresh.streak);
      } else if (status == FetchStatus::AuthError) {
        store.markAuthError();
      } else {
        store.markStale();  // keep showing the last values, with the stale marker (NFR5)
      }
      scheduler.fetched(status == FetchStatus::Ok);
    }
  }

  if (!store.hasData()) {
    renderer.message("Life Dashboard", online ? "loading..." : "no Wi-Fi yet");
  } else if (scheduler.shouldRotate()) {
    renderer.draw(scheduler.page(), store);
  }
  delay(50);
}
