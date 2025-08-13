/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_WS_URL: string
  readonly VITE_ENABLE_ANALYTICS: string
  readonly VITE_ANALYTICS_TRACKING_ID: string
  readonly VITE_ENABLE_WEBSOCKET: string
  readonly VITE_ENABLE_DEBUG: string
  readonly VITE_CASH_CHARGE_MODE: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}