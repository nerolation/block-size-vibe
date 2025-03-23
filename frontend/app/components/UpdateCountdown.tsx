import React, { useState, useEffect, useRef } from 'react';

interface UpdateCountdownProps {
  autoRefresh: boolean;
  interval: number; // in milliseconds
}

const UpdateCountdown: React.FC<UpdateCountdownProps> = ({ autoRefresh, interval }) => {
  const [countdown, setCountdown] = useState(Math.floor(interval / 1000));
  const [isVisible, setIsVisible] = useState(true);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  
  // Reset and sync the countdown timer
  const resetCountdown = () => {
    // Store the current time to calculate offsets
    startTimeRef.current = Date.now();
    
    // Set initial countdown value
    setCountdown(Math.floor(interval / 1000));
    
    // Clear any existing timers
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    // Create new interval that updates every second
    timerRef.current = setInterval(() => {
      const elapsedMs = Date.now() - startTimeRef.current;
      const remainingSeconds = Math.ceil((interval - elapsedMs) / 1000);
      
      setCountdown(Math.max(0, remainingSeconds));
      
      // If we've reached the end of the interval, reset the countdown
      if (elapsedMs >= interval) {
        startTimeRef.current = Date.now();
        setCountdown(Math.floor(interval / 1000));
      }
    }, 100);  // Update more frequently for smoother countdown
  };
  
  useEffect(() => {
    if (!autoRefresh) {
      setCountdown(Math.floor(interval / 1000));
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }
    
    // Initialize countdown
    resetCountdown();
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [autoRefresh, interval]);
  
  // Force visibility check on mount
  useEffect(() => {
    setIsVisible(true);
  }, []);
  
  if (!autoRefresh || !isVisible) {
    return null;
  }
  
  // Apply pulse animation when countdown is 3 or less
  const isNearZero = countdown <= 3;
  
  return (
    <div 
      className={`fixed bottom-6 right-6 bg-slate-800 text-white rounded-full w-16 h-16 flex items-center justify-center shadow-lg border border-blue-500 z-[9999] transition-all duration-300 hover:bg-slate-700 ${isNearZero ? 'animate-pulse-custom' : ''}`}
      title="Seconds until next data update"
      style={{ boxShadow: '0 0 15px rgba(59, 130, 246, 0.5)' }}
    >
      <span className={`text-2xl font-bold ${isNearZero ? 'text-red-400' : 'text-blue-200'}`}>
        {countdown}
      </span>
    </div>
  );
};

export default React.memo(UpdateCountdown); 