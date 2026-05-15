import { useThemeStore, type ThemePreference } from '../stores/themeStore';

const order: ThemePreference[] = ['system', 'light', 'dark'];
const labels: Record<ThemePreference, string> = {
  system: 'Auto',
  light: 'Light',
  dark: 'Dark',
};
const icons: Record<ThemePreference, string> = {
  system: '◐',
  light: '☀',
  dark: '☾',
};

export default function ThemeToggle() {
  const { preference, setPreference } = useThemeStore();
  const cycle = (): void => {
    const idx = order.indexOf(preference);
    setPreference(order[(idx + 1) % order.length]);
  };
  return (
    <button
      onClick={cycle}
      title={`Theme: ${labels[preference]} (click to change)`}
      className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
    >
      <span aria-hidden>{icons[preference]}</span>
      <span>{labels[preference]}</span>
    </button>
  );
}
