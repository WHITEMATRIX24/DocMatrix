// src/components/Layout/Layout.tsx
import React from 'react';
import Header from './Header';
import Sidebar from './Sidebar';

interface LayoutProps {
  children: React.ReactNode;
  showSidebar?: boolean;
}

const Layout: React.FC<LayoutProps> = ({ children, showSidebar = true }) => {
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f8f9fa',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Header */}
      <Header />
      
      {/* Main Content Area */}
      <div style={{
        display: 'flex',
        flex: 1,
        overflow: 'hidden'
      }}>
        {/* Sidebar */}
        {showSidebar && <Sidebar />}
        
        {/* Main Content */}
        <main style={{
          flex: 1,
          overflow: 'auto',
          backgroundColor: '#f8f9fa',
          padding: '20px'
        }}>
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;