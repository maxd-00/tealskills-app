import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import * as Sentry from '@sentry/react'

// Initialisation Sentry
Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN, // récupère ta DSN depuis Vercel (.env)
  integrations: [new Sentry.BrowserTracing(), new Sentry.Replay()],
  tracesSampleRate: 0.1,            // 10% des transactions
  replaysSessionSampleRate: 0.1,    // 10% des sessions
  replaysOnErrorSampleRate: 1.0,    // 100% si erreur
  sendDefaultPii: true,             // capture infos basiques (IP, user agent)
  environment: import.meta.env.MODE // 'production' sur Vercel
})

const container = document.getElementById('root')
const root = createRoot(container)

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)

