import React, { createContext, useContext, useEffect, useState } from 'react';
import { getCurrentUser, signOut, signIn, type AuthUser } from 'aws-amplify/auth';

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  signInUser: (email: string, password: string) => Promise<void>;
  signOutUser: () => Promise<void>;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkAuthState();
  }, []);

  const checkAuthState = async () => {
    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
      console.log('✅ User authenticated:', currentUser.username);
    } catch (error) {
      console.log('ℹ️ No authenticated user');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const signInUser = async (email: string, password: string) => {
    try {
      setError(null);
      setLoading(true);
      
      const { isSignedIn } = await signIn({ username: email, password });
      
      if (isSignedIn) {
        const currentUser = await getCurrentUser();
        setUser(currentUser);
        console.log('✅ Sign in successful:', currentUser.username);
      }
    } catch (error: any) {
      console.error('❌ Sign in error:', error);
      
      let errorMessage = 'Sign in failed';
      
      if (error.name === 'NotAuthorizedException') {
        errorMessage = 'Invalid email or password';
      } else if (error.name === 'UserNotConfirmedException') {
        errorMessage = 'Please confirm your email address';
      } else if (error.name === 'UserNotFoundException') {
        errorMessage = 'User not found';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const signOutUser = async () => {
    try {
      await signOut();
      setUser(null);
      console.log('✅ Sign out successful');
    } catch (error: any) {
      console.error('❌ Sign out error:', error);
      setError('Sign out failed');
    }
  };

  const value = {
    user,
    loading,
    signInUser,
    signOutUser,
    error
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};