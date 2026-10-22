import { BedrockRuntimeClient, ConverseCommand } from "@aws-sdk/client-bedrock-runtime";
import { z } from "zod";
import * as dotenv from 'dotenv';
dotenv.config();

const region = process.env.AWS_REGION;
const modelId = process.env.BEDROCK_MODEL_ID;

const client = new BedrockRuntimeClient({ region: region || 'us-east-1' });

export const IntentSchema = z.object({
  intent: z.enum([
    'list_connected_devices',
    'get_notification_queue',
    'simulate_device_event',
    'set_notification_rule',
    'explain_notification_decision',
    'request_summary',
    'create_viewing_contract',
    'activate_viewing_contract',
    'end_viewing_contract',
    'get_viewing_summary',
    'unknown'
  ]),
  arguments: z.record(z.any()),
  responseText: z.string(),
  requiresClarification: z.boolean(),
  clarificationQuestion: z.string().nullable()
});

export type ParsedIntent = z.infer<typeof IntentSchema>;

export async function interpretCommand(text: string, overrideFallback = false): Promise<{ intent: ParsedIntent, source: 'bedrock' | 'fallback' }> {
  if (!region || !modelId || overrideFallback) {
    return { intent: fallbackParser(text), source: 'fallback' };
  }

  const systemPrompt = `You are QuietCue's conversational assistant. Map the user's request to a structured intent.
Available intents:
- create_viewing_contract (args: name, activityType, rules)
- activate_viewing_contract (args: contractId)
- end_viewing_contract (args: contractId)
- get_viewing_summary (args: contractId)
- list_connected_devices
- get_notification_queue
- simulate_device_event (args: category ['security', 'package', 'thermostat', 'light', 'system', 'timer', 'device_unavailable', 'health', 'calendar'], title, message, sourceDevice)
- set_notification_rule (args: category ['security', 'package', 'thermostat', 'light', 'system', 'timer', 'device_unavailable', 'health', 'calendar'], policy ['interrupt_now', 'next_break', 'summarize_later'])
- explain_notification_decision (args: id)
- request_summary
- unknown

If the request describes starting an activity (e.g. work session, movie, study), map to create_viewing_contract with relevant policies.
Respond ONLY with a raw JSON object conforming to this schema:
{
  "intent": string,
  "arguments": object,
  "responseText": string,
  "requiresClarification": boolean,
  "clarificationQuestion": string | null
}`;

  try {
    const command = new ConverseCommand({
      modelId,
      messages: [{ role: "user", content: [{ text }] }],
      system: [{ text: systemPrompt }]
    });

    const response = await client.send(command);
    const resultText = response.output?.message?.content?.[0]?.text || "{}";
    const jsonMatch = resultText.match(/\{[\s\S]*\}/);
    const rawJson = jsonMatch ? jsonMatch[0] : "{}";
    const parsed = IntentSchema.parse(JSON.parse(rawJson));
    return { intent: parsed, source: 'bedrock' };
  } catch (err) {
    console.error("Bedrock interpretation failed, falling back:", err);
    return { intent: fallbackParser(text), source: 'fallback' };
  }
}

