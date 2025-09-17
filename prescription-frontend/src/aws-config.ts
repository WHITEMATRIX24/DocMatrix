import { Amplify } from 'aws-amplify';

const awsConfig = {
  Auth: {
    Cognito: {
      region: import.meta.env.VITE_AWS_REGION || 'ap-south-1',
      userPoolId: import.meta.env.VITE_USER_POOL_ID || 'ap-south-1_U2u0qXuEK',
      userPoolClientId: import.meta.env.VITE_USER_POOL_WEB_CLIENT_ID || '5sjuf1atk9mi8ufregrsgskkdu', // Fixed: added missing 'g' and 'k'
      identityPoolId: import.meta.env.VITE_IDENTITY_POOL_ID || 'ap-south-1:0494ac5-0d6c-4da5-af5e-b9fc032999cb', // Fixed: 04994ac5 → 10494ac5
      loginWith: {
        email: true,
      },
    }
  }
};

// DEBUG: Log environment variables
console.log('🔍 Environment Variables Debug:', {
  region: import.meta.env.VITE_AWS_REGION,
  userPool: import.meta.env.VITE_USER_POOL_ID,
  client: import.meta.env.VITE_USER_POOL_WEB_CLIENT_ID,
  identityPool: import.meta.env.VITE_IDENTITY_POOL_ID,
  allEnvVars: import.meta.env,
  mode: import.meta.env.MODE
});

// Check if environment variables are loaded
const missingVars = [];
if (!import.meta.env.VITE_AWS_REGION) missingVars.push('VITE_AWS_REGION');
if (!import.meta.env.VITE_USER_POOL_ID) missingVars.push('VITE_USER_POOL_ID');
if (!import.meta.env.VITE_USER_POOL_WEB_CLIENT_ID) missingVars.push('VITE_USER_POOL_WEB_CLIENT_ID');
if (!import.meta.env.VITE_IDENTITY_POOL_ID) missingVars.push('VITE_IDENTITY_POOL_ID');

if (missingVars.length > 0) {
  console.error('❌ Missing environment variables:', missingVars);
  console.error('📁 Check your .env file is in the root directory');
  console.error('🔄 Restart your dev server after editing .env');
} else {
  console.log('✅ All environment variables loaded successfully');
}

Amplify.configure(awsConfig);

console.log('✅ AWS Amplify configured with:', {
  region: awsConfig.Auth.Cognito.region,
  userPoolId: awsConfig.Auth.Cognito.userPoolId,
  userPoolClientId: awsConfig.Auth.Cognito.userPoolClientId,
  identityPoolId: awsConfig.Auth.Cognito.identityPoolId
});

export default awsConfig;