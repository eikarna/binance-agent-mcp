import { mockFetch } from "./demo-mock.ts";

globalThis.fetch = mockFetch as any;

import { BinanceClient } from "./client.ts";
import { loadConfig } from "./config.ts";

const ESC = "\x1b";
const CLEAR = `${ESC}[2J`;
const HOME = `${ESC}[H`;
const RED = `${ESC}[31m`;
const GREEN = `${ESC}[32m`;
const YELLOW = `${ESC}[33m`;
const CYAN = `${ESC}[36m`;
const RESET = `${ESC}[0m`;
const BOLD = `${ESC}[1m`;
const BG_RED = `${ESC}[41;37m`;
const BG_GREEN = `${ESC}[42;30m`;

interface LogMessage {
	time: string;
	msg: string;
	type: "info" | "buy" | "sell" | "error";
}

export class Dashboard {
	private client: BinanceClient;
	private symbol: string;
	private intervalMs: number;
	private isRunning = false;
	private logs: LogMessage[] = [];
	private maxLogs = 10;

	// Stats
	private currentPrice = 0;
	private imbalance = 0;
	private spread = 0;

	// Depth
	private bids: [number, number][] = [];
	private asks: [number, number][] = [];

	constructor(client: BinanceClient, symbol = "BTCUSDT", intervalMs = 1000) {
		this.client = client;
		this.symbol = symbol;
		this.intervalMs = intervalMs;
	}

	public async start() {
		this.isRunning = true;
		process.stdout.write(CLEAR);
		this.log(`Dashboard started for ${this.symbol}`, "info");

		// Initial fetch to populate UI
		await this.fetchData();
		this.render();

		while (this.isRunning) {
			await new Promise((r) => setTimeout(r, this.intervalMs));
			if (!this.isRunning) break;

			try {
				await this.fetchData();
				this.render();
			} catch (err) {
				this.log(
					`API Error: ${err instanceof Error ? err.message : String(err)}`,
					"error",
				);
			}
		}
	}

	public stop() {
		this.isRunning = false;
		process.stdout.write(`${ESC}[?25h`); // show cursor
		console.log(`\n${RESET}Dashboard stopped.`);
	}

	private log(msg: string, type: "info" | "buy" | "sell" | "error" = "info") {
		const time = new Date().toLocaleTimeString();
		this.logs.unshift({ time, msg, type });
		if (this.logs.length > this.maxLogs) {
			this.logs.pop();
		}
		this.render();
	}

	private randomizeMockData() {
		// Modulate the fixture data slightly so the dashboard is animated
		this.currentPrice += (Math.random() - 0.5) * 50;

		// Oscillate imbalance heavily for the demo effect
		this.imbalance += (Math.random() - 0.5) * 0.4;
		if (this.imbalance > 1) this.imbalance = 1;
		if (this.imbalance < -1) this.imbalance = -1;

		// Simulate bids/asks jitter
		this.bids = this.bids.map((b) => [
			b[0] + (Math.random() - 0.5) * 10,
			b[1] * (1 + (Math.random() - 0.5) * 0.1),
		]);
		this.asks = this.asks.map((a) => [
			a[0] + (Math.random() - 0.5) * 10,
			a[1] * (1 + (Math.random() - 0.5) * 0.1),
		]);

		// Re-sort
		this.bids.sort((a, b) => b[0] - a[0]);
		this.asks.sort((a, b) => a[0] - b[0]);
	}

	private async fetchData() {
		// We get static fixtures from the mock
		const ob = await this.client.getOrderBook(this.symbol, 20);
		const ticker = await this.client.getTicker(this.symbol);

		if (this.currentPrice === 0) {
			// First run init
			this.currentPrice = parseFloat(ticker.lastPrice);
			this.imbalance = ob.imbalance || 0;
			this.spread = ob.spreadPercent || 0;

			this.bids = ob.bids.map((b) => [parseFloat(b[0]), parseFloat(b[1])]);
			this.asks = ob.asks.map((a) => [parseFloat(a[0]), parseFloat(a[1])]);
		} else {
			this.randomizeMockData();
		}

		// Simulate signals for demo
		if (this.imbalance > 0.4) {
			this.log(
				`STRONG BUY SIGNAL: Imbalance +${(this.imbalance * 100).toFixed(1)}%`,
				"buy",
			);
		} else if (this.imbalance < -0.4) {
			this.log(
				`STRONG SELL SIGNAL: Imbalance ${(this.imbalance * 100).toFixed(1)}%`,
				"sell",
			);
		}
	}

