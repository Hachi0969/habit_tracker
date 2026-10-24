#pragma once
#include <ArduinoJson.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>

#include "Summary.h"

// Fetches and parses the device summary over HTTPS with certificate validation.
class SummaryClient {
 public:
  SummaryClient(const char* url, const char* token, const char* rootCa)
      : url_(url), token_(token), rootCa_(rootCa) {}

  FetchStatus fetch(Summary& out) {
    WiFiClientSecure tls;
    tls.setCACert(rootCa_);  // never setInsecure(): an unverified server could feed fake data

    HTTPClient http;
    http.setTimeout(8000);
    // HTTP/1.0 makes the server send plain (not chunked) bodies, which getStream() can parse.
    http.useHTTP10(true);
    if (!http.begin(tls, url_)) return FetchStatus::Transient;
    http.addHeader("x-device-token", token_);

    const int code = http.GET();
    if (code == 401) {
      http.end();
      return FetchStatus::AuthError;
    }
    if (code != 200) {
      Serial.printf("[summary] HTTP %d\n", code);
      http.end();
      return FetchStatus::Transient;  // 429, 5xx, timeouts (negative codes)
    }

    JsonDocument doc;
    const DeserializationError err = deserializeJson(doc, http.getStream());
    http.end();
    if (err) {
      Serial.printf("[summary] JSON error: %s\n", err.c_str());
      return FetchStatus::Transient;
    }

    Summary s;
    strlcpy(s.date, doc["date"] | "", sizeof(s.date));
    s.isToday = doc["is_today"] | false;
    s.studyHours = doc["study_hours"].isNull() ? NAN : doc["study_hours"].as<float>();
    s.studyGoalHours = doc["study_goal_hours"] | 2.0f;
    s.sleepHours = doc["sleep_hours"].isNull() ? NAN : doc["sleep_hours"].as<float>();
    s.sleepGoalHours = doc["sleep_goal_hours"] | 8.0f;
    s.mood = doc["mood"].isNull() ? -1 : doc["mood"].as<int>();
    s.streak = doc["streak"] | 0;
    JsonArrayConst week = doc["week_study"].as<JsonArrayConst>();
    for (int i = 0; i < 7 && i < (int)week.size(); i++) s.weekStudy[i] = week[i].as<float>();
    out = s;
    return FetchStatus::Ok;
  }

 private:
  const char* url_;
  const char* token_;
  const char* rootCa_;
};
