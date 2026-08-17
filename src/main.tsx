import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { CatalogProvider } from './CatalogContext.tsx'
import { AccessGate } from './AccessGate.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AccessGate>
      <CatalogProvider>
        <App />
      </CatalogProvider>
    </AccessGate>
  </StrictMode>,
)
