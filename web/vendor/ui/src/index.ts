/**
 * @ummat/ui — Shared UI component library
 *
 * All components are WCAG 2.2 AA compliant.
 * CSS required: import '@ummat/brand/css' in your app's globals.css.
 */

export { Button } from './components/Button'
export type { ButtonProps, ButtonVariant, ButtonSize } from './components/Button'

export { Input } from './components/Input'
export type { InputProps } from './components/Input'

export { Badge } from './components/Badge'
export type { BadgeProps, BadgeVariant, BadgeSize } from './components/Badge'

export { Card, CardHeader, CardBody, CardFooter } from './components/Card'
export type { CardProps, CardVariant } from './components/Card'

export { Modal } from './components/Modal'
export type { ModalProps } from './components/Modal'

export { Toast } from './components/Toast'
export type { ToastProps, ToastVariant } from './components/Toast'

export { Avatar } from './components/Avatar'
export type { AvatarProps, AvatarSize } from './components/Avatar'

export { Skeleton } from './components/Skeleton'
export type { SkeletonProps, SkeletonShape } from './components/Skeleton'

export { Banner } from './components/Banner'
export type { BannerProps, BannerVariant } from './components/Banner'

export { DataState } from './components/DataState'
export type { DataStateProps, DataStateEnum } from './components/DataState'

export { FocusRing } from './components/FocusRing'
export type { FocusRingProps } from './components/FocusRing'

// AsyncScreen — 7-state component (P2-E2-W02-S02-T01)
// Web variant only. React Native: import from @ummat/ui/async-screen.native
export { AsyncScreen } from './components/AsyncScreen'
export type { AsyncScreenProps } from './components/AsyncScreen'

// ErrorBoundary — route-level error boundary (P2-E2-W02-S02-T01)
export { ErrorBoundary } from './components/ErrorBoundary'
export type { ErrorBoundaryProps } from './components/ErrorBoundary'

// A11y primitives (T-P7-Q-A11Y-01..03) — mount LiveRegions + SkipLink in every
// app root layout; use FocusTrap + useReturnFocus on non-dialog overlay surfaces.
export { LiveRegions, useLiveAnnounce } from './a11y/LiveRegions'
export type {
  LiveRegionsProps,
  LiveAnnounceFn,
  LiveAnnounceOptions,
  LiveRegionPoliteness,
} from './a11y/LiveRegions'

export { FocusTrap } from './a11y/FocusTrap'
export type { FocusTrapProps } from './a11y/FocusTrap'

export { useReturnFocus } from './a11y/useReturnFocus'

export { SkipLink } from './a11y/SkipLink'
export type { SkipLinkProps } from './a11y/SkipLink'