	private renderGauge(value: number): string {
		// value is from -1.0 to 1.0
		const width = 40;
		const center = Math.floor(width / 2);

		// Normalize to width
		const pos = Math.floor(((value + 1) / 2) * width);

		let bar = "";
		for (let i = 0; i < width; i++) {
			if (i === center) {
				bar += `${RESET}|`;
			} else if (i < center && i >= pos) {
				bar += `${RED}█`; // sell pressure
			} else if (i > center && i <= pos) {
				bar += `${GREEN}█`; // buy pressure
			} else {
				bar += `${RESET}-`;
			}
		}

		return `[${bar}${RESET}]`;
	}

	private renderDepthGraph(): string {
		// Find max volume
		const maxVol = Math.max(
			...this.bids.map((b) => b[1]),
			...this.asks.map((a) => a[1]),
		);

		if (maxVol === 0 || !Number.isFinite(maxVol))
			return "Awaiting orderbook...";

		const barWidth = 30;
		let out = "";

		// Asks (descending price, from top down)
		const topAsks = this.asks.slice(0, 5).reverse();
		for (const [price, qty] of topAsks) {
			const w = Math.floor((qty / maxVol) * barWidth) || 1;
			const bar = "█".repeat(w);
			out += `  ${RED}${price.toFixed(2).padStart(10)} ${bar.padEnd(barWidth)} ${RESET}${qty.toFixed(4)}\n`;
		}

		out += `  ${RESET}----------- SPREAD: ${this.spread.toFixed(4)}% -----------\n`;

		// Bids (descending price)
		const topBids = this.bids.slice(0, 5);
		for (const [price, qty] of topBids) {
			const w = Math.floor((qty / maxVol) * barWidth) || 1;
			const bar = "█".repeat(w);
			out += `  ${GREEN}${price.toFixed(2).padStart(10)} ${bar.padEnd(barWidth)} ${RESET}${qty.toFixed(4)}\n`;
		}

		return out;
	}

	private render() {
		process.stdout.write(`${ESC}[?25l`); // hide cursor
		process.stdout.write(HOME);

		const termWidth = process.stdout.columns || 80;
		const hr = "=".repeat(termWidth);

		let output = `${CYAN}${BOLD}${hr}\n`;
		output += `   BINANCE MCP REALTIME TELEMETRY - ${this.symbol}\n`;
		output += `${hr}${RESET}\n\n`;

		// Top Section: Price & Imbalance
		output += `  ${BOLD}LAST PRICE:${RESET} $${this.currentPrice.toFixed(2)}    `;

		const imbColor = this.imbalance > 0 ? GREEN : RED;
		output += `  ${BOLD}ORDERBOOK IMBALANCE:${RESET} ${imbColor}${(this.imbalance * 100).toFixed(2).padStart(6)}%${RESET}\n\n`;

		output += `  ${this.renderGauge(this.imbalance)}\n\n`;

		// Middle Section: Depth Graph
		output += `${CYAN}${BOLD}--- MARKET DEPTH ---${RESET}\n`;
		output += this.renderDepthGraph() + "\n";

		// Bottom Section: Signal Stream
		output += `${CYAN}${BOLD}--- SIGNAL & EVENT STREAM ---${RESET}\n`;

		// Pad logs so UI doesn't jump
		for (let i = 0; i < this.maxLogs; i++) {
			if (i < this.logs.length) {
				const log = this.logs[i];
				let color = RESET;
				if (log.type === "buy") color = BG_GREEN;
				else if (log.type === "sell") color = BG_RED;
				else if (log.type === "error") color = RED;

				output += `  [${log.time}] ${color}${log.msg}${RESET}\n`;
			} else {
				output += `\n`;
			}
		}

		output += `\n${hr}\n`;
		output += `${YELLOW}Press Ctrl+C to exit${RESET}\n`;

		// clear to end of screen for anything left over
		output += `${ESC}[J`;

		process.stdout.write(output);
	}
}

if (import.meta.main) {
	const config = loadConfig();
	// Override base URL to point to localhost or anything, mock fetch catches it
	const client = new BinanceClient({ ...config } as any);

	const symbol = process.argv[2] || "BTCUSDT";
	const dashboard = new Dashboard(client, symbol, 1000); // 1-second refresh

	process.on("SIGINT", () => {
		dashboard.stop();
		process.exit(0);
	});

	dashboard.start().catch((err) => {
		console.error(err);
		process.exit(1);
	});
}
