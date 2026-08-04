// src/components/dashboard/dashboardConfig.js
/**
 * Dashboard configuration – defines order, visibility, priority, and other metadata for each section.
 * Extended schema supports feature flags, lazy loading, skeleton components, and permission controls.
 */
export const dashboardSections = [
  {
    id: "hero",
    title: "Today's Focus",
    priority: 100,
    enabled: true,
    permissions: [], // e.g., ['premium']
    lazy: true,
    skeleton: "HeroSkeleton",
    component: () => import('./sections/HeroSection'),
  },
  {
    id: "stats",
    title: "Quick Stats",
    priority: 80,
    enabled: true,
    permissions: [],
    lazy: true,
    skeleton: "StatsSkeleton",
    component: () => import('./sections/StatsSection'),
  },
  {
    id: "tasks",
    title: "Tasks",
    priority: 60,
    enabled: true,
    permissions: [],
    lazy: true,
    skeleton: "TasksSkeleton",
    component: () => import('./sections/TasksSection'),
  },
  {
    id: "revision",
    title: "Revision",
    priority: 40,
    enabled: true,
    permissions: [],
    lazy: true,
    skeleton: "RevisionSkeleton",
    component: () => import('./sections/RevisionSection'),
  },
  {
    id: "progress",
    title: "Progress",
    priority: 20,
    enabled: true,
    permissions: [],
    lazy: true,
    skeleton: "ProgressSkeleton",
    component: () => import('./sections/ProgressSection'),
  },
];
