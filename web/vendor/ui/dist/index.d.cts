import React$1, { ButtonHTMLAttributes, InputHTMLAttributes, HTMLAttributes, JSX, ReactNode, ImgHTMLAttributes, Component, ErrorInfo } from 'react';

/**
 * @ummat/ui — Button
 *
 * WCAG 2.2 AA compliant:
 * - 2.5.8 Target Size: min 44×44px on mobile (via min-h + min-w + padding)
 * - 2.4.7 Focus Visible: :focus-visible ring via CSS class
 * - 4.1.2 Name, Role, Value: aria-label / aria-disabled supported
 * - Uses green-600 (#5A9438) on light-bg variant per D-P3-15
 *
 * RTL: ltr:flex-row rtl:flex-row-reverse applied to button inner layout.
 *   Icon-left buttons flip icon to the right in RTL locales automatically.
 *
 * No Tailwind dependency — use CSS custom properties from @ummat/brand/css.
 */

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'light-bg';
type ButtonSize = 'sm' | 'md' | 'lg';
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    size?: ButtonSize;
    loading?: boolean;
    fullWidth?: boolean;
}
declare const Button: React$1.ForwardRefExoticComponent<ButtonProps & React$1.RefAttributes<HTMLButtonElement>>;

/**
 * @ummat/ui — Input
 *
 * WCAG 2.2 AA compliant:
 * - 2.5.8 Target Size 24×24px minimum (enforced via min-height)
 * - 2.4.7 Focus Visible: :focus-visible ring
 * - 1.3.1 Info and Relationships: label association via htmlFor/id
 * - 4.1.2 Name, Role, Value: aria-invalid, aria-describedby
 *
 * RTL: ltr:text-left rtl:text-right on label + hint/error;
 *   ltr:flex-row rtl:flex-row-reverse on the adornment row.
 */

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    hint?: string;
    error?: string;
    /** Left icon or adornment */
    prefixEl?: React$1.ReactNode;
    /** Right icon or adornment */
    suffixEl?: React$1.ReactNode;
    fullWidth?: boolean;
}
declare const Input: React$1.ForwardRefExoticComponent<InputProps & React$1.RefAttributes<HTMLInputElement>>;

/**
 * @ummat/ui — Badge
 *
 * Inline label for status, counts, or categories.
 */

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';
type BadgeSize = 'sm' | 'md';
interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
    variant?: BadgeVariant;
    size?: BadgeSize;
}
declare function Badge({ variant, size, className, children, ...props }: BadgeProps): React$1.JSX.Element;

/**
 * @ummat/ui — Card
 *
 * Surface container with optional header/footer.
 */

type CardVariant = 'default' | 'elevated' | 'outlined' | 'glass';
interface CardProps extends HTMLAttributes<HTMLDivElement> {
    variant?: CardVariant;
    /** Render as a button/link card (focusable) */
    interactive?: boolean;
    asElement?: keyof JSX.IntrinsicElements;
}
declare function Card({ variant, interactive, asElement: As, className, children, ...props }: CardProps): JSX.Element;
declare function CardHeader({ className, children, ...props }: HTMLAttributes<HTMLDivElement>): JSX.Element;
declare function CardBody({ className, children, ...props }: HTMLAttributes<HTMLDivElement>): JSX.Element;
declare function CardFooter({ className, children, ...props }: HTMLAttributes<HTMLDivElement>): JSX.Element;

/**
 * @ummat/ui — Modal
 *
 * WCAG 2.2 AA:
 * - 2.4.11 Focus Not Obscured: focus trap inside modal; backdrop does not obscure focused element
 * - 2.5.8 Target Size: close button min 44×44px
 * - 4.1.2: role="dialog", aria-modal, aria-labelledby
 * - Focus returns to trigger on close
 *
 * RTL: ltr:text-left rtl:text-right on title;
 *   ltr:flex-row rtl:flex-row-reverse on modal header (title + close button swap sides).
 *
 * No external deps — uses native <dialog> element for accessibility.
 */

