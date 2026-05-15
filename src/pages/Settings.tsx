import { ACCENT_OPTIONS, useThemeStore, type AccentColor, type ThemePreference } from '../stores/themeStore';

export default function Settings() {
  const { preference, setPreference, accent, setAccent } = useThemeStore();

  return (
    <div className="px-6 py-8 max-w-2xl">
      <h1 className="text-3xl font-light tracking-tight mb-8">Settings</h1>

      <Section title="Appearance" description="Match your system, or force a specific theme.">
        <Segment<ThemePreference>
          value={preference}
          onChange={setPreference}
          options={[
            { value: 'system', label: 'Auto', icon: '◐' },
            { value: 'light',  label: 'Light', icon: '☀' },
            { value: 'dark',   label: 'Dark',  icon: '☾' },
          ]}
        />
      </Section>

      <Section
        title="Highlight color"
        description="Used for active states, buttons, and selection highlights throughout the app."
      >
        <div className="flex flex-wrap gap-3">
          {ACCENT_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              onClick={() => setAccent(opt.id)}
              className={`group relative h-10 w-10 rounded-full transition-transform ${
                accent === opt.id ? 'scale-110' : 'hover:scale-105'
              }`}
              aria-label={opt.label}
              title={opt.label}
              style={{ backgroundColor: opt.hex }}
            >
              {accent === opt.id && (
                <span className="absolute inset-[-4px] rounded-full ring-2 ring-zinc-900 dark:ring-zinc-100" />
              )}
            </button>
          ))}
        </div>
        <PreviewSwatch />
      </Section>

      <Section
        title="About"
        description={null}
      >
        <dl className="text-sm space-y-2">
          <Row label="Web client" value="TypeStack 0.1.0" />
          <Row label="API base" value="/api" />
          <Row label="Documentation" value={<a href="/api/docs" target="_blank" rel="noreferrer" className="text-accent hover:text-accent-strong underline">/api/docs</a>} />
        </dl>
      </Section>
    </div>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string | null;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-10">
      <h2 className="text-lg font-medium mb-1">{title}</h2>
      {description && (
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">{description}</p>
      )}
      {children}
    </section>
  );
}

function Segment<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; icon?: string }[];
}) {
  return (
    <div className="inline-flex p-0.5 rounded-xl bg-zinc-100 dark:bg-zinc-800/70">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`px-4 py-1.5 text-sm rounded-lg transition-colors ${
            value === o.value
              ? 'bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100 shadow-sm'
              : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
          }`}
        >
          {o.icon && <span className="mr-1.5" aria-hidden>{o.icon}</span>}
          {o.label}
        </button>
      ))}
    </div>
  );
}

function PreviewSwatch() {
  return (
    <div className="mt-5 inline-flex flex-wrap items-center gap-3 px-4 py-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800">
      <button className="px-3 py-1.5 rounded-md bg-accent text-accent-fg hover:bg-accent-strong text-sm">
        Primary
      </button>
      <span className="text-accent text-sm">Accent text</span>
      <span className="inline-block h-4 w-16 rounded-full bg-accent" />
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-zinc-500">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
