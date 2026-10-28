import React from 'react'

interface MedicalCrossMarkProps {
  light?: boolean
  className?: string
}

export const MedicalCrossMark: React.FC<MedicalCrossMarkProps> = ({ light = false, className = '' }) => {
  return (
    <span className={`medical-cross-mark ${light ? 'mark-light' : ''} ${className}`} aria-hidden="true">
      <i />
      <i />
      <i />
      <i />
    </span>
  )
}
