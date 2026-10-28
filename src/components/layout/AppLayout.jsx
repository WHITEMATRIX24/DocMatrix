import React from 'react'
import StaffPortal from '@/StaffPortal'

/**
 * AppLayout: Persistent DocMatrix Application Shell
 * Encapsulates the persistent header, sidebar, role switcher, and main content viewport.
 */
export function AppLayout({ currentUser, onLogout, children }) {
  return (
    <StaffPortal user={currentUser} onLogout={onLogout}>
      {children}
    </StaffPortal>
  )
}

export default AppLayout
