import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import {
  BarChart3,
  BookOpen,
  BrainCircuit,
  ChartArea,
  Flame,
  Home,
  Moon,
  Search,
  Settings,
  Timer,
  Trophy,
  X,
  Zap,
} from 'lucide-react';
import { applyTheme, getStoredTheme, type AppTheme } from '@/lib/theme';

interface CommandItem {
  id: string;
  title: string;
  category: 'Navigation' | 'Actions' | 'Appearance';
  icon: typeof Home;
  shortcut?: string;
  action: () => void;
}

export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [, setLocation] = useLocation();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const navigate = (path: string) => {
    setLocation(path);
    onOpenChange(false);
  };

  const commands: CommandItem[] = [
    {
      id: 'nav-dashboard',
      title: 'Overview & Daily Pulse',
      category: 'Navigation',
      icon: Home,
      shortcut: 'G D',
      action: () => navigate('/'),
    },
    {
      id: 'nav-study',
      title: 'Focus Timer & Study Room',
      category: 'Navigation',
      icon: Timer,
      shortcut: 'G S',
      action: () => navigate('/study'),
    },
    {
      id: 'nav-syllabus',
      title: 'Syllabus & Topic Progress',
      category: 'Navigation',
      icon: BookOpen,
      shortcut: 'G Y',
      action: () => navigate('/syllabus'),
    },
    {
      id: 'nav-recall',
      title: 'Spaced Recall Flashcards',
      category: 'Navigation',
      icon: BrainCircuit,
      shortcut: 'G R',
      action: () => navigate('/recall'),
    },
    {
      id: 'nav-tests',
      title: 'Mock Test Tracker & Analytics',
      category: 'Navigation',
      icon: BarChart3,
      shortcut: 'G T',
      action: () => navigate('/tests'),
    },
    {
      id: 'nav-stats',
      title: 'Deep Study Stats & Heatmaps',
      category: 'Navigation',
      icon: ChartArea,
      shortcut: 'G A',
      action: () => navigate('/stats'),
    },
    {
      id: 'nav-compete',
      title: 'Weekly Circle & Leaderboard',
      category: 'Navigation',
      icon: Trophy,
      shortcut: 'G C',
      action: () => navigate('/compete'),
    },
    {
      id: 'nav-settings',
      title: 'Settings & Exam Target',
      category: 'Navigation',
      icon: Settings,
      shortcut: 'G ,',
      action: () => navigate('/settings'),
    },
    {
      id: 'act-focus-25',
      title: 'Start 25-Minute Focus Block',
      category: 'Actions',
      icon: Flame,
      action: () => navigate('/study'),
    },
    {
      id: 'act-flashcards',
      title: 'Review Due Flashcards',
      category: 'Actions',
      icon: Zap,
      action: () => navigate('/recall'),
    },
    {
      id: 'theme-toggle',
      title: 'Toggle Theme (Light / Dark / Obsidian)',
      category: 'Appearance',
      icon: Moon,
      action: () => {
        const current = getStoredTheme();
        const next: AppTheme = current === 'dark' ? 'black' : current === 'black' ? 'light' : 'dark';
        applyTheme(next);
        onOpenChange(false);
      },
    },
  ];

  const filtered = commands.filter(
    (cmd) =>
      cmd.title.toLowerCase().includes(query.toLowerCase()) ||
      cmd.category.toLowerCase().includes(query.toLowerCase()),
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        onOpenChange(!open);
      }
      if (!open) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        onOpenChange(false);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % Math.max(1, filtered.length));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filtered.length) % Math.max(1, filtered.length));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filtered[selectedIndex]) {
          filtered[selectedIndex].action();
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, filtered, selectedIndex, onOpenChange]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-16 sm:pt-24">
      <div
        className="fixed inset-0 bg-background/80 backdrop-blur-sm transition-opacity"
        onClick={() => onOpenChange(false)}
      />

      <div className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-border/80 bg-card shadow-2xl transition-all">
        <div className="flex items-center border-b border-border/70 px-4">
          <Search size={18} className="text-muted-foreground" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search pages, start focus block, or switch theme..."
            className="h-12 w-full bg-transparent px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <X size={16} />
          </button>
        </div>

        <div className="max-h-[380px] overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              No matching commands or pages.
            </div>
          ) : (
            filtered.map((cmd, index) => {
              const Icon = cmd.icon;
              const isSelected = index === selectedIndex;
              return (
                <button
                  key={cmd.id}
                  type="button"
                  onClick={() => cmd.action()}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors ${
                    isSelected ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-secondary'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon size={16} className={isSelected ? 'text-primary-foreground' : 'text-primary'} />
                    <span>{cmd.title}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-semibold uppercase tracking-wider ${
                        isSelected ? 'text-primary-foreground/70' : 'text-muted-foreground'
                      }`}
                    >
                      {cmd.category}
                    </span>
                    {cmd.shortcut && (
                      <kbd
                        className={`rounded px-1.5 py-0.5 font-mono text-[10px] ${
                          isSelected ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-secondary text-muted-foreground'
                        }`}
                      >
                        {cmd.shortcut}
                      </kbd>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>

        <div className="flex items-center justify-between border-t border-border/60 bg-secondary/30 px-4 py-2 font-mono text-[10px] text-muted-foreground">
          <div className="flex items-center gap-3">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>Esc Close</span>
          </div>
          <span>PrepPulse Command Palette</span>
        </div>
      </div>
    </div>
  );
}
