'use client';

import { useState } from 'react';
import { LoginPage } from '@/components/pages/login-page';

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authToken, setAuthToken] = useState<string | null>(null);

  const handleLogin = (token: string) => {
    setAuthToken(token);
    setIsAuthenticated(true);
    // Here you would typically redirect to the dashboard
    console.log('Login successful with token:', token);
  };

  if (!isAuthenticated) {
    return <LoginPage onLogin={handleLogin} />;
  }

  // Placeholder for dashboard - will be implemented next
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Welcome to COBOL Navigator Pro
        </h1>
        <p className="text-gray-600 mb-8">
          Dashboard coming soon...
        </p>
        <button
          onClick={() => setIsAuthenticated(false)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Logout
        </button>
      </div>
    </div>
  );
}
