import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import Header from '../../app/components/Header';

// Import screen and fireEvent from testing-library/dom
import { screen, fireEvent } from '@testing-library/dom';

// Mock data
const mockLatestBlock = {
  slot: 12345,
  ssz_size: 112640,
  snappy_size: 56320,
  compression_ratio: 0.5,
  components: {
    execution_payload: 74240,
    attestations: 24576,
    deposits: 0,
    proposer_slashings: 0,
    attester_slashings: 0,
    voluntary_exits: 0,
    sync_aggregate: 2048,
    blob_kzg_commitments: 11776
  },
  block_root: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
  timestamp: Date.now() / 1000
};

describe('Header Component', () => {
  // Mock the format timestamp function for consistent testing
  const originalDate = global.Date;
  
  beforeAll(() => {
    const mockDate = new Date(2023, 0, 1, 12, 0, 0);
    
    // Simpler date mock that works with TypeScript
    global.Date = jest.fn(() => mockDate) as unknown as typeof Date;
    global.Date.now = jest.fn(() => mockDate.getTime());
  });
  
  afterAll(() => {
    global.Date = originalDate;
  });
  
  it('renders header with title', () => {
    const mockOnToggleAutoRefresh = jest.fn();
    
    render(
      <Header 
        autoRefresh={true} 
        onToggleAutoRefresh={mockOnToggleAutoRefresh} 
      />
    );
    
    expect(screen.getByText('Ethereum Block Size Explorer')).toBeInTheDocument();
    expect(screen.getByText('Visualizing block size metrics from an Ethereum beacon node')).toBeInTheDocument();
  });
  
  it('displays latest block information when provided', () => {
    const mockOnToggleAutoRefresh = jest.fn();
    
    render(
      <Header 
        autoRefresh={true} 
        onToggleAutoRefresh={mockOnToggleAutoRefresh}
        latestBlock={mockLatestBlock}
      />
    );
    
    expect(screen.getByText(/Latest Block:/)).toBeInTheDocument();
    expect(screen.getByText('12345')).toBeInTheDocument();
  });
  
  it('shows updating status when isUpdating is true', () => {
    const mockOnToggleAutoRefresh = jest.fn();
    
    render(
      <Header 
        autoRefresh={true} 
        onToggleAutoRefresh={mockOnToggleAutoRefresh}
        latestBlock={mockLatestBlock}
        isUpdating={true}
      />
    );
    
    expect(screen.getByText('Updating...')).toBeInTheDocument();
  });
  
  it('toggles auto-refresh when button is clicked', () => {
    const mockOnToggleAutoRefresh = jest.fn();
    
    render(
      <Header 
        autoRefresh={true} 
        onToggleAutoRefresh={mockOnToggleAutoRefresh}
        latestBlock={mockLatestBlock}
      />
    );
    
    const button = screen.getByText('Auto-Refresh On');
    fireEvent.click(button);
    
    expect(mockOnToggleAutoRefresh).toHaveBeenCalledTimes(1);
  });
  
  it('shows correct button text when autoRefresh is false', () => {
    const mockOnToggleAutoRefresh = jest.fn();
    
    render(
      <Header 
        autoRefresh={false} 
        onToggleAutoRefresh={mockOnToggleAutoRefresh}
        latestBlock={mockLatestBlock}
      />
    );
    
    expect(screen.getByText('Auto-Refresh Off')).toBeInTheDocument();
  });
}); 