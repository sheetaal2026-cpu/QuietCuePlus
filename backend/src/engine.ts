import { 
  persistentStore, 
  ViewingContract, 
  ViewingRule, 
  DeviceEvent, 
  NotificationRecord, 
  EventCategory, 
  HandlingPolicy, 
  ViewerState,
  NotificationStatus 
} from './contracts.js';

export type { EventCategory, HandlingPolicy, ViewerState, NotificationStatus, DeviceEvent, NotificationRecord };

const VALID_CATEGORIES: EventCategory[] = [
  'security',
  'package',
  'thermostat',
  'light',
  'system',
  'timer',
  'device_unavailable',
  'health',
  'calendar'
];

export type EngineBroadcastEvent = {
  type:
    | 'state_sync'
    | 'event_simulated'
    | 'break_triggered'
    | 'viewer_state_changed'
    | 'rule_updated'
    | 'contract_updated'
    | 'notification_released'
    | 'notification_dismissed'
    | 'session_ended'
    | 'demo_reset'
    | 'timer_updated'
    | 'timer_completed'
    | 'timer_cancelled'
    | 'language_changed';
  timestamp: string;
  payload?: any;
};

export interface ModeTimerState {
  minutes: number;
  totalSeconds: number;
  remainingSeconds: number;
  isRunning: boolean;
  modeName: string;
  endsAt: number;
}

type EngineListener = (evt: EngineBroadcastEvent) => void;

export class PriorityEngine {
  private viewerState: ViewerState = 'Watching';
  private listeners: Set<EngineListener> = new Set();
  private modeTimer: ModeTimerState | null = null;
  private timerInterval: NodeJS.Timeout | null = null;
  private currentLanguage: string = 'en';

  constructor() {
    this.timerInterval = setInterval(() => {
      this.tickTimer();
    }, 1000);
  }

  private tickTimer() {
    if (!this.modeTimer || !this.modeTimer.isRunning) return;

    this.modeTimer.remainingSeconds -= 1;
    if (this.modeTimer.remainingSeconds <= 0) {
      const finishedTimer = { ...this.modeTimer };
      this.modeTimer = null;

      // 1. Trigger viewing break quietly
      this.triggerViewingBreak('timer');

      // 2. Add a friendly timer notification
      this.simulateEvent({
        id: `evt-timer-${Date.now()}`,
        title: `${finishedTimer.modeName} Timer Complete`,
        message: `Your ${finishedTimer.minutes}-minute ${finishedTimer.modeName} timer has finished. Switched to viewing break ☕.`,
        sourceDevice: 'QuietCue+ Mode Timer',
        category: 'timer',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        simulated: true
      });

      // 3. Broadcast timer completed
      this.broadcast('timer_completed', {
        timer: finishedTimer,
        viewerState: this.viewerState
      });
    } else {
      if (this.modeTimer.remainingSeconds % 5 === 0) {
        this.broadcast('timer_updated', { timer: this.modeTimer });
      }
    }
  }

  public getModeTimer(): ModeTimerState | null {
    return this.modeTimer;
  }

  public setModeTimer(minutes: number, modeName = 'Focus Mode'): ModeTimerState {
    const validMinutes = Math.max(1, Math.min(240, Number(minutes) || 25));
    const totalSeconds = Math.round(validMinutes * 60);
    this.modeTimer = {
      minutes: validMinutes,
      totalSeconds,
      remainingSeconds: totalSeconds,
      isRunning: true,
      modeName,
      endsAt: Date.now() + totalSeconds * 1000
    };
    this.broadcast('timer_updated', { timer: this.modeTimer });
    return this.modeTimer;
  }

  public pauseModeTimer(): ModeTimerState | null {
    if (this.modeTimer) {
      this.modeTimer.isRunning = false;
      this.broadcast('timer_updated', { timer: this.modeTimer });
    }
    return this.modeTimer;
  }

  public resumeModeTimer(): ModeTimerState | null {
    if (this.modeTimer) {
      this.modeTimer.isRunning = true;
      this.modeTimer.endsAt = Date.now() + this.modeTimer.remainingSeconds * 1000;
      this.broadcast('timer_updated', { timer: this.modeTimer });
    }
    return this.modeTimer;
  }

