# Fast Model Context Protocol

MCPサーバの構築とテストを目的としたプロジェクトです。Claude Desktop、Cursor、VS Code等でMCPサーバを利用することを想定しています。

## Model Context Protocol (MCP) とは

Model Context Protocol（MCP）は、Anthropic社が開発したプロトコルで、AI アシスタント（Claude など）に外部ツールやデータソースへのアクセス機能を提供します。MCPサーバは、AIが利用できるツールとしてカスタム機能を公開できます。

### MCPの主要コンポーネント

- **MCP Server**: ツールやリソースを提供するサーバー
- **MCP Client**: サーバーに接続してツールを利用するクライアント（Claude Desktopなど）
- **Transport**: クライアントとサーバー間の通信方法（stdio、HTTP等）

## 概要

このプロジェクトは、Model Context Protocol (MCP) サーバの実装例を提供します。TypeScriptで記述されており、以下のMCPサーバが含まれています：

- **Weather Server** - NWS APIを使用した天気情報サーバ
- **Hello World Server** - シンプルな挨拶とタイムスタンプサーバ

## セットアップ

### 前提条件

- Node.js 18.0.0以上
- npm

### インストール

```bash
npm install
```

### ビルド

```bash
npm run build
```

## 使用方法

### Claude Desktopでの利用

Claude Desktopの設定ファイル（`claude_desktop_config.json`）に以下を追加：

```json
{
  "mcpServers": {
    "weather": {
      "command": "node",
      "args": ["path/to/this/project/dist/index.js"]
    },
    "hello-world": {
      "command": "node",
      "args": ["path/to/this/project/dist/examples/helloWorld.js"]
    }
  }
}
```

### CursorやVS Codeでの利用

MCPクライアント拡張機能を使用して、ビルドされたJSファイルを指定してください。

### MCPサーバのテスト

MCPサーバを直接テストするには、以下の方法があります：

```bash
# Weather Serverをテスト
echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/list"}' | node dist/index.js

# Hello World Serverをテスト
echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/list"}' | node dist/examples/helloWorld.js
```

## MCPを使用したプロンプト例

Claude DesktopでMCPサーバが設定されている場合、以下のようなプロンプトでツールを活用できます：

### Weather Serverの使用例

```
東京の天気予報を教えてください。緯度35.6762、経度139.6503で確認してください。
```

```
カリフォルニア州の天気警報を確認してください。
```

```
明日の関東地方の天気はどうなりそうですか？横浜の座標（35.4437, 139.6380）で予報を取得してください。
```

### Hello World Serverの使用例

```
Hello Worldツールを使って挨拶してください。
```

```
私の名前は「太郎」です。挨拶ツールで私に挨拶してください。
```

```
現在の時刻を教えてください。時刻取得ツールを使用してください。
```

### 複数ツールを組み合わせた例

```
まず現在時刻を確認して、その後東京（35.6762, 139.6503）の天気予報を取得してください。時刻と天気情報をまとめて報告してください。
```

```
カリフォルニア州の天気警報をチェックして、もし警報がある場合は私に「警告あり」と挨拶ツールで伝えてください。
```

### 開発・テスト用のプロンプト

```
利用可能なMCPツールを全て一覧表示してください。各ツールの機能も説明してください。
```

```
天気取得ツールのパラメータ仕様を確認したいので、ツールの詳細情報を表示してください。
```

### 実用的な活用例

```
今から屋外イベントを予定しています。[座標]の天気予報を確認して、雨の可能性があるかどうか教えてください。併せて現在時刻も確認してください。
```

```
週末の旅行計画を立てています。フロリダ州の天気警報と、マイアミ（25.7617, -80.1918）の天気予報を確認してください。
```

### MCPツールの動作確認

```
MCPサーバが正常に動作しているか確認したいので、Hello Worldツールで簡単なテストを実行してください。
```

```
天気APIが正常にアクセスできるか、ニューヨーク（40.7128, -74.0060）の天気を取得してテストしてください。
```

## MCP SDK の使い方

