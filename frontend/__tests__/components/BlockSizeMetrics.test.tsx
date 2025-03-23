import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { screen } from '@testing-library/dom';
import BlockSizeMetrics from '../../app/components/BlockSizeMetrics';
import { generateMockBlocks } from '../mocks/blockServiceMock';

// Mock the Recharts library
jest.mock('recharts', () => {
  const OriginalModule = jest.requireActual('recharts');
  return {
    ...OriginalModule,
    ResponsiveContainer: ({ children, width, height }: any) => (
      <div data-testid="responsive-container" style={{ width, height }}>
        {children}
      </div>
    ),
    PieChart: ({ children }: any) => <div data-testid="pie-chart">{children}</div>,
    Pie: ({ children, data, dataKey }: any) => (
      <div data-testid="pie" data-data={JSON.stringify(data)} data-datakey={dataKey}>
        {children}
      </div>
    ),
    Cell: (props: any) => <div data-testid="cell" data-fill={props.fill} />,
    Legend: () => <div data-testid="legend" />,
    Tooltip: () => <div data-testid="tooltip" />
  };
});

describe('BlockSizeMetrics Component', () => {
  it('renders with empty data', () => {
    render(<BlockSizeMetrics blocks={[]} />);
    
    // Check heading
    expect(screen.getByText('Block Metrics')).toBeInTheDocument();
    
    // Check for zero values
    const sizeElements = screen.getAllByText('0 B');
    expect(sizeElements.length).toBe(2); // SSZ Size and Snappy Size
  });
  
  it('renders with block data', () => {
    // Generate 5 mock blocks
    const mockBlocks = generateMockBlocks(1000, 5);
    
    render(<BlockSizeMetrics blocks={mockBlocks} />);
    
    // Check for metrics headings
    expect(screen.getByText(/SSZ Size/i)).toBeInTheDocument();
    expect(screen.getByText(/Snappy Size/i)).toBeInTheDocument();
    expect(screen.getByText(/Compression/i)).toBeInTheDocument();
    
    // The component should render the pie chart
    expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
    expect(screen.getByTestId('pie')).toBeInTheDocument();
    
    // Check if data is passed to the Pie component
    const pieElement = screen.getByTestId('pie');
    const pieData = JSON.parse(pieElement.getAttribute('data-data') || '[]');
    expect(pieData.length).toBeGreaterThan(0);
  });
  
  it('displays formatted numbers for block sizes', () => {
    // Create a mock block with known size
    const mockBlocks = generateMockBlocks(1000, 1);
    mockBlocks[0].ssz_size = 100000; // 100 KB
    mockBlocks[0].snappy_size = 50000; // 50 KB
    mockBlocks[0].compression_ratio = 0.5; // 50%
    
    render(<BlockSizeMetrics blocks={mockBlocks} />);
    
    // Check for KB representation
    const metricElements = screen.getAllByText(/KB/i);
    const sszElement = metricElements.find(el => el.textContent?.includes('97'));
    const snappyElement = metricElements.find(el => el.textContent?.includes('48'));
    expect(sszElement).toBeInTheDocument();
    expect(snappyElement).toBeInTheDocument();
    
    // Check for percentage
    expect(screen.getByText((content) => content.includes('50.00'))).toBeInTheDocument();
  });
}); 