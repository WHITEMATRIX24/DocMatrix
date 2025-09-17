// components/Auth/SafeLogin.tsx
import React, { useState } from 'react';

const SafeLogin: React.FC = () => {
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  console.log('🔐 SafeLogin component rendered');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const { name, value } = e.target;
      setLoginData(prev => ({ ...prev, [name]: value }));
      console.log('📝 Input changed:', name, value);
    } catch (err) {
      console.error('❌ Error in handleChange:', err);
      setError('Input error occurred');
    }
  };

  const handleLogin = async () => {
    console.log('🚀 Login attempt started');
    setLoading(true);
    setError(null);

    try {
      // Just a test - no actual AWS Amplify call yet
      console.log('📧 Email:', loginData.email);
      console.log('🔒 Password length:', loginData.password.length);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.log('✅ Test login successful');
      alert('Test login successful! Check console for details.');
      
    } catch (err) {
      console.error('❌ Login error:', err);
      setError('Login failed');
    } finally {
      setLoading(false);
    }
  };

  console.log('🎯 SafeLogin rendering UI');

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '40px',
        width: '100%',
        maxWidth: '400px',
        boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <h1 style={{ color: '#2c3e50', marginBottom: '10px' }}>
            🏥 MediScript Pro
          </h1>
          <p style={{ color: '#7f8c8d', margin: 0 }}>
            Safe Login Test
          </p>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{
            display: 'block',
            marginBottom: '8px',
            fontWeight: '600',
            color: '#333'
          }}>
            Email
          </label>
          <input
            type="email"
            name="email"
            value={loginData.email}
            onChange={handleChange}
            style={{
              width: '100%',
              padding: '12px',
              border: '2px solid #ddd',
              borderRadius: '8px',
              fontSize: '16px',
              boxSizing: 'border-box'
            }}
            placeholder="Enter your email"
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{
            display: 'block',
            marginBottom: '8px',
            fontWeight: '600',
            color: '#333'
          }}>
            Password
          </label>
          <input
            type="password"
            name="password"
            value={loginData.password}
            onChange={handleChange}
            style={{
              width: '100%',
              padding: '12px',
              border: '2px solid #ddd',
              borderRadius: '8px',
              fontSize: '16px',
              boxSizing: 'border-box'
            }}
            placeholder="Enter your password"
          />
        </div>

        {error && (
          <div style={{
            marginBottom: '20px',
            padding: '12px',
            background: '#ffe6e6',
            border: '1px solid #ff9999',
            borderRadius: '8px',
            color: '#cc0000'
          }}>
            ⚠️ {error}
          </div>
        )}

        <button
          onClick={handleLogin}
          disabled={loading}
          style={{
            width: '100%',
            padding: '14px',
            background: loading ? '#ccc' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? '⏳ Testing...' : '🧪 Test Login'}
        </button>

        <div style={{
          marginTop: '20px',
          padding: '15px',
          background: '#f0f8ff',
          borderRadius: '8px',
          fontSize: '14px',
          color: '#0066cc'
        }}>
          <p style={{ margin: '0 0 10px 0', fontWeight: '600' }}>
            🧪 Debug Mode Active
          </p>
          <p style={{ margin: 0 }}>
            This is a safe version to test basic functionality.
            Check browser console for detailed logs.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SafeLogin;
