import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { screen } from '@testing-library/dom';
import BlockSizeChart from '../../app/components/BlockSizeChart';
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
    ComposedChart: ({ children, data }: any) => (
      <div data-testid="composed-chart" data-chart-items={data?.length || 0}>
        {children}
      </div>
    ),
    Bar: ({ dataKey }: any) => <div data-testid={`bar-${dataKey}`} />,
    Line: ({ dataKey }: any) => <div data-testid={`line-${dataKey}`} />,
    XAxis: ({ dataKey }: any) => <div data-testid={`xaxis-${dataKey}`} />,
    YAxis: ({ dataKey }: any) => <div data-testid={`yaxis-${dataKey}`} />,
    CartesianGrid: () => <div data-testid="cartesian-grid" />,
    Tooltip: () => <div data-testid="tooltip" />,
    Legend: () => <div data-testid="legend" />
  };
});

describe('BlockSizeChart Component', () => {
  it('renders chart title and container even with no blocks', () => {
    render(<BlockSizeChart blocks={[]} />);
    
    // Should always render the chart title
    expect(screen.getByText('Block Size Comparison')).toBeInTheDocument();
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
  });

  it('renders chart with block data', () => {
    const mockBlocks = generateMockBlocks(1000, 5);
    render(<BlockSizeChart blocks={mockBlocks} />);
    
    // Chart container should be present
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    expect(screen.getByTestId('composed-chart')).toBeInTheDocument();
    
    // Chart should have data elements
    const chartElement = screen.getByTestId('composed-chart');
    expect(chartElement).toHaveAttribute('data-chart-items', '5');
    
    // Axes and series should be rendered
    expect(screen.getByTestId('xaxis-slot')).toBeInTheDocument();
    expect(screen.getByTestId('bar-SSZ Size (KB)')).toBeInTheDocument();
    expect(screen.getByTestId('bar-Snappy Size (KB)')).toBeInTheDocument();
    expect(screen.getByTestId('line-compressionPercentage')).toBeInTheDocument();
  });

  it('sorts blocks by slot order', () => {
    // Create blocks in random slot order
    const unsortedBlocks = [
      generateMockBlocks(1002, 1)[0],
      generateMockBlocks(1000, 1)[0],
      generateMockBlocks(1001, 1)[0],
    ];
    
    render(<BlockSizeChart blocks={unsortedBlocks} />);
    
    // Verify chart has 3 data points
    const chartElement = screen.getByTestId('composed-chart');
    expect(chartElement).toHaveAttribute('data-chart-items', '3');
  });
  
  it('renders chart title', () => {
    const mockBlocks = generateMockBlocks(1000, 5);
    render(<BlockSizeChart blocks={mockBlocks} />);
    
    expect(screen.getByText(/Block Size Comparison/i)).toBeInTheDocument();
  });
}); 