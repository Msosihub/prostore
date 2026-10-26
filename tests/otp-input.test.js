jest.mock("query-string", () => ({ __esModule: true, default: {} }));
jest.mock("@/db/prisma", () => ({ prisma: {} }));
jest.mock("@/lib/africasTalking", () => ({ sendSms: jest.fn() }));
import { otpIdentifier } from "@/lib/otp";
test.each([null, {}, [], "test@example.test", "+255700000001,+255700000002", "x".repeat(101)])("invalid or unfinished OTP input rejected before any provider %#", value => {
  expect(() => otpIdentifier(value)).toThrow();
});
test.each(["0700000001", "255700000001", "+255 700 000 001"])("Tanzanian phone variant %s normalizes consistently", value => expect(otpIdentifier(value)).toBe("+255700000001"));
