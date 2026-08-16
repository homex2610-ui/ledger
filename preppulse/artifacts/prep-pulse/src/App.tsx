import { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AuthGate } from '@/components/auth-gate';
import { AppShell } from '@/components/app-shell';
import Dashboard from '@/pages/dashboard';
import Syllabus from '@/pages/syllabus';
import Tests from '@/pages/tests';
import Study from '@/pages/study';
import Recall from '@/pages/recall';
import { Stats } from '@/pages/stats';
import Compete from '@/pages/compete';
import JoinByLink from '@/pages/join-by-link';
import Settings from '@/pages/settings';
import NotFound from '@/pages/not-found';
import AdminDashboard from '@/pages/admin/admin-dashboard';
import AdminAnnouncements from '@/pages/admin/admin-announcements';
import AdminCohorts from '@/pages/admin/admin-cohorts';
import AdminUsers from '@/pages/admin/admin-users';
import {
  Route,
  Switch,
  useLocation,
  Router as WouterRouter,
} from 'wouter';

const queryClient = new QueryClient();

function Router() {
  return (
    // Keep a shared shell (sidebar, navbar) outside the boundary so it
    // survives a page crash.
    <RoutedErrorBoundary>
      <AppShell>
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/syllabus" component={Syllabus} />
          <Route path="/tests" component={Tests} />
          <Route path="/study" component={Study} />
          <Route path="/recall" component={Recall} />
          <Route path="/stats" component={Stats} />
          <Route path="/compete" component={Compete} />
          <Route path="/admin" component={AdminDashboard} />
          <Route path="/admin/announcements" component={AdminAnnouncements} />
          <Route path="/admin/cohorts" component={AdminCohorts} />
          <Route path="/admin/users" component={AdminUsers} />
          <Route path="/join/:code" component={JoinByLink} />
          <Route path="/settings" component={Settings} />
          <Route component={NotFound} />
        </Switch>
      </AppShell>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <AuthGate>
            <Router />
          </AuthGate>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
