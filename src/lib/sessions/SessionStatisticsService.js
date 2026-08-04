// src/lib/sessions/SessionStatisticsService.js
/**
 * SessionStatisticsService – computes aggregate statistics from sessions.
 * All methods return plain data (no Result wrapper) because they are read‑only.
 */
import { SessionRepository } from "./SessionRepository.js";

export class SessionStatisticsService {
  constructor() {
    this.repo = new SessionRepository();
  }

  /** Helper: get sessions between two Date objects */
  _sessionsInRange(startDate, endDate) {
    const start = startDate.toISOString();
    const end = endDate.toISOString();
    return this.repo.findInRange(start, end);
  }

  /** Today's total focus time (sum of focusScore * actualDuration / 100) */
  getTodayFocusTime() {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sessions = this._sessionsInRange(start, now);
    return sessions.reduce((sum, s) => {
      const focus = s.focusScore ?? 0;
      const duration = Number(s.actualDuration) || 0;
      return sum + (focus / 100) * duration;
    }, 0);
  }

  /** Weekly total focus time (last 7 days) */
  getWeeklyFocusTime() {
    const now = new Date();
    const start = new Date(now);
    start.setDate(start.getDate() - 6); // include today + 6 previous days
    const sessions = this._sessionsInRange(start, now);
    return sessions.reduce((sum, s) => {
      const focus = s.focusScore ?? 0;
      const duration = Number(s.actualDuration) || 0;
      return sum + (focus / 100) * duration;
    }, 0);
  }

  /** Average session length (minutes) */
  getAverageSessionLength() {
    const all = this.repo.getAllSessions();
    if (!all.length) return 0;
    const total = all.reduce((sum, s) => sum + (Number(s.actualDuration) || 0), 0);
    return total / all.length;
  }

  /** Longest session (by actualDuration) */
  getLongestSession() {
    const all = this.repo.getAllSessions();
    if (!all.length) return null;
    return all.reduce((prev, cur) => {
      const curDur = Number(cur.actualDuration) || 0;
      const prevDur = Number(prev.actualDuration) || 0;
      return curDur > prevDur ? cur : prev;
    }, all[0]);
  }

  /** Best study hour – hour of day with highest cumulative focus time */
  getBestStudyHour() {
    const all = this.repo.getAllSessions();
    const hourMap = new Map(); // hour -> cumulative focus minutes
    all.forEach((s) => {
      if (!s.startTime) return;
      const date = new Date(s.startTime);
      const hour = date.getHours();
      const focus = s.focusScore ?? 0;
      const duration = Number(s.actualDuration) || 0;
      const focusMinutes = (focus / 100) * duration;
      hourMap.set(hour, (hourMap.get(hour) || 0) + focusMinutes);
    });
    let bestHour = null;
    let bestValue = -1;
    hourMap.forEach((val, hour) => {
      if (val > bestValue) {
        bestValue = val;
        bestHour = hour;
      }
    });
    return bestHour;
  }

  /** Total interruptions across all sessions */
  getTotalInterruptions() {
    const all = this.repo.getAllSessions();
    return all.reduce((sum, s) => sum + (Number(s.interruptions) || 0), 0);
  }

  /** Pomodoro success rate – simplified as sessions where actualDuration >= plannedDuration */
  getPomodoroSuccessRate() {
    const all = this.repo.getAllSessions();
    if (!all.length) return 0;
    const successful = all.filter((s) => Number(s.actualDuration) >= Number(s.plannedDuration)).length;
    return Math.round((successful / all.length) * 100);
  }

  /** Focus trend – array of {date: 'YYYY-MM-DD', focusScoreAvg}
   * Returns daily average focusScore for the last 14 days.
   */
  getFocusTrend(days = 14) {
    const now = new Date();
    const start = new Date(now);
    start.setDate(start.getDate() - days + 1);
    const sessions = this._sessionsInRange(start, now);
    const dayMap = {};
    sessions.forEach((s) => {
      const date = new Date(s.startTime).toISOString().split('T')[0];
      if (!dayMap[date]) dayMap[date] = { totalScore: 0, count: 0 };
      dayMap[date].totalScore += Number(s.focusScore) || 0;
      dayMap[date].count += 1;
    });
    const result = [];
    for (let d = new Date(start); d <= now; d.setDate(d.getDate() + 1)) {
      const key = d.toISOString().split('T')[0];
      if (dayMap[key]) {
        result.push({ date: key, focusScoreAvg: Math.round(dayMap[key].totalScore / dayMap[key].count) });
      } else {
        result.push({ date: key, focusScoreAvg: 0 });
      }
    }
    return result;
  }
}
