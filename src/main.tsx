import { DialogProvider } from '@contexts/DialogProvider.tsx'
import { ProjectProvider } from '@contexts/ProjectContext.tsx'
import { ThemeProvider } from '@mui/material/styles'
import { loadPlugins } from '@plugins/manager'
import PortalTarget from '@slots/PortalTarget.tsx'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { v4 as uuidv4 } from 'uuid'
import App from './App.tsx'
import './index.css'
import RootProviderSlot from './RootProviderSlot.tsx'
import theme from './theme/theme'

const buildFallbackRandom = () =>
  Uint8Array.from({ length: 16 }, () => Math.floor(Math.random() * 256))

const ensureRandomUuid = () => {
  const randomUUID = () => {
    try {
      return uuidv4()
    } catch {
      return uuidv4({ random: buildFallbackRandom() })
    }
  }

  const cryptoObj = globalThis.crypto as
    | (Crypto & { randomUUID?: () => `${string}-${string}-${string}-${string}-${string}` })
    | undefined
  if (cryptoObj?.randomUUID) return
  if (cryptoObj) {
    try {
      cryptoObj.randomUUID = randomUUID as () => `${string}-${string}-${string}-${string}-${string}`
      return
    } catch {
      // Fall through to define a minimal crypto shim.
    }
  }

  Object.defineProperty(globalThis, 'crypto', {
    value: { randomUUID },
    configurable: true,
  })
}

ensureRandomUuid()

loadPlugins().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <ThemeProvider theme={theme}>
        <RootProviderSlot>
          <ProjectProvider>
            <DialogProvider>
              <App />
            </DialogProvider>
          </ProjectProvider>
        </RootProviderSlot>
        <PortalTarget id="global-overlay" />
      </ThemeProvider>
    </StrictMode>,
  )
});
