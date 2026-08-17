export interface ReleaseNote {
  version: string;
  date: string;
  type: 'Feature' | 'Fix' | 'UI';
  heading: string;
  added: string[];
  improved: string[];
  fixed: string[];
}

export const APP_RELEASES: ReleaseNote[] = [
  {
    version: '1.4.2',
    date: 'Aug 17, 2026',
    type: 'UI',
    heading: 'Study command center',
    added: [
      'A reimagined Overview that turns your numbers into direction.',
      'A live countdown to your exam, right on the home screen.',
      'Weekly rhythm chart so consistency stops hiding in spreadsheets.',
    ],
    improved: [
      'Today\u2019s mission now recommends your next move.',
      'Metric cards now each carry their own visual language.',
    ],
    fixed: [],
  },
  {
    version: '1.4.1',
    date: 'Aug 16, 2026',
    type: 'Fix',
    heading: 'Timer and login polish',
    added: [],
    improved: ['Quicker focus-session restarts after the app reloads.'],
    fixed: [
      'Sign in with Discord no longer leaves a stale session.',
      'Timer layout no longer overflows on narrow screens.',
    ],
  },
  {
    version: '1.4.0',
    date: 'Aug 15, 2026',
    type: 'Feature',
    heading: 'A proper focus room',
    added: [
      'Pomodoro and flow focus timers with break cycles.',
      'Focus music — lo-fi and rain, with volume memory.',
      'Admin panel: announcements, cohorts, and member tools.',
      'Study reminders tuned to your own pace.',
    ],
    improved: [],
    fixed: [],
  },
];

export const CURRENT_RELEASE: ReleaseNote = APP_RELEASES[0];

export const APP_VERSION = `v${CURRENT_RELEASE.version}`;

declare const __GIT_SHA__: string;

const buildSha = typeof __GIT_SHA__ !== 'undefined' && __GIT_SHA__ ? __GIT_SHA__ : 'dev';

export const BUILD_SHA = buildSha === 'dev' ? 'dev' : buildSha.slice(0, 7);

export const ENVIRONMENT = import.meta.env.PROD ? 'Production' : 'Development';

export const DB_SCHEMA_VERSION = '0004';

export const CHANGELOG_SEEN_KEY = 'pp-changelog-seen';

export function isChangelogSeen(): boolean {
  try {
    return localStorage.getItem(CHANGELOG_SEEN_KEY) === CURRENT_RELEASE.version;
  } catch {
    return true;
  }
}

export function markChangelogSeen(): void {
  try {
    localStorage.setItem(CHANGELOG_SEEN_KEY, CURRENT_RELEASE.version);
  } catch {
    return;
  }
}
