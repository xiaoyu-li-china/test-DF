import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider, useTheme, isNightTime, getAppliedTheme } from './ThemeContext';
import ThemeToggle from '../components/ThemeToggle';

const TestComponent = () => {
  const { theme, toggleTheme, setTheme } = useTheme();
  return (
    <div>
      <span data-testid="theme-value">{theme}</span>
      <button data-testid="toggle-btn" onClick={toggleTheme}>Toggle</button>
      <button data-testid="set-light" onClick={() => setTheme('light')}>Set Light</button>
      <button data-testid="set-dark" onClick={() => setTheme('dark')}>Set Dark</button>
      <button data-testid="set-system" onClick={() => setTheme('system')}>Set System</button>
      <button data-testid="set-auto" onClick={() => setTheme('auto')}>Set Auto</button>
    </div>
  );
};

const renderWithTheme = (initialTheme = null) => {
  if (initialTheme) {
    localStorage.setItem('theme', initialTheme);
  }
  return render(
    <ThemeProvider>
      <TestComponent />
    </ThemeProvider>
  );
};

describe('ThemeContext', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  describe('initial state', () => {
    it('should default to auto theme', () => {
      renderWithTheme();
      expect(screen.getByTestId('theme-value')).toHaveTextContent('auto');
    });

    it('should read theme from localStorage', () => {
      renderWithTheme('dark');
      expect(screen.getByTestId('theme-value')).toHaveTextContent('dark');
    });
  });

  describe('data-theme attribute', () => {
    it('should set data-theme to light when theme is light', async () => {
      renderWithTheme('light');
      await waitFor(() => {
        expect(document.documentElement.dataset.theme).toBe('light');
      });
    });

    it('should set data-theme to dark when theme is dark', async () => {
      renderWithTheme('dark');
      await waitFor(() => {
        expect(document.documentElement.dataset.theme).toBe('dark');
      });
    });

    it('should set data-theme based on system preference', async () => {
      window.matchMedia = vi.fn().mockImplementation((query) => ({
        matches: query === '(prefers-color-scheme: dark)',
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }));
      
      renderWithTheme('system');
      await waitFor(() => {
        expect(document.documentElement.dataset.theme).toBe('dark');
      });
    });

    it('should update data-theme when theme changes', async () => {
      renderWithTheme('light');
      await waitFor(() => {
        expect(document.documentElement.dataset.theme).toBe('light');
      });
      
      fireEvent.click(screen.getByTestId('set-dark'));
      await waitFor(() => {
        expect(document.documentElement.dataset.theme).toBe('dark');
      });
    });
  });

  describe('data-theme attribute and CSS integration', () => {
    it('should set data-theme attribute to light on html element', async () => {
      renderWithTheme('light');
      await waitFor(() => {
        expect(document.documentElement).toHaveAttribute('data-theme', 'light');
      });
    });

    it('should set data-theme attribute to dark on html element', async () => {
      renderWithTheme('dark');
      await waitFor(() => {
        expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
      });
    });

    it('should update data-theme attribute when switching from light to dark', async () => {
      renderWithTheme('light');
      await waitFor(() => {
        expect(document.documentElement).toHaveAttribute('data-theme', 'light');
      });
      
      fireEvent.click(screen.getByTestId('set-dark'));
      await waitFor(() => {
        expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
      });
    });

    it('should update data-theme attribute when switching from dark to light', async () => {
      renderWithTheme('dark');
      await waitFor(() => {
        expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
      });
      
      fireEvent.click(screen.getByTestId('set-light'));
      await waitFor(() => {
        expect(document.documentElement).toHaveAttribute('data-theme', 'light');
      });
    });

    it('should update data-theme attribute when switching to system', async () => {
      window.matchMedia = vi.fn().mockImplementation((query) => ({
        matches: query === '(prefers-color-scheme: dark)',
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }));
      
      renderWithTheme('light');
      await waitFor(() => {
        expect(document.documentElement).toHaveAttribute('data-theme', 'light');
      });
      
      fireEvent.click(screen.getByTestId('set-system'));
      await waitFor(() => {
        expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
      });
    });

    it('should update data-theme attribute when switching to auto mode', async () => {
      vi.setSystemTime(new Date(2026, 5, 3, 20, 0, 0));
      
      renderWithTheme('light');
      await waitFor(() => {
        expect(document.documentElement).toHaveAttribute('data-theme', 'light');
      });
      
      fireEvent.click(screen.getByTestId('set-auto'));
      await waitFor(() => {
        expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
      });
    });

    it('should reflect auto mode light theme during daytime', async () => {
      vi.setSystemTime(new Date(2026, 5, 3, 12, 0, 0));
      
      renderWithTheme('auto');
      await waitFor(() => {
        expect(document.documentElement).toHaveAttribute('data-theme', 'light');
      });
    });

    it('should reflect auto mode dark theme during nighttime', async () => {
      vi.setSystemTime(new Date(2026, 5, 3, 22, 0, 0));
      
      renderWithTheme('auto');
      await waitFor(() => {
        expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
      });
    });
  });

  describe('toggleTheme', () => {
    it('should cycle through themes in order', async () => {
      renderWithTheme('light');
      expect(screen.getByTestId('theme-value')).toHaveTextContent('light');
      
      fireEvent.click(screen.getByTestId('toggle-btn'));
      expect(screen.getByTestId('theme-value')).toHaveTextContent('dark');
      
      fireEvent.click(screen.getByTestId('toggle-btn'));
      expect(screen.getByTestId('theme-value')).toHaveTextContent('system');
      
      fireEvent.click(screen.getByTestId('toggle-btn'));
      expect(screen.getByTestId('theme-value')).toHaveTextContent('auto');
      
      fireEvent.click(screen.getByTestId('toggle-btn'));
      expect(screen.getByTestId('theme-value')).toHaveTextContent('light');
    });
  });

  describe('auto mode time detection', () => {
    it('isNightTime should return true during night hours (19:00 - 07:00)', () => {
      vi.setSystemTime(new Date(2026, 5, 3, 20, 0, 0));
      expect(isNightTime()).toBe(true);
      
      vi.setSystemTime(new Date(2026, 5, 3, 6, 0, 0));
      expect(isNightTime()).toBe(true);
      
      vi.setSystemTime(new Date(2026, 5, 3, 12, 0, 0));
      expect(isNightTime()).toBe(false);
      
      vi.setSystemTime(new Date(2026, 5, 3, 18, 59, 0));
      expect(isNightTime()).toBe(false);
      
      vi.setSystemTime(new Date(2026, 5, 3, 19, 0, 0));
      expect(isNightTime()).toBe(true);
      
      vi.setSystemTime(new Date(2026, 5, 3, 7, 0, 0));
      expect(isNightTime()).toBe(false);
    });

    it('getAppliedTheme should return dark in auto mode during night', () => {
      vi.setSystemTime(new Date(2026, 5, 3, 20, 0, 0));
      expect(getAppliedTheme('auto')).toBe('dark');
    });

    it('getAppliedTheme should return light in auto mode during day', () => {
      vi.setSystemTime(new Date(2026, 5, 3, 12, 0, 0));
      expect(getAppliedTheme('auto')).toBe('light');
    });
  });

  describe('localStorage persistence', () => {
    it('should save theme to localStorage when setTheme is called', async () => {
      renderWithTheme('light');
      
      fireEvent.click(screen.getByTestId('set-dark'));
      await waitFor(() => {
        expect(localStorage.getItem('theme')).toBe('dark');
      });
    });

    it('should read theme from localStorage on init', () => {
      localStorage.setItem('theme', 'dark');
      renderWithTheme();
      expect(screen.getByTestId('theme-value')).toHaveTextContent('dark');
    });
  });
});

describe('ThemeToggle Component', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  it('should render with correct label for light theme', () => {
    localStorage.setItem('theme', 'light');
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    );
    expect(screen.getByText('浅色')).toBeInTheDocument();
  });

  it('should render with correct label for dark theme', () => {
    localStorage.setItem('theme', 'dark');
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    );
    expect(screen.getByText('深色')).toBeInTheDocument();
  });

  it('should render with correct label for system theme', () => {
    localStorage.setItem('theme', 'system');
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    );
    expect(screen.getByText('跟随系统')).toBeInTheDocument();
  });

  it('should render with correct label for auto theme', () => {
    localStorage.setItem('theme', 'auto');
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    );
    expect(screen.getByText('跟随时间')).toBeInTheDocument();
  });

  it('should toggle theme when clicked', () => {
    localStorage.setItem('theme', 'light');
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    );
    
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByText('深色')).toBeInTheDocument();
  });
});
