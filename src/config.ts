export interface BinanceConfig {
  apiKey?: string;
  apiSecret?: string;
  useTestnet: boolean;
  dryRun: boolean;
  maxNotionalUSDT: number;
  maxSlippagePercent: number;
}

export function loadConfig(): BinanceConfig {
  return {
    apiKey: process.env.BINANCE_API_KEY || "",
    apiSecret: process.env.BINANCE_API_SECRET || "",
    useTestnet: process.env.BINANCE_USE_TESTNET === "true" || !process.env.BINANCE_API_KEY,
    dryRun: process.env.BINANCE_DRY_RUN !== "false",
    maxNotionalUSDT: Number(process.env.MAX_NOTIONAL_USDT || "500"),
    maxSlippagePercent: Number(process.env.MAX_SLIPPAGE_PERCENT || "1.5"),
  };
}

export function getBaseUrl(useTestnet: boolean): string {
  return useTestnet
    ? "https://testnet.binance.vision"
    : "https://api.binance.com";
}
