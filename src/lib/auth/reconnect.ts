import type { ConnectionProfileDraft } from './profile-management.ts';
import type { ConnectionProfile } from './profile-store.ts';

/** A profile whose authority the server rejected. The household sees this as
 * "Reconnexion nécessaire", not as an HTTP status. */
export function profileNeedsReconnection(profile: ConnectionProfile | null | undefined) {
  return profile?.status.code === 'authentication-error';
}

/**
 * The draft that re-establishes an existing connection without reopening the
 * full form. It is only returned for the authentication methods Folio can
 * renew on its own — an identity-provider sign-in, or a client certificate
 * already held by the device. Methods that need a secret typed by hand (token,
 * Paperless credentials, custom headers) return null: those still belong in
 * the connection form.
 */
export function reconnectDraftForProfile(
  profile: ConnectionProfile,
  redirectUri: string,
): ConnectionProfileDraft | null {
  const base = {
    profileId: profile.id,
    displayName: profile.displayName,
    serverUrl: profile.serverUrl,
  };
  if (profile.auth.kind === 'oidc') {
    return {
      ...base,
      auth: {
        kind: 'oidc',
        issuer: profile.auth.issuer,
        clientId: profile.auth.clientId,
        redirectUri,
        scopes: [...profile.auth.scopes],
        // The rejected session must not be silently reused by the provider.
        forceLogin: true,
      },
    };
  }
  if (profile.auth.kind === 'mutual-tls') {
    return {
      ...base,
      auth: { kind: 'mutual-tls', identityAction: 'reuse', identity: profile.auth.identity },
    };
  }
  return null;
}