function fallbackParser(text: string): ParsedIntent {
  const lower = text.toLowerCase();
  
  // Focus Work Session Rule
  if (lower.includes('coding') || lower.includes('deploy') || lower.includes('production') || lower.includes('work from home') || lower.includes('wfh') || (lower.includes('code') && lower.includes('alexa')) || lower.includes('focus work')) {
    return {
      intent: 'create_viewing_contract',
      arguments: {
        name: 'Focus Work Session',
        activityType: 'study',
        rules: [
          { eventCategory: 'security', handlingPolicy: 'interrupt_now', priority: 1 },
          { eventCategory: 'system', handlingPolicy: 'next_break', priority: 2 },
          { eventCategory: 'package', handlingPolicy: 'next_break', priority: 3 },
          { eventCategory: 'thermostat', handlingPolicy: 'summarize_later', priority: 4 }
        ]
      },
      responseText: "I have created and activated your Focus Work Contract! While you are in your focused session, the screen stays quiet. When your priority task completes, QuietCue+ will whisper in the subtitles: 'Task complete, time for a break!' ☕",
      requiresClarification: false,
      clarificationQuestion: null
    };
  }

  // Viewing contract creation patterns (e.g. "I'm starting my work session", "start a movie contract")
  if (lower.includes('start') || lower.includes('work session') || lower.includes('contract') || lower.includes('focus')) {
    return {
      intent: 'create_viewing_contract',
      arguments: {
        name: 'Focus Mode',
        activityType: 'movie'
      },
      responseText: `Got it! I've created a Focus Mode contract with the following rules:
• Critical alerts: interrupt now - 2 beeps
• Package updates: next break
• Routine updates: session digest

Would you like me to activate this now?`,
      requiresClarification: false,
      clarificationQuestion: null
    };
  }

  if (lower.includes("device") && lower.includes("connected")) {
    return {
      intent: 'list_connected_devices',
      arguments: {},
      responseText: "I'll fetch your connected devices.",
      requiresClarification: false,
      clarificationQuestion: null
    };
  }
  
  // Timer intent ("set a timer for 25 minutes", "focus timer 30 mins", etc.)
  if (lower.includes('timer') || lower.includes('pomodoro') || lower.includes('countdown')) {
    let minutes = 25;
    const matchMin = text.match(/(\d+)\s*(?:mins?|minutes?|m\b)/i);
    const matchHour = text.match(/(\d+)\s*(?:hours?|hrs?|h\b)/i);
    if (matchMin && matchMin[1]) {
      minutes = parseInt(matchMin[1], 10);
    } else if (matchHour && matchHour[1]) {
      minutes = parseInt(matchHour[1], 10) * 60;
    } else if (lower.includes('pomodoro')) {
      minutes = 25;
    }

    return {
      intent: 'set_mode_timer',
      arguments: { minutes },
      responseText: `I've set a ${minutes}-minute timer for your viewing mode. When the timer finishes, QuietCue+ will quietly transition to a viewing break without harsh alarms.`,
      requiresClarification: false,
      clarificationQuestion: null
    };
  }

  // 1. Health & Wellness (Hydration, Mini Breaks, Posture, Exercise)
  if (
    lower.includes('drink water') ||
    lower.includes('drinking water') ||
    lower.includes('drink') ||
    lower.includes('hydrat') ||
    lower.includes('posture') ||
    lower.includes('stretch') ||
    lower.includes('mini break') ||
    lower.includes('eye rest') ||
    lower.includes('exercise') ||
    lower.includes('workout') ||
    lower.includes('walk') ||
    lower.includes('fitness') ||
    (lower.includes('health') && (lower.includes('remind') || lower.includes('notification') || lower.includes('cue') || lower.includes('check')))
  ) {
    let title = 'Hydration & Posture Cue';
    let message = 'Drink a glass of water - 250ml and roll your shoulders for a quick posture reset.';
    
    if ((lower.includes('stretch') || lower.includes('break') || lower.includes('posture')) && (lower.includes('water') || lower.includes('drink'))) {
      title = 'Hydration & Posture Cue';
      message = 'Drink a fresh glass of water - 250ml and do a 30-second shoulder posture stretch.';
    } else if (lower.includes('exercise') || lower.includes('workout') || lower.includes('walk') || lower.includes('fitness')) {
      title = 'Movement & Exercise Goal';
      message = 'Stand up, walk around, and do light stretches to hit your hourly fitness goal.';
    } else if (lower.includes('break') || lower.includes('posture') || lower.includes('eye')) {
      title = 'Mini Break & Posture Check';
      message = 'Roll your shoulders, look 20 feet away for 20 seconds, and relax.';
    } else if (lower.includes('water') || lower.includes('drink') || lower.includes('hydrat')) {
      title = 'Hydration Reminder';
      message = 'Time to drink a glass of water - 250ml to stay refreshed.';
    }

    return {
      intent: 'simulate_device_event',
      arguments: {
        category: 'health',
        title,
        message,
        sourceDevice: 'Smart Health & Wellness'
      },
      responseText: `Added health reminder: "${title}". It will gently alert you on your next viewing break without interrupting active content.`,
      requiresClarification: false,
      clarificationQuestion: null
    };
  }

  // 2. Water purifier / appliance maintenance
  if (lower.includes('purifier') || lower.includes('water filter') || (lower.includes('water') && lower.includes('filter'))) {
    return {
      intent: 'simulate_device_event',
      arguments: {
        category: 'system',
        title: 'Water Purifier Check',
        message: 'Water purifier filter inspection and cycle check due.',
        sourceDevice: 'Smart Water Purifier'
      },
      responseText: 'Added notification for Water Purifier Check. Governed under your active Viewing Contract as a routine system update.',
      requiresClarification: false,
      clarificationQuestion: null
    };
  }

  // 3. Calendar & Family Reminders (Dad's Day, Mom's Birthday, etc.)
  if (lower.includes('dad') || lower.includes('birthday') || lower.includes('calendar') || lower.includes('anniversary')) {
    const isDad = lower.includes('dad');
    let name = isDad ? 'Dad' : 'Family Member';
    const bdayMatch = text.match(/(?:for|of|is)\s+([A-Za-z]+)(?:'s)?\s*(?:birthday)?/i);
    if (bdayMatch && bdayMatch[1] && !['the', 'a', 'my', 'me', 'this', 'that', 'someone', 'a'].includes(bdayMatch[1].toLowerCase())) {
      name = bdayMatch[1].charAt(0).toUpperCase() + bdayMatch[1].slice(1);
    }
    const title = isDad ? "Dad's Day Reminder" : lower.includes('birthday') ? `${name}'s Birthday Reminder` : 'Calendar Reminder';
    const message = isDad 
      ? "Today is Dad's Day! Send warm greetings."
      : lower.includes('birthday')
        ? `Today is ${name}'s birthday! Wish them a wonderful celebration.`
        : 'Upcoming calendar event scheduled for today.';

    return {
      intent: 'simulate_device_event',
      arguments: {
        category: 'calendar',
        title,
        message,
        sourceDevice: 'Alexa Family Calendar'
      },
      responseText: `Added calendar reminder: "${title}". Synced with your active contract - will alert gently during session break.`,
      requiresClarification: false,
      clarificationQuestion: null
    };
  }

  // 4. Focus Work Session Rule
  if (lower.includes('coding') || lower.includes('deploy') || lower.includes('production') || lower.includes('work from home') || lower.includes('wfh') || lower.includes('focus work')) {
    return {
      intent: 'create_viewing_contract',
      arguments: {
        name: 'Focus Work Session',
        activityType: 'study',
        rules: [
          { eventCategory: 'security', handlingPolicy: 'interrupt_now', priority: 1 },
          { eventCategory: 'system', handlingPolicy: 'next_break', priority: 2 },
          { eventCategory: 'package', handlingPolicy: 'next_break', priority: 3 },
          { eventCategory: 'thermostat', handlingPolicy: 'summarize_later', priority: 4 }
        ]
      },
      responseText: "I have created and activated your Focus Work Contract! While you are in your focused session, the screen stays quiet. When your priority task completes, QuietCue+ will whisper in the subtitles: 'Task complete, time for a break!' ☕",
      requiresClarification: false,
      clarificationQuestion: null
    };
  }

  // 5. Generic notification creation pattern ("add a notification on...", "notify me about...")
  if (lower.includes('notification') || lower.includes('notify') || lower.includes('alert') || lower.includes('remind') || lower.includes('check')) {
    let subject = 'Smart Home Event';
    const match = text.match(/(?:notification (?:on|for|about)|notify (?:me about|me on|about)|alert (?:for|about|on)|add (?:a )?notification (?:on|for|about)?|remind (?:me to|me about)?)\s+(.+)/i);
    if (match && match[1]) {
      subject = match[1].trim().replace(/[.?!]$/, '');
      subject = subject.charAt(0).toUpperCase() + subject.slice(1);
    } else if (text.length < 50) {
      subject = text.charAt(0).toUpperCase() + text.slice(1);
    }

    let category: 'security' | 'package' | 'thermostat' | 'light' | 'system' | 'health' | 'calendar' = 'system';
    if (lower.includes('dad') || lower.includes('birthday') || lower.includes('calendar') || lower.includes('anniversary')) {
      category = 'calendar';
    } else if (lower.includes('water') || lower.includes('drink') || lower.includes('hydrat') || lower.includes('exercise') || lower.includes('stretch') || lower.includes('posture') || lower.includes('break') || lower.includes('health') || lower.includes('fitness')) {
      category = 'health';
    } else if (lower.includes('door') || lower.includes('bell') || lower.includes('camera') || lower.includes('motion') || lower.includes('smoke') || lower.includes('security')) {
      category = 'security';
    } else if (lower.includes('package') || lower.includes('parcel') || lower.includes('delivery') || lower.includes('amazon')) {
      category = 'package';
    } else if (lower.includes('temp') || lower.includes('thermostat') || lower.includes('heat') || lower.includes('cool') || lower.includes('ac')) {
      category = 'thermostat';
    } else if (lower.includes('light') || lower.includes('lamp') || lower.includes('bulb')) {
      category = 'light';
    }

    return {
      intent: 'simulate_device_event',
      arguments: {
        category,
        title: subject,
        message: `${subject} event triggered from Alexa+ voice.`,
        sourceDevice: category === 'health' ? 'Health & Wellness Tracker' : 'Alexa+ Voice'
      },
      responseText: `Added ${category === 'health' ? 'wellness' : 'smart home'} notification for "${subject}". Routed according to your active Viewing Contract.`,
      requiresClarification: false,
      clarificationQuestion: null
    };
  }

  if (lower.includes('drink') || lower.includes('water') || lower.includes('hydrat') || lower.includes('exercise') || lower.includes('stretch') || lower.includes('posture')) {
    let title = 'Hydration Reminder';
    let message = 'Time to drink a glass of water - 250ml.';
    if (lower.includes('exercise') || lower.includes('workout') || lower.includes('walk')) {
      title = 'Fitness & Movement Cue';
      message = 'Stand up, walk around, or do light stretches.';
    } else if (lower.includes('break') || lower.includes('eye') || lower.includes('posture')) {
      title = 'Mini Break & Posture Check';
      message = 'Roll your shoulders, look 20 feet away for 20 seconds, and relax.';
    }
    return {
      intent: 'simulate_device_event',
      arguments: {
        category: 'health',
        title,
        message,
        sourceDevice: 'Smart Health Monitor'
      },
      responseText: `Added health prompt: "${title}". It will gently alert you on your next viewing break without interrupting active content.`,
      requiresClarification: false,
      clarificationQuestion: null
    };
  }

  if (lower.includes('simulate') && (lower.includes('parcel') || lower.includes('package'))) { 
    return { 
      intent: 'simulate_device_event', 
      arguments: { 
        category: 'package', 
        title: 'Package Update', 
        message: 'A parcel has been delivered to the doorstep.', 
        sourceDevice: 'Smart Parcel Box' 
      }, 
      responseText: 'Simulating a package delivery event.', 
      requiresClarification: false, 
      clarificationQuestion: null 
    }; 
  }

  if (lower.includes('simulate') && (lower.includes('thermostat') || lower.includes('temperature'))) { 
    return { 
      intent: 'simulate_device_event', 
      arguments: { 
        category: 'thermostat', 
        title: 'Thermostat Update', 
        message: 'Indoor temperature is 72°F.', 
        sourceDevice: 'Thermostat' 
      }, 
      responseText: 'Simulating a thermostat update.', 
      requiresClarification: false, 
      clarificationQuestion: null 
    }; 
  }

  if (lower.includes('simulate') && (lower.includes('water') || lower.includes('system') || lower.includes('router'))) { 
    return { 
      intent: 'simulate_device_event', 
      arguments: { 
        category: 'system', 
        title: 'System Update', 
        message: 'System firmware check completed successfully.', 
        sourceDevice: 'Fire TV' 
      }, 
      responseText: 'Simulating a system update event.', 
      requiresClarification: false, 
      clarificationQuestion: null 
    }; 
  }

  if (lower.includes('simulate') && (lower.includes('security') || lower.includes('doorbell') || lower.includes('alert') || lower.includes('critical'))) {
    return {
      intent: 'simulate_device_event',
      arguments: { 
        category: 'security', 
        title: 'Critical alert - Doorbell', 
        message: 'Front door camera detected motion.', 
        sourceDevice: 'Front Door - Ring' 
      },
      responseText: "Simulating a critical security event.",
      requiresClarification: false,
      clarificationQuestion: null
    };
  }

  if (lower.includes("package") && (lower.includes("silent") || lower.includes("quiet") || lower.includes("rule") || lower.includes("summarize"))) {
    return {
      intent: 'set_notification_rule',
      arguments: { category: 'package', policy: 'summarize_later' },
      responseText: "I will add package updates to your session digest.",
      requiresClarification: false,
      clarificationQuestion: null
    };
  }
  
  if (lower.includes("summarize") || lower.includes("summary") || lower.includes("digest")) {
    return {
      intent: 'request_summary',
      arguments: {},
      responseText: "I'll grab the session summary for you.",
      requiresClarification: false,
      clarificationQuestion: null
    };
  }
  
  if (lower.includes("why")) {
    if (lower.trim() === "why did it do that?" || lower.trim() === "why?") {
      return {
        intent: 'unknown',
        arguments: {},
        responseText: "Which notification would you like me to explain?",
        requiresClarification: true,
        clarificationQuestion: "Which notification decision would you like me to explain (e.g., Doorbell or Package)?"
      };
    }
    return {
      intent: 'explain_notification_decision',
      arguments: { id: 'evt-doorbell-1' },
      responseText: "You marked the security alert as critical, so I displayed it immediately. Your package update is still queued for your next break.",
      requiresClarification: false,
      clarificationQuestion: null
    };
  }

  return {
    intent: 'unknown',
    arguments: {},
    responseText: "I'm ready to manage your viewing contract. Try saying: 'I'm starting a work session' or 'Simulate package delivery'.",
    requiresClarification: false,
    clarificationQuestion: null
  };
}
