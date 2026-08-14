export const EXAM_TRACKS: Array<{ value: ExamTrack; label: string }> = [
  { value: "jee_main", label: "JEE Main" },
  { value: "neet", label: "NEET" },
];
export type ExamTrack = "jee_main" | "neet";

export interface TrackExam {
  value: string;
  label: string;
}

export interface ExamConfig {
  track: ExamTrack;
  label: string;
  exams: TrackExam[];
  subjectKeys: string[];
  subjects: string[];
  testDefaults: { maxScore: number; totalQuestions: number; timeMinutes: number };
  syllabusAvailable: boolean;
}

export const EXAM_CONFIGS: Record<ExamTrack, ExamConfig> = {
  jee_main: {
    track: "jee_main",
    label: "JEE Main",
    exams: [
      { value: "jee_main", label: "JEE Main" },
      { value: "jee_adv", label: "JEE Advanced" },
    ],
    subjectKeys: ["physics", "chemistry", "mathematics"],
    subjects: ["Physics", "Chemistry", "Mathematics"],
    testDefaults: { maxScore: 300, totalQuestions: 90, timeMinutes: 180 },
    syllabusAvailable: true,
  },
  neet: {
    track: "neet",
    label: "NEET",
    exams: [{ value: "neet", label: "NEET" }],
    subjectKeys: ["physics", "chemistry", "biology"],
    subjects: ["Physics", "Chemistry", "Biology"],
    testDefaults: { maxScore: 720, totalQuestions: 180, timeMinutes: 200 },
    syllabusAvailable: true,
  },
};

export function getExamConfig(track: string | null | undefined): ExamConfig {
  return track === "neet" ? EXAM_CONFIGS.neet : EXAM_CONFIGS.jee_main;
}

export function isNeetTrack(track: string | null | undefined): boolean {
  return track === "neet";
}

export function subjectLabel(key: string): string {
  return key.charAt(0).toUpperCase() + key.slice(1);
}

export function subjectAllowedForTrack(track: string | null | undefined, subject: string, extra: string[] = []): boolean {
  const config = getExamConfig(track);
  return config.subjects.includes(subject) || extra.includes(subject);
}

export const TOPIC_STATUSES = ["not_started", "learning", "practiced", "revised", "mastered"] as const;
export type TopicStatus = (typeof TOPIC_STATUSES)[number];

// Mastery is earned by progression only: each status can move forward one step
// (or reset to not_started as a deliberate correction). The only path to
// "mastered" is from "revised", so it can never be set arbitrarily.
export const TOPIC_TRANSITIONS: Record<TopicStatus, TopicStatus[]> = {
  not_started: ["learning"],
  learning: ["not_started", "practiced"],
  practiced: ["not_started", "revised"],
  revised: ["not_started", "mastered"],
  mastered: ["not_started", "revised"],
};

export function allowedTopicTransitions(status: TopicStatus): TopicStatus[] {
  return TOPIC_TRANSITIONS[status] ?? [];
}

export function canTransitionTopic(from: TopicStatus, to: string): boolean {
  return allowedTopicTransitions(from).includes(to as TopicStatus);
}