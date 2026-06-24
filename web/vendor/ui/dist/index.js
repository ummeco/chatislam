// src/components/Button.tsx
import { forwardRef } from "react";
import { jsx, jsxs } from "react/jsx-runtime";
var variantStyles = {
  primary: "ummat-btn--primary",
  secondary: "ummat-btn--secondary",
  ghost: "ummat-btn--ghost",
  danger: "ummat-btn--danger",
  /** D-P3-15: use green-600 for light backgrounds — meets WCAG AA contrast */
  "light-bg": "ummat-btn--light-bg"
};
var sizeStyles = {
  sm: "ummat-btn--sm",
  md: "ummat-btn--md",
  lg: "ummat-btn--lg"
};
var Button = forwardRef(
  ({
    variant = "primary",
    size = "md",
    loading = false,
    fullWidth = false,
    disabled,
    className = "",
    children,
    ...props
  }, ref) => {
    const isDisabled = disabled || loading;
    return /* @__PURE__ */ jsxs(
      "button",
      {
        ref,
        disabled: isDisabled,
        "aria-disabled": isDisabled,
        "aria-busy": loading,
        className: [
          "ummat-btn",
          variantStyles[variant],
          sizeStyles[size],
          fullWidth ? "ummat-btn--full" : "",
          loading ? "ummat-btn--loading" : "",
          className
        ].filter(Boolean).join(" "),
        ...props,
        children: [
          loading ? /* @__PURE__ */ jsx("span", { className: "ummat-btn__spinner", "aria-hidden": "true" }) : null,
          /* @__PURE__ */ jsx("span", { className: [
            loading ? "ummat-btn__label--hidden" : "",
            "ltr:flex-row rtl:flex-row-reverse"
          ].filter(Boolean).join(" "), children })
        ]
      }
    );
  }
);
Button.displayName = "Button";

// src/components/Input.tsx
import { forwardRef as forwardRef2 } from "react";
import { jsx as jsx2, jsxs as jsxs2 } from "react/jsx-runtime";
var idCounter = 0;
var nextId = () => `ummat-input-${++idCounter}`;
var Input = forwardRef2(
  ({
    label,
    hint,
    error,
    prefixEl,
    suffixEl,
    fullWidth = false,
    id,
    className = "",
    disabled,
    ...props
  }, ref) => {
    const inputId = id ?? nextId();
    const hintId = hint ? `${inputId}-hint` : void 0;
    const errorId = error ? `${inputId}-error` : void 0;
    const describedBy = [hintId, errorId].filter(Boolean).join(" ") || void 0;
    return /* @__PURE__ */ jsxs2(
      "div",
      {
        className: [
          "ummat-input-wrap",
          fullWidth ? "ummat-input-wrap--full" : "",
          error ? "ummat-input-wrap--error" : "",
          disabled ? "ummat-input-wrap--disabled" : ""
        ].filter(Boolean).join(" "),
        children: [
          label ? /* @__PURE__ */ jsx2("label", { htmlFor: inputId, className: "ummat-input__label ltr:text-left rtl:text-right", children: label }) : null,
          /* @__PURE__ */ jsxs2("div", { className: "ummat-input__field ltr:flex-row rtl:flex-row-reverse", children: [
            prefixEl ? /* @__PURE__ */ jsx2("span", { className: "ummat-input__prefix", "aria-hidden": "true", children: prefixEl }) : null,
            /* @__PURE__ */ jsx2(
              "input",
              {
                ref,
                id: inputId,
                disabled,
                "aria-invalid": error ? "true" : void 0,
                "aria-describedby": describedBy,
                className: ["ummat-input", className].filter(Boolean).join(" "),
                ...props
              }
            ),
            suffixEl ? /* @__PURE__ */ jsx2("span", { className: "ummat-input__suffix", "aria-hidden": "true", children: suffixEl }) : null
          ] }),
          hint && !error ? /* @__PURE__ */ jsx2("p", { id: hintId, className: "ummat-input__hint ltr:text-left rtl:text-right", children: hint }) : null,
          error ? /* @__PURE__ */ jsx2("p", { id: errorId, className: "ummat-input__error ltr:text-left rtl:text-right", role: "alert", children: error }) : null
        ]
      }
    );
  }
);
Input.displayName = "Input";

