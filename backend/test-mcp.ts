import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';

async function main() {
  const transport = new SSEClientTransport(new URL('http://localhost:3001/mcp'));
  const client = new Client({ name: "test", version: "1.0.0" }, { capabilities: {} });
  
  await client.connect(transport);
  console.log("Connected!");
  
  const tools = await client.listTools();
  console.log("Tools:", tools);
  
  const result = await client.callTool({ name: 'list_connected_devices', arguments: {} });
  console.log("Devices:", result);
  
  process.exit(0);
}

main().catch(console.error);
