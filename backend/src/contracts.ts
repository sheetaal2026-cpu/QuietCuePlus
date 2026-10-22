import fs from 'fs';
import path from 'path';

export type ActivityType = 'movie' | 'sports' | 'family' | 'study' | 'custom' | 'vr';
export type ContractStatus = 'draft' | 'active' | 'paused' | 'completed';
export type HandlingPolicy = 'interrupt_now' | 'next_break' | 'summarize_later';
export type EventCategory = 'security' | 'package' | 'thermostat' | 'light' | 'system' | 'timer' | 'device_unavailable' | 'health' | 'calendar';
export type ViewerState = 'Watching' | 'Paused' | 'Break' | 'Summary';
export type NotificationStatus = 'pending' | 'displayed' | 'summarized' | 'dismissed';

export interface ViewingRule {
  eventCategory: EventCategory;
  handlingPolicy: HandlingPolicy;
  displayCondition?: 'credits' | 'immediate' | 'pause' | 'summary_only';
  priority: number; // 1 (highest) to 5
  userDefined: boolean;
  updatedAt: string;
}

export interface BreakConfiguration {
  allowMidBreaks: boolean;
  releaseOnCredits: boolean;
  scheduledBreaks?: string[];
}

export interface ViewingContract {
  contractId: string;
  name: string;
  activityType: ActivityType;
  status: ContractStatus;
  createdAt: string;
  updatedAt: string;
  rules: ViewingRule[];
  sessionStartTime: string;
  sessionEndTime?: string;
  breakConfiguration?: BreakConfiguration;
  endCondition?: string;
  notificationSummary?: {
    totalEvents: number;
    displayedCount: number;
    queuedCount: number;
    summarizedCount: number;
    dismissedCount: number;
  };
}

export interface DeviceEvent {
  id: string;
  title: string;
  message: string;
  sourceDevice: string;
  category: EventCategory;
  timestamp: string;
  simulated: boolean;
  metadata?: Record<string, any>;
}

export interface NotificationRecord {
  id: string;
  contractId: string;
  event: DeviceEvent;
  appliedRule: HandlingPolicy;
  priority: number;
  status: NotificationStatus;
  explanation: string;
  handledAt: string;
  soundPlayed?: 'critical' | 'normal' | 'summary' | 'none';
}

const DB_FILE = path.resolve(process.cwd(), 'quietcue_store.json');

export interface StorageData {
  contracts: Record<string, ViewingContract>;
  activeContractId: string | null;
  notifications: NotificationRecord[];
  soundPreferences: {
    volume: number;
    criticalSound: boolean;
    normalSound: boolean;
    routineSound: boolean;
    quietMode: boolean;
  };
}

export function getDefaultMovieRules(): ViewingRule[] {
  const now = new Date().toISOString();
  return [
    {
      eventCategory: 'security',
      handlingPolicy: 'interrupt_now',
      priority: 1,
      userDefined: true,
      updatedAt: now
    },
    {
      eventCategory: 'package',
      handlingPolicy: 'next_break',
      displayCondition: 'credits',
      priority: 2,
      userDefined: true,
      updatedAt: now
    },
    {
      eventCategory: 'thermostat',
      handlingPolicy: 'summarize_later',
      priority: 3,
      userDefined: false,
      updatedAt: now
    },
    {
      eventCategory: 'light',
      handlingPolicy: 'summarize_later',
      priority: 4,
      userDefined: false,
      updatedAt: now
    },
    {
      eventCategory: 'device_unavailable',
      handlingPolicy: 'next_break',
      priority: 5,
      userDefined: false,
      updatedAt: now
    },
    {
      eventCategory: 'health',
      handlingPolicy: 'next_break',
      displayCondition: 'pause',
      priority: 2,
      userDefined: true,
      updatedAt: now
    },
    {
      eventCategory: 'calendar',
      handlingPolicy: 'next_break',
      displayCondition: 'pause',
      priority: 3,
      userDefined: true,
      updatedAt: now
    }
  ];
}

