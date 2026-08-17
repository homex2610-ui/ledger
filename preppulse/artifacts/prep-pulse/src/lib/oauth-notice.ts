import { useEffect, useState } from 'react';

const OAUTH_NOTICE_KEY = 'pp-oauth-notice';

export function useOauthQueryNotice(): string | null {
  const [notice, setNotice] = useState<string | null>(null);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oauth = params.get('oauth');
    const provider = params.get('provider');
    const reason = params.get('reason');
    if (!oauth) return;
    window.history.replaceState({}, '', window.location.pathname);
    try {
      if (sessionStorage.getItem(OAUTH_NOTICE_KEY) === oauth) return;
      sessionStorage.setItem(OAUTH_NOTICE_KEY, oauth);
    } catch {
      /* storage unavailable */
    }
    const providerLabel = provider === 'google' ? 'Google' : provider === 'discord' ? 'Discord' : null;
    if (oauth === 'error') {
      if (provider === 'discord' && reason === 'state_mismatch') setNotice('Discord sign-in expired. Go back and try again.');
      else if (provider === 'discord' && (reason === 'exchange_failed' || reason === 'identity_failed')) setNotice('Discord rejected the sign-in. Try again in a moment.');
      else setNotice(`${providerLabel ? providerLabel + ' ' : ''}sign-in failed. Try again.`);
    }
    if (oauth === 'conflict') setNotice(`This email already belongs to an account. If it\u2019s your account, sign in with your email and password, or use \u201cForgot password?\u201d to reset it \u2014 then connect ${providerLabel ?? 'the provider'} in Settings.`);
    if (oauth === 'success') setNotice('Signed in.');
  }, []);
  return notice;
}