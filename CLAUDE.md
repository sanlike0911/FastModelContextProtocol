# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Model Context Protocol (MCP) server implementation built with TypeScript. The project creates MCP servers that can be used as tools in Claude conversations, providing weather data and other functionality through the MCP SDK.

## Build and Development Commands

- `npm run build` - Compile TypeScript to JavaScript (outputs to `dist/`)
- `npm run start` - Run the main server (`dist/index.js`)
- `npm run dev` - Build and run in one command
- `npm run dev:watch` - Watch TypeScript files for changes and rebuild
- `npm run debug` - Start with Node.js debugger attached (port 9229)
- `npm run debug:watch` - Watch mode with debugger

## Architecture

### Source Structure
- `src/index.ts` - Main weather MCP server with NWS API integration
- `src/examples/` - Additional MCP server examples
  - `weather.ts` - Duplicate weather server (same as index.ts)
  - `helloWorld.ts` - Simple greeting MCP server

### MCP Server Pattern
All servers follow this structure:
1. Create `McpServer` instance with name, version, and capabilities
2. Register tools using `server.tool()` with schema validation via Zod
3. Initialize with `StdioServerTransport` in `main()` function
4. Use `console.error()` for logging (stdout is reserved for MCP protocol)

### Key Dependencies
- `@modelcontextprotocol/sdk` - Core MCP functionality
- `zod` - Schema validation for tool parameters
- `typescript` - Language and build system

## TypeScript Configuration

The project uses strict TypeScript settings:
- Compiles from `src/` to `dist/`
- Source maps enabled for debugging
- Module: `nodenext` for Node.js ES modules
- Strict type checking enabled

## Debugging Setup

VS Code debugging configurations are available:
- "Debug Main (index.js)" - Debug the main weather server
- "Debug Current File in examples/" - Debug any file in src/examples/
- "Attach to Node" - Attach to running Node process

## Binary Distribution

The main weather server is configured as a CLI tool named "weather" in package.json, pointing to `dist/index.js`.