### 基本的なMCPサーバの構造

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// 1. サーバーインスタンスの作成
const server = new McpServer({
  name: "サーバー名",
  version: "1.0.0",
  capabilities: {
    resources: {},  // リソース機能（オプション）
    tools: {},      // ツール機能（必須）
  },
});
```

### ツールの登録

```typescript
// 2. ツールの登録
server.tool(
  "tool_name",           // ツール名（一意である必要がある）
  "ツールの説明",         // 人間が読める説明
  {
    // 3. パラメータのスキーマ定義（Zodを使用）
    param1: z.string().describe("パラメータ1の説明"),
    param2: z.number().optional().describe("オプションのパラメータ2"),
  },
  async (params) => {
    // 4. ツールの実装
    const { param1, param2 } = params;

    // ビジネスロジックの実行
    const result = await someAsyncOperation(param1, param2);

    // 5. レスポンスの返却
    return {
      content: [
        {
          type: "text",
          text: `結果: ${result}`
        }
      ]
    };
  }
);
```

### サーバーの起動

```typescript
// 6. メイン関数
async function main() {
  // Stディオトランスポートの作成
  const transport = new StdioServerTransport();

  // サーバーの接続
  await server.connect(transport);

  // ログ出力（stderrを使用）
  console.error("MCP Server running on stdio");
}

// 7. エラーハンドリングと起動
main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
```

### パラメータの型定義とバリデーション

Zodを使用してパラメータの型安全性を確保：

```typescript
// 基本的な型
z.string()                    // 文字列
z.number()                    // 数値
z.boolean()                   // 真偽値
z.array(z.string())          // 文字列配列

// バリデーション付き
z.string().min(1).max(100)   // 長さ制限
z.number().min(0).max(100)   // 数値範囲
z.string().email()           // メール形式

// オプション
z.string().optional()        // オプショナル
z.string().default("default") // デフォルト値

// 説明付き
z.string().describe("ユーザー名")  // 説明文
```

### レスポンス形式

MCPツールは以下の形式でレスポンスを返す必要があります：

```typescript
return {
  content: [
    {
      type: "text",
      text: "テキストレスポンス"
    },
    // 複数のコンテンツを返すことも可能
    {
      type: "text",
      text: "追加のテキスト"
    }
  ]
};
```

### エラーハンドリング

```typescript
server.tool("example", "説明", {}, async () => {
  try {
    const result = await riskyOperation();
    return {
      content: [{
        type: "text",
        text: `成功: ${result}`
      }]
    };
  } catch (error) {
    return {
      content: [{
        type: "text",
        text: `エラー: ${error.message}`
      }]
    };
  }
});
```

### リソースの提供（オプション）

静的なデータやドキュメントを提供する場合：

```typescript
const server = new McpServer({
  name: "example",
  version: "1.0.0",
  capabilities: {
    resources: {},
    tools: {},
  },
});

// リソースの登録
server.resource(
  "resource://example/data",
  "Example data resource",
  "application/json",
  async () => {
    return JSON.stringify({ data: "example" });
  }
);
```

## 開発

### 開発コマンド

```bash
# ビルド
npm run build

# 開発モード（ビルド + 実行）
npm run dev

# ファイル監視モード
npm run dev:watch

# デバッグモード
npm run debug
```

### デバッグ

VS Codeでのデバッグ設定が含まれています：

1. VS Codeでプロジェクトを開く
2. F5キーまたは「実行とデバッグ」パネルから設定を選択：
   - **Debug Main (index.js)** - メインの天気サーバをデバッグ
   - **Debug Current File in examples/** - examples フォルダ内のファイルをデバッグ

### 新しいMCPサーバの作成

1. `src/examples/` に新しい `.ts` ファイルを作成
2. 基本的なMCPサーバの構造に従って実装：

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new McpServer({
  name: "your-server-name",
  version: "1.0.0",
  capabilities: {
    resources: {},
    tools: {},
  },
});

server.tool(
  "tool_name",
  "Tool description",
  {
    // Zod schema for parameters
  },
  async (params) => {
    // Tool implementation
    return {
      content: [{
        type: "text",
        text: "Response text"
      }]
    };
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Your Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
```

## 含まれるMCPサーバ

### Weather Server (`src/index.ts`)

NWS (National Weather Service) APIを使用した天気情報サーバ

**利用可能なツール:**
- `get_alerts` - 州の天気警報を取得
- `get_forecast` - 座標指定での天気予報を取得

### Hello World Server (`src/examples/helloWorld.ts`)

シンプルなテスト用サーバ

**利用可能なツール:**
- `say_hello` - 挨拶メッセージを返す
- `get_time` - 現在時刻を返す

## プロジェクト構造

```
├── src/
│   ├── index.ts              # メインの天気サーバ
│   └── examples/
│       ├── weather.ts        # 天気サーバ（重複）
│       └── helloWorld.ts     # Hello Worldサーバ
├── dist/                     # ビルド出力
├── .vscode/                  # VS Codeデバッグ設定
├── package.json
├── tsconfig.json
└── README.md
```

## ライセンス

ISC

## 貢献

プルリクエストやイシューの報告を歓迎します。新しいMCPサーバの例を追加する場合は、`src/examples/` ディレクトリに配置してください。