'use client';

import * as React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from './ui/button';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  // Avoid hydration mismatch
  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="bg-white border border-black text-black hover:bg-black hover:text-white transition-colors h-7 px-3 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black"
        aria-label="Toggle theme"
        disabled
      >
        <Sun className="h-3 w-3" aria-hidden="true" />
      </Button>
    );
  }

  const isDark = theme === 'dark';

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="bg-white dark:bg-black border border-black dark:border-white text-black dark:text-white hover:bg-black dark:hover:bg-white hover:text-white dark:hover:text-black transition-colors h-7 px-3 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black dark:focus:ring-white"
    >
      {isDark ? (
        <Sun className="h-3 w-3" aria-hidden="true" />
      ) : (
        <Moon className="h-3 w-3" aria-hidden="true" />
      )}
    </Button>
  );
}


