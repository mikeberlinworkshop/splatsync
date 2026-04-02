const BASE = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Request failed');
  }
  return res.json();
}

export const api = {
  health: () => request<{ status: string }>('/health'),

  // Auth
  otfLogin: (email: string, password: string) =>
    request<{ message: string; member_name: string }>('/auth/otf/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  stravaConnectUrl: () =>
    request<{ url: string }>('/auth/strava/connect'),
  authStatus: () =>
    request<{
      otf_connected: boolean;
      strava_connected: boolean;
      strava_athlete_id: number | null;
      email: string | null;
    }>('/auth/status'),
  logout: () => request<{ message: string }>('/auth/logout', { method: 'POST' }),
  otfDisconnect: () => request('/auth/otf/disconnect', { method: 'POST' }),
  stravaDisconnect: () => request('/auth/strava/disconnect', { method: 'POST' }),

  // Workouts
  compareWorkouts: (days?: number) =>
    request<{
      summary: {
        total_otf: number;
        total_strava: number;
        matched: number;
        needs_fix: number;
        otf_only: number;
      };
      comparisons: Comparison[];
    }>(`/workouts/compare${days ? `?days=${days}` : ''}`),

  // Sync
  syncWorkout: (otfWorkout: OtfWorkout, stravaActivityId?: number) =>
    request<{
      strava_activity_id: number;
      strava_url: string;
      name: string;
      synced_at: string;
    }>('/sync/execute', {
      method: 'POST',
      body: JSON.stringify({
        otf_workout: otfWorkout,
        strava_activity_id: stravaActivityId,
      }),
    }),
};

export interface OtfWorkout {
  id: string;
  date: string;
  calories: number;
  splat_points: number;
  avg_hr: number;
  max_hr: number;
  duration_minutes: number;
  class_type: string;
  zone_minutes?: {
    gray: number;
    blue: number;
    green: number;
    orange: number;
    red: number;
  };
}

export interface StravaActivity {
  id: number;
  name: string;
  date: string;
  calories: number | null;
  avg_hr: number | null;
  max_hr: number | null;
  distance: number | null;
  duration_minutes: number;
  sport_type: string;
}

export interface Comparison {
  status: 'matched' | 'otf_only' | 'strava_only' | 'synced';
  otf: OtfWorkout | null;
  strava: StravaActivity | null;
  diffs: {
    calories: number;
    avg_hr: number;
    max_hr: number;
  } | null;
  needs_fix: boolean;
}
