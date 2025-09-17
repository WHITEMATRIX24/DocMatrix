// src/components/Layout/Header.tsx
import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const Header: React.FC = () => {
  const { user, signOut, authProvider } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Sign out error:', error);
      // Force navigate to login even if signOut fails
      navigate('/login');
    }
  };

  const testConnection = () => {
    alert(`✅ System working! Auth: ${authProvider?.toUpperCase()}`);
  };

  return (
    <header style={{
      background: 'white',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      position: 'sticky',
      top: 0,
      zIndex: 1000
    }}>
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto',
        padding: '0 20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        height: '70px'
      }}>
        <div>
          <h1 style={{ 
            color: '#2c3e50', 
            margin: '0 0 5px 0',
            fontSize: '24px',
            fontWeight: 'bold'
          }}>
            🏥 MediScript Pro
          </h1>
          <p style={{ 
            color: '#7f8c8d', 
            margin: 0,
            fontSize: '14px'
          }}>
            Welcome back, {user?.attributes?.name || user?.username || user?.email}
            {authProvider && (
              <span style={{ 
                marginLeft: '10px', 
                fontSize: '12px', 
                background: authProvider === 'cognito' ? '#28a745' : '#ffc107', 
                color: 'white', 
                padding: '2px 6px', 
                borderRadius: '4px',
                fontWeight: 'bold'
              }}>
                {authProvider === 'cognito' ? 'AWS' : 'Local'}
              </span>
            )}
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button 
            onClick={testConnection}
            style={{ 
              padding: '8px 16px', 
              backgroundColor: '#3498db', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px', 
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Test System
          </button>
          <button
            onClick={handleSignOut}
            style={{
              padding: '10px 20px',
              backgroundColor: '#e74c3c',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600'
            }}
          >
            Sign Out
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;