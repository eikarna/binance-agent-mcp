import { describe, expect, it } from "bun:test";
import { ArbitrageDetector } from "../src/detector.ts";
import { BinanceClient } from "../src/client.ts";
import { loadConfig } from "../src/config.ts";

describe("Autonomous Arbitrage Detector", () => {
  const config = loadConfig();
  const client = new BinanceClient(config);
  const detector = new ArbitrageDetector(client);

  it("should attempt to detect triangular arbitrage", async () => {
    // Note: Live market arb will likely be negative, but it should return an object.
    const opp = await detector.detectTriangular("BTC", "USDT", "ETH", 1);
    
    expect(opp).toBeDefined();
    if (opp) {
      expect(opp.route).toEqual(["BTC", "USDT", "ETH", "BTC"]);
      expect(typeof opp.expectedProfitPercent).toBe("number");
      expect(opp.executableAmount).toBe(1);
    }
  });
});
