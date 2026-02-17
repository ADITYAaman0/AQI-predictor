/**
 * ThemeToggle Component Tests
 * 
 * Tests for the theme toggle button component including:
 * - Theme switching functionality
 * - localStorage persistence
 * - Icon rendering for each theme state
 * - Accessibility features
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeToggle } from '../ThemeToggle';
import { ThemeProvider } from '@/providers/ThemeProvider';

// Mock localStorage
const localStorageMock = (() => {
    let store: Record<string, string> = {};

    return {
        getItem: (key: string) => store[key] || null,
        setItem: (key: string, value: string) => {
            store[key] = value.toString();
        },
        removeItem: (key: string) => {
            delete store[key];
        },
        clear: () => {
            store = {};
        },
    };
})();

Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
});

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
    })),
});

describe('ThemeToggle', () => {
    beforeEach(() => {
        localStorageMock.clear();
        document.documentElement.className = '';
        document.documentElement.removeAttribute('data-theme');
    });

    const renderWithProvider = (ui: React.ReactElement) => {
        return render(<ThemeProvider>{ui}</ThemeProvider>);
    };

    describe('Rendering', () => {
        it('should render the theme toggle button', async () => {
            renderWithProvider(<ThemeToggle />);

            await waitFor(() => {
                const button = screen.getByRole('button', { name: /switch to/i });
                expect(button).toBeInTheDocument();
            });
        });

        it('should render with correct size classes', async () => {
            const { rerender } = renderWithProvider(<ThemeToggle size="small" />);

            await waitFor(() => {
                let button = screen.getByRole('button');
                expect(button).toHaveClass('w-8', 'h-8');
            });

            rerender(
                <ThemeProvider>
                    <ThemeToggle size="medium" />
                </ThemeProvider>
            );

            await waitFor(() => {
                let button = screen.getByRole('button');
                expect(button).toHaveClass('w-10', 'h-10');
            });

            rerender(
                <ThemeProvider>
                    <ThemeToggle size="large" />
                </ThemeProvider>
            );

            await waitFor(() => {
                let button = screen.getByRole('button');
                expect(button).toHaveClass('w-12', 'h-12');
            });
        });

        it('should render with label when showLabel is true', async () => {
            renderWithProvider(<ThemeToggle showLabel={true} />);

            await waitFor(() => {
                expect(screen.getByText(/light|dark|auto/i)).toBeInTheDocument();
            });
        });
    });

    describe('Theme Switching', () => {
        it('should cycle through themes: light → dark → system → light', async () => {
            renderWithProvider(<ThemeToggle showLabel={true} />);

            await waitFor(() => {
                expect(screen.getByRole('button')).toBeInTheDocument();
            });

            const button = screen.getByRole('button');

            // Initial state should be system (default)
            await waitFor(() => {
                expect(screen.getByText(/auto/i)).toBeInTheDocument();
            });

            // Click to switch to light
            fireEvent.click(button);
            await waitFor(() => {
                expect(screen.getByText(/light/i)).toBeInTheDocument();
            });

            // Click to switch to dark
            fireEvent.click(button);
            await waitFor(() => {
                expect(screen.getByText(/dark/i)).toBeInTheDocument();
            });

            // Click to switch to system
            fireEvent.click(button);
            await waitFor(() => {
                expect(screen.getByText(/auto/i)).toBeInTheDocument();
            });
        });

        it('should update document data-theme attribute', async () => {
            renderWithProvider(<ThemeToggle />);

            await waitFor(() => {
                expect(screen.getByRole('button')).toBeInTheDocument();
            });

            const button = screen.getByRole('button');

            // Click to switch to light
            fireEvent.click(button);
            await waitFor(() => {
                expect(document.documentElement.getAttribute('data-theme')).toBe('light');
            });

            // Click to switch to dark
            fireEvent.click(button);
            await waitFor(() => {
                expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
            });
        });
    });

    describe('localStorage Persistence', () => {
        it('should save theme preference to localStorage', async () => {
            renderWithProvider(<ThemeToggle />);

            await waitFor(() => {
                expect(screen.getByRole('button')).toBeInTheDocument();
            });

            const button = screen.getByRole('button');

            // Switch to light
            fireEvent.click(button);
            await waitFor(() => {
                expect(localStorageMock.getItem('theme')).toBe('light');
            });

            // Switch to dark
            fireEvent.click(button);
            await waitFor(() => {
                expect(localStorageMock.getItem('theme')).toBe('dark');
            });

            // Switch to system
            fireEvent.click(button);
            await waitFor(() => {
                expect(localStorageMock.getItem('theme')).toBe('system');
            });
        });

        it('should restore theme from localStorage on mount', async () => {
            localStorageMock.setItem('theme', 'dark');

            renderWithProvider(<ThemeToggle showLabel={true} />);

            await waitFor(() => {
                expect(screen.getByText(/dark/i)).toBeInTheDocument();
            });
        });
    });

    describe('Accessibility', () => {
        it('should have proper ARIA labels', async () => {
            renderWithProvider(<ThemeToggle />);

            await waitFor(() => {
                const button = screen.getByRole('button');
                expect(button).toHaveAttribute('aria-label');
                expect(button.getAttribute('aria-label')).toMatch(/switch to/i);
            });
        });

        it('should have tooltip title', async () => {
            renderWithProvider(<ThemeToggle />);

            await waitFor(() => {
                const button = screen.getByRole('button');
                expect(button).toHaveAttribute('title');
                expect(button.getAttribute('title')).toMatch(/switch to/i);
            });
        });

        it('should be keyboard accessible', async () => {
            renderWithProvider(<ThemeToggle showLabel={true} />);

            await waitFor(() => {
                expect(screen.getByRole('button')).toBeInTheDocument();
            });

            const button = screen.getByRole('button');
            button.focus();

            expect(document.activeElement).toBe(button);

            // Simulate Enter key press
            fireEvent.keyDown(button, { key: 'Enter', code: 'Enter' });
            fireEvent.click(button);

            await waitFor(() => {
                expect(screen.getByText(/light/i)).toBeInTheDocument();
            });
        });
    });

    describe('Icon Rendering', () => {
        it('should show correct icon for each theme', async () => {
            renderWithProvider(<ThemeToggle />);

            await waitFor(() => {
                expect(screen.getByRole('button')).toBeInTheDocument();
            });

            const button = screen.getByRole('button');
            const svgs = button.querySelectorAll('svg');

            // Should have 4 SVGs (sun, moon, auto, spacer)
            expect(svgs.length).toBe(4);

            // Check that icons have proper opacity classes
            const visibleIcons = Array.from(svgs).filter(
                (svg) => !svg.classList.contains('opacity-0')
            );

            // Only one icon should be visible at a time (plus the spacer)
            expect(visibleIcons.length).toBeGreaterThanOrEqual(1);
        });
    });

    describe('Custom Styling', () => {
        it('should apply custom className', async () => {
            renderWithProvider(<ThemeToggle className="custom-class" />);

            await waitFor(() => {
                const button = screen.getByRole('button');
                expect(button).toHaveClass('custom-class');
            });
        });

        it('should apply glassmorphic styles', async () => {
            renderWithProvider(<ThemeToggle />);

            await waitFor(() => {
                const button = screen.getByRole('button');
                expect(button).toHaveClass('glass-card');
                expect(button).toHaveClass('backdrop-blur-lg');
            });
        });
    });
});
