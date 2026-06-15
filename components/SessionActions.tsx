'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function SessionActions() {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  const validateToken = async () => {
    setLoading('validate');
    try {
      const response = await fetch('/api/auth/validate', {
        method: 'POST',
      });
      const data = await response.json();
      
      if (data.valid) {
        let message = '✅ Token is valid!\\n\\n';
        if (data.userId) message += `User ID: ${data.userId}\\n`;
        if (data.email) message += `Email: ${data.email}\\n`;
        if (data.name) message += `Name: ${data.name}\\n`;
        alert(message);
      } else {
        alert(`❌ Token validation failed!\\n\\nError: ${data.error}`);
      }
    } catch (error) {
      console.error('Token validation error:', error);
      alert('❌ Token validation failed!\\n\\nError: Unable to validate token. Please try again.');
    } finally {
      setLoading(null);
    }
  };

  const refreshToken = async () => {
    setLoading('refresh');
    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
      });
      const data = await response.json();
      
      if (data.success) {
        alert('✅ Tokens refreshed successfully!\\n\\nReloading page...');
        setTimeout(() => {
          router.refresh();
        }, 1000);
      } else {
        alert(`❌ Token refresh failed!\\n\\nError: ${data.error}`);
      }
    } catch (error) {
      console.error('Token refresh error:', error);
      alert('❌ Token refresh failed!\\n\\nError: Unable to refresh tokens. Please try again.');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="d-grid gap-2 d-md-flex">
      <button 
        className="btn btn-outline-warning" 
        onClick={refreshToken}
        disabled={loading !== null}
      >
        {loading === 'refresh' ? 'Refreshing...' : 'Refresh Session Info'}
      </button>
      <button 
        className="btn btn-outline-info" 
        onClick={validateToken}
        disabled={loading !== null}
      >
        {loading === 'validate' ? 'Validating...' : 'Validate Token'}
      </button>
    </div>
  );
}

