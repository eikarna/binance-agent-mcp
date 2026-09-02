import type { ArbitrageOpportunity } from "./arbitrage.ts";
import type { BinanceClient } from "./client.ts";

export class ArbitrageDetector {
	private client: BinanceClient;

	constructor(client: BinanceClient) {
		this.client = client;
	}

	/**
	 * Detect triangular arbitrage opportunity.
	 * e.g., BTC -> USDT, USDT -> ETH, ETH -> BTC
	 */
	async detectTriangular(
		base: string,
		quote1: string,
		quote2: string,
		amount: number,
	): Promise<ArbitrageOpportunity | null> {
		const pair1 = `${base}${quote1}`; // e.g. BTCUSDT
		const pair2 = `${quote2}${quote1}`; // e.g. ETHUSDT
		const pair3 = `${base}${quote2}`; // e.g. BTCETH

		try {
			// In reality we should Promise.all these
			const ob1 = await this.client.getOrderBook(pair1, 5);
			const ob2 = await this.client.getOrderBook(pair2, 5);
			const ob3 = await this.client.getOrderBook(pair3, 5);

			if (!ob1.asks[0] || !ob2.bids[0] || !ob3.bids[0]) {
				return null;
			}

			// Step 1: Sell base for quote1 (e.g. Sell BTC for USDT)
			const bid1 = parseFloat(ob1.bids[0][0]);
			const quote1Acquired = amount * bid1;

			// Step 2: Buy quote2 with quote1 (e.g. Buy ETH with USDT)
			const ask2 = parseFloat(ob2.asks[0][0]);
			const quote2Acquired = quote1Acquired / ask2;

			// Step 3: Sell quote2 for base (e.g. Sell ETH for BTC) -> Note: pair3 is baseQuote2 (BTCETH), so we buy base with quote2
			// Wait, if pair3 is BTCETH, it means price of BTC in ETH.
			// We have ETH (quote2) and want BTC (base). We buy BTC using ETH.
			const ask3 = parseFloat(ob3.asks[0][0]);
			const finalBase = quote2Acquired / ask3;

			const profitPercent = ((finalBase - amount) / amount) * 100;

			return {
				route: [base, quote1, quote2, base],
				expectedProfitPercent: profitPercent,
				executableAmount: amount,
				timestamp: Date.now(),
			};
		} catch (e) {
			console.error("Triangular arb detection failed:", e);
			return null;
		}
	}
}
