import React from 'react';
import { render, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { screen, fireEvent } from '@testing-library/dom';
import RangeSelector from '../../app/components/RangeSelector';

describe('RangeSelector Component', () => {
  const defaultProps = {
    currentRange: { start: 1000, end: 1020 },
    onRangeChange: jest.fn(),
    latestSlot: 1050
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with current range values', () => {
    render(<RangeSelector {...defaultProps} />);
    
    // Check if inputs have correct initial values
    const startInput = screen.getByLabelText(/start slot/i) as HTMLInputElement;
    const endInput = screen.getByLabelText(/end slot/i) as HTMLInputElement;
    
    expect(startInput.value).toBe('1000');
    expect(endInput.value).toBe('1020');
  });

  it('updates input values when props change', () => {
    const { rerender } = render(<RangeSelector {...defaultProps} />);
    
    // Rerender with new props
    rerender(
      <RangeSelector 
        {...defaultProps} 
        currentRange={{ start: 1010, end: 1030 }} 
      />
    );
    
    const startInput = screen.getByLabelText(/start slot/i) as HTMLInputElement;
    const endInput = screen.getByLabelText(/end slot/i) as HTMLInputElement;
    
    expect(startInput.value).toBe('1010');
    expect(endInput.value).toBe('1030');
  });

  it('validates and submits the form with valid inputs', () => {
    render(<RangeSelector {...defaultProps} />);
    
    const startInput = screen.getByLabelText(/start slot/i);
    const endInput = screen.getByLabelText(/end slot/i);
    const submitButton = screen.getByText('Apply Range');
    
    // Change input values
    fireEvent.change(startInput, { target: { value: '1005' } });
    fireEvent.change(endInput, { target: { value: '1025' } });
    
    // Submit form
    fireEvent.click(submitButton);
    
    // Check if onRangeChange was called with correct values
    expect(defaultProps.onRangeChange).toHaveBeenCalledWith({ 
      start: 1005, 
      end: 1025 
    });
  });

  it('shows error for invalid range (start > end)', () => {
    render(<RangeSelector {...defaultProps} />);
    
    const startInput = screen.getByLabelText(/start slot/i);
    const endInput = screen.getByLabelText(/end slot/i);
    const submitButton = screen.getByText('Apply Range');
    
    // Set invalid range
    fireEvent.change(startInput, { target: { value: '1030' } });
    fireEvent.change(endInput, { target: { value: '1020' } });
    
    // Submit form
    fireEvent.click(submitButton);
    
    // Check error message is displayed
    expect(screen.getByText(/start slot must be less than or equal to end slot/i)).toBeInTheDocument();
    
    // onRangeChange should not be called
    expect(defaultProps.onRangeChange).not.toHaveBeenCalled();
  });

  it('applies quick range selections', () => {
    render(<RangeSelector {...defaultProps} />);
    
    // Click on "Last 20 Blocks" button
    fireEvent.click(screen.getByText(/last 20 blocks/i));
    
    // Expect onRangeChange to be called with range of last 20 slots
    // The implementation uses latestSlot - count + 1 for the start slot
    expect(defaultProps.onRangeChange).toHaveBeenCalledWith({ 
      start: 1030, 
      end: 1050
    });
  });

  it('disables controls when isPending is true', () => {
    render(<RangeSelector {...defaultProps} isPending={true} />);
    
    const applyButton = screen.getByText('Loading...');
    expect(applyButton).toBeDisabled();
    
    // Check that all preset buttons are disabled
    const presetButtons = screen.getAllByRole('button');
    presetButtons.forEach(button => {
      expect(button).toBeDisabled();
    });
  });
}); 