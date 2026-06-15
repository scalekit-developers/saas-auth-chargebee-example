'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/auth/login');
      const data = await response.json();
      
      if (data.authUrl) {
        window.location.href = data.authUrl;
      } else {
        alert('Failed to get login URL');
        setLoading(false);
      }
    } catch (error) {
      console.error('Login error:', error);
      alert('Failed to initiate login');
      setLoading(false);
    }
  };

  return (
    <button 
      onClick={handleLogin}
      className="btn btn-primary btn-lg"
      disabled={loading}
    >
      <span className="me-2">🔐</span>
      {loading ? 'Loading...' : 'Continue with Scalekit'}
    </button>
  );
}