// src/components/Badge.tsx
import { jsx as jsx3 } from "react/jsx-runtime";
function Badge({
  variant = "default",
  size = "md",
  className = "",
  children,
  ...props
}) {
  return /* @__PURE__ */ jsx3(
    "span",
    {
      className: [
        "ummat-badge",
        `ummat-badge--${variant}`,
        `ummat-badge--${size}`,
        className
      ].filter(Boolean).join(" "),
      ...props,
      children
    }
  );
}

// src/components/Card.tsx
import { jsx as jsx4 } from "react/jsx-runtime";
function Card({
  variant = "default",
  interactive = false,
  asElement: As = "div",
  className = "",
  children,
  ...props
}) {
  return (
    // @ts-expect-error polymorphic element
    /* @__PURE__ */ jsx4(
      As,
      {
        className: [
          "ummat-card",
          `ummat-card--${variant}`,
          interactive ? "ummat-card--interactive" : "",
          className
        ].filter(Boolean).join(" "),
        tabIndex: interactive ? 0 : void 0,
        ...props,
        children
      }
    )
  );
}
function CardHeader({ className = "", children, ...props }) {
  return /* @__PURE__ */ jsx4("div", { className: ["ummat-card__header", className].filter(Boolean).join(" "), ...props, children });
}
function CardBody({ className = "", children, ...props }) {
  return /* @__PURE__ */ jsx4("div", { className: ["ummat-card__body", className].filter(Boolean).join(" "), ...props, children });
}
function CardFooter({ className = "", children, ...props }) {
  return /* @__PURE__ */ jsx4("div", { className: ["ummat-card__footer", className].filter(Boolean).join(" "), ...props, children });
}

// src/components/Modal.tsx
import {
  useEffect,
  useRef
} from "react";
import { jsx as jsx5, jsxs as jsxs3 } from "react/jsx-runtime";
function Modal({
  open,
  onClose,
  title,
  triggerRef,
  children,
  className = "",
  maxWidth = "32rem"
}) {
  const dialogRef = useRef(null);
  const titleId = useRef(`ummat-modal-title-${Math.random().toString(36).slice(2)}`);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open) {
      if (!dialog.open) dialog.showModal();
    } else {
      if (dialog.open) {
        dialog.close();
        triggerRef?.current?.focus();
      }
    }
  }, [open, triggerRef]);
  const handleKeyDown = (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };
  const handleClick = (e) => {
    if (e.target === dialogRef.current) onClose();
  };
  return /* @__PURE__ */ jsx5(
    "dialog",
    {
      ref: dialogRef,
      "aria-modal": "true",
      "aria-labelledby": title ? titleId.current : void 0,
      className: ["ummat-modal", className].filter(Boolean).join(" "),
      onKeyDown: handleKeyDown,
      onClick: handleClick,
      children: /* @__PURE__ */ jsxs3(
        "div",
        {
          className: "ummat-modal__content",
          style: { maxWidth },
          role: "document",
          children: [
            /* @__PURE__ */ jsxs3("div", { className: "ummat-modal__header ltr:flex-row rtl:flex-row-reverse", children: [
              title ? /* @__PURE__ */ jsx5("h2", { id: titleId.current, className: "ummat-modal__title ltr:text-left rtl:text-right", children: title }) : null,
              /* @__PURE__ */ jsx5(
                "button",
                {
                  type: "button",
                  onClick: onClose,
                  className: "ummat-modal__close",
                  "aria-label": "Close dialog",
                  children: /* @__PURE__ */ jsxs3(
                    "svg",
                    {
                      xmlns: "http://www.w3.org/2000/svg",
                      width: "20",
                      height: "20",
                      viewBox: "0 0 24 24",
                      fill: "none",
                      stroke: "currentColor",
                      strokeWidth: "2",
                      strokeLinecap: "round",
                      strokeLinejoin: "round",
                      "aria-hidden": "true",
                      children: [
                        /* @__PURE__ */ jsx5("line", { x1: "18", y1: "6", x2: "6", y2: "18" }),
                        /* @__PURE__ */ jsx5("line", { x1: "6", y1: "6", x2: "18", y2: "18" })
                      ]
                    }
                  )
                }
              )
            ] }),
            /* @__PURE__ */ jsx5("div", { className: "ummat-modal__body", children })
          ]
        }
      )
    }
  );
}

