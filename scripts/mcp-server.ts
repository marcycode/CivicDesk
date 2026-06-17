import { invokeMcpTool, mcpTools } from "@/lib/mcp";

type JsonRpcRequest = {
  jsonrpc: "2.0";
  id?: string | number | null;
  method: string;
  params?: Record<string, unknown>;
};

const stdin = process.stdin;
stdin.setEncoding("utf8");

let buffer = "";

stdin.on("data", (chunk) => {
  buffer += chunk;
  processBuffer();
});

stdin.on("end", () => {
  process.exit(0);
});

function processBuffer() {
  while (true) {
    const separatorIndex = buffer.indexOf("\r\n\r\n");
    if (separatorIndex === -1) {
      return;
    }

    const headerBlock = buffer.slice(0, separatorIndex);
    const contentLengthMatch = headerBlock.match(/Content-Length:\s*(\d+)/i);
    if (!contentLengthMatch) {
      buffer = "";
      return;
    }

    const contentLength = Number(contentLengthMatch[1]);
    const messageStart = separatorIndex + 4;
    if (buffer.length < messageStart + contentLength) {
      return;
    }

    const rawMessage = buffer.slice(messageStart, messageStart + contentLength);
    buffer = buffer.slice(messageStart + contentLength);

    const message = JSON.parse(rawMessage) as JsonRpcRequest;
    void handleMessage(message);
  }
}

async function handleMessage(message: JsonRpcRequest) {
  if (message.method === "notifications/initialized") {
    return;
  }

  try {
    switch (message.method) {
      case "initialize":
        return respond(message.id, {
          protocolVersion: "2025-03-26",
          capabilities: {
            tools: {}
          },
          serverInfo: {
            name: "civicdesk",
            version: "0.1.0"
          }
        });
      case "tools/list":
        return respond(message.id, { tools: mcpTools });
      case "tools/call": {
        const name = String(message.params?.name ?? "");
        const args = (message.params?.arguments as Record<string, unknown> | undefined) ?? {};
        const result = await invokeMcpTool(name, args);
        return respond(message.id, {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2)
            }
          ]
        });
      }
      default:
        return respondError(message.id, -32601, `Method not found: ${message.method}`);
    }
  } catch (error) {
    return respondError(message.id, -32000, error instanceof Error ? error.message : "Unknown error");
  }
}

function respond(id: JsonRpcRequest["id"], result: unknown) {
  if (id === undefined) {
    return;
  }

  send({
    jsonrpc: "2.0",
    id,
    result
  });
}

function respondError(id: JsonRpcRequest["id"], code: number, message: string) {
  if (id === undefined) {
    return;
  }

  send({
    jsonrpc: "2.0",
    id,
    error: {
      code,
      message
    }
  });
}

function send(payload: unknown) {
  const json = JSON.stringify(payload);
  process.stdout.write(`Content-Length: ${Buffer.byteLength(json, "utf8")}\r\n\r\n${json}`);
}
