// src/services/auth.ts - Updated for Amplify v6+
import { signIn, signOut, getCurrentUser, fetchAuthSession } from 'aws-amplify/auth';
import type { User } from './types';

class AuthService {
  async signIn(username: string, password: string): Promise<string> {
    try {
      const { isSignedIn, nextStep } = await signIn({ username, password });
      
      if (isSignedIn) {
        const session = await fetchAuthSession();
        const token = session.tokens?.idToken?.toString();
        if (token) {
          return token;
        }
        throw new Error('No token received');
      } else {
        throw new Error('Sign in failed');
      }
    } catch (error) {
      console.error('Error signing in:', error);
      throw error;
    }
  }

  async signOut(): Promise<void> {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  }

  async getCurrentUser(): Promise<User | null> {
    try {
      const user = await getCurrentUser();
      const session = await fetchAuthSession();
      const token = session.tokens?.idToken?.toString();
      
      if (!token) {
        return null;
      }

      // Extract user info from JWT token
      const payload = JSON.parse(atob(token.split('.')[1]));
      
      return {
        userId: payload.sub,
        email: payload.email,
        name: payload.name || payload.email,
        role: payload['custom:role'] || 'doctor',
        specialization: payload['custom:specialization']
      };
    } catch (error) {
      console.error('No authenticated user:', error);
      return null;
    }
  }

  async getCurrentToken(): Promise<string | null> {
    try {
      const session = await fetchAuthSession();
      const token = session.tokens?.idToken?.toString();
      return token || null;
    } catch (error) {
      console.error('No valid session:', error);
      return null;
    }
  }

  async refreshToken(): Promise<string | null> {
    try {
      const session = await fetchAuthSession({ forceRefresh: true });
      const token = session.tokens?.idToken?.toString();
      return token || null;
    } catch (error) {
      console.error('Error refreshing token:', error);
      return null;
    }
  }

  async isAuthenticated(): Promise<boolean> {
    try {
      await getCurrentUser();
      return true;
    } catch (error) {
      return false;
    }
  }
}

export default new AuthService();