import { getBaseUrl, type BinanceConfig } from "./config.ts";

export interface Ticker24hr {
  symbol: string;
  priceChange: string;
  priceChangePercent: string;
  weightedAvgPrice: string;
  prevClosePrice: string;
  lastPrice: string;
  lastQty: string;
  bidPrice: string;
  bidQty: string;
  askPrice: string;
  askQty: string;
  openPrice: string;
  highPrice: string;
  lowPrice: string;
  volume: string;
  quoteVolume: string;
  openTime: number;
  closeTime: number;
  count: number;
}

export interface OrderBook {
  lastUpdateId: number;
  bids: [string, string][]; // [price, qty]
  asks: [string, string][];
  spread?: number;
  spreadPercent?: number;
  bidDepth?: number;
  askDepth?: number;
  imbalance?: number; // (bid - ask) / (bid + ask)
}

export interface AccountBalance {
  asset: string;
  free: string;
  locked: string;
}

export interface AccountInfo {
  makerCommission: number;
  takerCommission: number;
  buyerCommission: number;
  sellerCommission: number;
  canTrade: boolean;
  canWithdraw: boolean;
  canDeposit: boolean;
  updateTime: number;
  accountType: string;
  balances: AccountBalance[];
}

export interface OrderResult {
  symbol: string;
  orderId: number;
  clientOrderId: string;
  transactTime: number;
  price: string;
  origQty: string;
  executedQty: string;
  cummulativeQuoteQty: string;
  status: string;
  timeInForce: string;
  type: string;
  side: string;
  dryRun?: boolean;
}

export class BinanceClient {
  private config: BinanceConfig;
  private baseUrl: string;

  constructor(config: BinanceConfig) {
    this.config = config;
    this.baseUrl = getBaseUrl(config.useTestnet);
  }

  private async signQuery(params: Record<string, string | number>): Promise<string> {
    if (!this.config.apiSecret) {
      throw new Error("BINANCE_API_SECRET is required for authenticated endpoints.");
    }
    const timestamp = Date.now();
    const query = new URLSearchParams({
      ...Object.fromEntries(
        Object.entries(params).map(([k, v]) => [k, String(v)])
      ),
      timestamp: String(timestamp),
    }).toString();

    // Use native Web Crypto API for HMAC-SHA256
    const encoder = new TextEncoder();
    const keyData = encoder.encode(this.config.apiSecret);
    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const signatureBuffer = await crypto.subtle.sign(
      "HMAC",
      cryptoKey,
      encoder.encode(query)
    );
    const signatureArray = Array.from(new Uint8Array(signatureBuffer));
    const signature = signatureArray
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    return `${query}&signature=${signature}`;
  }

