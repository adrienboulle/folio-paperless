import { Check, CircleAlert } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';

import { animateLayout } from '@/components/motion';
import { createThemedStyleSheet, fonts, palette, radii, shadows } from '@/constants/theme';

export type SheetToastState = {
  message: string;
  error?: boolean;
};

/**
 * A native `Modal` is its own window: a toast rendered by the screen underneath
 * is never seen while a sheet is open. Every sheet therefore owns its own toast
 * and still forwards the message to the screen, so a result stays readable once
 * the sheet closes.
 */
export function useSheetToast(forward?: (message: string, error?: boolean) => void) {
  const [toast, setToast] = useState<SheetToastState | null>(null);
  const forwardRef = useRef(forward);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    forwardRef.current = forward;
  }, [forward]);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const showToast = useCallback((message: string, error = false) => {
    animateLayout();
    setToast({ message, error });
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      animateLayout();
      setToast(null);
    }, error ? 3500 : 2200);
    forwardRef.current?.(message, error);
  }, []);

  return { showToast, toast };
}

export function SheetToast({ toast }: { toast: SheetToastState | null }) {
  if (!toast) return null;
  return (
    <View
      accessibilityLiveRegion="polite"
      pointerEvents="none"
      style={[styles.toast, toast.error && styles.toastError]}>
      {toast.error ? (
        <CircleAlert color={palette.paper} size={17} />
      ) : (
        <Check color={palette.lime} size={17} />
      )}
      <Text style={styles.toastText}>{toast.message}</Text>
    </View>
  );
}

const styles = createThemedStyleSheet({
  toast: {
    position: 'absolute',
    left: 24,
    right: 24,
    bottom: 34,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderRadius: radii.md,
    backgroundColor: palette.ink,
    ...shadows.lift,
  },
  toastError: {
    backgroundColor: palette.danger,
  },
  toastText: {
    flexShrink: 1,
    color: palette.paper,
    fontFamily: fonts.sans,
    fontSize: 12,
    fontWeight: '700',
  },
});