  public cancelModeTimer(): boolean {
    if (this.modeTimer) {
      this.modeTimer = null;
      this.broadcast('timer_cancelled', {});
      return true;
    }
    return false;
  }

  public getLanguage(): string {
    return this.currentLanguage;
  }

  public setLanguage(lang: string): string {
    this.currentLanguage = lang || 'en';
    this.broadcast('language_changed', { language: this.currentLanguage });
    return this.currentLanguage;
  }

  public subscribe(listener: EngineListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public broadcast(type: EngineBroadcastEvent['type'], payload?: any) {
    const evt: EngineBroadcastEvent = {
      type,
      timestamp: new Date().toISOString(),
      payload
    };
    for (const listener of this.listeners) {
      try {
        listener(evt);
      } catch (e) {
        console.error('Error in engine listener:', e);
      }
    }
  }

  public reset() {
    persistentStore.resetDemo();
    this.viewerState = 'Watching';
    this.modeTimer = null;
    this.broadcast('demo_reset', {
      viewerState: this.viewerState,
      activeContract: persistentStore.getActiveContract(),
      notifications: persistentStore.getNotifications()
    });
  }

  public getViewerState(): ViewerState {
    return this.viewerState;
  }

  public setViewerState(state: ViewerState) {
    this.viewerState = state;
    const released = this.evaluateQueue();
    this.broadcast('viewer_state_changed', {
      viewerState: this.viewerState,
      releasedNotifications: released,
      notifications: persistentStore.getNotifications()
    });
    return this.viewerState;
  }

  public getRules(): Record<EventCategory, HandlingPolicy> {
    const contract = persistentStore.getActiveContract();
    const rulesMap: Record<string, HandlingPolicy> = {
      security: 'interrupt_now',
      package: 'next_break',
      thermostat: 'summarize_later',
      light: 'summarize_later',
      system: 'summarize_later',
      timer: 'interrupt_now',
      device_unavailable: 'next_break'
    };

    if (contract && contract.rules) {
      for (const r of contract.rules) {
        rulesMap[r.eventCategory] = r.handlingPolicy;
      }
    }
    return rulesMap as Record<EventCategory, HandlingPolicy>;
  }

  public setRule(category: EventCategory, policy: HandlingPolicy) {
    if (!VALID_CATEGORIES.includes(category)) {
      throw new Error(`Invalid category: ${category}`);
    }
    if (!['interrupt_now', 'next_break', 'summarize_later'].includes(policy)) {
      throw new Error(`Invalid policy: ${policy}`);
    }
    const contract = persistentStore.getActiveContract();
    if (!contract) {
      throw new Error('No active viewing contract found');
    }

    const existingRule = contract.rules.find(r => r.eventCategory === category);
    if (existingRule) {
      existingRule.handlingPolicy = policy;
      existingRule.updatedAt = new Date().toISOString();
      existingRule.userDefined = true;
    } else {
      contract.rules.push({
        eventCategory: category,
        handlingPolicy: policy,
        priority: 3,
        userDefined: true,
        updatedAt: new Date().toISOString()
      });
    }

    contract.updatedAt = new Date().toISOString();
    persistentStore.saveContract(contract);
    this.broadcast('rule_updated', {
      category,
      policy,
      activeContract: contract
    });
    return policy;
  }

  public simulateEvent(event: DeviceEvent): NotificationRecord {
    const contract = persistentStore.getActiveContract();
    const rules = this.getRules();
    const policy = rules[event.category] || 'summarize_later';

    let status: NotificationStatus = 'pending';
    let soundToPlay: 'critical' | 'normal' | 'summary' | 'none' = 'none';
    const categoryLabel = event.category.replace(/_/g, ' ');
    let explanation = '';

    // Priority calculation (1 = critical, 2 = package, etc.)
    const ruleObj = contract?.rules.find(r => r.eventCategory === event.category);
    const priority = ruleObj ? ruleObj.priority : (policy === 'interrupt_now' ? 1 : 3);

    if (policy === 'interrupt_now') {
      status = 'displayed';
      soundToPlay = 'critical';
      explanation = 'Displayed immediately on screen • 2 beeps';
    } else if (policy === 'next_break') {
      if (this.viewerState === 'Break') {
        status = 'displayed';
        soundToPlay = 'normal';
        explanation = 'Displayed immediately during break • 1 beep';
      } else {
        status = 'pending';
        explanation = 'Held quietly for next viewing break';
      }
    } else if (policy === 'summarize_later') {
      if (this.viewerState === 'Summary') {
        status = 'summarized';
        soundToPlay = 'summary';
        explanation = 'Added to session digest • Silent';
      } else {
        status = 'pending';
        explanation = 'Saved for session digest • Silent';
      }
    }

    const record: NotificationRecord = {
      id: event.id,
      contractId: contract?.contractId || 'default',
      event,
      appliedRule: policy,
      priority,
      status,
      explanation,
      handledAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      soundPlayed: soundToPlay
    };

    persistentStore.addNotification(record);
    this.updateContractSummary();
    this.broadcast('event_simulated', {
      record,
      viewerState: this.viewerState,
      activeContract: persistentStore.getActiveContract()
    });
    return record;
  }

  public triggerViewingBreak(condition = 'break'): NotificationRecord[] {
    this.viewerState = 'Break';
    const released: NotificationRecord[] = [];
    const all = persistentStore.getNotifications();
    for (const record of all) {
      if (record.status === 'pending' && record.appliedRule === 'next_break') {
        const updated = persistentStore.updateNotification(record.id, {
          status: 'displayed',
          explanation: 'Delivered during viewing break • 1 beep',
          handledAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          soundPlayed: 'normal'
        });
        if (updated) released.push(updated);
      }
    }
    this.updateContractSummary();
    this.broadcast('break_triggered', {
      condition,
      viewerState: this.viewerState,
      releasedNotifications: released,
      notifications: persistentStore.getNotifications(),
      activeContract: persistentStore.getActiveContract()
    });
    return released;
  }

  private evaluateQueue(): NotificationRecord[] {
    const updatedRecords: NotificationRecord[] = [];
    const all = persistentStore.getNotifications();
    for (const record of all) {
      if (record.status === 'pending') {
        if (record.appliedRule === 'next_break' && this.viewerState === 'Break') {
          const u = persistentStore.updateNotification(record.id, {
            status: 'displayed',
            explanation: 'Delivered during break • 1 beep',
            handledAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            soundPlayed: 'normal'
          });
          if (u) updatedRecords.push(u);
        } else if (record.appliedRule === 'summarize_later' && this.viewerState === 'Summary') {
          const u = persistentStore.updateNotification(record.id, {
            status: 'summarized',
            explanation: 'Included in session digest • Silent'
          });
          if (u) updatedRecords.push(u);
        } else if (record.appliedRule === 'next_break' && this.viewerState === 'Summary') {
          const u = persistentStore.updateNotification(record.id, {
            status: 'summarized',
            explanation: 'Included in session digest • Silent'
          });
          if (u) updatedRecords.push(u);
        }
      }
    }
    this.updateContractSummary();
    return updatedRecords;
  }

  public updateContractSummary() {
    const contract = persistentStore.getActiveContract();
    if (!contract) return;
    const notifications = persistentStore.getNotifications().filter(n => n.contractId === contract.contractId);
    contract.notificationSummary = {
      totalEvents: notifications.length,
      displayedCount: notifications.filter(n => n.status === 'displayed').length,
      queuedCount: notifications.filter(n => n.status === 'pending').length,
      summarizedCount: notifications.filter(n => n.status === 'summarized').length,
      dismissedCount: notifications.filter(n => n.status === 'dismissed').length
    };
    persistentStore.saveContract(contract);
  }

  public getQueue(): NotificationRecord[] {
    return persistentStore.getNotifications();
  }

  public getDecision(id: string): NotificationRecord | undefined {
    return persistentStore.getNotifications().find(n => n.id === id);
  }
}

export const engine = new PriorityEngine();
