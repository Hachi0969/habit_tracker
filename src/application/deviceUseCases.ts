import type { Device, DeviceRepository } from "../infrastructure/repositories.ts";
import type { TokenGenerator } from "../infrastructure/TokenGenerator.ts";
import { ValidationError } from "./ValidationError.ts";

/** UC8: register an ESP32. The token is returned ONCE; only its hash is stored. */
export class RegisterDeviceUseCase {
  private readonly devices: DeviceRepository;
  private readonly tokens: TokenGenerator;

  constructor(devices: DeviceRepository, tokens: TokenGenerator) {
    this.devices = devices;
    this.tokens = tokens;
  }

  async execute(name: string): Promise<{ device: Device; token: string }> {
    const trimmed = name.trim();
    if (trimmed.length < 1 || trimmed.length > 40) {
      throw new ValidationError({ name: "Give the device a name (1-40 characters)" });
    }
    const token = this.tokens.generate();
    const device = await this.devices.create(trimmed, await this.tokens.hash(token));
    return { device, token };
  }
}

/** UC8: revoke a lost or retired device. Its token stops working immediately. */
export class RevokeDeviceUseCase {
  private readonly devices: DeviceRepository;

  constructor(devices: DeviceRepository) {
    this.devices = devices;
  }

  async execute(id: string): Promise<void> {
    await this.devices.revoke(id);
  }
}
