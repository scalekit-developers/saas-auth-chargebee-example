'use client';

interface CopyButtonProps {
  text: string;
  label?: string;
}

export default function CopyButton({ text, label = 'Copy' }: CopyButtonProps) {
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    alert('Copied!');
  };

  return (
    <button 
      className="btn btn-sm btn-outline-primary" 
      onClick={handleCopy}
    >
      {label}
    </button>
  );
}

