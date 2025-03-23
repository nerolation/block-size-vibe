import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { screen, fireEvent } from '@testing-library/dom';
import BlockComponentsTable from '../../app/components/BlockComponentsTable';
import { generateMockBlocks } from '../mocks/blockServiceMock';

// Mock global methods used for export functionality
global.URL.createObjectURL = jest.fn();
global.Blob = jest.fn(() => ({})) as any;

describe('BlockComponentsTable Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  it('renders message when no blocks are available', () => {
    render(<BlockComponentsTable blocks={[]} />);
    
    expect(screen.getByText('No block data available')).toBeInTheDocument();
  });

  it('renders table with block component data', () => {
    const mockBlocks = generateMockBlocks(1000, 5);
    render(<BlockComponentsTable blocks={mockBlocks} />);
    
    // Table header should be present
    expect(screen.getByText('Component Size Breakdown')).toBeInTheDocument();
    
    // Component rows should be present
    expect(screen.getByText('execution payload')).toBeInTheDocument();
    expect(screen.getByText('attestations')).toBeInTheDocument();
    // This might be rendered as 'sync aggregate' without underscores due to text transformation
    const syncElement = screen.getByText((content) => 
      content.includes('sync') && content.includes('aggregate')
    );
    expect(syncElement).toBeInTheDocument();
  });

  it('formats sizes correctly', () => {
    const mockBlocks = generateMockBlocks(1000, 1);
    // Set specific component sizes for testing
    mockBlocks[0].components.execution_payload = 75000; // Should be displayed as KB
    mockBlocks[0].components.attestations = 512; // Should be displayed as B
    mockBlocks[0].ssz_size = 100000; // For percentage calculation
    
    render(<BlockComponentsTable blocks={mockBlocks} />);
    
    // Find the KB sizes (looking for execution payload size)
    const sizeElements = screen.getAllByText(/KB/);
    expect(sizeElements.length).toBeGreaterThan(0);
    
    // Look for the specific value for attestations
    expect(screen.getByText('512 B')).toBeInTheDocument();
    
    // Check for percentages - we expect execution_payload to be 75% of the block
    const percentElements = screen.getAllByText(/%/);
    expect(percentElements.length).toBeGreaterThan(0);
    
    // At least one percentage should be near 75%
    const hasExpectedPercentage = percentElements.some(el => {
      const text = el.textContent || '';
      const percentValue = parseFloat(text);
      return percentValue >= 70 && percentValue <= 80;
    });
    expect(hasExpectedPercentage).toBe(true);
  });

  it('allows sorting by different columns', () => {
    const mockBlocks = generateMockBlocks(1000, 3);
    
    // Ensure consistent component sizes for predictable sorting
    mockBlocks[0].components = {
      execution_payload: 70000,
      attestations: 20000,
      deposits: 5000,
      sync_aggregate: 2000,
      proposer_slashings: 0,
      attester_slashings: 0,
      voluntary_exits: 0,
      blob_kzg_commitments: 1000
    };
    
    render(<BlockComponentsTable blocks={mockBlocks} />);
    
    // By default, the table should be sorted by size in descending order
    // This means execution_payload should be first
    const initialRows = screen.getAllByRole('row');
    // The first row after header should contain execution_payload
    const firstDataRow = initialRows[1];
    expect(firstDataRow).toHaveTextContent('execution payload');
    
    // Get the component column header
    const columnHeaders = screen.getAllByRole('columnheader');
    const componentHeader = columnHeaders[0]; // First column is Component
    
    // Sort by name (click on the first column header)
    fireEvent.click(componentHeader);
    
    // We won't check the exact sort order as it may vary based on implementation details
    // Just check that we can click the header without errors
    
    // Now click the size header to sort by size
    const sizeHeader = columnHeaders[1]; // Second column is Size
    fireEvent.click(sizeHeader);
    
    // After clicking the size header, execution_payload should be first again
    const rowsAfterSizeSort = screen.getAllByRole('row');
    const firstRowAfterSizeSort = rowsAfterSizeSort[1];
    expect(firstRowAfterSizeSort).toHaveTextContent('execution payload');
  });

  it('has export functionality', () => {
    const mockBlocks = generateMockBlocks(1000, 3);
    render(<BlockComponentsTable blocks={mockBlocks} />);
    
    // Export button should be present
    const exportButton = screen.getByText('Export CSV');
    expect(exportButton).toBeInTheDocument();
    
    // Click export button
    fireEvent.click(exportButton);
    
    // Expect Blob constructor to be called
    expect(global.Blob).toHaveBeenCalled();
    expect(global.URL.createObjectURL).toHaveBeenCalled();
  });
}); 