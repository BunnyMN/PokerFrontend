import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { AppProviders } from './app/providers.tsx'
import { ToastContainer } from './shared/components/ui/Toast.tsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppProviders>
      <App />
      <ToastContainer />
    </AppProviders>
  </React.StrictMode>,
)