interface ModalProps {
    open: boolean;
    onClose: () => void;
    title?: string;
    /** Element that triggered the modal — focus returns here on close */
    triggerRef?: React$1.RefObject<HTMLElement | null>;
    children: ReactNode;
    className?: string;
    /** Max width of modal content area */
    maxWidth?: string;
}
declare function Modal({ open, onClose, title, triggerRef, children, className, maxWidth, }: ModalProps): React$1.JSX.Element;

/**
 * @ummat/ui — Toast / Notification
 *
 * WCAG: role="status" (non-urgent) or role="alert" (urgent).
 * Uses aria-live="polite" for status, aria-live="assertive" for errors.
 */

type ToastVariant = 'info' | 'success' | 'warning' | 'error';
interface ToastProps {
    variant?: ToastVariant;
    message: ReactNode;
    /** Auto-dismiss timeout in ms. 0 = no auto-dismiss. */
    duration?: number;
    onClose?: () => void;
    className?: string;
}
declare function Toast({ variant, message, duration, onClose, className, }: ToastProps): React$1.JSX.Element;

/**
 * @ummat/ui — Avatar
 *
 * User/entity avatar with image fallback to initials.
 * WCAG: alt text required when not decorative.
 */

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
interface AvatarProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
    src?: string | null;
    /** Display name used to generate initials on fallback */
    name?: string;
    size?: AvatarSize;
    /** aria-label for the avatar (defaults to name) */
    label?: string;
}
declare function Avatar({ src, name, size, label, className, ...props }: AvatarProps): React$1.JSX.Element;

/**
 * @ummat/ui — Skeleton
 *
 * Loading placeholder using the shared `ummat-skeleton-pulse` keyframe
 * defined in @ummat/brand/css. One keyframe, no per-component duplication (B6-06).
 *
 * WCAG: role="status" + aria-label so screen readers announce loading state.
 */

type SkeletonShape = 'rect' | 'circle' | 'text';
interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
    shape?: SkeletonShape;
    width?: string | number;
    height?: string | number;
    /** Number of text-line skeletons to render */
    lines?: number;
}
declare function Skeleton({ shape, width, height, lines, className, style, ...props }: SkeletonProps): React$1.JSX.Element;

/**
 * @ummat/ui — Banner
 *
 * Full-width informational or status banner.
 * WCAG: role="region" with aria-label, or role="alert" for errors.
 */

type BannerVariant = 'info' | 'success' | 'warning' | 'error' | 'offline';
interface BannerProps {
    variant?: BannerVariant;
    children: ReactNode;
    onDismiss?: () => void;
    className?: string;
    /** aria-label for the landmark region */
    label?: string;
}
declare function Banner({ variant, children, onDismiss, className, label, }: BannerProps): React$1.JSX.Element;

/**
 * @ummat/ui — DataState (B5-01)
 *
 * 7-state wrapper component for all data-loading surfaces:
 *   loading | empty | error | offline | partial | success | stale
 *
 * Usage:
 *   <DataState state="loading" skeleton={<Skeleton lines={3} />}>
 *     <MyContent />
 *   </DataState>
 *
 * WCAG:
 * - aria-live="polite" for status updates
 * - role="alert" for errors
 * - role="status" for loading
 */

type DataStateEnum = 'loading' | 'empty' | 'error' | 'offline' | 'partial' | 'success' | 'stale';
interface DataStateProps {
    state: DataStateEnum;
    children: ReactNode;
    /** Custom skeleton shown in loading state. Defaults to a 3-line text skeleton. */
    skeleton?: ReactNode;
    /** Empty state content */
    emptyContent?: ReactNode;
    /** Error state content */
    errorContent?: ReactNode;
    /** Offline state content */
    offlineContent?: ReactNode;
    /** Stale warning banner (shown above content in stale state) */
    staleBanner?: ReactNode;
    /** Partial warning banner (shown above content in partial state) */
    partialBanner?: ReactNode;
    className?: string;
}
declare function DataState({ state, children, skeleton, emptyContent, errorContent, offlineContent, staleBanner, partialBanner, className, }: DataStateProps): React$1.JSX.Element;

