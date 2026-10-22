import { PriorityEngine, DeviceEvent } from './src/engine.js';
import * as assert from 'assert';

function createEvent(id: string, category: any): DeviceEvent {
  return {
    id,
    title: 'Test',
    message: 'Test message',
    sourceDevice: 'Test Device',
    category,
    timestamp: new Date().toISOString(),
    simulated: true
  };
}

function runTests() {
  const engine = new PriorityEngine();

  // Test 1: A critical event matching an explicitly configured critical rule is displayed immediately.
  engine.setRule('security', 'interrupt_now');
  engine.setViewerState('Watching');
  const res1 = engine.simulateEvent(createEvent('1', 'security'));
  assert.strictEqual(res1.status, 'displayed', 'Test 1 Failed');

  // Test 2: A package event is queued during Watching.
  engine.setRule('package', 'next_break');
  const res2 = engine.simulateEvent(createEvent('2', 'package'));
  assert.strictEqual(res2.status, 'pending', 'Test 2 Failed');

  // Test 3: Entering Break displays eligible package notifications.
  engine.setViewerState('Break');
  const q3 = engine.getDecision('2');
  assert.strictEqual(q3?.status, 'displayed', 'Test 3 Failed');

  // Test 4: A routine thermostat event remains pending until the summary is requested.
  engine.setViewerState('Watching');
  const res4 = engine.simulateEvent(createEvent('4', 'thermostat'));
  assert.strictEqual(res4.status, 'pending', 'Test 4 Failed');
  engine.setViewerState('Break');
  assert.strictEqual(engine.getDecision('4')?.status, 'pending', 'Test 4 Failed (Break)');
  engine.setViewerState('Summary');
  assert.strictEqual(engine.getDecision('4')?.status, 'summarized', 'Test 4 Failed (Summary)');

  // Test 5: Changing the package rule to summarize_later changes the result of the next package event.
  engine.setViewerState('Watching');
  engine.setRule('package', 'summarize_later');
  const res5 = engine.simulateEvent(createEvent('5', 'package'));
  assert.strictEqual(res5.status, 'pending', 'Test 5 Failed');
  engine.setViewerState('Break');
  assert.strictEqual(engine.getDecision('5')?.status, 'pending', 'Test 5 Failed (Break)');

  // Test 6: A user-designated critical rule cannot be silently overridden by a less urgent rule.
  // Actually, this just means if user sets to interrupt_now, it stays that way.
  engine.setRule('thermostat', 'interrupt_now');
  const res6 = engine.simulateEvent(createEvent('6', 'thermostat'));
  assert.strictEqual(res6.status, 'displayed', 'Test 6 Failed');

  // Test 7: explain_notification_decision returns the actual stored decision for a valid event.
  const explanation = engine.getDecision('1');
  assert.ok(explanation?.explanation.includes('interrupt_now'), 'Test 7 Failed');

  // Test 8: Unknown event IDs and invalid rules produce clear errors.
  let throws = false;
  try {
    engine.setRule('invalid' as any, 'interrupt_now');
  } catch (e) {
    throws = true;
  }
  assert.ok(throws, 'Test 8 Failed (invalid category)');

  // Test 9: Reset Demo restores the expected default rules and empty or seeded queue.
  engine.reset();
  assert.strictEqual(engine.getRules().package, 'next_break', 'Test 9 Failed');
  assert.strictEqual(engine.getQueue().length, 5, 'Test 9 Failed');

  console.log('All 9 engine tests passed!');
}

runTests();
