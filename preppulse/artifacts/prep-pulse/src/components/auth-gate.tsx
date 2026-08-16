import { type ReactNode } from 'react';
import { useLocation } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import { getGetMeQueryKey, useGetMe, type AuthResponse } from '@workspace/api-client-react';
import AuthPage from '@/pages/auth';
import ForgotPasswordPage from '@/pages/forgot-password';
import ResetPasswordPage from '@/pages/reset-password';

export function AuthGate({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const queryClient = useQueryClient();
  const query = useGetMe({ query: { queryKey: getGetMeQueryKey(), retry: false, staleTime: 30_000 } });

  if (query.isLoading) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-5 bg-background">
        <span className="flex h-14 w-14 animate-pulse items-center justify-center rounded-2xl bg-accent font-display text-2xl font-bold text-accent-foreground shadow-sm">P</span>
        <p className="font-mono-custom text-[10px] uppercase tracking-[.2em] text-muted-foreground">waking your prep pulse…</p>
      </div>
    );
  }

  if (!query.data) {
    const onAuthed = (auth: AuthResponse) => {
      queryClient.setQueryData(getGetMeQueryKey(), auth);
    };
    if (location.startsWith('/forgot-password')) {
      return <ForgotPasswordPage />;
    }
    if (location.startsWith('/reset-password')) {
      return <ResetPasswordPage onAuthed={onAuthed} />;
    }
    return <AuthPage onAuthed={onAuthed} />;
  }

  return <>{children}</>;
}