/**
 * @ummat/ui — FocusRing (B2-07)
 *
 * Utility wrapper that guarantees a visible :focus-visible ring.
 * Use on any custom interactive element that might suppress the browser
 * default (e.g. elements with outline: none from a CSS reset).
 *
 * WCAG 2.4.7 Focus Visible (AA) + 2.4.11 Focus Not Obscured (2.2 AA)
 */

interface FocusRingProps extends HTMLAttributes<HTMLSpanElement> {
    children: ReactNode;
    /** Extra offset in px (default 2) */
    offset?: number;
}
declare function FocusRing({ children, offset, className, style, ...props }: FocusRingProps): React$1.JSX.Element;

/**
 * @ummat/ui — AsyncScreen
 *
 * Purpose: 7-state wrapper component for all async/data-bearing screens.
 *   Renders exactly one state at a time: loading | empty | error | populated |
 *   offline | permission-denied | rate-limited.
 *
 * Inputs:
 *   - loading: boolean — fetch in-flight, no data yet
 *   - empty: boolean — fetch succeeded, result set is zero-length / null
 *   - error: Error | null — non-retriable fetch or mutation failure
 *   - offline: boolean — network unavailable
 *   - permissionDenied: boolean — user lacks required auth claim / role
 *   - rateLimited: boolean — API returned 429 or quota exceeded
 *   - retryAfterMs: number (optional) — countdown ms for rate-limited state
 *   - onRetry: () => void — retry callback for error / rate-limited states
 *   - children: ReactNode — rendered ONLY in the populated state
 *   - emptySlot: ReactNode — rendered in the empty state
 *
 * Outputs: JSX element with appropriate slot rendered for the current state.
 *
 * Constraints:
 *   - Priority order (first truthy wins):
 *     offline > permissionDenied > rateLimited > loading > error > empty > populated
 *   - children NEVER render in any state other than populated
 *   - error state MUST NOT expose raw stack traces to the DOM
 *
 * SPORT: P2-E2-W02-S02-T01 — AsyncScreen baseline component
 *
 * Ref: .claude/docs/p2-robustness-framework-spec.md §3.2
 */

interface AsyncScreenProps {
    loading: boolean;
    empty: boolean;
    error: Error | null;
    offline: boolean;
    permissionDenied: boolean;
    rateLimited: boolean;
    /** Countdown milliseconds for rate-limited state. Defaults to 60_000. */
    retryAfterMs?: number;
    onRetry: () => void;
    children: React$1.ReactNode;
    emptySlot: React$1.ReactNode;
}
/**
 * AsyncScreen renders exactly one of 7 states for async data-bearing screens.
 * Import from @ummat/ui — never copy this component into an app.
 */
declare function AsyncScreen(props: AsyncScreenProps): React$1.JSX.Element;
declare namespace AsyncScreen {
    var displayName: string;
}

/**
 * @ummat/ui — ErrorBoundary
 *
 * Purpose: React class error boundary that catches unhandled render errors
 *   and renders the provided fallback UI instead of crashing the tree.
 *   Wraps every route-level component per the robustness spec (§4.1).
 *
 * Inputs:
 *   - fallback: ReactNode — displayed when a render error is caught
 *   - onError?: (error: Error, info: ErrorInfo) => void — optional callback
 *     for Sentry capture (only INTERNAL errors go to Sentry; see spec §4.1)
 *   - children: ReactNode — the guarded subtree
 *
 * Outputs: children in the normal case; fallback when an error is caught.
 *
 * Constraints:
 *   - MUST NOT expose raw stack traces in the fallback UI
 *   - Used at route level: <ErrorBoundary fallback={<ErrorState onRetry={refetch} />}>
 *
 * SPORT: P2-E2-W02-S02-T01 — ErrorBoundary baseline component
 *
 * Ref: .claude/docs/p2-robustness-framework-spec.md §4.1
 */

