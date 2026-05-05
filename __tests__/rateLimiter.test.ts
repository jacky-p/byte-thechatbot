import { checkRateLimit, getClientIp, _resetStore } from "../app/api/chat/rateLimiter";

beforeEach(() => {
  _resetStore();
});

describe("checkRateLimit", () => {
  it("allows the first 5 requests from the same IP", () => {
    for (let i = 0; i < 5; i++) {
      expect(checkRateLimit("1.2.3.4").allowed).toBe(true);
    }
  });

  it("blocks the 6th request from the same IP", () => {
    for (let i = 0; i < 5; i++) checkRateLimit("1.2.3.4");
    expect(checkRateLimit("1.2.3.4").allowed).toBe(false);
  });

  it("returns remaining count correctly", () => {
    expect(checkRateLimit("1.2.3.4").remaining).toBe(4);
    expect(checkRateLimit("1.2.3.4").remaining).toBe(3);
  });

  it("does not share counters between different IPs", () => {
    for (let i = 0; i < 5; i++) checkRateLimit("1.2.3.4");
    expect(checkRateLimit("5.6.7.8").allowed).toBe(true);
  });

  it("resets the counter after the window expires", () => {
    jest.useFakeTimers();
    for (let i = 0; i < 5; i++) checkRateLimit("1.2.3.4");
    expect(checkRateLimit("1.2.3.4").allowed).toBe(false);

    jest.advanceTimersByTime(24 * 60 * 60 * 1000 + 1);
    expect(checkRateLimit("1.2.3.4").allowed).toBe(true);
    jest.useRealTimers();
  });
});

describe("getClientIp", () => {
  const makeReq = (headers: Record<string, string>) =>
    new Request("http://localhost/api/chat", { method: "POST", headers });

  it("reads the first IP from x-forwarded-for", () => {
    const req = makeReq({ "x-forwarded-for": "203.0.113.1, 10.0.0.1" });
    expect(getClientIp(req)).toBe("203.0.113.1");
  });

  it("falls back to 127.0.0.1 when header is absent", () => {
    const req = makeReq({});
    expect(getClientIp(req)).toBe("127.0.0.1");
  });

  it("handles a single IP in x-forwarded-for with no comma", () => {
    const req = makeReq({ "x-forwarded-for": "203.0.113.1" });
    expect(getClientIp(req)).toBe("203.0.113.1");
  });
});