// src/components/Toast.tsx
import { useEffect as useEffect2 } from "react";
import { jsx as jsx6, jsxs as jsxs4 } from "react/jsx-runtime";
var icons = {
  info: "\u2139\uFE0F",
  success: "\u2705",
  warning: "\u26A0\uFE0F",
  error: "\u274C"
};
function Toast({
  variant = "info",
  message,
  duration = 5e3,
  onClose,
  className = ""
}) {
  useEffect2(() => {
    if (duration > 0 && onClose) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);
  const isError = variant === "error" || variant === "warning";
  return /* @__PURE__ */ jsxs4(
    "div",
    {
      className: ["ummat-toast", `ummat-toast--${variant}`, className].filter(Boolean).join(" "),
      role: isError ? "alert" : "status",
      "aria-live": isError ? "assertive" : "polite",
      "aria-atomic": "true",
      children: [
        /* @__PURE__ */ jsx6("span", { className: "ummat-toast__icon", "aria-hidden": "true", children: icons[variant] }),
        /* @__PURE__ */ jsx6("span", { className: "ummat-toast__message", children: message }),
        onClose ? /* @__PURE__ */ jsx6(
          "button",
          {
            type: "button",
            onClick: onClose,
            className: "ummat-toast__close",
            "aria-label": "Dismiss notification",
            children: "\xD7"
          }
        ) : null
      ]
    }
  );
}

// src/components/Avatar.tsx
import { useState } from "react";
import { jsx as jsx7 } from "react/jsx-runtime";
function getInitials(name) {
  const parts = name.trim().split(/\s+/);
  const first = parts[0] ?? "";
  if (parts.length === 1) return first.slice(0, 2).toUpperCase();
  const last = parts[parts.length - 1] ?? "";
  return ((first[0] ?? "") + (last[0] ?? "")).toUpperCase();
}
function Avatar({
  src,
  name = "",
  size = "md",
  label,
  className = "",
  ...props
}) {
  const [imgError, setImgError] = useState(false);
  const showImage = src && !imgError;
  const initials = name ? getInitials(name) : "?";
  const ariaLabel = label ?? name ?? "Avatar";
  return /* @__PURE__ */ jsx7(
    "span",
    {
      className: ["ummat-avatar", `ummat-avatar--${size}`, className].filter(Boolean).join(" "),
      role: "img",
      "aria-label": ariaLabel,
      children: showImage ? /* @__PURE__ */ jsx7(
        "img",
        {
          src,
          alt: "",
          "aria-hidden": "true",
          onError: () => setImgError(true),
          className: "ummat-avatar__img",
          ...props
        }
      ) : /* @__PURE__ */ jsx7("span", { className: "ummat-avatar__initials", "aria-hidden": "true", children: initials })
    }
  );
}

// src/components/Skeleton.tsx
import { jsx as jsx8 } from "react/jsx-runtime";
function Skeleton({
  shape = "rect",
  width,
  height,
  lines,
  className = "",
  style,
  ...props
}) {
  if (shape === "text" && lines && lines > 1) {
    return /* @__PURE__ */ jsx8("div", { role: "status", "aria-label": "Loading", className: "ummat-skeleton-group", ...props, children: Array.from({ length: lines }).map((_, i) => /* @__PURE__ */ jsx8(
      "div",
      {
        className: "skeleton ummat-skeleton--text",
        style: { width: i === lines - 1 ? "70%" : "100%" },
        "aria-hidden": "true"
      },
      i
    )) });
  }
  return /* @__PURE__ */ jsx8(
    "div",
    {
      role: "status",
      "aria-label": "Loading",
      className: [
        "skeleton",
        `ummat-skeleton--${shape}`,
        className
      ].filter(Boolean).join(" "),
      style: {
        width: width !== void 0 ? width : void 0,
        height: height !== void 0 ? height : void 0,
        ...style
      },
      ...props
    }
  );
}

// src/components/Banner.tsx
import { jsx as jsx9, jsxs as jsxs5 } from "react/jsx-runtime";
function Banner({
  variant = "info",
  children,
  onDismiss,
  className = "",
  label
}) {
  const isAlert = variant === "error" || variant === "warning";
  return /* @__PURE__ */ jsxs5(
    "div",
    {
      className: ["ummat-banner", `ummat-banner--${variant}`, className].filter(Boolean).join(" "),
      role: isAlert ? "alert" : "region",
      "aria-label": label ?? `${variant} notification`,
      "aria-live": isAlert ? "assertive" : "polite",
      children: [
        /* @__PURE__ */ jsx9("span", { className: "ummat-banner__content", children }),
        onDismiss ? /* @__PURE__ */ jsx9(
          "button",
          {
            type: "button",
            onClick: onDismiss,
            className: "ummat-banner__dismiss",
            "aria-label": "Dismiss",
            children: "\xD7"
          }
        ) : null
      ]
    }
  );
}

// src/components/DataState.tsx
import { Fragment, jsx as jsx10, jsxs as jsxs6 } from "react/jsx-runtime";
var defaultEmptyContent = /* @__PURE__ */ jsxs6("div", { className: "ummat-data-state ummat-data-state--empty", role: "status", "aria-live": "polite", children: [
  /* @__PURE__ */ jsx10("span", { className: "ummat-data-state__icon", "aria-hidden": "true", children: "\u{1F4ED}" }),
  /* @__PURE__ */ jsx10("p", { className: "ummat-data-state__message", children: "No results yet." })
] });
var defaultErrorContent = /* @__PURE__ */ jsxs6("div", { className: "ummat-data-state ummat-data-state--error", role: "alert", children: [
  /* @__PURE__ */ jsx10("span", { className: "ummat-data-state__icon", "aria-hidden": "true", children: "\u26A0\uFE0F" }),
  /* @__PURE__ */ jsx10("p", { className: "ummat-data-state__message", children: "Something went wrong. Please try again." })
] });
var defaultOfflineContent = /* @__PURE__ */ jsxs6("div", { className: "ummat-data-state ummat-data-state--offline", role: "alert", children: [
  /* @__PURE__ */ jsx10("span", { className: "ummat-data-state__icon", "aria-hidden": "true", children: "\u{1F4F6}" }),
  /* @__PURE__ */ jsx10("p", { className: "ummat-data-state__message", children: "You appear to be offline." })
] });
function DataState({
  state,
  children,
  skeleton,
  emptyContent,
  errorContent,
  offlineContent,
  staleBanner,
  partialBanner,
  className = ""
}) {
  if (state === "loading") {
    return /* @__PURE__ */ jsx10("div", { role: "status", "aria-label": "Loading", "aria-live": "polite", className, children: skeleton ?? /* @__PURE__ */ jsx10(Skeleton, { shape: "text", lines: 3 }) });
  }
  if (state === "empty") {
    return /* @__PURE__ */ jsx10(Fragment, { children: emptyContent ?? defaultEmptyContent });
  }
  if (state === "error") {
    return /* @__PURE__ */ jsx10(Fragment, { children: errorContent ?? defaultErrorContent });
  }
  if (state === "offline") {
    return /* @__PURE__ */ jsx10(Fragment, { children: offlineContent ?? defaultOfflineContent });
  }
  if (state === "partial") {
    return /* @__PURE__ */ jsxs6("div", { className, children: [
      partialBanner ?? /* @__PURE__ */ jsx10("div", { className: "ummat-data-state ummat-data-state--partial", role: "status", "aria-live": "polite", children: /* @__PURE__ */ jsx10("p", { className: "ummat-data-state__message", children: "Some data could not be loaded." }) }),
      children
    ] });
  }
  if (state === "stale") {
    return /* @__PURE__ */ jsxs6("div", { className, children: [
      staleBanner ?? /* @__PURE__ */ jsx10("div", { className: "ummat-data-state ummat-data-state--stale", role: "status", "aria-live": "polite", children: /* @__PURE__ */ jsx10("p", { className: "ummat-data-state__message", children: "Showing cached data. Refreshing\u2026" }) }),
      children
    ] });
  }
  return /* @__PURE__ */ jsx10(Fragment, { children });
}

// src/components/FocusRing.tsx
import { jsx as jsx11 } from "react/jsx-runtime";
function FocusRing({
  children,
  offset = 2,
  className = "",
  style,
  ...props
}) {
  return /* @__PURE__ */ jsx11(
    "span",
    {
      className: ["ummat-focus-ring", className].filter(Boolean).join(" "),
      style: { "--focus-ring-offset": `${offset}px`, ...style },
      ...props,
      children
    }
  );
}

// src/components/AsyncScreen.tsx
import { useEffect as useEffect3, useRef as useRef2, useState as useState2 } from "react";
import { Fragment as Fragment2, jsx as jsx12, jsxs as jsxs7 } from "react/jsx-runtime";
function resolveState(props) {
  if (props.offline) return "offline";
  if (props.permissionDenied) return "permission-denied";
  if (props.rateLimited) return "rate-limited";
  if (props.loading) return "loading";
  if (props.error) return "error";
  if (props.empty) return "empty";
  return "populated";
}
function useCountdown(ms, active) {
  const totalSec = Math.ceil((ms ?? 6e4) / 1e3);
  const [remaining, setRemaining] = useState2(totalSec);
  useEffect3(() => {
    if (!active) {
      setRemaining(totalSec);
      return;
    }
    setRemaining(totalSec);
    const id = setInterval(() => {
      setRemaining((s) => Math.max(0, s - 1));
    }, 1e3);
    return () => clearInterval(id);
  }, [active, totalSec]);
  return remaining;
}
function LoadingSlot() {
  return /* @__PURE__ */ jsx12("div", { className: "ummat-async-screen ummat-async-screen--loading", role: "status", "aria-live": "polite", "aria-label": "Loading", children: /* @__PURE__ */ jsx12("span", { className: "ummat-async-screen__spinner", "aria-hidden": "true" }) });
}
function EmptySlot({ children }) {
  return /* @__PURE__ */ jsx12("div", { className: "ummat-async-screen ummat-async-screen--empty", role: "status", "aria-live": "polite", children });
}
function ErrorSlot({ onRetry }) {
  return /* @__PURE__ */ jsxs7("div", { className: "ummat-async-screen ummat-async-screen--error", role: "alert", "aria-live": "assertive", children: [
    /* @__PURE__ */ jsx12("p", { className: "ummat-async-screen__message", children: "Something went wrong. Please try again." }),
    /* @__PURE__ */ jsx12("button", { className: "ummat-async-screen__retry", onClick: onRetry, type: "button", children: "Retry" })
  ] });
}
function OfflineSlot() {
  return /* @__PURE__ */ jsx12("div", { className: "ummat-async-screen ummat-async-screen--offline", role: "status", "aria-live": "polite", children: /* @__PURE__ */ jsx12("p", { className: "ummat-async-screen__message", children: "You appear to be offline." }) });
}
function PermissionDeniedSlot() {
  return /* @__PURE__ */ jsx12("div", { className: "ummat-async-screen ummat-async-screen--permission-denied", role: "status", "aria-live": "polite", children: /* @__PURE__ */ jsx12("p", { className: "ummat-async-screen__message", children: "You don't have permission to view this content." }) });
}
function RateLimitedSlot({ retryAfterMs, onRetry }) {
  const remaining = useCountdown(retryAfterMs, true);
  const autoRetried = useRef2(false);
  useEffect3(() => {
    if (remaining === 0 && !autoRetried.current) {
      autoRetried.current = true;
      onRetry();
    }
  }, [remaining, onRetry]);
  return /* @__PURE__ */ jsx12("div", { className: "ummat-async-screen ummat-async-screen--rate-limited", role: "status", "aria-live": "polite", children: remaining > 0 ? /* @__PURE__ */ jsxs7("p", { className: "ummat-async-screen__message", children: [
    "Retrying in ",
    remaining,
    "s\u2026"
  ] }) : /* @__PURE__ */ jsx12("button", { className: "ummat-async-screen__retry", onClick: onRetry, type: "button", children: "Retry now" }) });
}
function AsyncScreen(props) {
  const {
    onRetry,
    children,
    emptySlot,
    retryAfterMs
  } = props;
  const state = resolveState(props);
  switch (state) {
    case "offline":
      return /* @__PURE__ */ jsx12(OfflineSlot, {});
    case "permission-denied":
      return /* @__PURE__ */ jsx12(PermissionDeniedSlot, {});
    case "rate-limited":
      return /* @__PURE__ */ jsx12(RateLimitedSlot, { retryAfterMs, onRetry });
    case "loading":
      return /* @__PURE__ */ jsx12(LoadingSlot, {});
    case "error":
      return /* @__PURE__ */ jsx12(ErrorSlot, { onRetry });
    case "empty":
      return /* @__PURE__ */ jsx12(EmptySlot, { children: emptySlot });
    case "populated":
      return /* @__PURE__ */ jsx12(Fragment2, { children });
  }
}
AsyncScreen.displayName = "AsyncScreen";

// src/components/ErrorBoundary.tsx
import { Component } from "react";
var ErrorBoundary = class extends Component {
  static displayName = "ErrorBoundary";
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error, info) {
    this.props.onError?.(error, info);
  }
  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
};

