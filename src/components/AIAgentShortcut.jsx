import React from 'react'
import { Link } from 'react-router-dom'

export default function AIAgentShortcut() {
  return (
    <Link
      to="/ai-agent"
      className="ai-agent-shortcut"
      aria-label="Open AI Agent"
      title="AI Agent"
    >
      <svg viewBox="0 0 32 32" aria-hidden="true" focusable="false">
        <path
          fill="currentColor"
          d="M16 3a2.5 2.5 0 0 1 2.5 2.5v.6A9 9 0 0 1 25 14v1h1a2 2 0 0 1 0 4h-1v1a9 9 0 0 1-6.5 8.63V29a.5.5 0 0 1-1 0v-.37A9 9 0 0 1 11 20v-1h-1a2 2 0 0 1 0-4h1v-1a9 9 0 0 1 6.5-8.9V5.5A2.5 2.5 0 0 1 16 3Zm0 2a.5.5 0 0 0-.5.5v1.6A7 7 0 0 0 9 14v7a7 7 0 0 0 14 0v-7a7 7 0 0 0-6.5-6.9V5.5A.5.5 0 0 0 16 5Zm-3.5 9a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Zm7 0a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Zm-3.5 5.5c1.24 0 2.36.43 3.24 1.14a.5.5 0 0 1-.64.76A4 4 0 0 0 16 21a4 4 0 0 0-2.6.9.5.5 0 0 1-.64-.76A5 5 0 0 1 16 19.5Z"
        />
      </svg>
    </Link>
  )
}

