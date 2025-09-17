// src/main.tsx
import React from 'react'
import ReactDOM from 'react-dom/client'

// Import AWS configuration FIRST (synchronously)
// This ensures AWS Amplify is configured before the app starts
import './aws-config'

import App from './App.tsx'

// Import CSS
import './index.css'

// Import React Toastify CSS
import 'react-toastify/dist/ReactToastify.css'

console.log('🚀 Starting MediScript Pro...');

ReactDOM.createRoot(document.getElementById('root')!).render(
      <App />
 )