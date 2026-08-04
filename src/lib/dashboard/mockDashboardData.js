// src/lib/dashboard/mockDashboardData.js
/**
 * Mock data adhering to the DashboardData contract. Used by DashboardService
 * during development before real stores are wired.
 */
export const mockDashboardData = {
  hero: {
    title: "Today's Focus",
    subtitle: "Complete the pending algebra chapter",
    estimatedMinutes: 45,
    progress: 0.2,
    priority: "high",
    cta: "Resume",
    action: () => console.log("Resume hero action"),
  },
  stats: [
    {
      id: "studyTime",
      title: "Study Time",
      value: "2h 30m",
      unit: "",
      trend: "up",
      icon: "clock",
      color: "var(--color-primary)",
    },
    {
      id: "questionsSolved",
      title: "Questions Solved",
      value: 78,
      unit: "",
      trend: "up",
      icon: "check",
      color: "var(--color-success)",
    },
    {
      id: "revisionDue",
      title: "Revision Due",
      value: 5,
      unit: "items",
      trend: "down",
      icon: "refresh",
      color: "var(--color-warning)",
    },
    {
      id: "accuracy",
      title: "Accuracy",
      value: "92%",
      unit: "",
      trend: "stable",
      icon: "star",
      color: "var(--color-info)",
    },
  ],
  tasks: [
    {
      id: "t1",
      subject: "Math",
      chapter: "Algebra",
      duration: 45,
      difficulty: "medium",
      priority: "high",
      progress: 0.0,
      resumeAction: () => console.log("Resume task t1"),
    },
    {
      id: "t2",
      subject: "Physics",
      chapter: "Mechanics",
      duration: 30,
      difficulty: "easy",
      priority: "medium",
      progress: 0.5,
      resumeAction: () => console.log("Resume task t2"),
    },
  ],
  revision: [
    {
      subject: "Chemistry",
      chapter: "Organic",
      confidence: 70,
      urgency: "high",
      daysRemaining: 2,
    },
    {
      subject: "History",
      chapter: "World War II",
      confidence: 40,
      urgency: "medium",
      daysRemaining: 5,
    },
  ],
  progress: {
    labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    datasets: [
      {
        label: "Study Hours",
        data: [2, 2.5, 3, 1.5, 0, 0, 0],
        backgroundColor: "var(--color-primary)",
      },
    ],
    summary: "You are on track to meet your weekly goal.",
  },
  weekly: {
    studyHours: 9,
    tasksCompleted: 5,
    revisionDue: 3,
  },
  streak: {
    currentStreak: 4,
    longestStreak: 7,
  },
};
