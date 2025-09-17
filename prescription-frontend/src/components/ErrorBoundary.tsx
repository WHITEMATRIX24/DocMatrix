// src/components/ErrorBoundary.tsx
import React, { Component } from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: any;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('🚨 ErrorBoundary caught an error:', error);
    console.error('🚨 Error info:', errorInfo);
    this.setState({
      hasError: true,
      error,
      errorInfo
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          padding: '40px',
          background: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%)',
          color: 'white',
          fontFamily: 'monospace'
        }}>
          <div style={{
            background: 'rgba(0,0,0,0.2)',
            padding: '30px',
            borderRadius: '12px',
            maxWidth: '800px',
            margin: '0 auto'
          }}>
            <h1 style={{ marginBottom: '20px', fontSize: '24px' }}>
              🚨 Something went wrong in MediScript Pro!
            </h1>
            
            <div style={{ marginBottom: '20px' }}>
              <h3>Error Message:</h3>
              <pre style={{ 
                background: 'rgba(0,0,0,0.3)', 
                padding: '15px', 
                borderRadius: '8px',
                fontSize: '14px',
                overflow: 'auto',
                whiteSpace: 'pre-wrap'
              }}>
                {this.state.error?.toString()}
              </pre>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <h3>Component Stack:</h3>
              <pre style={{ 
                background: 'rgba(0,0,0,0.3)', 
                padding: '15px', 
                borderRadius: '8px',
                fontSize: '12px',
                overflow: 'auto',
                whiteSpace: 'pre-wrap'
              }}>
                {this.state.errorInfo?.componentStack}
              </pre>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <h3>Possible Solutions:</h3>
              <ul style={{ paddingLeft: '20px' }}>
                <li>Check if AWS Amplify is properly configured</li>
                <li>Verify all components are imported correctly</li>
                <li>Check browser console for additional errors</li>
                <li>Ensure all required dependencies are installed</li>
              </ul>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => window.location.reload()}
                style={{
                  padding: '12px 24px',
                  background: 'white',
                  color: '#ee5a24',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '16px'
                }}
              >
                🔄 Reload Page
              </button>
              
              <button
                onClick={() => {
                  localStorage.clear();
                  window.location.href = '/login';
                }}
                style={{
                  padding: '12px 24px',
                  background: 'rgba(255,255,255,0.2)',
                  color: 'white',
                  border: '1px solid white',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '16px'
                }}
              >
                🔐 Reset & Go to Login
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
