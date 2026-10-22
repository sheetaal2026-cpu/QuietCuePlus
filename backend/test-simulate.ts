import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';

async function main() {
  const transport = new SSEClientTransport(new URL('http://localhost:3001/mcp'));
  const client = new Client({ name: "test", version: "1.0.0" }, { capabilities: {} });
  
  await client.connect(transport);
  console.log("Connected!");
  
  const result = await client.callTool({
    name: 'simulate_device_event',
    arguments: {
      id: "test-id",
      category: "security",
      title: "Motion Detected",
      message: "Front door camera detected motion.",
      sourceDevice: "Simulated Device"
    }
  });
  console.log("Simulate result:", JSON.stringify(result, null, 2));

  const queueResult = await client.callTool({
    name: 'get_notification_queue',
    arguments: {}
  });
  console.log("Queue result:", JSON.stringify(queueResult, null, 2));

  process.exit(0);
}

main().catch(console.error);
