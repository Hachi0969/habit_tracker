#pragma once
#include <WiFi.h>
#include <time.h>

// Connects to Wi-Fi and syncs the clock (TLS certificate checks need the correct time).
class WifiManager {
 public:
  WifiManager(const char* ssid, const char* password) : ssid_(ssid), password_(password) {}

  void begin() {
    WiFi.mode(WIFI_STA);
    WiFi.setAutoReconnect(true);
    WiFi.begin(ssid_, password_);
  }

  // Non-blocking: call often. Returns true while connected.
  bool ensureConnected() {
    if (WiFi.status() == WL_CONNECTED) {
      if (!timeRequested_) {
        configTime(0, 0, "pool.ntp.org", "time.google.com");
        timeRequested_ = true;
      }
      return true;
    }
    if (millis() - lastAttempt_ > 15000) {
      lastAttempt_ = millis();
      WiFi.disconnect();
      WiFi.begin(ssid_, password_);
    }
    return false;
  }

  bool clockReady() const { return time(nullptr) > 1700000000; }  // after Nov 2023

 private:
  const char* ssid_;
  const char* password_;
  unsigned long lastAttempt_ = 0;
  bool timeRequested_ = false;
};