// src/a11y/LiveRegions.tsx
import { createContext, useCallback, useContext, useEffect as useEffect4, useRef as useRef3, useState as useState3 } from "react";
import { jsx as jsx13, jsxs as jsxs8 } from "react/jsx-runtime";
var LiveRegionsContext = createContext(null);
function LiveRegions({
  defaultDebounceMs = 100,
  defaultClearAfterMs = 1e3,
  className = "ummat-sr-only"
} = {}) {
  const [politeMessage, setPoliteMessage] = useState3("");
  const [assertiveMessage, setAssertiveMessage] = useState3("");
  const lastPoliteRef = useRef3({ message: "", timestamp: 0 });
  const lastAssertiveRef = useRef3({ message: "", timestamp: 0 });
  const politeClearTimerRef = useRef3(null);
  const assertiveClearTimerRef = useRef3(null);
  useEffect4(() => {
    return () => {
      if (politeClearTimerRef.current) clearTimeout(politeClearTimerRef.current);
      if (assertiveClearTimerRef.current) clearTimeout(assertiveClearTimerRef.current);
    };
  }, []);
  const announce = useCallback(
    (message, politeness = "polite", options) => {
      if (typeof message !== "string" || message.length === 0) return;
      const debounceMs = options?.debounceMs ?? defaultDebounceMs;
      const clearAfterMs = options?.clearAfterMs ?? defaultClearAfterMs;
      const now = Date.now();
      const lastRef = politeness === "assertive" ? lastAssertiveRef : lastPoliteRef;
      const setter = politeness === "assertive" ? setAssertiveMessage : setPoliteMessage;
      const clearTimerRef = politeness === "assertive" ? assertiveClearTimerRef : politeClearTimerRef;
      if (lastRef.current.message === message && now - lastRef.current.timestamp < debounceMs) {
        return;
      }
      lastRef.current = { message, timestamp: now };
      setter("");
      Promise.resolve().then(() => {
        setter(message);
      });
      if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
      clearTimerRef.current = setTimeout(() => {
        setter("");
      }, clearAfterMs);
    },
    [defaultDebounceMs, defaultClearAfterMs]
  );
  return /* @__PURE__ */ jsxs8(LiveRegionsContext.Provider, { value: { announce }, children: [
    /* @__PURE__ */ jsx13(
      "div",
      {
        role: "status",
        "aria-live": "polite",
        "aria-atomic": "true",
        className,
        "data-ummat-live-region": "polite",
        children: politeMessage
      }
    ),
    /* @__PURE__ */ jsx13(
      "div",
      {
        role: "alert",
        "aria-live": "assertive",
        "aria-atomic": "true",
        className,
        "data-ummat-live-region": "assertive",
        children: assertiveMessage
      }
    )
  ] });
}
var warnedNoProvider = false;
function useLiveAnnounce() {
  const ctx = useContext(LiveRegionsContext);
  if (!ctx) {
    const env = typeof globalThis !== "undefined" && globalThis.process?.env?.NODE_ENV || "development";
    if (env !== "production") {
      throw new Error(
        "[@ummat/ui] useLiveAnnounce() called without <LiveRegions /> ancestor. Mount <LiveRegions /> once in your app root layout."
      );
    }
    if (!warnedNoProvider && typeof console !== "undefined") {
      console.warn(
        "[@ummat/ui] useLiveAnnounce(): no <LiveRegions /> ancestor \u2014 announcements will be dropped."
      );
      warnedNoProvider = true;
    }
    return () => {
    };
  }
  return ctx.announce;
}

