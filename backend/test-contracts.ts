import { PriorityEngine } from './src/engine.js';
import { persistentStore } from './src/contracts.js';
import * as assert from 'assert';

function runTests() {
  console.log('Running Viewing Contracts & Engine Tests...');

  // Reset to clean demo state
  persistentStore.resetDemo();
  const engine = new PriorityEngine();

  // 1. Verify Active Contract
  const activeContract = persistentStore.getActiveContract();
  assert.ok(activeContract, 'Active contract should exist');
  assert.strictEqual(activeContract?.name, 'Focus Mode');
  assert.strictEqual(activeContract?.status, 'active');

  // 2. Critical Alert (Security) interrupts immediately
  const criticalEvent = engine.simulateEvent({
    id: 'test-crit-1',
    title: 'Doorbell Alert',
    message: 'Person detected',
    sourceDevice: 'Ring Doorbell',
    category: 'security',
    timestamp: '10:00 AM',
    simulated: true
  });
  assert.strictEqual(criticalEvent.status, 'displayed');
  assert.strictEqual(criticalEvent.appliedRule, 'interrupt_now');
  assert.strictEqual(criticalEvent.soundPlayed, 'critical');

  // 3. Package Alert queues until break
  const packageEvent = engine.simulateEvent({
    id: 'test-pkg-1',
    title: 'Package Delivery',
    message: 'Box delivered',
    sourceDevice: 'Parcel Box',
    category: 'package',
    timestamp: '10:05 AM',
    simulated: true
  });
  assert.strictEqual(packageEvent.status, 'pending');
  assert.strictEqual(packageEvent.appliedRule, 'next_break');

  // 4. Trigger viewing break releases package alert
  engine.triggerViewingBreak('credits');
  const packageUpdated = engine.getDecision('test-pkg-1');
  assert.strictEqual(packageUpdated?.status, 'displayed');
  assert.ok(packageUpdated?.explanation.includes('credits'));

  // 5. Routine Thermostat update summarizes later
  const thermoEvent = engine.simulateEvent({
    id: 'test-thermo-1',
    title: 'Temp Update',
    message: '72F reached',
    sourceDevice: 'Thermostat',
    category: 'thermostat',
    timestamp: '10:10 AM',
    simulated: true
  });
  assert.strictEqual(thermoEvent.status, 'pending');
  assert.strictEqual(thermoEvent.appliedRule, 'summarize_later');

  // 6. Test rule modification
  engine.setRule('package', 'summarize_later');
  const rules = engine.getRules();
  assert.strictEqual(rules.package, 'summarize_later');

  // 7. Verify contract summary counts
  const updatedContract = persistentStore.getActiveContract();
  assert.ok(updatedContract?.notificationSummary);
  assert.ok(updatedContract!.notificationSummary!.totalEvents >= 6);

  console.log('✅ All 7 Viewing Contracts & Priority Engine tests passed successfully!');
}

runTests();
