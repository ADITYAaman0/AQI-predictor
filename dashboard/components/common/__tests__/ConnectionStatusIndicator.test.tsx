import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ConnectionStatusIndicator, ConnectionStatusBadge } from '../ConnectionStatusIndicator';
import { useWebSocket } from '@/providers/WebSocketProvider';

// Mock the useWebSocket hook
jest.mock('@/providers/WebSocketProvider');

const mockUseWebSocket = useWebSocket as jest.MockedFunction<typeof useWebSocket>;

describe('ConnectionStatusIndicator', () => {
  beforeEach(() => {
    mockUseWebSocket.mockReturnValue({
      client: null,
      isConnected: false,
      isConnecting: false,
      error: null,
      lastUpdate: null,
      reconnectAttempts: 0,
      subscribe: jest.fn(),
      unsubscribe: jest.fn(),
      refresh: jest.fn(),
    });
  });
  
  afterEach(() => {
    jest.clearAllMocks();
  });
  
  describe('Rendering', () => {
    it('should render without crashing', () => {
      render(<ConnectionStatusIndicator />);
      expect(screen.getByRole('generic')).toBeInTheDocument();
    });
    
    it('should render at specified position', () => {
      const { container } = render(<ConnectionStatusIndicator position="bottom-left" />);
      const indicator = container.querySelector('.bottom-4.left-4');
      expect(indicator).toBeInTheDocument();
    });
    
    it('should apply custom className', () => {
      const { container } = render(<ConnectionStatusIndicator className="custom-class" />);
      const indicator = container.querySelector('.custom-class');
      expect(indicator).toBeInTheDocument();
    });
  });
  
  describe('Connection States', () => {
    it('should show green dot when connected', () => {
      mockUseWebSocket.mockReturnValue({
        client: null,
        isConnected: true,
        isConnecting: false,
        error: null,
        lastUpdate: null,
        reconnectAttempts: 0,
        subscribe: jest.fn(),
        unsubscribe: jest.fn(),
        refresh: jest.fn(),
      });
      
      const { container } = render(<ConnectionStatusIndicator />);
      const greenDot = container.querySelector('.bg-green-500');
      expect(greenDot).toBeInTheDocument();
    });
    
    it('should show yellow dot when connecting', () => {
      mockUseWebSocket.mockReturnValue({
        client: null,
        isConnected: false,
        isConnecting: true,
        error: null,
        lastUpdate: null,
        reconnectAttempts: 0,
        subscribe: jest.fn(),
        unsubscribe: jest.fn(),
        refresh: jest.fn(),
      });
      
      const { container } = render(<ConnectionStatusIndicator />);
      const yellowDot = container.querySelector('.bg-yellow-500');
      expect(yellowDot).toBeInTheDocument();
    });
    
    it('should show red dot when disconnected', () => {
      mockUseWebSocket.mockReturnValue({
        client: null,
        isConnected: false,
        isConnecting: false,
        error: new Error('Connection failed'),
        lastUpdate: null,
        reconnectAttempts: 0,
        subscribe: jest.fn(),
        unsubscribe: jest.fn(),
        refresh: jest.fn(),
      });
      
      const { container } = render(<ConnectionStatusIndicator />);
      const redDot = container.querySelector('.bg-red-500');
      expect(redDot).toBeInTheDocument();
    });
    
    it('should show pulse animation when connecting', () => {
      mockUseWebSocket.mockReturnValue({
        client: null,
        isConnected: false,
        isConnecting: true,
        error: null,
        lastUpdate: null,
        reconnectAttempts: 0,
        subscribe: jest.fn(),
        unsubscribe: jest.fn(),
        refresh: jest.fn(),
      });
      
      const { container } = render(<ConnectionStatusIndicator />);
      const pulsingDot = container.querySelector('.animate-pulse');
      expect(pulsingDot).toBeInTheDocument();
    });
  });
  
  describe('Status Text', () => {
    it('should show status text when showText is true', () => {
      mockUseWebSocket.mockReturnValue({
        client: null,
        isConnected: true,
        isConnecting: false,
        error: null,
        lastUpdate: null,
        reconnectAttempts: 0,
        subscribe: jest.fn(),
        unsubscribe: jest.fn(),
        refresh: jest.fn(),
      });
      
      render(<ConnectionStatusIndicator showText />);
      expect(screen.getByText('Real-time updates active')).toBeInTheDocument();
    });
    
    it('should show reconnection attempts in status text', () => {
      mockUseWebSocket.mockReturnValue({
        client: null,
        isConnected: false,
        isConnecting: true,
        error: null,
        lastUpdate: null,
        reconnectAttempts: 3,
        subscribe: jest.fn(),
        unsubscribe: jest.fn(),
        refresh: jest.fn(),
      });
      
      render(<ConnectionStatusIndicator showText />);
      expect(screen.getByText('Reconnecting (3/5)...')).toBeInTheDocument();
    });
    
    it('should show error message in status text', () => {
      mockUseWebSocket.mockReturnValue({
        client: null,
        isConnected: false,
        isConnecting: false,
        error: new Error('Connection failed'),
        lastUpdate: null,
        reconnectAttempts: 0,
        subscribe: jest.fn(),
        unsubscribe: jest.fn(),
        refresh: jest.fn(),
      });
      
      render(<ConnectionStatusIndicator showText />);
      expect(screen.getByText('Connection failed')).toBeInTheDocument();
    });
  });
  
  describe('Tooltip', () => {
    it('should show tooltip on hover when showText is false', async () => {
      mockUseWebSocket.mockReturnValue({
        client: null,
        isConnected: true,
        isConnecting: false,
        error: null,
        lastUpdate: null,
        reconnectAttempts: 0,
        subscribe: jest.fn(),
        unsubscribe: jest.fn(),
        refresh: jest.fn(),
      });
      
      const { container } = render(<ConnectionStatusIndicator />);
      const indicator = container.querySelector('.fixed');
      
      if (indicator) {
        fireEvent.mouseEnter(indicator);
        
        await waitFor(() => {
          expect(screen.getByText('Real-time updates active')).toBeInTheDocument();
        });
      }
    });
    
    it('should hide tooltip on mouse leave', async () => {
      mockUseWebSocket.mockReturnValue({
        client: null,
        isConnected: true,
        isConnecting: false,
        error: null,
        lastUpdate: null,
        reconnectAttempts: 0,
        subscribe: jest.fn(),
        unsubscribe: jest.fn(),
        refresh: jest.fn(),
      });
      
      const { container } = render(<ConnectionStatusIndicator />);
      const indicator = container.querySelector('.fixed');
      
      if (indicator) {
        fireEvent.mouseEnter(indicator);
        await waitFor(() => {
          expect(screen.getByText('Real-time updates active')).toBeInTheDocument();
        });
        
        fireEvent.mouseLeave(indicator);
        await waitFor(() => {
          expect(screen.queryByText('Real-time updates active')).not.toBeInTheDocument();
        });
      }
    });
    
    it('should show error in tooltip', async () => {
      const testError = new Error('Test error message');
      
      mockUseWebSocket.mockReturnValue({
        client: null,
        isConnected: false,
        isConnecting: false,
        error: testError,
        lastUpdate: null,
        reconnectAttempts: 0,
        subscribe: jest.fn(),
        unsubscribe: jest.fn(),
        refresh: jest.fn(),
      });
      
      const { container } = render(<ConnectionStatusIndicator />);
      const indicator = container.querySelector('.fixed');
      
      if (indicator) {
        fireEvent.mouseEnter(indicator);
        
        await waitFor(() => {
          expect(screen.getByText('Test error message')).toBeInTheDocument();
        });
      }
    });
  });
});

