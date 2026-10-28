interface EnvConfig {
  showRoadmap: boolean
}

export const env: EnvConfig = {
  showRoadmap: import.meta.env.VITE_SHOW_ROADMAP === 'true',
}
