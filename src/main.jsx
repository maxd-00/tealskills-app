import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import * as Sentry from '@sentry/react'

const DSN = import.meta.env.VITE_SENTRY_DSN

// ⚠️ Ne jamais bloquer le rendu si Sentry pose problème
try {
  if (DSN) {
    Sentry.init({
      dsn: DSN,
      integrations: [new Sentry.BrowserTracing(), new Sentry.Replay()],
      tracesSampleRate: 0.1,
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0,
      sendDefaultPii: true,
      environment: import.meta.env.MODE,
    })
  }
} catch (e) {
  // On loggue et on laisse l'app démarrer
  console.error('Sentry init failed (ignored):', e)
}

const container = document.getElementById('root')
const root = createRoot(container)

// Un garde-fou de plus : si Sentry est importé, on peut ajouter un ErrorBoundary
const AppWithBoundary = DSN
  ? (
      <Sentry.ErrorBoundary fallback={<div style={{padding:16}}>Une erreur est survenue. Réessayez.</div>}>
        <App />
      </Sentry.ErrorBoundary>
    )
  : <App />

root.render(
  <React.StrictMode>
    {AppWithBoundary}
  </React.StrictMode>
)


