'use client';

export default function PrintButton() {
  return (
    <button 
      className="btn btn-outline-secondary" 
      onClick={() => window.print()}
    >
      Print Dashboard
    </button>
  );
}

