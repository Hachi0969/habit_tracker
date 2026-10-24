#pragma once
#include <Arduino.h>

// Decides when to rotate pages and when to fetch, with back-off after failures.
class PageScheduler {
 public:
  static constexpr unsigned long PAGE_MS = 5000;              // rotate about every 5 s
  static constexpr unsigned long REFRESH_MS = 5UL * 60 * 1000;  // poll every 5 min
  static constexpr unsigned long MIN_RETRY_MS = 30UL * 1000;

  bool shouldRotate() {
    if (millis() - lastRotate_ < PAGE_MS) return false;
    lastRotate_ = millis();
    page_ = (page_ + 1) % 3;
    return true;
  }
  int page() const { return page_; }

  bool shouldFetch() const { return first_ || millis() - lastFetch_ >= nextDelay_; }

  void fetched(bool ok) {
    first_ = false;
    lastFetch_ = millis();
    // success: normal interval; failures: 30 s, 60 s, 120 s, 240 s, then 5 min
    if (ok) {
      failures_ = 0;
      nextDelay_ = REFRESH_MS;
      return;
    }
    const unsigned long backoff = MIN_RETRY_MS << (failures_ < 4 ? failures_ : 4);
    nextDelay_ = backoff < REFRESH_MS ? backoff : REFRESH_MS;
    failures_++;
  }

 private:
  int page_ = 0;
  bool first_ = true;
  unsigned long lastRotate_ = 0;
  unsigned long lastFetch_ = 0;
  unsigned long nextDelay_ = REFRESH_MS;
  unsigned int failures_ = 0;
};