// src/a11y/FocusTrap.tsx
import { useEffect as useEffect5, useRef as useRef4 } from "react";
import { jsx as jsx14 } from "react/jsx-runtime";
var FOCUSABLE_SELECTOR = [
  "a[href]",
  "area[href]",
  "button:not([disabled])",
  'input:not([disabled]):not([type="hidden"])',
  "select:not([disabled])",
  "textarea:not([disabled])",
  "iframe",
  "object",
  "embed",
  "audio[controls]",
  "video[controls]",
  '[contenteditable]:not([contenteditable="false"])',
  '[tabindex]:not([tabindex="-1"])'
].join(",");
function getTabbable(root) {
  const nodes = Array.from(root.querySelectorAll(FOCUSABLE_SELECTOR));
  return nodes.filter((el) => {
    if (el.hasAttribute("disabled")) return false;
    if (el.getAttribute("aria-hidden") === "true") return false;
    return el.offsetParent !== null || el === document.activeElement;
  });
}
function FocusTrap({
  active,
  children,
  className,
  onEscape,
  returnFocusTo,
  initialFocusSelector
}) {
  const containerRef = useRef4(null);
  const previouslyFocusedRef = useRef4(null);
  useEffect5(() => {
    if (!active) return;
    previouslyFocusedRef.current = returnFocusTo?.current ?? document.activeElement ?? null;
    const container = containerRef.current;
    if (!container) return;
    const initial = initialFocusSelector ? container.querySelector(initialFocusSelector) : null;
    const target = initial ?? getTabbable(container)[0] ?? container;
    if (target === container && !container.hasAttribute("tabindex")) {
      container.setAttribute("tabindex", "-1");
    }
    const raf = requestAnimationFrame(() => target.focus());
    return () => {
      cancelAnimationFrame(raf);
      const toFocus = previouslyFocusedRef.current;
      if (toFocus && typeof toFocus.focus === "function") {
        toFocus.focus();
      }
    };
  }, [active, initialFocusSelector, returnFocusTo]);
  useEffect5(() => {
    if (!active) return;
    const container = containerRef.current;
    if (!container) return;
    const handleKeyDown = (event) => {
      if (event.key === "Escape" && onEscape) {
        event.stopPropagation();
        onEscape();
        return;
      }
      if (event.key !== "Tab") return;
      const tabbable = getTabbable(container);
      if (tabbable.length === 0) {
        event.preventDefault();
        container.focus();
        return;
      }
      const first = tabbable[0];
      const last = tabbable[tabbable.length - 1];
      const activeEl = document.activeElement;
      if (event.shiftKey) {
        if (activeEl === first || !container.contains(activeEl)) {
          event.preventDefault();
          last?.focus();
        }
      } else {
        if (activeEl === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    container.addEventListener("keydown", handleKeyDown);
    return () => container.removeEventListener("keydown", handleKeyDown);
  }, [active, onEscape]);
  return /* @__PURE__ */ jsx14("div", { ref: containerRef, className, "data-ummat-focus-trap": active ? "on" : "off", children });
}

// src/a11y/useReturnFocus.ts
import { useEffect as useEffect6, useRef as useRef5 } from "react";
function useReturnFocus(active, triggerRef) {
  const capturedRef = useRef5(null);
  useEffect6(() => {
    if (!active) return;
    capturedRef.current = triggerRef?.current ?? (typeof document !== "undefined" ? document.activeElement : null);
    return () => {
      const target = capturedRef.current;
      if (target && typeof target.focus === "function" && document.contains(target)) {
        requestAnimationFrame(() => target.focus());
      }
    };
  }, [active, triggerRef]);
}

// src/a11y/SkipLink.tsx
import { jsx as jsx15 } from "react/jsx-runtime";
var DEFAULT_CLASSNAME = "ummat-skip-link sr-only focus:not-sr-only focus:absolute focus:top-2 focus:start-2 focus:z-50 focus:bg-white focus:text-[#0D2F17] focus:px-4 focus:py-2 focus:ring-2 focus:ring-[#1E5E2F] focus:rounded";
function SkipLink({
  href = "#main",
  children = "Skip to main content",
  className
}) {
  const composed = className ? `${DEFAULT_CLASSNAME} ${className}` : DEFAULT_CLASSNAME;
  return /* @__PURE__ */ jsx15("a", { href, className: composed, "data-ummat-skip-link": "", children });
}
export {
  AsyncScreen,
  Avatar,
  Badge,
  Banner,
  Button,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  DataState,
  ErrorBoundary,
  FocusRing,
  FocusTrap,
  Input,
  LiveRegions,
  Modal,
  Skeleton,
  SkipLink,
  Toast,
  useLiveAnnounce,
  useReturnFocus
};
//# sourceMappingURL=index.js.map