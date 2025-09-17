// src/components/Layout/Sidebar.tsx
import React from 'react';
import { Link, useLocation } from 'react-router-dom';

interface MenuItem {
  name: string;
  path: string;
  icon: string;
  description?: string;
}

const Sidebar: React.FC = () => {
  const location = useLocation();

  const menuItems: MenuItem[] = [
    {
      name: 'Dashboard',
      path: '/dashboard',
      icon: '🏠',
      description: 'Overview and quick actions'
    },
    {
      name: 'New Prescription',
      path: '/prescription/create',
      icon: '📝',
      description: 'Create prescription'
    },
    {
      name: 'Add Patient',
      path: '/patient/create',
      icon: '👤',
      description: 'Register new patient'
    },
    {
      name: 'Add Medicine',
      path: '/medicine/add',
      icon: '💊',
      description: 'Add new medicine'
    }
  ];

  const isActive = (path: string) => {
    if (path === '/dashboard') {
      return location.pathname === '/dashboard';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div style={{
      width: '280px',
      backgroundColor: 'white',
      boxShadow: '2px 0 8px rgba(0,0,0,0.1)',
      height: 'calc(100vh - 70px)',
      position: 'sticky',
      top: '70px',
      overflowY: 'auto'
    }}>
      <div style={{ padding: '20px' }}>
        <h2 style={{
          fontSize: '18px',
          fontWeight: '600',
          color: '#2c3e50',
          marginBottom: '20px',
          paddingBottom: '10px',
          borderBottom: '2px solid #ecf0f1'
        }}>
          Navigation
        </h2>
        
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {menuItems.map((item) => {
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                style={{
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'flex-start',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  transition: 'all 0.3s ease',
                  backgroundColor: active ? '#e3f2fd' : 'transparent',
                  color: active ? '#1976d2' : '#2c3e50',
                  border: active ? '1px solid #bbdefb' : '1px solid transparent'
                }}
                onMouseEnter={(e) => {
                  if (!active) {
                    e.currentTarget.style.backgroundColor = '#f5f5f5';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <span style={{ 
                  marginRight: '12px', 
                  fontSize: '20px',
                  minWidth: '24px'
                }}>
                  {item.icon}
                </span>
                <div>
                  <div style={{
                    fontWeight: active ? '600' : '500',
                    fontSize: '14px',
                    marginBottom: '2px'
                  }}>
                    {item.name}
                  </div>
                  {item.description && (
                    <div style={{
                      fontSize: '12px',
                      color: active ? '#1565c0' : '#7f8c8d',
                      lineHeight: '1.3'
                    }}>
                      {item.description}
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Quick Stats */}
        <div style={{
          marginTop: '30px',
          padding: '15px',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
          border: '1px solid #e9ecef'
        }}>
          <h3 style={{
            fontSize: '14px',
            fontWeight: '600',
            color: '#495057',
            marginBottom: '10px'
          }}>
            📊 Quick Stats
          </h3>
          <div style={{ fontSize: '12px', color: '#6c757d', lineHeight: '1.6' }}>
            <div>Session: Active</div>
            <div>Last Login: Today</div>
            <div>Status: Online</div>
          </div>
        </div>

        {/* Help Section */}
        <div style={{
          marginTop: '20px',
          padding: '15px',
          backgroundColor: '#fff3cd',
          borderRadius: '8px',
          border: '1px solid #ffeaa7'
        }}>
          <h3 style={{
            fontSize: '14px',
            fontWeight: '600',
            color: '#856404',
            marginBottom: '8px'
          }}>
            💡 Need Help?
          </h3>
          <p style={{
            fontSize: '12px',
            color: '#856404',
            margin: 0,
            lineHeight: '1.4'
          }}>
            Click on any menu item to navigate. Use the dashboard for quick actions.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;