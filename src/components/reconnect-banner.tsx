import { RefreshCw, ShieldAlert } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { MotionPressable as Pressable } from '@/components/motion';
import { createThemedStyleSheet, fonts, palette, radii } from '@/constants/theme';
import { useApp } from '@/context/app-context';
import { useI18n } from '@/context/ui-preferences-context';
import { presentAuthError } from '@/lib/auth/error-presentation';
import { profileNeedsReconnection } from '@/lib/auth/reconnect';
import { usePathname, useRouter } from '@/lib/router';

/**
 * Persistent invitation to sign in again, shown on every tab while Paperless
 * refuses the active connection. It restarts the sign-in for the connection
 * that is already saved; the full connection form is only opened for the
 * methods that need a secret typed by hand.
 */
export function ReconnectBanner() {
  const { activeProfile, reconnectActiveProfile } = useApp();
  const { t } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The four tabs carry it; deeper screens keep their own chrome.
  const onTab = ['/', '/documents', '/inbox', '/settings'].includes(pathname);
  if (!onTab || !profileNeedsReconnection(activeProfile)) return null;

  async function reconnect() {
    setBusy(true);
    setError(null);
    try {
      const { reconnected } = await reconnectActiveProfile();
      if (!reconnected) {
        setError(t('profiles.reconnectForm'));
        router.push({ pathname: '/settings', params: { reconnect: '1' } });
      }
    } catch (caught) {
      setError(presentAuthError(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View accessibilityLiveRegion="polite" style={styles.banner}>
      <View style={styles.row}>
        <View style={styles.icon}>
          <ShieldAlert color={palette.danger} size={18} strokeWidth={2.3} />
        </View>
        <View style={styles.copy}>
          <Text style={styles.title}>{t('profiles.reconnectTitle')}</Text>
          <Text style={styles.subtitle}>
            {activeProfile?.status.summary || t('profiles.reconnectCopy')}
          </Text>
        </View>
        <Pressable
          accessibilityLabel={t('profiles.reconnectAccessibility', {
            server: activeProfile?.displayName ?? '',
          })}
          accessibilityRole="button"
          accessibilityState={{ busy, disabled: busy }}
          disabled={busy}
          onPress={() => void reconnect()}
          style={styles.action}>
          {busy ? (
            <ActivityIndicator color={palette.canvas} size="small" />
          ) : (
            <RefreshCw color={palette.canvas} size={14} strokeWidth={2.6} />
          )}
          <Text style={styles.actionText}>{t('profiles.reconnectAction')}</Text>
        </Pressable>
      </View>
      {!!error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = createThemedStyleSheet({
  banner: {
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 18,
    borderRadius: radii.md,
    backgroundColor: palette.dangerSurface,
    borderWidth: 1,
    borderColor: palette.danger,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  icon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.rose,
  },
  copy: {
    flex: 1,
  },
  title: {
    color: palette.ink,
    fontFamily: fonts.sans,
    fontSize: 13,
    fontWeight: '900',
  },
  subtitle: {
    color: palette.inkSoft,
    fontFamily: fonts.sans,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  action: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    borderRadius: radii.sm,
    backgroundColor: palette.ink,
  },
  actionText: {
    color: palette.canvas,
    fontFamily: fonts.sans,
    fontSize: 12,
    fontWeight: '900',
  },
  error: {
    color: palette.danger,
    fontFamily: fonts.sans,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.78,
    transform: [{ scale: 0.99 }],
  },
});
