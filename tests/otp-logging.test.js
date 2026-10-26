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
import { POST as send } from "@/app/api/auth/send-otp/route";
import { POST as verify } from "@/app/api/auth/verify-otp/route";
const identifier = "+255700000001";
const token = "654321";
let logs;
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

  logs = ["log", "error", "warn", "info", "debug"].map((name) =>
    jest.spyOn(console, name).mockImplementation(() => {}),
  );
});
afterEach(() => {
  for (const log of logs) log.mockRestore();
});
function expectNoSensitiveLogs() {
  const output = logs
    .flatMap((log) => log.mock.calls)
    .flat()
    .map(String)
    .join(" ");
  expect(output).not.toContain(identifier);
  expect(output).not.toContain(token);
  expect(output).not.toContain("verificationToken");
}
test("send still stores and delivers OTP without logging its record", async () => {
  prisma.verificationToken.findFirst.mockResolvedValue(null);
  prisma.verificationToken.create.mockImplementation(async ({ data }) => data);
  const result = await send(
    new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({ identifier }),
    }),
  );
  expect(result.status).toBe(200);
  const stored = prisma.verificationToken.create.mock.calls[0][0].data;
  expect(sendSms).toHaveBeenCalledWith(
    identifier,
    expect.stringContaining(stored.token),
  );
  for (const log of logs) expect(log).not.toHaveBeenCalled();
});
test("verify consumes token without logging credentials or record", async () => {
  prisma.verificationToken.findFirst.mockResolvedValue({
    identifier,
    token,
    expires: new Date(Date.now() + 60000),
  });
  prisma.user.findUnique.mockResolvedValue({
    id: "buyer",
    phone: identifier,
    isVerified: true,
  });
  prisma.user.update.mockResolvedValue({ id: "buyer", phone: identifier });
  const result = await verify(
    new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({ identifier, token }),
    }),
  );
  expect(result.status).toBe(200);
  expect(prisma.verificationToken.deleteMany).toHaveBeenCalled();
  expectNoSensitiveLogs();
});
test("database failure logs a fixed message rather than credential-bearing error", async () => {
  prisma.verificationToken.findFirst.mockRejectedValue(
    new Error(`verificationToken ${identifier} ${token}`),
  );
  const result = await verify(
    new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({ identifier, token }),
    }),
  );
  expect(result.status).toBe(500);
  expectNoSensitiveLogs();
});

test.each(["database", "sms"])(
  "send sanitizes %s failure without leaking token",
  async (source) => {
    prisma.verificationToken.findFirst.mockResolvedValue(null);
    const failure = new Error(`verificationToken ${identifier} ${token}`);
    prisma.verificationToken.create.mockImplementation(async ({ data }) => {
      if (source === "database") throw failure;
      return data;
    });
    sendSms.mockImplementation(async () => {
      if (source === "sms") throw failure;
    });
    const result = await send(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ identifier }),
      }),
    );
    expect(result.status).toBe(source === "sms" ? 503 : 500);
    const body = JSON.stringify(await result.json());
    expect(body).not.toContain(identifier);
    expect(body).not.toContain(token);
    expect(body).not.toContain("verificationToken");
    expectNoSensitiveLogs();
  },
);
