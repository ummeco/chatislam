'use client';

import * as Sentry from '@sentry/nextjs';
import Link from 'next/link';
import { useEffect } from 'react';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        backgroundColor: '#0D2F17',
        color: '#FFFFFF',
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      <Link
        href="/"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          marginBottom: '3rem',
          textDecoration: 'none',
          color: 'inherit',
        }}
      >
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '2.25rem',
            height: '2.25rem',
            borderRadius: '0.75rem',
            backgroundColor: '#C9F27A',
            color: '#0D2F17',
            fontWeight: 900,
          }}
        >
          C
        </span>
        <span style={{ fontWeight: 900, fontSize: '1.25rem', letterSpacing: '-0.02em' }}>
          ChatIslam
        </span>
      </Link>

      <div
        style={{
          maxWidth: '28rem',
          width: '100%',
          textAlign: 'center',
          padding: '2.5rem',
          borderRadius: '1.5rem',
          backgroundColor: 'rgba(30, 94, 47, 0.4)',
          border: '1px solid rgba(201, 242, 122, 0.15)',
        }}
      >
        <div
          style={{
            width: '4rem',
            height: '4rem',
            margin: '0 auto 1.5rem',
            borderRadius: '9999px',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.5rem',
          }}
          role="img"
          aria-label="Warning"
        >
          ⚠
        </div>

        <h1 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>
          Something went wrong
        </h1>
        <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.875rem', lineHeight: 1.5 }}>
          An unexpected error occurred. Please try again or return to the home page.
        </p>

        {process.env.NODE_ENV === 'development' && error?.message && (
          <pre
            style={{
              marginTop: '1.5rem',
              textAlign: 'left',
              fontSize: '0.75rem',
              color: '#FCA5A5',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              borderRadius: '0.75rem',
              padding: '1rem',
              overflow: 'auto',
              maxHeight: '12rem',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {error.message}
            {error.digest && `\n\nDigest: ${error.digest}`}
          </pre>
        )}

        <div
          style={{
            display: 'flex',
            gap: '0.75rem',
            justifyContent: 'center',
            marginTop: '1.5rem',
          }}
        >
          <button
            type="button"
            onClick={reset}
            style={{
              padding: '0.625rem 1.25rem',
              borderRadius: '0.5rem',
              backgroundColor: '#C9F27A',
              color: '#0D2F17',
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Try Again
          </button>
          <Link
            href="/"
            style={{
              padding: '0.625rem 1.25rem',
              borderRadius: '0.5rem',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              color: '#FFFFFF',
              fontWeight: 600,
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
            }}
          >
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}
