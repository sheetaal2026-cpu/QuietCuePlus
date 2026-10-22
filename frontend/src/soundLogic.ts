export interface QueueItem {
  id: string;
  status: string; // 'displayed' | 'pending' | 'summarized'
  appliedRule: string; // 'interrupt_now' | 'next_break' | 'summarize_later'
  event: { category: string };
}

export interface SoundSettings {
  soundEnabled: boolean;
  masterMute: boolean;
  soundMode: string; // 'all' | 'critical' | 'off'
  summaryChime: boolean;
}

export interface SoundAction {
  id: string;
  category: string;
  expectedSound: string;
  attempted: boolean;
  status: 'success' | 'failed' | 'muted' | 'excluded';
  playMethod?: 'playCritical' | 'playNormal' | 'playSummary';
}

export function evaluateSounds(
  currentQueue: QueueItem[],
  viewerState: string,
  previousViewerState: string,
  playedIds: Set<string>,
  settings: SoundSettings
): { actions: SoundAction[], newPlayedIds: Set<string> } {
  
  const actions: SoundAction[] = [];
  const newPlayedIds = new Set(playedIds);
  let summaryOpened = (viewerState === 'Summary' && previousViewerState !== 'Summary');
  let playedSummaryChime = false;

  for (const q of currentQueue) {
    if (q.status === 'displayed' && !playedIds.has(q.id)) {
      newPlayedIds.add(q.id);
      
      let expectedSound = q.appliedRule === 'interrupt_now' ? 'Critical (2 beeps)' : 'Normal (1 beep)';
      
      if (settings.soundMode === 'off' || (settings.soundMode === 'critical' && q.appliedRule !== 'interrupt_now')) {
        actions.push({ id: q.id, category: q.event.category, expectedSound, attempted: false, status: 'excluded' });
        continue;
      }

      if (settings.masterMute) {
        actions.push({ id: q.id, category: q.event.category, expectedSound, attempted: false, status: 'muted' });
        continue;
      }

      if (!settings.soundEnabled) {
        actions.push({ id: q.id, category: q.event.category, expectedSound, attempted: true, status: 'failed' });
        continue;
      }

      actions.push({
        id: q.id, 
        category: q.event.category, 
        expectedSound, 
        attempted: true, 
        status: 'success', // will be evaluated by caller
        playMethod: q.appliedRule === 'interrupt_now' ? 'playCritical' : 'playNormal'
      });
    }

    // Handle routine items being surfaced during summary
    if (summaryOpened && settings.summaryChime && q.status === 'summarized' && !playedIds.has(q.id)) {
      newPlayedIds.add(q.id);
      if (!playedSummaryChime && settings.soundMode !== 'off' && !settings.masterMute && settings.soundEnabled) {
        actions.push({
          id: 'Summary',
          category: 'System',
          expectedSound: 'Summary Chime',
          attempted: true,
          status: 'success',
          playMethod: 'playSummary'
        });
        playedSummaryChime = true;
      }
    }
  }

  return { actions, newPlayedIds };
}
