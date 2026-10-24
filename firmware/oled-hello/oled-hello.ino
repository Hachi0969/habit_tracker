// Iteration I1 spike: confirm the OLED's controller before writing the real firmware.
// Arduino IDE: install the "U8g2" library, select your ESP32 board, upload.
// Wiring: SDA -> GPIO21, SCL -> GPIO22, VCC -> 3V3, GND -> GND.
//
// 1. It prints the I2C address it finds (usually 0x3C) to the Serial Monitor at 115200 baud.
// 2. It draws a frame touching all four edges. With the WRONG driver you will see a 2-pixel
//    shift, a column of noise on the right, or nothing. Then swap the two lines below and retry.
#include <U8g2lib.h>
#include <Wire.h>

U8G2_SH1106_128X64_NONAME_F_HW_I2C display(U8G2_R0, U8X8_PIN_NONE);
// U8G2_SSD1306_128X64_NONAME_F_HW_I2C display(U8G2_R0, U8X8_PIN_NONE);

void setup() {
  Serial.begin(115200);
  Wire.begin();
  for (uint8_t addr = 1; addr < 127; addr++) {
    Wire.beginTransmission(addr);
    if (Wire.endTransmission() == 0) Serial.printf("I2C device at 0x%02X\n", addr);
  }

  display.begin();
  display.clearBuffer();
  display.drawFrame(0, 0, 128, 64);
  display.setFont(u8g2_font_6x12_tr);
  display.drawStr(8, 24, "hello, desk!");
  display.drawStr(8, 40, "frame = all 4 edges?");
  display.sendBuffer();
}

void loop() {}
