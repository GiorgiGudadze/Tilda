import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ThemeToggleProps {
  theme: 'light' | 'dark';
  onToggle: () => void;
}

/** An icon button whose name says which theme it switches to. */
export function ThemeToggle({ theme, onToggle }: ThemeToggleProps) {
  const label =
    theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme';
  const Icon = theme === 'dark' ? Sun : Moon;
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={label}
      title={label}
      onClick={onToggle}
    >
      <Icon aria-hidden="true" />
    </Button>
  );
}
