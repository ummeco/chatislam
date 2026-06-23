/**
 * @ummat/ui — Accessibility primitives barrel
 *
 * All a11y primitives shared across Ummeco web apps. Mount LiveRegions and
 * SkipLink in every root layout; use FocusTrap + useReturnFocus for any
 * non-dialog overlay surface (drawers, popovers, command palettes).
 */

export { LiveRegions, useLiveAnnounce } from './LiveRegions'
export type {
  LiveRegionsProps,
  LiveAnnounceFn,
  LiveAnnounceOptions,
  LiveRegionPoliteness,
} from './LiveRegions'

export { FocusTrap } from './FocusTrap'
export type { FocusTrapProps } from './FocusTrap'

export { useReturnFocus } from './useReturnFocus'

export { SkipLink } from './SkipLink'
export type { SkipLinkProps } from './SkipLink'
