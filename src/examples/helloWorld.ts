#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new McpServer({
  name: "hello-world",
  version: "1.0.0",
  capabilities: {
    resources: {},
    tools: {},
  },
});

server.tool(
  "say_hello",
  "Returns a simple hello world greeting",
  {
    name: z.string().optional().describe("Name to greet (optional)"),
  },
  async ({ name }) => {
    const greeting = name ? `Hello, ${name}!` : "Hello, World!";

    return {
      content: [
        {
          type: "text",
          text: greeting,
        },
      ],
    };
  },
);

server.tool(
  "get_time",
  "Returns the current time",
  {},
  async () => {
    const now = new Date();
    const timeString = now.toLocaleString();

    return {
      content: [
        {
          type: "text",
          text: `Current time: ${timeString}`,
        },
      ],
    };
  },
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Hello World MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});