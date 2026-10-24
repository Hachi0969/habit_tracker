#pragma once
#include <Arduino.h>

// Mirrors the DeviceSummary JSON from the Edge Function. NAN / -1 mean "no data".
struct Summary {
  char date[11] = "";  // "YYYY-MM-DD"
  bool isToday = false;
  float studyHours = NAN;
  float studyGoalHours = 2;
  float sleepHours = NAN;
  float sleepGoalHours = 8;
  int mood = -1;
  int streak = 0;
  float weekStudy[7] = {0, 0, 0, 0, 0, 0, 0};
};

enum class FetchStatus { Ok, AuthError, Transient };

// SummaryStore: keeps the last good values so the screen never goes blank (NFR5).
class SummaryStore {
 public:
  void save(const Summary& s) {
    summary_ = s;
    hasData_ = true;
    stale_ = false;
  }
  void markStale() { stale_ = true; }
  void markAuthError() { authError_ = true; }

  const Summary& summary() const { return summary_; }
  bool hasData() const { return hasData_; }
  bool stale() const { return stale_; }
  bool authError() const { return authError_; }

 private:
  Summary summary_;
  bool hasData_ = false;
  bool stale_ = true;
  bool authError_ = false;
};
