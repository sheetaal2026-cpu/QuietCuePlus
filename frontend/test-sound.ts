import { evaluateSounds, QueueItem, SoundSettings } from './src/soundLogic.js';

function runTests() {
  console.log("Running Sound Logic Tests...");
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

  const baseSettings: SoundSettings = { soundEnabled: true, masterMute: false, soundMode: 'all', summaryChime: true };

  // 1. A surfaced critical notification requests exactly two beep tones.
  let queue: QueueItem[] = [
    { id: '1', status: 'displayed', appliedRule: 'interrupt_now', event: { category: 'security' } }
  ];
  let res = evaluateSounds(queue, 'Watching', 'Watching', new Set(), baseSettings);
  assertEqual(res.actions.length, 1, "Critical generates one action");
  assertEqual(res.actions[0].playMethod, 'playCritical', "Critical requests playCritical (2 beeps)");

  // 2. A normal notification queued during Watching produces no sound.
  queue = [
    { id: '2', status: 'pending', appliedRule: 'next_break', event: { category: 'package' } }
  ];
  res = evaluateSounds(queue, 'Watching', 'Watching', new Set(), baseSettings);
  assertEqual(res.actions.length, 0, "Pending normal notification produces no sound");

  // 3. Surfacing that notification at Break requests one soft beep.
  queue = [
    { id: '2', status: 'displayed', appliedRule: 'next_break', event: { category: 'package' } }
  ];
  res = evaluateSounds(queue, 'Break', 'Watching', new Set(), baseSettings);
  assertEqual(res.actions.length, 1, "Surfaced normal notification produces action");
  assertEqual(res.actions[0].playMethod, 'playNormal', "Requests playNormal (1 beep)");

  // 4. A routine notification produces no sound when it arrives.
  queue = [
    { id: '3', status: 'pending', appliedRule: 'summarize_later', event: { category: 'thermostat' } }
  ];
  res = evaluateSounds(queue, 'Watching', 'Watching', new Set(), baseSettings);
  assertEqual(res.actions.length, 0, "Routine notification produces no sound on arrival");

  // 5. Critical-only mode suppresses normal sounds but permits configured critical sounds.
  queue = [
    { id: '4', status: 'displayed', appliedRule: 'interrupt_now', event: { category: 'security' } },
    { id: '5', status: 'displayed', appliedRule: 'next_break', event: { category: 'package' } }
  ];
  res = evaluateSounds(queue, 'Break', 'Watching', new Set(), { ...baseSettings, soundMode: 'critical' });
  assertEqual(res.actions.length, 2, "Generates 2 actions for logging");
  assertEqual(res.actions[0].playMethod, 'playCritical', "Critical plays");
  assertEqual(res.actions[1].status, 'excluded', "Normal is excluded by soundMode");

  // 6. Muting all sounds prevents notification beeps while preserving visual alerts.
  res = evaluateSounds(queue, 'Watching', 'Watching', new Set(), { ...baseSettings, masterMute: true });
  assertEqual(res.actions[0].status, 'muted', "Critical is muted");
  assertEqual(res.actions[1].status, 'muted', "Normal is muted");

  // 7. Refreshing the queue does not replay sounds for an already surfaced notification.
  res = evaluateSounds(queue, 'Watching', 'Watching', new Set(['4', '5']), baseSettings);
  assertEqual(res.actions.length, 0, "Already played IDs produce no actions");

  // Summary Chime test (implicit in requirement 3 optional)
  queue = [
    { id: '6', status: 'summarized', appliedRule: 'summarize_later', event: { category: 'thermostat' } }
  ];
  res = evaluateSounds(queue, 'Summary', 'Watching', new Set(), baseSettings);
  assertEqual(res.actions.length, 1, "Summary chime action created");
  assertEqual(res.actions[0].playMethod, 'playSummary', "Requests summary chime");

  console.log(`\nTests completed: ${passed}/${total} passed.`);
}

runTests();
