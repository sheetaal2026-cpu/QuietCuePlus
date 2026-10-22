export interface ModeMedia {
  key: string;
  video: string;
  poster: string;
  label: string;
  title: string;
  sub: string;
}

export const getMediaForMode = (name?: string, activityType?: string): ModeMedia => {
  const mode = `${name || ''} ${activityType || ''}`.toLowerCase();
  
  if (mode.includes('vr') || mode.includes('virtual') || mode.includes('spatial') || mode.includes('headset')) {
    return {
      key: 'vr',
      video: '/movie.mp4',
      poster: '/feature_night_bg.jpg',
      label: 'VR Immersion',
      title: 'VR Spatial Immersion',
      sub: 'VR spatial shield active | Peripheral spatial anchors only'
    };
  }

  if (mode.includes('focus') || mode.includes('work') || mode.includes('study')) {
    return {
      key: 'focus',
      video: '/movie.mp4',
      poster: '/focus_workspace_bg.jpg',
      label: 'Focus Mode',
      title: 'Focus Terminal',
      sub: 'Focus shield active | Strict zero interrupt except security'
    };
  }
  
  if (mode.includes('sport') || mode.includes('action') || mode.includes('racing') || mode.includes('car')) {
    return {
      key: 'sports',
      video: '/movie.mp4',
      poster: '/sports_live_bg.jpg',
      label: 'Sports Live',
      title: 'Live Sports Feed',
      sub: 'Sports contract active | Release updates between quarters'
    };
  }
  
  if (mode.includes('family') || mode.includes('relax') || mode.includes('space') || mode.includes('blackhole')) {
    return {
      key: 'family',
      video: '/movie.mp4',
      poster: '/family_time_bg.jpg',
      label: 'Family Time',
      title: 'Family Presentation',
      sub: 'Family contract active | Quiet dinner & celebration policy'
    };
  }
  
  return {
    key: 'feature',
    video: '/movie.mp4',
    poster: '/feature_night_bg.jpg',
    label: 'Feature Night',
    title: 'Feature Presentation',
    sub: 'Active contract active | Hold alerts for session break'
  };
};

export const getMediaForMovieSearch = (query: string): ModeMedia & { matchedMode: { name: string; activityType: string; icon: string } } => {
  const q = query.toLowerCase();
  
  if (q.includes('vr') || q.includes('spatial') || q.includes('headset') || q.includes('virtual')) {
    return {
      key: 'vr',
      video: '/movie.mp4',
      poster: '/feature_night_bg.jpg',
      label: 'VR Immersion',
      title: 'VR Spatial Immersion',
      sub: 'VR spatial shield active | Peripheral anchors only',
      matchedMode: { name: 'VR Immersion', activityType: 'vr', icon: '🥽' }
    };
  }

  if (q.includes('routine') || q.includes('morning') || q.includes('lifestyle') || q.includes('wellness') || q.includes('hydration')) {
    return {
      key: 'focus',
      video: '/movie.mp4',
      poster: '/focus_workspace_bg.jpg',
      label: 'Lifestyle Routine',
      title: 'Lifestyle Routine',
      sub: 'Lifestyle routine active | Hold routine digests for scheduled break',
      matchedMode: { name: 'Focus Work', activityType: 'lifestyle', icon: '🌿' }
    };
  }
  if (q.includes('bedtime') || q.includes('quiet') || q.includes('night routine') || q.includes('evening')) {
    return {
      key: 'family',
      video: '/movie.mp4',
      poster: '/family_time_bg.jpg',
      label: 'Bedtime Routine',
      title: 'Bedtime Quiet Routine',
      sub: 'Bedtime routine active | Strict silent policy across all sensors',
      matchedMode: { name: 'Family Time', activityType: 'lifestyle', icon: '🌙' }
    };
  }
  if (q.includes('matrix') || q.includes('code') || q.includes('terminal')) {
    return {
      key: 'focus',
      video: '/movie.mp4',
      poster: '/focus_workspace_bg.jpg',
      label: 'Focus Mode',
      title: 'Focus Terminal',
      sub: 'Focus shield active | Strict zero interrupt except security',
      matchedMode: { name: 'Focus Work', activityType: 'focus', icon: '💻' }
    };
  }
  if (q.includes('space') || q.includes('blackhole') || q.includes('science') || q.includes('astronomy') || q.includes('interstellar') || q.includes('dune')) {
    return {
      key: 'family',
      video: '/movie.mp4',
      poster: '/family_time_bg.jpg',
      label: 'Family Presentation',
      title: 'Family Presentation',
      sub: 'Quiet contract active | Hold notifications for scheduled break',
      matchedMode: { name: 'Family Time', activityType: 'family', icon: '👨‍👩‍👧' }
    };
  }
  if (q.includes('sport') || q.includes('formula') || q.includes('grand prix') || q.includes('car') || q.includes('fast') || q.includes('racing') || q.includes('soccer') || q.includes('football')) {
    return {
      key: 'sports',
      video: '/movie.mp4',
      poster: '/sports_live_bg.jpg',
      label: 'Sports Live',
      title: 'Live Sports Feed',
      sub: 'Sports contract active | Release updates between quarters',
      matchedMode: { name: 'Sports Live', activityType: 'sports', icon: '⚽' }
    };
  }
  return {
    key: 'feature',
    video: '/movie.mp4',
    poster: '/feature_night_bg.jpg',
    label: 'Feature Night',
    title: query.trim() ? query : 'Feature Presentation',
    sub: 'Feature contract active | Hold non-critical alerts for scheduled break',
    matchedMode: { name: 'Feature Night', activityType: 'movie', icon: '🍿' }
  };
};
