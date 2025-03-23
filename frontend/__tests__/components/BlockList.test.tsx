import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { screen, fireEvent } from '@testing-library/dom';
import BlockList from '../../app/components/BlockList';
import { generateMockBlocks } from '../mocks/blockServiceMock';

describe('BlockList Component', () => {
  // Mock Date for consistent timestamp formatting
  const originalDate = global.Date;
  
  beforeAll(() => {
    const mockDate = new Date(2023, 0, 1, 12, 0, 0);
    global.Date = jest.fn(() => mockDate) as unknown as typeof Date;
    global.Date.now = jest.fn(() => mockDate.getTime());
  });
  
  afterAll(() => {
    global.Date = originalDate;
  });

  it('renders empty state when no blocks', () => {
    render(<BlockList blocks={[]} />);
    
    // The component actually shows the table with no rows instead of a message
    expect(screen.getByText('Block Details')).toBeInTheDocument();
    const table = screen.getByRole('table');
    expect(table).toBeInTheDocument();
    
    // Table headers should be present
    expect(screen.getByText('Slot')).toBeInTheDocument();
    expect(screen.getByText('Slot Timestamp')).toBeInTheDocument();
    
    // Should have empty tbody
    const rows = screen.getAllByRole('row');
    expect(rows.length).toBe(1); // Only header row
  });

  it('renders a list of blocks', () => {
    const mockBlocks = generateMockBlocks(1000, 5);
    render(<BlockList blocks={mockBlocks} />);
    
    // Should render a row for each block
    mockBlocks.forEach(block => {
      expect(screen.getByText(block.slot.toString())).toBeInTheDocument();
    });
  });

  it('formats byte sizes correctly', () => {
    const mockBlocks = generateMockBlocks(1000, 1);
    
    // Set specific sizes for testing formatting
    mockBlocks[0].ssz_size = 1536; // Should be displayed as KB
    mockBlocks[0].snappy_size = 800; // Should be displayed as B
    
    render(<BlockList blocks={mockBlocks} />);
    
    // Check for formatted byte sizes
    expect(screen.getByText('1.50 KB')).toBeInTheDocument();
    expect(screen.getByText('800 B')).toBeInTheDocument();
  });

  it('expands a block when clicked', () => {
    const mockBlocks = generateMockBlocks(1000, 3);
    
    // Add specific component names to match what's displayed
    mockBlocks[0].components = {
      execution_payload: 10000,
      attestations: 5000,
      deposits: 2000,
      proposer_slashings: 0,
      attester_slashings: 0,
      voluntary_exits: 0,
      sync_aggregate: 1000,
      blob_kzg_commitments: 500
    };
    
    render(<BlockList blocks={mockBlocks} />);
    
    // Initially, components should not be visible
    expect(screen.queryByText('Component Breakdown')).not.toBeInTheDocument();
    
    // Find and click the Show Details button
    const showDetailsButton = screen.getAllByText('Show Details')[0];
    fireEvent.click(showDetailsButton);
    
    // Now components should be visible
    expect(screen.getByText('Component Breakdown')).toBeInTheDocument();
    expect(screen.getByText('execution payload:')).toBeInTheDocument();
    expect(screen.getByText('attestations:')).toBeInTheDocument();
  });

  it('collapses an expanded block when clicked again', () => {
    const mockBlocks = generateMockBlocks(1000, 3);
    
    // Add specific component names to match what's displayed
    mockBlocks[0].components = {
      execution_payload: 10000,
      attestations: 5000,
      deposits: 2000,
      proposer_slashings: 0,
      attester_slashings: 0,
      voluntary_exits: 0,
      sync_aggregate: 1000,
      blob_kzg_commitments: 500
    };
    
    render(<BlockList blocks={mockBlocks} />);
    
    // Find and click the Show Details button to expand
    const showDetailsButton = screen.getAllByText('Show Details')[0];
    fireEvent.click(showDetailsButton);
    
    // Components should be visible
    expect(screen.getByText('Component Breakdown')).toBeInTheDocument();
    
    // The button should now say "Hide Details"
    const hideDetailsButton = screen.getByText('Hide Details');
    fireEvent.click(hideDetailsButton);
    
    // Components should not be visible anymore
    expect(screen.queryByText('Component Breakdown')).not.toBeInTheDocument();
  });

  it('sorts blocks by slot in descending order', () => {
    const unsortedBlocks = [
      generateMockBlocks(1000, 1)[0],
      generateMockBlocks(1002, 1)[0],
      generateMockBlocks(1001, 1)[0],
    ];
    
    render(<BlockList blocks={unsortedBlocks} />);
    
    // Get all slot cells (skipping the header)
    const rows = screen.getAllByRole('row');
    
    // First row should be header, then slots in descending order
    expect(rows[1]).toHaveTextContent('1002');
    expect(rows[2]).toHaveTextContent('1001');
    expect(rows[3]).toHaveTextContent('1000');
  });
}); 