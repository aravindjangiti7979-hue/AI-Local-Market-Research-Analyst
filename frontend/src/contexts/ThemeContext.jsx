import React, { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    // Check localStorage first
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      return savedTheme;
    }
    
    // Check system preference
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    
    // Default to light
    return 'light';
  });

  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Apply theme to document
    const root = window.document.documentElement;
    
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    
    // Save to localStorage
    localStorage.setItem('theme', theme);
    
    // Add transition after initial load
    setTimeout(() => {
      root.classList.add('transition-colors');
      root.style.transitionDuration = '200ms';
    }, 100);
    
    setIsLoaded(true);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
  };

  const setLightTheme = () => {
    setTheme('light');
  };

  const setDarkTheme = () => {
    setTheme('dark');
  };

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e) => {
      // Only change if user hasn't explicitly set a preference
      if (!localStorage.getItem('theme')) {
        setTheme(e.matches ? 'dark' : 'light');
      }
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Provide theme colors as CSS custom properties
  useEffect(() => {
    const root = document.documentElement;
    
    // Modern gradient-based theme colors
    const lightThemeColors = {
      '--background': '255 255 255',
      '--foreground': '17 24 39',
      '--card': '255 255 255',
      '--card-foreground': '17 24 39',
      '--primary': '59 130 246',
      '--primary-foreground': '255 255 255',
      '--secondary': '249 250 251',
      '--secondary-foreground': '17 24 39',
      '--muted': '249 250 251',
      '--muted-foreground': '107 114 128',
      '--accent': '243 244 246',
      '--accent-foreground': '17 24 39',
      '--destructive': '239 68 68',
      '--destructive-foreground': '255 255 255',
      '--border': '229 231 235',
      '--input': '229 231 235',
      '--ring': '59 130 246',
      '--radius': '0.5rem',
      '--gradient-primary': 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
      '--gradient-secondary': 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)',
      '--gradient-accent': 'linear-gradient(135deg, #10b981 0%, #3b82f6 100%)',
      '--shadow-color': '0 0 0 1px rgba(0, 0, 0, 0.05)',
      '--shadow-elevation': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    };

    const darkThemeColors = {
      '--background': '17 24 39',
      '--foreground': '243 244 246',
      '--card': '31 41 55',
      '--card-foreground': '243 244 246',
      '--primary': '96 165 250',
      '--primary-foreground': '17 24 39',
      '--secondary': '31 41 55',
      '--secondary-foreground': '243 244 246',
      '--muted': '31 41 55',
      '--muted-foreground': '156 163 175',
      '--accent': '55 65 81',
      '--accent-foreground': '243 244 246',
      '--destructive': '220 38 38',
      '--destructive-foreground': '243 244 246',
      '--border': '55 65 81',
      '--input': '55 65 81',
      '--ring': '96 165 250',
      '--radius': '0.5rem',
      '--gradient-primary': 'linear-gradient(135deg, #60a5fa 0%, #a78bfa 100%)',
      '--gradient-secondary': 'linear-gradient(135deg, #1f2937 0%, #374151 100%)',
      '--gradient-accent': 'linear-gradient(135deg, #059669 0%, #60a5fa 100%)',
      '--shadow-color': '0 0 0 1px rgba(255, 255, 255, 0.1)',
      '--shadow-elevation': '0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -2px rgba(0, 0, 0, 0.25)',
    };

    const colors = theme === 'light' ? lightThemeColors : darkThemeColors;
    
    Object.entries(colors).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });
  }, [theme]);

  // Add smooth transitions for theme changes
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      * {
        transition-property: color, background-color, border-color, text-decoration-color, fill, stroke;
        transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
        transition-duration: 200ms;
      }
      
      /* Disable transitions during initial load */
      .no-transition * {
        transition: none !important;
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Add theme class to body for third-party components
  useEffect(() => {
    document.body.classList.toggle('dark', theme === 'dark');
    document.body.classList.toggle('light', theme === 'light');
  }, [theme]);

  // Provide theme context to children
  const value = {
    theme,
    toggleTheme,
    setLightTheme,
    setDarkTheme,
    isLoaded,
  };

  // Prevent flash of wrong theme
  if (!isLoaded) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
        <div className="w-16 h-16 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 animate-spin" />
      </div>
    );
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

// Custom hook for theme-aware styling
export const useThemeClass = (lightClass, darkClass) => {
  const { theme } = useTheme();
  return theme === 'light' ? lightClass : darkClass;
};

// Higher-order component for theme-aware components
export const withTheme = (Component) => {
  return function WithThemeComponent(props) {
    const theme = useTheme();
    return <Component {...props} theme={theme} />;
  };
};

// Theme toggle button component
export const ThemeToggle = ({ className = '' }) => {
  const { theme, toggleTheme } = useTheme();
  
  return (
    <button
      onClick={toggleTheme}
      className={`relative inline-flex h-6 w-11 items-center rounded-full bg-gradient-to-r from-gray-300 to-gray-400 dark:from-gray-600 dark:to-gray-700 transition-all duration-200 ${className}`}
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 dark:from-gray-300 dark:to-gray-400 transition-transform duration-200 ${
          theme === 'dark' ? 'translate-x-6' : 'translate-x-1'
        }`}
      >
        {theme === 'light' ? (
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="w-2 h-2 rounded-full bg-gradient-to-br from-yellow-500 to-orange-600" />
          </span>
        ) : (
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="w-1.5 h-1.5 rounded-full bg-gradient-to-br from-gray-400 to-gray-300" />
          </span>
        )}
      </span>
      
      {/* Sun and moon icons */}
      <span className="absolute left-1 top-1/2 transform -translate-y-1/2">
        <span className="w-3 h-3 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 opacity-70" />
      </span>
      <span className="absolute right-1 top-1/2 transform -translate-y-1/2">
        <span className="w-3 h-3 rounded-full bg-gradient-to-br from-gray-400 to-gray-500 opacity-70" />
      </span>
    </button>
  );
};

// Theme-aware container component
export const ThemeContainer = ({ children, className = '' }) => {
  const { theme } = useTheme();
  
  return (
    <div
      className={`min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 ${className}`}
      data-theme={theme}
    >
      {children}
    </div>
  );
};

// Theme-aware text component
export const ThemeText = ({ children, type = 'default', className = '' }) => {
  const { theme } = useTheme();
  
  const typeClasses = {
    default: 'text-gray-900 dark:text-white',
    muted: 'text-gray-600 dark:text-gray-400',
    primary: 'text-blue-600 dark:text-blue-400',
    secondary: 'text-purple-600 dark:text-purple-400',
    success: 'text-green-600 dark:text-green-400',
    warning: 'text-yellow-600 dark:text-yellow-400',
    error: 'text-red-600 dark:text-red-400',
    gradient: 'bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent',
  };
  
  return (
    <span className={`${typeClasses[type]} ${className}`}>
      {children}
    </span>
  );
};

// Theme-aware card component
export const ThemeCard = ({ children, className = '', hoverable = false, glass = false }) => {
  const cardClasses = `
    bg-white dark:bg-gray-900 
    border border-gray-200 dark:border-gray-700 
    rounded-xl shadow-sm dark:shadow-gray-900/30
    ${glass ? 'backdrop-blur-sm bg-white/70 dark:bg-gray-900/70 border-gray-200/50 dark:border-gray-700/50' : ''}
    ${hoverable ? 'transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 hover:border-gray-300 dark:hover:border-gray-600' : ''}
    ${className}
  `;
  
  return (
    <div className={cardClasses}>
      {children}
    </div>
  );
};