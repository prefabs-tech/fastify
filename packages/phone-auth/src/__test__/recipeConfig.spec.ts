import type { FastifyInstance } from "fastify";

/* istanbul ignore file */
import Fastify from "fastify";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  DEFAULT_CONTACT_METHOD,
  DEFAULT_FLOW_TYPE,
  TWILIO_VERIFY_PLACEHOLDER_CODE,
} from "../constants";

const twilioClientMock = {
  client: { verify: { v2: { services: vi.fn() } } },
  verifyServiceSid: "VA123",
};

// getTwilioClient is our own module and is the only thing here that reaches an
// external service, so it is the mock seam.
vi.mock("../lib/getTwilioClient", () => ({
  default: vi.fn(() => twilioClientMock),
}));

const { default: getPasswordlessRecipeConfig } =
  await import("../recipe/config");

const twilio = {
  accountSid: "AC123",
  authToken: "token",
  verifyServiceSid: "VA123",
};

const buildFastify = (
  phoneAuthConfig?: Record<string, unknown>,
): FastifyInstance => {
  const fastify = Fastify({ logger: false });

  fastify.decorate("config", {
    appName: "Test App",
    phoneAuth: phoneAuthConfig,
  });

  return fastify;
};

describe("getPasswordlessRecipeConfig", () => {
  let fastify: FastifyInstance;

  afterEach(async () => {
    await fastify.close();
  });

  it("defaults contactMethod and flowType", () => {
    fastify = buildFastify({ twilio });

    const config = getPasswordlessRecipeConfig(fastify);

    expect(config.contactMethod).toBe(DEFAULT_CONTACT_METHOD);
    expect(config.flowType).toBe(DEFAULT_FLOW_TYPE);
  });

  it("honours a configured contactMethod", () => {
    fastify = buildFastify({ contactMethod: "EMAIL_OR_PHONE", twilio });

    expect(getPasswordlessRecipeConfig(fastify).contactMethod).toBe(
      "EMAIL_OR_PHONE",
    );
  });

  it("throws when the phone auth config is missing", () => {
    fastify = buildFastify();

    expect(() => getPasswordlessRecipeConfig(fastify)).toThrow(
      /Phone auth config is missing/,
    );
  });

  it("throws when dev mode is on without a devModeOtp", () => {
    fastify = buildFastify({ enableDevMode: true });

    expect(() => getPasswordlessRecipeConfig(fastify)).toThrow(
      /devModeOtp is required/,
    );
  });

  it("returns the dev mode OTP for every number in dev mode", async () => {
    fastify = buildFastify({ devModeOtp: "123456", enableDevMode: true });

    const { getCustomUserInputCode } = getPasswordlessRecipeConfig(fastify);

    await expect(
      getCustomUserInputCode!("public", { phoneNumber: "+15550001111" }),
    ).resolves.toBe("123456");
  });

  it("returns the dev mode OTP for a bypassed number outside dev mode", async () => {
    fastify = buildFastify({
      bypassSmsFor: ["+15550001111"],
      devModeOtp: "123456",
      twilio,
    });

    const { getCustomUserInputCode } = getPasswordlessRecipeConfig(fastify);

    await expect(
      getCustomUserInputCode!("public", { phoneNumber: "+15550001111" }),
    ).resolves.toBe("123456");
  });

  it("returns the Twilio Verify placeholder for a regular number", async () => {
    fastify = buildFastify({ bypassSmsFor: ["+15550001111"], twilio });

    const { getCustomUserInputCode } = getPasswordlessRecipeConfig(fastify);

    await expect(
      getCustomUserInputCode!("public", { phoneNumber: "+15559998888" }),
    ).resolves.toBe(TWILIO_VERIFY_PLACEHOLDER_CODE);
  });

  it("uses smsDelivery that only logs in dev mode", () => {
    fastify = buildFastify({ devModeOtp: "123456", enableDevMode: true });

    const config = getPasswordlessRecipeConfig(fastify);

    expect(config.smsDelivery).toBeDefined();
    expect(
      (config as { createAndSendCustomTextMessage?: unknown })
        .createAndSendCustomTextMessage,
    ).toBeUndefined();
  });

  it("uses Twilio SMS delivery outside dev mode", () => {
    fastify = buildFastify({ twilio });

    const config = getPasswordlessRecipeConfig(fastify);

    expect(config.smsDelivery).toBeDefined();
  });
});
