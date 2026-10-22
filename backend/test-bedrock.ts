import { interpretCommand } from './src/bedrock.js';

async function runTests() {
  console.log("Running Bedrock Fallback Tests...");
  let passed = 0;
  let total = 0;

  function assertEqual(actual: any, expected: any, testName: string) {
    total++;
    const a = JSON.stringify(actual);
    const e = JSON.stringify(expected);
    if (a === e) {
      console.log(`✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${testName}\n  Expected: ${e}\n  Actual:   ${a}`);
    }
  }

  // Override fallback flag set to true so we test the pure deterministic parser locally without incurring AWS costs
  
  // 1. A valid natural-language request for connected devices
  let res = await interpretCommand("What devices are connected?", true);
  assertEqual(res.intent.intent, 'list_connected_devices', "Recognizes devices intent");
  assertEqual(res.source, 'fallback', "Uses fallback source");

  // 2. A request to defer package updates produces a valid set_notification_rule action
  res = await interpretCommand("Keep package updates silent until I ask", true);
  assertEqual(res.intent.intent, 'set_notification_rule', "Recognizes set_notification_rule intent");
  assertEqual(res.intent.arguments.category, 'package', "Parses category argument");
  assertEqual(res.intent.arguments.policy, 'summarize_later', "Parses policy argument");

  // 3. Ambiguous request triggers clarification
  res = await interpretCommand("Why did it do that?", true);
  assertEqual(res.intent.intent, 'unknown', "Unclear why statement maps to unknown intent initially in fallback");
  assertEqual(res.intent.requiresClarification, true, "Requires clarification for missing ID");

  // 4. Unrelated request does not invoke tool
  res = await interpretCommand("What is the weather today?", true);
  assertEqual(res.intent.intent, 'unknown', "Unrelated request maps to unknown");
  assertEqual(res.intent.requiresClarification, false, "Does not require clarification for unrelated");

  console.log(`\nTests completed: ${passed}/${total} passed.`);
}

runTests().catch(console.error);
