import React, { useState, useEffect } from 'react';

interface PageLoadCountdownProps {
  initialSeconds: number;
  onComplete?: () => void;
}

const PageLoadCountdown: React.FC<PageLoadCountdownProps> = ({ 
  initialSeconds = 12,
  onComplete
}) => {
  const [countdown, setCountdown] = useState(initialSeconds);
  const [visible, setVisible] = useState(true);
  
  useEffect(() => {
    // Reset countdown when component mounts
    setCountdown(initialSeconds);
    setVisible(true);
    
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          // When we reach 0, clear the interval and call onComplete if provided
          clearInterval(timer);
          if (onComplete) {
            onComplete();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [initialSeconds, onComplete]);
  
  if (!visible || countdown < 0) {
    return null;
  }
  
  // Apply pulse animation when countdown is 3 or less
  const isNearZero = countdown <= 3;
  
  return (
    <div 
      className={`fixed bottom-6 left-6 bg-slate-800 text-white rounded-lg px-3 py-2 flex items-center justify-center shadow-lg border border-emerald-500 z-[9999] transition-all duration-300 hover:bg-slate-700 ${isNearZero ? 'animate-pulse-custom' : ''}`}
      title="Page refresh countdown"
      style={{ 
        boxShadow: '0 0 15px rgba(16, 185, 129, 0.5)'
      }}
    >
      <div className="flex flex-col items-center">
        <span className="text-xs text-emerald-200 mb-1">Page Refresh</span>
        <span className={`text-xl font-bold ${isNearZero ? 'text-red-400' : 'text-emerald-200'}`}>
          {countdown}s
        </span>
      </div>
    </div>
  );
};

export default React.memo(PageLoadCountdown); 