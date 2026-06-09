import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { App } from '@/App'
import { installChunkLoadRecovery, installDeployVersionCheck } from '@/lib/chunkLoadRecovery'
import '@/index.css'

installChunkLoadRecovery()
installDeployVersionCheck()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
