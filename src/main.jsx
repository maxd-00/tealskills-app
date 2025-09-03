import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// Sentry v8
import * as Sentry from '@sentry/react'
import { BrowserTracing } from '@sentry/react'

const DSN = import.meta.env.VITE_SENTRY_DSN

try {
  if (DSN) {
    Sentry.init({
      dsn: DSN,
      integrations: [
        new BrowserTracing(),         // v8: class importée séparément
        Sentry.replayIntegration(),   // v8: fonction, pas "new Replay()"
      ],
      tracesSampleRate: 0.1,
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0,
      sendDefaultPii: true,
      environment: import.meta.env.MODE,
    })
  }
} catch (e) {
  console.error('Sentry init failed (ignored):', e)
}

const container = document.getElementById('root')
const root = createRoot(container)

const AppWithBoundary = DSN
  ? (
      <Sentry.ErrorBoundary fallback={<div style={{padding:16}}>
        Une erreur est survenue. Réessayez.
      </div>}>
        <App />
      </Sentry.ErrorBoundary>
    )
  : <App />

root.render(
  <React.StrictMode>
    {AppWithBoundary}
  </React.StrictMode>
)



