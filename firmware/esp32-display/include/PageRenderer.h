#pragma once
#include <U8g2lib.h>
#include <time.h>

#include "Summary.h"

// Draws the three OLED pages (128 x 64). Knows nothing about Wi-Fi or HTTP.
class PageRenderer {
 public:
  PageRenderer(U8G2& display, long utcOffsetSeconds) : d_(display), utcOffset_(utcOffsetSeconds) {}

  void begin() {
    d_.begin();
    d_.setContrast(180);
  }

  void message(const char* line1, const char* line2 = "") {
    d_.clearBuffer();
    d_.setFont(u8g2_font_6x12_tr);
    d_.drawStr(0, 28, line1);
    d_.drawStr(0, 44, line2);
    d_.sendBuffer();
  }

  void draw(int page, const SummaryStore& store) {
    const Summary& s = store.summary();
    d_.clearBuffer();
    switch (page) {
      case 0: today(s); break;
      case 1: moodAndStreak(s); break;
      default: week(s); break;
    }
    if (store.stale()) staleMarker();
    pageDots(page);
    d_.sendBuffer();
  }

 private:
  U8G2& d_;
  long utcOffset_;

  void header(const char* title, const Summary& s) {
    d_.setFont(u8g2_font_6x12_tr);
    d_.drawStr(0, 10, title);
    // "10-24" or "10-22 old" when the latest entry is not today's
    char buf[16];
    snprintf(buf, sizeof(buf), "%s%s", s.date[0] ? s.date + 5 : "--", s.isToday ? "" : " old");
    d_.drawStr(128 - d_.getStrWidth(buf), 10, buf);
    d_.drawHLine(0, 13, 128);
  }

  // Page 1: study against goal (progress bar) and last night's sleep.
  void today(const Summary& s) {
    header("TODAY", s);
    char buf[24];
    d_.setFont(u8g2_font_6x12_tr);
    d_.drawStr(0, 27, "Study");
    if (isnan(s.studyHours)) snprintf(buf, sizeof(buf), "-- / %.1fh", s.studyGoalHours);
    else snprintf(buf, sizeof(buf), "%.1f / %.1fh", s.studyHours, s.studyGoalHours);
    d_.drawStr(128 - d_.getStrWidth(buf), 27, buf);

    const float ratio = (isnan(s.studyHours) || s.studyGoalHours <= 0) ? 0 : min(1.0f, s.studyHours / s.studyGoalHours);
    d_.drawFrame(0, 31, 128, 8);
    d_.drawBox(2, 33, (int)(124 * ratio), 4);

    d_.drawStr(0, 53, "Sleep");
    if (isnan(s.sleepHours)) {
      snprintf(buf, sizeof(buf), "--");
    } else {
      const int minutes = (int)lroundf(s.sleepHours * 60);
      snprintf(buf, sizeof(buf), "%dh %02dm", minutes / 60, minutes % 60);
    }
    d_.setFont(u8g2_font_helvB10_tr);
    d_.drawStr(128 - d_.getStrWidth(buf), 55, buf);
  }

  // Page 2: five mood dots with the current one filled, big streak number.
  void moodAndStreak(const Summary& s) {
    header("MOOD + STREAK", s);
    for (int i = 1; i <= 5; i++) {
      const int x = 8 + (i - 1) * 13;
      if (i == s.mood) d_.drawDisc(x, 32, 5);
      else d_.drawCircle(x, 32, 5);
    }
    d_.setFont(u8g2_font_6x12_tr);
    char buf[12];
    if (s.mood > 0) snprintf(buf, sizeof(buf), "mood %d/5", s.mood);
    else snprintf(buf, sizeof(buf), "mood --");
    d_.drawStr(0, 55, buf);

    snprintf(buf, sizeof(buf), "%d", s.streak);
    d_.setFont(u8g2_font_logisoso24_tn);
    d_.drawStr(127 - d_.getStrWidth(buf), 46, buf);
    d_.setFont(u8g2_font_5x8_tr);
    d_.drawStr(127 - d_.getStrWidth("day streak"), 56, "day streak");
  }

  // Page 3: seven vertical bars of study hours, oldest on the left, with day initials.
  void week(const Summary& s) {
    header("STUDY 7 DAYS", s);
    float maxH = s.studyGoalHours > 0 ? s.studyGoalHours : 1;
    for (float h : s.weekStudy) maxH = max(maxH, h);
    const int top = 17, bottom = 52, barW = 12, gap = 6;
    // The last bar is always today (even if today is not logged), so initials follow the clock.
    static const char* initials = "MTWTFSS";
    const int todayIdx = todayMonday0(s);
    for (int i = 0; i < 7; i++) {
      const int x = 2 + i * (barW + gap);
      const int h = (int)((bottom - top) * (s.weekStudy[i] / maxH));
      if (h > 0) d_.drawBox(x, bottom - h, barW, h);
      else d_.drawHLine(x, bottom, barW);
      if (todayIdx >= 0) {
        char c[2] = {initials[(todayIdx - 6 + i + 7 * 2) % 7], 0};
        d_.setFont(u8g2_font_5x8_tr);
        d_.drawStr(x + 4, 62, c);
      }
    }
    // dashed goal line
    if (s.studyGoalHours > 0) {
      const int y = bottom - (int)((bottom - top) * (s.studyGoalHours / maxH));
      for (int x = 0; x < 128; x += 4) d_.drawPixel(x, y);
    }
  }

  void staleMarker() {
    // small triangle under the header, top-right corner: data may be out of date
    d_.drawTriangle(122, 16, 127, 16, 127, 21);
  }

  void pageDots(int page) {
    for (int i = 0; i < 3; i++) {
      if (i == page) d_.drawBox(57 + i * 5, 62, 3, 2);
      else d_.drawPixel(58 + i * 5, 63);
    }
  }

  // Today's weekday from the NTP clock; falls back to the summary date if the clock is not set.
  int todayMonday0(const Summary& s) const {
    const time_t now = time(nullptr);
    if (now > 1700000000) {
      const time_t local = now + utcOffset_;
      struct tm t;
      gmtime_r(&local, &t);
      return (t.tm_wday + 6) % 7;
    }
    return s.isToday ? dayOfWeekMonday0(s.date) : -1;
  }

  // Sakamoto's algorithm on "YYYY-MM-DD"; returns 0 = Monday .. 6 = Sunday, or -1.
  static int dayOfWeekMonday0(const char* date) {
    if (strlen(date) != 10) return -1;
    int y = atoi(date), m = atoi(date + 5), d = atoi(date + 8);
    static const int t[] = {0, 3, 2, 5, 0, 3, 5, 1, 4, 6, 2, 4};
    if (m < 3) y -= 1;
    const int sunday0 = (y + y / 4 - y / 100 + y / 400 + t[m - 1] + d) % 7;
    return (sunday0 + 6) % 7;
  }
};