describe('ConnectionStatusBadge', () => {
  beforeEach(() => {
    mockUseWebSocket.mockReturnValue({
      client: null,
      isConnected: false,
      isConnecting: false,
      error: null,
      lastUpdate: null,
      reconnectAttempts: 0,
      subscribe: jest.fn(),
      unsubscribe: jest.fn(),
      refresh: jest.fn(),
    });
  });
  
  afterEach(() => {
    jest.clearAllMocks();
  });
  
  describe('Rendering', () => {
    it('should render without crashing', () => {
      render(<ConnectionStatusBadge />);
      expect(screen.getByText('Offline')).toBeInTheDocument();
    });
    
    it('should show "Live" when connected', () => {
      mockUseWebSocket.mockReturnValue({
        client: null,
        isConnected: true,
        isConnecting: false,
        error: null,
        lastUpdate: null,
        reconnectAttempts: 0,
        subscribe: jest.fn(),
        unsubscribe: jest.fn(),
        refresh: jest.fn(),
      });
      
      render(<ConnectionStatusBadge />);
      expect(screen.getByText('Live')).toBeInTheDocument();
    });
    
    it('should show "Connecting" when connecting', () => {
      mockUseWebSocket.mockReturnValue({
        client: null,
        isConnected: false,
        isConnecting: true,
        error: null,
        lastUpdate: null,
        reconnectAttempts: 0,
        subscribe: jest.fn(),
        unsubscribe: jest.fn(),
        refresh: jest.fn(),
      });
      
      render(<ConnectionStatusBadge />);
      expect(screen.getByText('Connecting')).toBeInTheDocument();
    });
    
    it('should show "Offline" when disconnected', () => {
      render(<ConnectionStatusBadge />);
      expect(screen.getByText('Offline')).toBeInTheDocument();
    });
  });
  
  describe('Visual Indicators', () => {
    it('should show green dot when connected', () => {
      mockUseWebSocket.mockReturnValue({
        client: null,
        isConnected: true,
        isConnecting: false,
        error: null,
        lastUpdate: null,
        reconnectAttempts: 0,
        subscribe: jest.fn(),
        unsubscribe: jest.fn(),
        refresh: jest.fn(),
      });
      
      const { container } = render(<ConnectionStatusBadge />);
      const greenDot = container.querySelector('.bg-green-500');
      expect(greenDot).toBeInTheDocument();
    });
    
    it('should show pulse animation when connecting', () => {
      mockUseWebSocket.mockReturnValue({
        client: null,
        isConnected: false,
        isConnecting: true,
        error: null,
        lastUpdate: null,
        reconnectAttempts: 0,
        subscribe: jest.fn(),
        unsubscribe: jest.fn(),
        refresh: jest.fn(),
      });
      
      const { container } = render(<ConnectionStatusBadge />);
      const pulsingDot = container.querySelector('.animate-pulse');
      expect(pulsingDot).toBeInTheDocument();
    });
  });
});
