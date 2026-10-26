jest.mock("query-string", () => ({ __esModule: true, default: {} }));
jest.mock("@/db/prisma", () => ({
  prisma: {
    $transaction: jest.fn(),
    $executeRaw: jest.fn(),
    otpThrottle: { upsert: jest.fn(), update: jest.fn() },
    verificationToken: {
      findFirst: jest.fn(),
      create: jest.fn(),
      deleteMany: jest.fn(),
      delete: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
  },
}));
jest.mock("@/lib/africasTalking", () => ({ sendSms: jest.fn() }));
import { prisma } from "@/db/prisma";
import { sendSms } from "@/lib/africasTalking";
import { POST as retired } from "@/app/api/auth/send-sms/route";
import { POST as otp } from "@/app/api/auth/send-otp/route";
const request = (body) =>
  new Request("http://localhost", {
    method: "POST",
    body: JSON.stringify(body),
  });
beforeEach(() => {
  prisma.$transaction.mockImplementation((fn) => fn(prisma));
  prisma.$executeRaw.mockResolvedValue(1);
  prisma.otpThrottle.upsert.mockResolvedValue({
    windowStartedAt: new Date(),
    sendCount: 0,
    failedAttempts: 0,
    lastSentAt: null,
  });
  prisma.otpThrottle.update.mockResolvedValue({});
  prisma.verificationToken.deleteMany.mockResolvedValue({ count: 1 });
  sendSms.mockResolvedValue(undefined);

  prisma.verificationToken.findFirst.mockResolvedValue(null);
  prisma.verificationToken.create.mockResolvedValue({});
  sendSms.mockResolvedValue(undefined);
});
test.each([{}, { to: "+255700000001", message: "private" }, { role: "ADMIN" }])(
  "retired generic relay never calls provider or exposes input",
  async (body) => {
    const result = await retired(request(body));
    expect(result.status).toBe(410);
    expect(await result.json()).toEqual({ error: "Endpoint retired" });
    expect(sendSms).not.toHaveBeenCalled();
  },
);
test.each([
  "+255700000001,+255700000002",
  "+255700000001;+255700000002",
  "hello",
  "broken@",
  "",
  null,
])(
  "invalid OTP identifier %s cannot reach database or provider",
  async (identifier) => {
    expect((await otp(request({ identifier }))).status).toBe(400);
    expect(prisma.verificationToken.findFirst).not.toHaveBeenCalled();
    expect(sendSms).not.toHaveBeenCalled();
  },
);
test.each(["0700000001", "255700000001", "+255 700 000 001"])(
  "public OTP still sends server-generated content for %s",
  async (identifier) => {
    const result = await otp(
      request({ identifier, message: "attacker text", to: "+255700000002" }),
    );
    expect(result.status).toBe(200);
    const { token } = prisma.verificationToken.create.mock.calls[0][0].data;
    expect(sendSms).toHaveBeenCalledWith(
      "+255700000001",
      `Namba yako ya kuhakiki ni ${token}`,
    );
    expect(await result.json()).toEqual({ success: true });
  },
);
test("OTP cooldown cannot trigger provider", async () => {
  prisma.otpThrottle.upsert.mockResolvedValue({
    sendCount: 3,
    failedAttempts: 0,
    windowStartedAt: new Date(),
  });
  expect((await otp(request({ identifier: "+255700000001" }))).status).toBe(
    429,
  );
  expect(sendSms).not.toHaveBeenCalled();
});
