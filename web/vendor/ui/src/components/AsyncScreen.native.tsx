/**
 * @ummat/ui — AsyncScreen (React Native variant)
 *
 * Purpose: 7-state wrapper component for React Native screens — same props contract
 *   as AsyncScreen.tsx (web). Uses NetInfo for offline detection; uses
 *   @ummat/native-bridge permission hook for permission-denied state.
 *
 * Inputs: identical to AsyncScreen.tsx — loading, empty, error, offline,
 *   permissionDenied, rateLimited, retryAfterMs, onRetry, children, emptySlot.
 *
 * Outputs: React Native View hierarchy representing the current state.
 *
 * Constraints:
 *   - NO DOM APIs (window / document / localStorage) — RN-compatible only.
 *   - Same priority order as web: offline > permissionDenied > rateLimited >
 *     loading > error > empty > populated.
 *   - children NEVER render outside the populated state.
 *   - error state MUST NOT expose raw stack traces in the rendered output.
 *
 * SPORT: P2-E2-W02-S02-T01 — AsyncScreen.native baseline component
 *
 * Ref: .claude/docs/p2-robustness-framework-spec.md §3.2 (RN variant)
 */

import React, { useEffect, useRef, useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native'
import NetInfo, { type NetInfoState } from '@react-native-community/netinfo'
import { usePermissionDenied } from '@ummat/native-bridge'

export interface AsyncScreenProps {
  loading: boolean
  empty: boolean
  error: Error | null
  /** Passed from caller — component also auto-detects via NetInfo */
  offline: boolean
  permissionDenied: boolean
  rateLimited: boolean
  /** Countdown milliseconds for rate-limited state. Defaults to 60_000. */
  retryAfterMs?: number
  onRetry: () => void
  children: React.ReactNode
  emptySlot: React.ReactNode
}

type ScreenState =
  | 'offline'
  | 'permission-denied'
  | 'rate-limited'
  | 'loading'
  | 'error'
  | 'empty'
  | 'populated'

function resolveState(
  props: AsyncScreenProps,
  netOffline: boolean,
): ScreenState {
  const offline = props.offline || netOffline
  if (offline) return 'offline'
  if (props.permissionDenied) return 'permission-denied'
  if (props.rateLimited) return 'rate-limited'
  if (props.loading) return 'loading'
  if (props.error) return 'error'
  if (props.empty) return 'empty'
  return 'populated'
}

// ---------------------------------------------------------------------------
// Countdown hook (RN-compatible — no DOM timers)
// ---------------------------------------------------------------------------
function useCountdown(ms: number | undefined, active: boolean): number {
  const totalSec = Math.ceil((ms ?? 60_000) / 1_000)
  const [remaining, setRemaining] = useState(totalSec)

  useEffect(() => {
    if (!active) {
      setRemaining(totalSec)
      return
    }
    setRemaining(totalSec)
    const id = setInterval(() => {
      setRemaining((s) => Math.max(0, s - 1))
    }, 1_000)
    return () => clearInterval(id)
  }, [active, totalSec])

  return remaining
}

// ---------------------------------------------------------------------------
// AsyncScreen — RN export
// ---------------------------------------------------------------------------

/**
 * AsyncScreen (React Native) — same props contract as the web variant.
 * Uses NetInfo for live offline detection; @ummat/native-bridge for permissions.
 */
export function AsyncScreen(props: AsyncScreenProps) {
  const {
    loading,
    empty,
    error,
    offline: offlineProp,
    permissionDenied: permissionDeniedProp,
    rateLimited,
    retryAfterMs,
    onRetry,
    children,
    emptySlot,
  } = props

  // ---------- NetInfo offline detection ----------
  const [netOffline, setNetOffline] = useState(false)

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      setNetOffline(state.isConnected === false)
    })
    return unsubscribe
  }, [])

  // ---------- native-bridge permission hook ----------
  const { denied: nativeDenied } = usePermissionDenied()
  const permissionDenied = permissionDeniedProp || nativeDenied

  const state = resolveState(
    { ...props, offline: offlineProp, permissionDenied },
    netOffline,
  )

  // ---------- Countdown for rate-limited ----------
  const totalSec = Math.ceil((retryAfterMs ?? 60_000) / 1_000)
  const remaining = useCountdown(retryAfterMs, state === 'rate-limited')
  const autoRetried = useRef(false)

  useEffect(() => {
    if (state === 'rate-limited' && remaining === 0 && !autoRetried.current) {
      autoRetried.current = true
      onRetry()
    }
    if (state !== 'rate-limited') {
      autoRetried.current = false
    }
  }, [state, remaining, onRetry])

  switch (state) {
    case 'offline':
      return (
        <View style={styles.container} accessibilityRole="none">
          <Text style={styles.message} accessibilityRole="text">
            You appear to be offline.
          </Text>
        </View>
      )

    case 'permission-denied':
      return (
        <View style={styles.container} accessibilityRole="none">
          <Text style={styles.message} accessibilityRole="text">
            You don&apos;t have permission to view this content.
          </Text>
        </View>
      )

    case 'rate-limited':
      return (
        <View style={styles.container} accessibilityRole="none">
          {remaining > 0 ? (
            <Text style={styles.message} accessibilityRole="text">
              Retrying in {remaining}s…
            </Text>
          ) : (
            <TouchableOpacity
              style={styles.retryButton}
              onPress={onRetry}
              accessibilityRole="button"
              accessibilityLabel="Retry now"
            >
              <Text style={styles.retryLabel}>Retry now</Text>
            </TouchableOpacity>
          )}
        </View>
      )

    case 'loading':
      return (
        <View style={styles.container} accessibilityRole="progressbar">
          <ActivityIndicator size="large" accessibilityLabel="Loading" />
        </View>
      )

    case 'error':
      return (
        <View style={styles.container} accessibilityRole="alert">
          <Text style={styles.message} accessibilityRole="text">
            Something went wrong. Please try again.
          </Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={onRetry}
            accessibilityRole="button"
            accessibilityLabel="Retry"
          >
            <Text style={styles.retryLabel}>Retry</Text>
          </TouchableOpacity>
        </View>
      )

    case 'empty':
      return (
        <View style={styles.container} accessibilityRole="none">
          {emptySlot}
        </View>
      )

    case 'populated':
      return <>{children}</>
  }
}

AsyncScreen.displayName = 'AsyncScreen'

export default AsyncScreen

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 12,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#1E5E2F',
    minHeight: 44,
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
})
