import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { toast } from 'react-toastify';
import { UserProfile, UserRole, UserPermissions, getDefaultPermissions } from '../types/index';
import { dynamoDBService } from '../services/dynamoDBService';

interface User {
  username: string;
  email?: string;
  userId?: string;
  attributes?: any;
}

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  isAuthenticated: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<any>;
  signOut: () => Promise<void>;
  signUp: (email: string, password: string, attributes?: any) => Promise<any>;
  confirmSignUp: (email: string, code: string) => Promise<any>;
  resendSignUpCode: (email: string) => Promise<any>;
  forgotPassword: (email: string) => Promise<any>;
  confirmPassword: (email: string, code: string, newPassword: string) => Promise<any>;
  getCurrentUser: () => Promise<User | null>;
  getIdToken: () => Promise<string | null>;
  updateUserProfile: (updates: Partial<UserProfile>) => Promise<{ success: boolean; error?: string }>;
  refreshUserProfile: () => Promise<void>;
  hasPermission: (permission: keyof UserPermissions) => boolean;
  isRole: (role: UserRole | UserRole[]) => boolean;
  getUserPermissions: () => UserPermissions;
  authProvider: string;
  userRole: string | null;
  userGroups: string[];
  hasUser: boolean;
  isAmplifyAvailable: boolean;
  isDynamoDBAvailable: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
};

// Helper function to format phone number to E.164 format
const formatPhoneNumber = (phone: string): string => {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');
  
  // If it starts with country code, use as is
  if (digits.startsWith('91') && digits.length === 12) {
    return `+${digits}`;
  }
  
  // If it's 10 digits (Indian number without country code), add +91
  if (digits.length === 10) {
    return `+91${digits}`;
  }
  
  // If it already has +, use as is
  if (phone.startsWith('+')) {
    return phone;
  }
  
  // Default: assume it needs +91 prefix for Indian numbers
  return `+91${digits}`;
};

