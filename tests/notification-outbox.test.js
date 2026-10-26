jest.mock("@/db/prisma",()=>({prisma:{}}));
jest.mock("@/auth",()=>({auth:jest.fn()}));
import {smsAcceptance, notificationBatch} from "@/lib/order-notification-outbox";
const to="+255700000001";
const payload=(statusCode, extra={})=>({SMSMessageData:{Recipients:[{number:to,statusCode,messageId:"test-id",...extra}]}});
test.each([100,101,102])("%s is acceptance, not delivery",code=>expect(smsAcceptance(payload(code),to).state).toBe("ACCEPTED"));
test.each([401,402,403,404,405,407])("%s requires review rather than automatic resend",code=>expect(smsAcceptance(payload(code),to).state).toBe("FAILED"));
test.each([500,501,502])("%s is bounded retryable rejection",code=>expect(smsAcceptance(payload(code),to).state).toBe("RETRY"));
test("provider optout never retries",()=>expect(smsAcceptance(payload(406),to).state).toBe("SUPPRESSED"));
test.each([null,{},payload(101,{number:"other"}),payload(101,{messageId:""}),payload(999)])("unknown response never claims acceptance",data=>expect(smsAcceptance(data,to).state).toBe("UNKNOWN"));

test.each([0,51,1.5])("invalid batch bound %s fails before IO",async limit=>await expect(notificationBatch({limit})).rejects.toThrow("Invalid batch size"));