export function getDefaultStorage(): StorageData {
  const defaultContractId = 'contract-focus-mode';
  const now = new Date().toISOString();
  const defaultContract: ViewingContract = {
    contractId: defaultContractId,
    name: 'Focus Mode',
    activityType: 'movie',
    status: 'active',
    createdAt: now,
    updatedAt: now,
    sessionStartTime: now,
    breakConfiguration: {
      allowMidBreaks: true,
      releaseOnCredits: true
    },
    endCondition: 'movie_credits_or_manual',
    rules: getDefaultMovieRules(),
    notificationSummary: {
      totalEvents: 6,
      displayedCount: 1,
      queuedCount: 4,
      summarizedCount: 1,
      dismissedCount: 0
    }
  };

  const initialNotifications: NotificationRecord[] = [
    {
      id: 'evt-doorbell-1',
      contractId: defaultContractId,
      event: {
        id: 'evt-doorbell-1',
        title: 'Critical alert - Doorbell',
        message: 'Front door camera detected person at doorstep.',
        sourceDevice: 'Front Door - Ring',
        category: 'security',
        timestamp: '8:24 AM',
        simulated: true
      },
      appliedRule: 'interrupt_now',
      priority: 1,
      status: 'displayed',
      explanation: 'Critical security alert. Displayed immediately on screen • 2 beeps.',
      handledAt: '8:24 AM',
      soundPlayed: 'critical'
    },
    {
      id: 'evt-package-1',
      contractId: defaultContractId,
      event: {
        id: 'evt-package-1',
        title: 'Package update',
        message: 'Your Amazon package was delivered to the doorstep.',
        sourceDevice: 'Amazon Logistics',
        category: 'package',
        timestamp: '8:21 AM',
        simulated: true
      },
      appliedRule: 'next_break',
      priority: 2,
      status: 'pending',
      explanation: 'Scheduled for package updates. Queued quietly until viewing break or credits.',
      handledAt: '8:21 AM',
      soundPlayed: 'none'
    },
    {
      id: 'evt-thermo-1',
      contractId: defaultContractId,
      event: {
        id: 'evt-thermo-1',
        title: 'Thermostat update',
        message: 'Indoor temperature adjusted to 72°F.',
        sourceDevice: 'Thermostat',
        category: 'thermostat',
        timestamp: '8:18 AM',
        simulated: true
      },
      appliedRule: 'summarize_later',
      priority: 3,
      status: 'pending',
      explanation: 'Saved for thermostat updates. Held quietly for session digest.',
      handledAt: '8:18 AM',
      soundPlayed: 'none'
    },
    {
      id: 'evt-light-1',
      contractId: defaultContractId,
      event: {
        id: 'evt-light-1',
        title: 'Lighting update',
        message: 'Balcony soft light auto-dimmed to 20%.',
        sourceDevice: 'Smart Lights',
        category: 'light',
        timestamp: '8:12 AM',
        simulated: true
      },
      appliedRule: 'summarize_later',
      priority: 4,
      status: 'summarized',
      explanation: 'Saved for lighting updates. Recorded quietly in session digest.',
      handledAt: '8:12 AM',
      soundPlayed: 'none'
    },
    {
      id: 'evt-sys-1',
      contractId: defaultContractId,
      event: {
        id: 'evt-sys-1',
        title: 'System Update',
        message: 'Router firmware check completed successfully.',
        sourceDevice: 'Fire TV',
        category: 'system',
        timestamp: '18m ago',
        simulated: true
      },
      appliedRule: 'summarize_later',
      priority: 5,
      status: 'pending',
      explanation: 'Routine system update queued for digest.',
      handledAt: '8:05 AM',
      soundPlayed: 'none'
    }
  ];

  return {
    contracts: { [defaultContractId]: defaultContract },
    activeContractId: defaultContractId,
    notifications: initialNotifications,
    soundPreferences: {
      volume: 0.7,
      criticalSound: true,
      normalSound: true,
      routineSound: false,
      quietMode: true
    }
  };
}

export class PersistentStore {
  private data: StorageData;

  constructor() {
    this.data = this.load();
  }

  private load(): StorageData {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        return JSON.parse(raw);
      }
    } catch (e) {
      console.warn('Could not read existing store, creating fresh defaults:', e);
    }
    const def = getDefaultStorage();
    this.saveData(def);
    return def;
  }

  private saveData(data: StorageData) {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (e) {
      console.error('Failed to persist store:', e);
    }
  }

  public save() {
    this.saveData(this.data);
  }

  public resetDemo() {
    this.data = getDefaultStorage();
    this.data.notifications = [];
    for (const c of Object.values(this.data.contracts)) {
      c.notificationSummary = {
        totalEvents: 0,
        displayedCount: 0,
        queuedCount: 0,
        summarizedCount: 0,
        dismissedCount: 0
      };
    }
    this.save();
    return this.data;
  }

  public getContracts(): ViewingContract[] {
    return Object.values(this.data.contracts);
  }

  public getContract(id?: string): ViewingContract | undefined {
    if (id) return this.data.contracts[id];
    if (this.data.activeContractId) return this.data.contracts[this.data.activeContractId];
    return undefined;
  }

  public getActiveContract(): ViewingContract | undefined {
    if (!this.data.activeContractId) return undefined;
    return this.data.contracts[this.data.activeContractId];
  }

  public saveContract(contract: ViewingContract) {
    this.data.contracts[contract.contractId] = contract;
    this.save();
  }

  public setActiveContract(id: string) {
    if (!this.data.contracts[id]) {
      throw new Error(`Contract ${id} does not exist`);
    }
    // Pause existing active contract if different
    if (this.data.activeContractId && this.data.activeContractId !== id) {
      const prev = this.data.contracts[this.data.activeContractId];
      if (prev && prev.status === 'active') {
        prev.status = 'paused';
        prev.updatedAt = new Date().toISOString();
      }
    }
    this.data.activeContractId = id;
    this.data.contracts[id].status = 'active';
    this.data.contracts[id].updatedAt = new Date().toISOString();
    this.save();
    return this.data.contracts[id];
  }

  public getNotifications(): NotificationRecord[] {
    return [...this.data.notifications];
  }

  public addNotification(record: NotificationRecord) {
    this.data.notifications.unshift(record);
    this.save();
  }

  public updateNotification(id: string, updates: Partial<NotificationRecord>) {
    const item = this.data.notifications.find(n => n.id === id);
    if (item) {
      Object.assign(item, updates);
      this.save();
    }
    return item;
  }

  public getSoundPreferences() {
    return { ...this.data.soundPreferences };
  }

  public setSoundPreferences(prefs: Partial<StorageData['soundPreferences']>) {
    this.data.soundPreferences = { ...this.data.soundPreferences, ...prefs };
    this.save();
    return this.data.soundPreferences;
  }
}

export const persistentStore = new PersistentStore();