interface ErrorBoundaryProps {
    /** Fallback UI to render when a render error is caught. */
    fallback: ReactNode;
    /**
     * Optional callback for error reporting (e.g. Sentry.captureException).
     * Called with the error and React component stack.
     * MUST NOT expose the stack trace in the rendered UI.
     */
    onError?: (error: Error, info: ErrorInfo) => void;
    children: ReactNode;
}
interface State {
    hasError: boolean;
}
declare class ErrorBoundary extends Component<ErrorBoundaryProps, State> {
    static displayName: string;
    constructor(props: ErrorBoundaryProps);
    static getDerivedStateFromError(): State;
    componentDidCatch(error: Error, info: ErrorInfo): void;
    render(): ReactNode;
}

/**
 * @ummat/ui — LiveRegions
 *
 * Canonical pair of ARIA live regions mounted ONCE per page (T-P7-Q-A11Y-01).
 *
 * WCAG 2.2 AA:
 * - 4.1.3 Status Messages — announces transient updates without focus change.
 *
 * Anti-pattern: NEVER mount more than one polite + one assertive region per page.
 * Multiple regions cause screen reader chaos (NVDA/JAWS may speak the most-recently
 * mutated region only; VoiceOver may queue all of them sequentially).
 *
 * Usage:
 *   // app/layout.tsx (root, mounted once)
 *   <LiveRegions />
 *
 *   // any descendant component
 *   const announce = useLiveAnnounce();
 *   announce('Donation received', 'polite');
 *   announce('Save failed', 'assertive');
 *
 * Implementation notes:
 * - Polite region: <div role="status" aria-live="polite" aria-atomic="true">
 * - Assertive region: <div role="alert" aria-live="assertive" aria-atomic="true">
 * - Both regions are visually hidden via .ummat-sr-only (a11y.css class).
 * - Messages are debounced (default 100 ms) so rapid same-message bursts collapse
 *   into a single announcement.
 * - Messages are cleared after a delay (default 1000 ms) so the screen reader's
 *   buffer is reset and identical subsequent messages re-announce.
 */

type LiveRegionPoliteness = 'polite' | 'assertive';
interface LiveAnnounceOptions {
    /** Debounce duplicates within this window (ms). Default 100. */
    debounceMs?: number;
    /** Clear the region after this delay so identical messages re-announce. Default 1000. */
    clearAfterMs?: number;
}
interface LiveAnnounceFn {
    (message: string, politeness?: LiveRegionPoliteness, options?: LiveAnnounceOptions): void;
}
interface LiveRegionsProps {
    /** Default debounce window (ms). Default 100. */
    defaultDebounceMs?: number;
    /** Default clear-after delay (ms). Default 1000. */
    defaultClearAfterMs?: number;
    /** Optional className for the wrapper (sr-only by default). */
    className?: string;
}
declare function LiveRegions({ defaultDebounceMs, defaultClearAfterMs, className, }?: LiveRegionsProps): React$1.JSX.Element;
declare function useLiveAnnounce(): LiveAnnounceFn;

/**
 * @ummat/ui — FocusTrap
 *
 * Canonical focus-trap wrapper (T-P7-Q-A11Y-02).
 *
 * Implementation note: hand-rolled (zero-dep) — does not depend on focus-trap-react
 * or Radix. The Modal primitive uses native <dialog>.showModal() which provides its
 * own modal focus trap; FocusTrap exists for non-dialog surfaces (drawers, popovers,
 * inline trapped regions) and for legacy ad-hoc modal logic being migrated.
 *
 * WCAG 2.2 AA:
 * - 2.4.3 Focus Order — Tab and Shift+Tab cycle within the trap.
 * - 2.4.11 Focus Not Obscured — caller is responsible for visual placement.
 * - 2.1.2 No Keyboard Trap — Escape closes the trap (caller wires onEscape).
 *
 * Usage:
 *   <FocusTrap active={open} onEscape={onClose} returnFocusTo={triggerRef}>
 *     <Drawer>...</Drawer>
 *   </FocusTrap>
 */

