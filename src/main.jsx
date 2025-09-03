import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// Sentry v8
import * as Sentry from '@sentry/react'
import { browserTracingIntegration, replayIntegration } from '@sentry/react'

const DSN = import.meta.env.VITE_SENTRY_DSN

// Ne bloque jamais le rendu si Sentry a un souci
try {
  if (DSN) {
    Sentry.init({
      dsn: DSN,
      integrations: [
        browserTracingIntegration(),  // v8 : fonction
        replayIntegration(),          // v8 : fonction
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
