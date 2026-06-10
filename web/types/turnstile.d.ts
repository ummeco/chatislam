// Window.turnstile — Cloudflare Turnstile CAPTCHA widget (D-P3-20).

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement | string,
        options: {
          sitekey: string
          callback?: (token: string) => void
          'expired-callback'?: () => void
          'error-callback'?: () => void
          appearance?: 'always' | 'execute' | 'interaction-only'
          theme?: 'auto' | 'light' | 'dark'
          language?: string
          tabindex?: number
        }
      ) => string
      reset: (widgetId?: string) => void
      remove: (widgetId: string) => void
      getResponse: (widgetId?: string) => string | undefined
    }
  }
}

export {}