// Helper function to validate and format birthdate
const formatBirthdate = (birthdate: string): string => {
  // Ensure the date is in YYYY-MM-DD format
  const date = new Date(birthdate);
  if (isNaN(date.getTime())) {
    throw new Error('Invalid birthdate format');
  }
  
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userGroups, setUserGroups] = useState<string[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isDynamoDBAvailable, setIsDynamoDBAvailable] = useState(false);

  const isAmplifyAvailable = !!(
    import.meta.env.VITE_AWS_REGION &&
    import.meta.env.VITE_USER_POOL_ID &&
    (import.meta.env.VITE_USER_POOL_CLIENT_ID || import.meta.env.VITE_USER_POOL_WEB_CLIENT_ID)
  );

  // Minimal DynamoDB service check (use your own test)
  useEffect(() => {
    setIsDynamoDBAvailable(!!dynamoDBService);
  }, []);

  useEffect(() => {
    checkAuthState();
  }, []);

  const checkAuthState = async () => {
    try {
      setLoading(true);
      if (!isAmplifyAvailable) {
        await clearAuthState();
        return;
      }
      const { getCurrentUser } = await import('@aws-amplify/auth');
      const currentUser = await getCurrentUser();
      await setUserFromAmplify(currentUser);
    } catch {
      await clearAuthState();
    } finally {
      setLoading(false);
    }
  };

  const setUserFromAmplify = async (amplifyUser: any) => {
    const newUser: User = {
      username: amplifyUser.username,
      email: amplifyUser.signInDetails?.loginId || amplifyUser.attributes?.email,
      userId: amplifyUser.userId || amplifyUser.username,
      attributes: amplifyUser,
    };
    setUser(newUser);
    setIsAuthenticated(true);
    setUserRole('doctor');
    setUserGroups(['doctor']);

    // Try to get extended profile (optional)
    if (isDynamoDBAvailable && dynamoDBService.getAllUsers) {
      try {
        const profiles = await dynamoDBService.getAllUsers();
        const profile = profiles.find(
          (p: any) =>
            p.cognitoUsername === newUser.username || p.email === newUser.email
        );
        if (profile) {
          setUserProfile(profile);
          setUserRole(profile.role || 'doctor');
          setUserGroups([profile.role || 'doctor']);
        }
      } catch (error) {
        console.log('DynamoDB profile error:', error);
      }
    }
  };

  const clearAuthState = async () => {
    try {
      if (isAmplifyAvailable) {
        const { signOut } = await import('@aws-amplify/auth');
        await signOut().catch(() => {});
      }
    } catch (error) {}
    setUser(null);
    setUserProfile(null);
    setIsAuthenticated(false);
    setUserRole(null);
    setUserGroups([]);
  };

  // FIXED SIGNUP FUNCTION
  const signUp = async (email: string, password: string, attributes: any = {}) => {
    if (!isAmplifyAvailable) {
      throw new Error('Sign up requires AWS Cognito to be configured');
    }
    
    try {
      const { signUp } = await import('@aws-amplify/auth');
      
      // Build username
      const emailPrefix = email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
      const timestamp = Date.now().toString().slice(-6);
      const username = `${emailPrefix}${timestamp}`;
      
      // Validate and format phone number
      let formattedPhone = '';
      if (attributes.phone_number) {
        try {
          formattedPhone = formatPhoneNumber(attributes.phone_number);
        } catch (error) {
          throw new Error('Invalid phone number format. Please use format: +919876543210 or 9876543210');
        }
      }
      
      // Validate and format birthdate
      let formattedBirthdate = '';
      if (attributes.birthdate) {
        try {
          formattedBirthdate = formatBirthdate(attributes.birthdate);
        } catch (error) {
          throw new Error('Invalid birthdate format. Please select a valid date.');
        }
      }
      
      // Build user attributes according to Cognito standard attributes
      const userAttributes: Record<string, string> = {
        email: email,
        name: attributes.name || emailPrefix,
      };
      
      // Add optional standard attributes
      if (formattedPhone) {
        userAttributes.phone_number = formattedPhone;
      }
      
      if (formattedBirthdate) {
        userAttributes.birthdate = formattedBirthdate;
      }
      
      if (attributes.gender) {
        userAttributes.gender = attributes.gender.toLowerCase();
      }
      
      // Add address field (your Cognito requires 'address' not 'addresses')
      const hospitalValue = (attributes.hospital || attributes.address || '').toString();
      if (!hospitalValue || hospitalValue.trim().length === 0) {
        throw new Error('Hospital/Address is required but was empty or missing');
      }
      
      userAttributes.address = hospitalValue.trim(); // Use 'address' not 'addresses'
      
      // Add custom attributes (now that we see custom:role is configured)
      if (attributes.role) {
        userAttributes['custom:role'] = attributes.role.toLowerCase();
      }
      
      // Note: custom:licenseNumber is not shown in your AWS console,
      // so we'll skip it to avoid errors
      
      console.log('🔍 Final userAttributes being sent to Cognito:', userAttributes);
      
      // Save email → username mapping for confirmation
      localStorage.setItem('cognito_signup_mapping', JSON.stringify({
        email, 
        username, 
        timestamp: Date.now()
      }));
      
      const result = await signUp({
        username,
        password,
        options: {
          userAttributes,
        },
      });
      
      console.log('✅ Signup result:', result);
      toast.success('Account created! Please check your email for verification.');
      return { 
        success: true, 
        result, 
        username,
        isSignUpComplete: result.isSignUpComplete 
      };
      
    } catch (err: any) {
      console.error('❌ Signup error details:', err);
      localStorage.removeItem('cognito_signup_mapping');
      
      // Provide more specific error messages
      let errorMessage = err.message || 'Sign up failed';
      
      if (errorMessage.includes('phone_number')) {
        errorMessage = 'Invalid phone number format. Please use format: +919876543210';
      } else if (errorMessage.includes('birthdate')) {
        errorMessage = 'Invalid birthdate. Please select a valid date.';
      } else if (errorMessage.includes('password')) {
        errorMessage = 'Password does not meet requirements. Use at least 8 characters with uppercase, lowercase, number and special character.';
      } else if (errorMessage.includes('address')) {
        errorMessage = 'Hospital/Address field is required but appears to be empty. Please fill in your hospital or clinic name and try again.';
      } else if (errorMessage.includes('required but was empty')) {
        errorMessage = 'Hospital/Address field cannot be empty. Please enter your hospital or clinic information.';
      } else if (errorMessage.includes('schema') || errorMessage.includes('conform')) {
        errorMessage = 'Some required fields are missing or incorrect. Please check all fields and try again.';
      }
      
      toast.error(errorMessage);
      throw new Error(errorMessage);
    }
  };

  // Confirmation: finds mapped username for email
  const confirmSignUp = async (email: string, code: string) => {
    try {
      const { confirmSignUp } = await import('@aws-amplify/auth');
      const mapping = localStorage.getItem('cognito_signup_mapping');
      let usernameToUse: string | null = null;
      
      if (mapping) {
        const parsed = JSON.parse(mapping);
        if (parsed.email === email) {
          usernameToUse = parsed.username;
        }
      }
      
      if (!usernameToUse) {
        throw new Error('Cannot find username for confirmation. Please sign up again.');
      }
      
      const result = await confirmSignUp({
        username: usernameToUse,
        confirmationCode: code.trim(),
      });
      
      localStorage.removeItem('cognito_signup_mapping');
      toast.success('Email verified successfully! You can now sign in.');
      return { success: true, result };
      
    } catch (err: any) {
      console.error('❌ Confirmation error:', err);
      toast.error(err.message || 'Verification failed');
      throw new Error(err.message || 'Verification failed');
    }
  };

  // Resend code using mapping
  const resendSignUpCode = async (email: string) => {
    try {
      const { resendSignUpCode } = await import('@aws-amplify/auth');
      const mapping = localStorage.getItem('cognito_signup_mapping');
      let usernameToUse: string | null = null;
      
      if (mapping) {
        const parsed = JSON.parse(mapping);
        if (parsed.email === email) {
          usernameToUse = parsed.username;
        }
      }
      
      if (!usernameToUse) {
        throw new Error('Cannot find account information. Please sign up again.');
      }
      
      await resendSignUpCode({ username: usernameToUse });
      toast.success('Verification code resent');
      return { success: true };
      
    } catch (err: any) {
      console.error('❌ Resend error:', err);
      toast.error(err.message || 'Failed to resend code');
      throw new Error(err.message || 'Failed to resend code');
    }
  };

  // Sign In: can use email directly (alias enabled)
  const signIn = async (email: string, password: string) => {
    // Local test mode
    if (email === 'test@example.com' && password === 'TestPass123!') {
      const testUser: User = {
        username: 'testuser',
        email: email,
        userId: 'test-user-id',
      };
      setUser(testUser);
      setIsAuthenticated(true);
      setUserRole('doctor');
      setUserGroups(['doctor']);
      toast.success('Logged in (Local Mode)!');
      return { success: true, user: testUser };
    }
    
    if (!isAmplifyAvailable) {
      throw new Error('Invalid credentials');
    }
    
    try {
      setLoading(true);
      const { signIn } = await import('@aws-amplify/auth');
      const result = await signIn({ username: email, password });
      const { getCurrentUser } = await import('@aws-amplify/auth');
      const currentUser = await getCurrentUser();
      await setUserFromAmplify(currentUser);
      toast.success('Logged in successfully!');
      return { success: true, result };
    } catch (err: any) {
      console.error('❌ SignIn error:', err);
      toast.error(err.message || 'Login failed');
      throw new Error(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try { 
      await clearAuthState(); 
      toast.success('Signed out successfully'); 
    } catch { 
      toast.error('Error signing out'); 
    }
  };

  // Password reset functions
  const forgotPassword = async (email: string) => {
    try {
      const { resetPassword } = await import('@aws-amplify/auth');
      await resetPassword({ username: email });
      toast.success('Password reset code sent to your email');
      return { success: true };
    } catch (err: any) {
      toast.error(err.message || 'Failed to send reset code');
      throw new Error(err.message);
    }
  };

  const confirmPassword = async (email: string, code: string, newPassword: string) => {
    try {
      const { confirmResetPassword } = await import('@aws-amplify/auth');
      await confirmResetPassword({ username: email, confirmationCode: code, newPassword });
      toast.success('Password changed successfully');
      return { success: true };
    } catch (err: any) {
      toast.error(err.message || 'Failed to change password');
      throw new Error(err.message);
    }
  };

  const getCurrentUser = async (): Promise<User | null> => {
    if (!isAmplifyAvailable) return user;
    try {
      const { getCurrentUser } = await import('@aws-amplify/auth');
      const currentUser = await getCurrentUser();
      return {
        username: currentUser.username,
        email: currentUser.signInDetails?.loginId,
        userId: currentUser.userId,
        attributes: currentUser,
      };
    } catch { 
      return null; 
    }
  };

  const getIdToken = async (): Promise<string | null> => {
    if (!isAmplifyAvailable) return null;
    try {
      const { fetchAuthSession } = await import('@aws-amplify/auth');
      const session = await fetchAuthSession();
      return session.tokens?.idToken?.toString() || null;
    } catch { 
      return null; 
    }
  };

  const updateUserProfile = async (updates: Partial<UserProfile>): Promise<{ success: boolean; error?: string }> => {
    return { success: false, error: 'Not implemented in this version' };
  };

  const refreshUserProfile = async (): Promise<void> => {};

  const hasPermission = (permission: keyof UserPermissions): boolean => {
    const role = userProfile?.role || userRole || 'doctor';
    const permissions = getDefaultPermissions(role as UserRole);
    return permissions[permission] || false;
  };

  const isRole = (role: UserRole | UserRole[]): boolean => {
    const currentRole = userProfile?.role || userRole;
    if (!currentRole) return false;
    if (Array.isArray(role)) return role.includes(currentRole as UserRole);
    return currentRole === role;
  };

  const getUserPermissions = (): UserPermissions => {
    const role = userProfile?.role || userRole || 'doctor';
    return getDefaultPermissions(role as UserRole);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        isAuthenticated,
        loading,
        signIn,
        signOut,
        signUp,
        confirmSignUp,
        resendSignUpCode,
        forgotPassword,
        confirmPassword,
        getCurrentUser,
        getIdToken,
        updateUserProfile,
        refreshUserProfile,
        hasPermission,
        isRole,
        getUserPermissions,
        authProvider: isAmplifyAvailable ? 'cognito' : 'local',
        userRole,
        userGroups,
        hasUser: !!user,
        isAmplifyAvailable,
        isDynamoDBAvailable,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};