import { mock } from "bun:test";
import { fixtures } from "./fixtures.ts";

const mockFetch = mock(async (input: string | Request | URL, init?: RequestInit) => {
  const urlString = input instanceof Request ? input.url : input.toString();
  const url = new URL(urlString);
  const pathname = url.pathname;
  const searchParams = url.searchParams;

  if (pathname.includes("/api/v3/ticker/24hr")) {
    const symbol = searchParams.get("symbol");
    if (symbol && symbol in fixtures.ticker) {
      return new Response(JSON.stringify(fixtures.ticker[symbol as keyof typeof fixtures.ticker]));
    }
    return new Response(JSON.stringify({ code: -1121, msg: "Invalid symbol." }), { status: 400 });
  }

  if (pathname.includes("/api/v3/depth")) {
    const symbol = searchParams.get("symbol");
    if (symbol && symbol in fixtures.depth) {
      return new Response(JSON.stringify(fixtures.depth[symbol as keyof typeof fixtures.depth]));
    }
    return new Response(JSON.stringify({ code: -1121, msg: "Invalid symbol." }), { status: 400 });
  }

  if (pathname.includes("/api/v3/klines")) {
    const symbol = searchParams.get("symbol");
    if (symbol && symbol in fixtures.klines) {
      const limit = parseInt(searchParams.get("limit") || "50", 10);
      const data = fixtures.klines[symbol as keyof typeof fixtures.klines];
      return new Response(JSON.stringify(data.slice(0, limit)));
    }
    return new Response(JSON.stringify({ code: -1121, msg: "Invalid symbol." }), { status: 400 });
  }

  if (pathname.includes("/api/v3/account")) {
    return new Response(JSON.stringify(fixtures.account));
  }

  if (pathname.includes("/api/v3/order")) {
    if (init?.method === "POST") {
      const orderRes = { ...fixtures.order };
      const symbol = searchParams.get("symbol") || "BTCUSDT";
      const side = searchParams.get("side") || "BUY";
      const type = searchParams.get("type") || "LIMIT";
      const quantity = searchParams.get("quantity") || "0.001";
      const price = searchParams.get("price") || "50000.00";
      
      orderRes.symbol = symbol;
      orderRes.side = side;
      orderRes.type = type;
      orderRes.origQty = quantity;
      orderRes.price = price;
      
      return new Response(JSON.stringify(orderRes));
    }
    if (init?.method === "DELETE") {
       const symbol = searchParams.get("symbol") || "BTCUSDT";
       const orderId = parseInt(searchParams.get("orderId") || "123456789", 10);
       return new Response(JSON.stringify({ symbol, orderId, status: "CANCELED" }));
    }
  }

  // Fallback to original fetch for unmatched requests, or error
  return new Response("Not Found", { status: 404 });
});

globalThis.fetch = mockFetch as any;
