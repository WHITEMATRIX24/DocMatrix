import React from 'react'
import { Navigate } from 'react-router-dom'

export const AlertsPage: React.FC = () => {
  return <Navigate to="/inventory/items" replace />
}

export default AlertsPage
