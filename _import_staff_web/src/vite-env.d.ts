/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SHOW_ROADMAP?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
