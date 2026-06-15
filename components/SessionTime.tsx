'use client';

import { useEffect, useState } from 'react';

export default function SessionTime() {
  const [time, setTime] = useState<string>('');

  useEffect(() => {
    // Set initial time
    setTime(new Date().toLocaleString());
    
    // Update every second
    const interval = setInterval(() => {
      setTime(new Date().toLocaleString());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return <span suppressHydrationWarning>{time || 'Loading...'}</span>;
}

