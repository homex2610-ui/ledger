import { useEffect, useRef } from 'react';
import { useLocation, useParams } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import { getGetCirclesQueryKey, getGetLeaderboardQueryKey, useConnectByCode } from '@workspace/api-client-react';
import { Card } from '@/components/ui-elements';

const JOIN_ERROR_KEY = 'pp-join-error';

export default function JoinByLink() {
  const params = useParams<{ code: string }>();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const connect = useConnectByCode();
  // The effect must fire exactly once per visit — StrictMode double-invokes
  // effects in dev, and remounts (e.g. back-navigation) must not re-join.
  const ranRef = useRef(false);

  useEffect(() => {
    if (ranRef.current) return;
    const code = (params.code ?? '').trim().toUpperCase();
    if (!code) {
      try { sessionStorage.setItem(JOIN_ERROR_KEY, 'That invite link is missing its code.'); } catch { /* ignore */ }
      navigate('/compete');
      return;
    }
    ranRef.current = true;
    connect.mutate(
      { data: { code } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetCirclesQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetLeaderboardQueryKey() });
          navigate('/compete');
        },
        onError: (err) => {
          try { sessionStorage.setItem(JOIN_ERROR_KEY, err instanceof Error ? err.message : 'Could not join that circle'); } catch { /* ignore */ }
          navigate('/compete');
        },
      },
    );
  }, [params.code, navigate, queryClient, connect]);

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <Card className="p-8 text-center">
        <p className="font-mono-custom text-[10px] uppercase tracking-[.18em] text-primary">Private circle</p>
        <p className="mt-2 font-display text-2xl font-bold">Joining your circle…</p>
        <p className="mt-2 text-sm text-muted-foreground">Hold tight — this only takes a moment.</p>
      </Card>
    </div>
  );
}