interface FocusTrapProps {
    /** When false, the trap is inert and renders children unchanged. */
    active: boolean;
    /** Wrapped content. */
    children: ReactNode;
    /** Optional className for the wrapper element. */
    className?: string;
    /** Called on Escape keydown while trap is active. */
    onEscape?: () => void;
    /**
     * Element to restore focus to on deactivate. If omitted, focus restores to
     * whatever was active when the trap activated.
     */
    returnFocusTo?: React$1.RefObject<HTMLElement | null>;
    /**
     * Selector for the initial focus target inside the trap. If omitted, the
     * first tabbable descendant is focused.
     */
    initialFocusSelector?: string;
}
declare function FocusTrap({ active, children, className, onEscape, returnFocusTo, initialFocusSelector, }: FocusTrapProps): React$1.JSX.Element;

/**
 * @ummat/ui — useReturnFocus
 *
 * Captures the active element when `active` flips true and restores focus to
 * it when `active` flips false (or on unmount). Use for non-modal surfaces
 * that need to behave like a modal for focus-restoration purposes (drawers,
 * popovers, command palettes).
 *
 * If you need a full focus trap, use <FocusTrap />. If you only need return-
 * focus, use this hook.
 *
 * Usage:
 *   const triggerRef = useRef<HTMLButtonElement>(null);
 *   useReturnFocus(open, triggerRef);
 */
declare function useReturnFocus(active: boolean, 
/**
 * Optional explicit trigger ref. If provided, focus restores to this element.
 * If omitted, focus restores to whatever was active when `active` became true.
 */
triggerRef?: React.RefObject<HTMLElement | null>): void;

/**
 * @ummat/ui — SkipLink
 *
 * Canonical skip-to-main link (T-P7-Q-A11Y-03).
 *
 * WCAG 2.2 AA:
 * - 2.4.1 Bypass Blocks — first focusable element on every page is a skip link
 *   that jumps to the page's main content.
 *
 * Mount as the FIRST child of <body> in every app's root layout. Pair with a
 * <main id="main" tabIndex={-1}> landmark so the activation lands cleanly.
 *
 * Styling: visually hidden until focused; on focus it pops into the top-start
 * corner with a strong contrast background. The styling uses Tailwind logical
 * utilities so the corner respects RTL (start-2 not left-2).
 *
 * Translation: pass the localized label via `children` or default to plain
 * 'Skip to main content' (English fallback). Apps SHOULD provide a translated
 * label via the `common.a11y.skipToMain` key.
 */

interface SkipLinkProps {
    /** Anchor target. Default '#main'. */
    href?: string;
    /** Localized label. Default 'Skip to main content'. */
    children?: ReactNode;
    /** Optional className appended to the canonical class list. */
    className?: string;
}
declare function SkipLink({ href, children, className, }: SkipLinkProps): React$1.JSX.Element;

export { AsyncScreen, type AsyncScreenProps, Avatar, type AvatarProps, type AvatarSize, Badge, type BadgeProps, type BadgeSize, type BadgeVariant, Banner, type BannerProps, type BannerVariant, Button, type ButtonProps, type ButtonSize, type ButtonVariant, Card, CardBody, CardFooter, CardHeader, type CardProps, type CardVariant, DataState, type DataStateEnum, type DataStateProps, ErrorBoundary, type ErrorBoundaryProps, FocusRing, type FocusRingProps, FocusTrap, type FocusTrapProps, Input, type InputProps, type LiveAnnounceFn, type LiveAnnounceOptions, type LiveRegionPoliteness, LiveRegions, type LiveRegionsProps, Modal, type ModalProps, Skeleton, type SkeletonProps, type SkeletonShape, SkipLink, type SkipLinkProps, Toast, type ToastProps, type ToastVariant, useLiveAnnounce, useReturnFocus };
