/**
 * B6-03: Page transition template — re-renders on every route change.
 * Next.js re-mounts template.tsx (unlike layout.tsx) on navigation,
 * which triggers the CSS animation on every page view.
 *
 * prefers-reduced-motion: animation is disabled via CSS (see globals.css).
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="ci-page">{children}</div>
}
