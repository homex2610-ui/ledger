import { useEffect, type ReactNode } from 'react';
import { useLocation } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import { ApiError, getGetMeQueryKey, useGetMe, type AuthResponse } from '@workspace/api-client-react';
import AuthPage from '@/pages/auth';
import ForgotPasswordPage from '@/pages/forgot-password';
import ResetPasswordPage from '@/pages/reset-password';
import { BrandMark } from '@/components/brand-mark';

export function AuthGate({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const queryClient = useQueryClient();
  const query = useGetMe({ query: { queryKey: getGetMeQueryKey(), retry: false, staleTime: 30_000 } });

  useEffect(() => {
    // Supabase recovery links carry the token in the URL hash. Emails sent
    // before the redirect allow-list was fixed land on the bare origin with
    // #access_token=...; bounce those to the reset page so the token is read.
    const hash = new URLSearchParams(window.location.hash.slice(1));
    if (hash.has('access_token') && !window.location.pathname.endsWith('/reset-password')) {
      window.location.replace('/reset-password' + window.location.hash);
      return;
    }
    const params = new URLSearchParams(window.location.search);
    if (params.has('oauth') || params.has('provider')) {
      params.delete('oauth');
      params.delete('provider');
      const qs = params.toString();
      window.history.replaceState({}, '', qs ? `${window.location.pathname}?${qs}` : window.location.pathname);
    }
  }, []);

  const sessionDead = Boolean(query.data && query.error instanceof ApiError && query.error.status === 401);

  const onAuthed = (auth: AuthResponse) => {
    queryClient.setQueryData(getGetMeQueryKey(), auth);
  };

  if (query.isLoading) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-5 bg-background">
        <span className="animate-pulse"><BrandMark size={56} /></span>
        <p className="font-mono-custom text-[10px] uppercase tracking-[.2em] text-muted-foreground">waking your prep pulse…</p>
      </div>
    );
  }

  if (location.startsWith('/forgot-password')) {
    return <ForgotPasswordPage />;
  }
  if (location.startsWith('/reset-password')) {
    return <ResetPasswordPage onAuthed={onAuthed} />;
  }
  if (!query.data || sessionDead) {
    return <AuthPage onAuthed={onAuthed} />;
  }

  return <>{children}</>;
}