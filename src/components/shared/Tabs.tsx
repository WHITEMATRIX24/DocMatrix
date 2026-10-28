import React from 'react'

export interface TabItem {
  id: string
  label: string
  count?: number | string
  icon?: React.ReactNode
}

interface TabsProps {
  tabs: TabItem[]
  activeTab: string
  onChange: (id: string) => void
}

export const Tabs: React.FC<TabsProps> = ({ tabs, activeTab, onChange }) => {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        borderBottom: '1px solid var(--line, #e9e9e5)',
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch',
        scrollbarWidth: 'none',
        paddingBottom: '2px'
      }}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 14px',
              border: 'none',
              borderBottom: isActive ? '2px solid var(--teal-primary, #008891)' : '2px solid transparent',
              background: 'transparent',
              color: isActive ? 'var(--teal-primary, #008891)' : 'var(--charcoal-body, #475554)',
              fontSize: '13px',
              fontWeight: isActive ? '750' : '600',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              minHeight: '44px',
              transition: 'all 0.15s ease'
            }}
          >
            {tab.icon}
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: '700',
                  padding: '1px 6px',
                  borderRadius: '999px',
                  background: isActive ? 'rgba(0, 136, 145, 0.12)' : 'var(--surface-alt, #f4f6f5)',
                  color: isActive ? 'var(--teal-primary, #008891)' : 'var(--charcoal-muted, #6e7e7d)'
                }}
              >
                {tab.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

export default Tabs
