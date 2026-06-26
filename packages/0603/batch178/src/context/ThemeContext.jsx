import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';

const ThemeContext = createContext();

export const isNightTime = () => {
  const hour = new Date().getHours();
  return hour >= 19 || hour < 7;
};

const getStoredOverrideDate = () => {
  try {
    return localStorage.getItem('themeOverrideDate');
  } catch (e) {
    return null;
  }
};

const isToday = (dateString) => {
  if (!dateString) return false;
  const today = new Date().toDateString();
  return dateString === today;
};

const getInitialTheme = () => {
  try {
    const storedTheme = localStorage.getItem('theme');
    if (storedTheme === 'auto') {
      const overrideDate = getStoredOverrideDate();
      if (isToday(overrideDate)) {
        const overrideTheme = localStorage.getItem('themeOverride');
        if (overrideTheme) return overrideTheme;
      }
    }
    return storedTheme || 'auto';
  } catch (e) {
    return 'auto';
  }
};

export const getAppliedTheme = (theme) => {
  if (theme === 'auto') {
    const overrideDate = getStoredOverrideDate();
    if (isToday(overrideDate)) {
      try {
        const overrideTheme = localStorage.getItem('themeOverride');
        if (overrideTheme) return overrideTheme;
      } catch (e) {}
    }
    return isNightTime() ? 'dark' : 'light';
  }
  if (theme === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return theme;
};

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(getInitialTheme);
  const timerRef = useRef(null);

  const setTheme = useCallback((newTheme) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem('theme', newTheme);
    } catch (e) {}
  }, []);

  const setThemeWithOverride = useCallback((newTheme) => {
    setThemeState(newTheme);
    try {
      if (theme === 'auto') {
        localStorage.setItem('themeOverride', newTheme);
        localStorage.setItem('themeOverrideDate', new Date().toDateString());
      } else {
        localStorage.setItem('theme', newTheme);
      }
    } catch (e) {}
  }, [theme]);

  useEffect(() => {
    const root = document.documentElement;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const applyTheme = () => {
      root.dataset.theme = getAppliedTheme(theme);
    };

    applyTheme();

    const handleSystemThemeChange = () => {
      if (theme === 'system') {
        root.dataset.theme = mediaQuery.matches ? 'dark' : 'light';
      }
    };

    mediaQuery.addEventListener('change', handleSystemThemeChange);

    if (theme === 'auto') {
      const scheduleNextCheck = () => {
        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        
        let nextCheck;
        if (currentHour < 7) {
          nextCheck = new Date(now);
          nextCheck.setHours(7, 0, 0, 0);
        } else if (currentHour < 19) {
          nextCheck = new Date(now);
          nextCheck.setHours(19, 0, 0, 0);
        } else {
          nextCheck = new Date(now);
          nextCheck.setDate(nextCheck.getDate() + 1);
          nextCheck.setHours(7, 0, 0, 0);
        }

        const delay = nextCheck - now;
        timerRef.current = setTimeout(() => {
          const overrideDate = getStoredOverrideDate();
          if (!isToday(overrideDate)) {
            applyTheme();
          }
          scheduleNextCheck();
        }, delay);
      };

      const midnight = new Date();
      midnight.setDate(midnight.getDate() + 1);
      midnight.setHours(0, 0, 0, 0);
      const midnightDelay = midnight - new Date();
      
      const midnightTimer = setTimeout(() => {
        try {
          localStorage.removeItem('themeOverride');
          localStorage.removeItem('themeOverrideDate');
        } catch (e) {}
        applyTheme();
      }, midnightDelay);

      scheduleNextCheck();

      return () => {
        mediaQuery.removeEventListener('change', handleSystemThemeChange);
        if (timerRef.current) clearTimeout(timerRef.current);
        clearTimeout(midnightTimer);
      };
    }

    return () => mediaQuery.removeEventListener('change', handleSystemThemeChange);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    const order = ['light', 'dark', 'system', 'auto'];
    const currentIndex = order.indexOf(theme);
    const nextTheme = order[(currentIndex + 1) % order.length];
    
    if (theme === 'auto' && (nextTheme === 'light' || nextTheme === 'dark')) {
      setThemeWithOverride(nextTheme);
    } else {
      try {
        localStorage.removeItem('themeOverride');
        localStorage.removeItem('themeOverrideDate');
      } catch (e) {}
      setTheme(nextTheme);
    }
  }, [theme, setTheme, setThemeWithOverride]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