  /**
   * Fetch 24hr ticker price change statistics
   */
  async getTicker(symbol: string): Promise<Ticker24hr> {
    const cleanSymbol = symbol.toUpperCase().replace(/[-_/]/g, "");
    const url = `${this.baseUrl}/api/v3/ticker/24hr?symbol=${encodeURIComponent(cleanSymbol)}`;
    const res = await fetch(url);
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Binance API error (${res.status}): ${err}`);
    }
    return (await res.json()) as Ticker24hr;
  }

  /**
   * Fetch Order Book Depth with calculated analytics (spread, depth, imbalance)
   */
  async getOrderBook(symbol: string, limit: number = 20): Promise<OrderBook> {
    const cleanSymbol = symbol.toUpperCase().replace(/[-_/]/g, "");
    const url = `${this.baseUrl}/api/v3/depth?symbol=${encodeURIComponent(cleanSymbol)}&limit=${limit}`;
    const res = await fetch(url);
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Binance API error (${res.status}): ${err}`);
    }
    const data = (await res.json()) as {
      lastUpdateId: number;
      bids: [string, string][];
      asks: [string, string][];
    };

    const bestBid = data.bids.length > 0 ? parseFloat(data.bids[0]![0]) : 0;
    const bestAsk = data.asks.length > 0 ? parseFloat(data.asks[0]![0]) : 0;
    const spread = bestAsk > 0 && bestBid > 0 ? bestAsk - bestBid : 0;
    const spreadPercent = bestBid > 0 ? (spread / bestBid) * 100 : 0;

    let totalBidDepth = 0;
    for (const [p, q] of data.bids) {
      totalBidDepth += parseFloat(p) * parseFloat(q);
    }

    let totalAskDepth = 0;
    for (const [p, q] of data.asks) {
      totalAskDepth += parseFloat(p) * parseFloat(q);
    }

    const totalDepth = totalBidDepth + totalAskDepth;
    const imbalance =
      totalDepth > 0 ? (totalBidDepth - totalAskDepth) / totalDepth : 0;

    return {
      lastUpdateId: data.lastUpdateId,
      bids: data.bids,
      asks: data.asks,
      spread: Number(spread.toFixed(4)),
      spreadPercent: Number(spreadPercent.toFixed(4)),
      bidDepth: Number(totalBidDepth.toFixed(2)),
      askDepth: Number(totalAskDepth.toFixed(2)),
      imbalance: Number(imbalance.toFixed(4)),
    };
  }

  /**
   * Fetch Klines / Candlestick data
   */
  async getKlines(
    symbol: string,
    interval: string = "1h",
    limit: number = 50
  ): Promise<Array<{
    openTime: number;
    open: string;
    high: string;
    low: string;
    close: string;
    volume: string;
    closeTime: number;
    quoteAssetVolume: string;
    trades: number;
  }>> {
    const cleanSymbol = symbol.toUpperCase().replace(/[-_/]/g, "");
    const url = `${this.baseUrl}/api/v3/klines?symbol=${encodeURIComponent(
      cleanSymbol
    )}&interval=${interval}&limit=${limit}`;
    const res = await fetch(url);
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Binance API error (${res.status}): ${err}`);
    }
    const raw = (await res.json()) as Array<[
      number,
      string,
      string,
      string,
      string,
      string,
      number,
      string,
      number,
      string,
      string,
      string
    ]>;

    return raw.map((k) => ({
      openTime: k[0],
      open: k[1],
      high: k[2],
      low: k[3],
      close: k[4],
      volume: k[5],
      closeTime: k[6],
      quoteAssetVolume: k[7],
      trades: k[8],
    }));
  }

  /**
   * Fetch account balances and trading permissions (Signed)
   */
  async getAccount(): Promise<AccountInfo> {
    if (!this.config.apiKey) {
      throw new Error("BINANCE_API_KEY is required for account queries.");
    }
    const signedQuery = await this.signQuery({});
    const url = `${this.baseUrl}/api/v3/account?${signedQuery}`;
    const res = await fetch(url, {
      headers: {
        "X-MBX-APIKEY": this.config.apiKey,
      },
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Binance API error (${res.status}): ${err}`);
    }
    const data = (await res.json()) as AccountInfo;
    // Filter non-zero balances for cleaner agent context
    const nonZeroBalances = data.balances.filter(
      (b) => parseFloat(b.free) > 0 || parseFloat(b.locked) > 0
    );
    return {
      ...data,
      balances: nonZeroBalances,
    };
  }

  /**
   * Execute Spot Order (with dry-run simulation guard)
   */
  async createOrder(params: {
    symbol: string;
    side: "BUY" | "SELL";
    type: "LIMIT" | "MARKET";
    quantity: number;
    price?: number;
    timeInForce?: "GTC" | "IOC" | "FOK";
  }): Promise<OrderResult> {
    const cleanSymbol = params.symbol.toUpperCase().replace(/[-_/]/g, "");

    // Safety checks: Notional ceiling
    const ticker = await this.getTicker(cleanSymbol);
    const estPrice = params.price || parseFloat(ticker.lastPrice);
    const notional = params.quantity * estPrice;

    if (notional > this.config.maxNotionalUSDT) {
      throw new Error(
        `Risk Guardrail Violation: Order notional value ($${notional.toFixed(
          2
        )}) exceeds maximum allowed notional ($${this.config.maxNotionalUSDT}).`
      );
    }

    // Dry Run Simulation Mode
    if (this.config.dryRun) {
      return {
        symbol: cleanSymbol,
        orderId: Math.floor(Date.now() + Math.random() * 1000),
        clientOrderId: `dry_run_${Date.now()}`,
        transactTime: Date.now(),
        price: String(params.price || ticker.lastPrice),
        origQty: String(params.quantity),
        executedQty: String(params.quantity),
        cummulativeQuoteQty: String(notional.toFixed(4)),
        status: "FILLED",
        timeInForce: params.timeInForce || "GTC",
        type: params.type,
        side: params.side,
        dryRun: true,
      };
    }

    if (!this.config.apiKey) {
      throw new Error("BINANCE_API_KEY is required for live order creation.");
    }

    const orderPayload: Record<string, string | number> = {
      symbol: cleanSymbol,
      side: params.side,
      type: params.type,
      quantity: params.quantity,
    };

    if (params.type === "LIMIT") {
      if (!params.price) {
        throw new Error("Price is required for LIMIT orders.");
      }
      orderPayload.price = params.price;
      orderPayload.timeInForce = params.timeInForce || "GTC";
    }

    const signedQuery = await this.signQuery(orderPayload);
    const url = `${this.baseUrl}/api/v3/order?${signedQuery}`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "X-MBX-APIKEY": this.config.apiKey,
      },
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Binance Order Execution Error (${res.status}): ${err}`);
    }

    return (await res.json()) as OrderResult;
  }

  /**
   * Cancel an active order (Signed)
   */
  async cancelOrder(symbol: string, orderId: number): Promise<{ symbol: string; orderId: number; status: string }> {
    const cleanSymbol = symbol.toUpperCase().replace(/[-_/]/g, "");

    if (this.config.dryRun) {
      return {
        symbol: cleanSymbol,
        orderId,
        status: "CANCELED (SIMULATED)",
      };
    }

    if (!this.config.apiKey) {
      throw new Error("BINANCE_API_KEY is required to cancel orders.");
    }

    const signedQuery = await this.signQuery({
      symbol: cleanSymbol,
      orderId,
    });
    const url = `${this.baseUrl}/api/v3/order?${signedQuery}`;
    const res = await fetch(url, {
      method: "DELETE",
      headers: {
        "X-MBX-APIKEY": this.config.apiKey,
      },
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Binance Cancel Order Error (${res.status}): ${err}`);
    }

    return (await res.json()) as { symbol: string; orderId: number; status: string };
  }
}
