# Desk display setup (ESP32 + OLED)

## 1. Confirm the screen (iteration I1 spike)
1. Wire the OLED: SDA → GPIO21, SCL → GPIO22, VCC → 3V3, GND → GND.
2. Open `firmware/oled-hello/oled-hello.ino` in the Arduino IDE, install the **U8g2** library, upload.
3. Serial Monitor (115200) should print `I2C device at 0x3C`.
4. The frame must touch all four edges. If it is shifted or noisy, swap to the SSD1306 line and retry.
5. Write the result in `docs/decision-log.md` and use the same line in `esp32-display/src/main.cpp`.

## 2. Register the device
Web app (cloud mode) → **Settings → Desk display → Register**. Copy the token; it is shown once.
Lost it? Revoke the device and register a new one.

## 3. Configure and flash
```bash
cd firmware/esp32-display
cp include/secrets.example.h include/secrets.h   # gitignored
```
Fill in Wi-Fi, `DEVICE_TOKEN`, `SUMMARY_URL` and `ROOT_CA`. To get the root certificate:
```bash
openssl s_client -showcerts -connect YOUR-PROJECT-REF.supabase.co:443 </dev/null
```
Copy the **last** `-----BEGIN CERTIFICATE-----` block. Then build and upload with PlatformIO:
```bash
pio run -t upload && pio device monitor
```

## Behaviour
| Server answer | Display |
|---|---|
| 200 | Stores the summary, redraws, clears the stale marker |
| 401 | "auth error", stops polling until reboot |
| 429 / 5xx / timeout / no Wi-Fi | Keeps last values, shows the stale marker, retries after 30 s, 60 s, 120 s, 240 s, then every 5 min |

Certificate validation is never turned off. If the host changes certificate authority, update `ROOT_CA`.
