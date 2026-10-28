import React from 'react'

/**
 * Lightweight, accessible loading spinner
 */
export default function Spinner({ size = 18, color = '#ffffff' }) {
  return (
    <span
      className="docmatrix-spinner"
      style={{
        width: size,
        height: size,
        borderWidth: Math.max(2, Math.round(size / 8)),
        borderColor: `${color}33`,
        borderTopColor: color
      }}
      role="status"
      aria-label="Loading"
    />
  )
}
