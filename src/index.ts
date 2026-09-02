#!/usr/bin/env node
import { runServer } from "./server.js";

// Launch MCP server over stdio
runServer().catch((error) => {
	console.error("Fatal error running Binance MCP Server:", error);
	process.exit(1);
});
