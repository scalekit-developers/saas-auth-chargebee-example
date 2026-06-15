'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
      });
      const data = await response.json();
      
      if (data.logoutUrl) {
        window.location.href = data.logoutUrl;
      } else {
        router.push('/');
        router.refresh();
      }
    } catch (error) {
      console.error('Logout error:', error);
      router.push('/');
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); handleLogout(); }} className="d-inline">
      <button 
        className="btn btn-outline-light btn-sm ms-2" 
        type="submit"
        disabled={loading}
      >
        {loading ? 'Logging out...' : 'Logout'}
      </button>
    </form>
  );
}

