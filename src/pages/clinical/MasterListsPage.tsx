import React from 'react'
import { Navigate } from 'react-router-dom'

export const MasterListsPage: React.FC = () => {
  return <Navigate to="/settings/clinical-config" replace />
}

export default MasterListsPage
