import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { CatalogProvider } from './CatalogContext.tsx'
import { AccessGate } from './AccessGate.tsx'
import { ConfirmProvider } from './ConfirmModal.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AccessGate>
      <ConfirmProvider>
        <CatalogProvider>
          <App />
        </CatalogProvider>
      </ConfirmProvider>
    </AccessGate>
  </StrictMode>,
)
