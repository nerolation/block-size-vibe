import React from 'react';
import { render, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { screen } from '@testing-library/dom';
import UpdateCountdown from '../../app/components/UpdateCountdown';

describe('UpdateCountdown Component', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders with initial countdown value', () => {
    const interval = 12000; // 12 seconds
    render(<UpdateCountdown autoRefresh={true} interval={interval} />);
    
    // Initial countdown should be 12 seconds
    expect(screen.getByText('12')).toBeInTheDocument();
  });

  it('counts down when autoRefresh is true', () => {
    const interval = 12000; // 12 seconds
    render(<UpdateCountdown autoRefresh={true} interval={interval} />);
    
    // Initially 12 seconds
    expect(screen.getByText('12')).toBeInTheDocument();
    
    // Advance by 2 seconds
    act(() => {
      jest.advanceTimersByTime(2000);
    });
    
    // Should now be 10 seconds
    expect(screen.getByText('10')).toBeInTheDocument();
    
    // Advance by 10 more seconds (total: 12 seconds, full interval)
    act(() => {
      jest.advanceTimersByTime(10000);
    });
    
    // Should reset to 12 seconds
    expect(screen.getByText('12')).toBeInTheDocument();
  });

  it('stops countdown when autoRefresh is false', () => {
    const interval = 12000; // 12 seconds
    const { rerender } = render(<UpdateCountdown autoRefresh={true} interval={interval} />);
    
    // Initial countdown is 12 seconds
    expect(screen.getByText('12')).toBeInTheDocument();
    
    // Advance by 2 seconds
    act(() => {
      jest.advanceTimersByTime(2000);
    });
    
    // Should be 10 seconds now
    expect(screen.getByText('10')).toBeInTheDocument();
    
    // Turn off auto-refresh
    rerender(<UpdateCountdown autoRefresh={false} interval={interval} />);
    
    // When autoRefresh is false, the component should return null
    expect(screen.queryByText('10')).not.toBeInTheDocument();
  });

  it('restarts countdown when autoRefresh is toggled back on', () => {
    const interval = 12000; // 12 seconds
    const { rerender } = render(<UpdateCountdown autoRefresh={false} interval={interval} />);
    
    // When autoRefresh is false, component should not be rendered
    expect(screen.queryByText('12')).not.toBeInTheDocument();
    
    // Turn on auto-refresh
    rerender(<UpdateCountdown autoRefresh={true} interval={interval} />);
    
    // Should show the initial countdown
    expect(screen.getByText('12')).toBeInTheDocument();
  });
}); 