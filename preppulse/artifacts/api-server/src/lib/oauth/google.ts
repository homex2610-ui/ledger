import { OAuth2Client } from "google-auth-library";
import { loadOAuthConfig } from "./config.js";

export interface GoogleIdentity {
  sub: string;
  email: string;
  name: string;
}

export class GoogleVerificationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GoogleVerificationError";
  }
}

let client: OAuth2Client | null = null;

function googleClient(): OAuth2Client | null {
  const { googleClientId, googleCertsUrl } = loadOAuthConfig();
  if (!googleClientId) return null;
  if (!client) {
    client = new OAuth2Client({
      clientId: googleClientId,
      endpoints: googleCertsUrl ? { oauth2FederatedSignonPemCertsUrl: googleCertsUrl } : undefined,
    });
  }
  return client;
}

/**
 * Verifies a Google Identity Services ID token using Google's signing
 * certificates.
 *
 * google-auth-library validates the RSA-SHA256 signature against the matching
 * `kid` from Google's cached certificate endpoint, checks `aud` against
 * GOOGLE_CLIENT_ID, checks `iss` against Google's issuers, and rejects
 * expired tokens. In Node it fetches the PEM certificate format by default;
 * GOOGLE_CERTS_URL (test-only) can point it at a different endpoint.
 */
export async function verifyGoogleCredential(credential: string): Promise<GoogleIdentity> {
  const oauth = googleClient();
  if (!oauth) throw new GoogleVerificationError("Google sign-in is not configured");

  const config = loadOAuthConfig();
  let ticket;
  try {
    ticket = await oauth.verifyIdToken({ idToken: credential, audience: config.googleClientId! });
  } catch {
    throw new GoogleVerificationError("Google credential is invalid or expired");
  }

  const payload = ticket.getPayload();
  if (!payload?.sub || !payload.email || payload.email_verified !== true) {
    throw new GoogleVerificationError("Google credential is missing the required identity claims");
  }

  return { sub: payload.sub, email: payload.email, name: payload.name ?? "" };
}