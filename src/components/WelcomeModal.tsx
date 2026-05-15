import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { markOnboarded } from '../api/auth';
import { useAuthStore } from '../stores/authStore';
import keyIcon from '../assets/key-icon.png';

interface Step {
  title: string;
  body: React.ReactNode;
}

function buildSteps(role: 'admin' | 'user'): Step[] {
  const common: Step[] = [
    {
      title: 'Welcome to TypeStack',
      body: (
        <>
          <p>
            TypeStack is the self-hosted font manager for your team. It can browse, preview, and
            activate fonts from several sources — and it stays out of the way when you don’t need it.
          </p>
          <p className="mt-3 text-zinc-500 text-sm">
            Three minutes to set expectations, then you’re done.
          </p>
        </>
      ),
    },
    {
      title: 'Libraries',
      body: (
        <>
          <p>
            <strong>Libraries</strong> (left rail) are how fonts are organized. Each one is a curated
            list someone created. Click a library to see its fonts, or click the disclosure arrow to
            list family names inline.
          </p>
          {role === 'user' ? (
            <p className="mt-3 text-zinc-500 text-sm">
              You only see libraries you’ve been granted access to. If you need access to a different
              one, ask your admin.
            </p>
          ) : (
            <p className="mt-3 text-zinc-500 text-sm">
              As an admin you can see every library. Use{' '}
              <strong>Admin → Users → Library access</strong> to grant a user membership in any
              library.
            </p>
          )}
        </>
      ),
    },
    {
      title: 'System fonts',
      body: (
        <>
          <p>
            Under <strong>System Fonts</strong> in the sidebar, you’ll find:
          </p>
          <ul className="mt-2 space-y-1 text-sm list-disc list-inside text-zinc-600 dark:text-zinc-400">
            <li>
              <strong>Mac OS</strong> — the OS-locked typefaces that ship with macOS. Always on,
              can’t be activated or deactivated.
            </li>
            <li>
              <strong>Font Book</strong> — fonts you installed personally via Font Book. macOS
              auto-activates these, so TypeStack just shows them for reference.
            </li>
          </ul>
        </>
      ),
    },
    {
      title: 'Auto-activation',
      body: (
        <>
          <p>
            On any library’s detail page, add a rule like{' '}
            <em>“auto-activate when Adobe InDesign is frontmost.”</em> TypeStack will quietly turn
            those fonts on while that app is in front, and turn them off when you switch away. Your
            manual activations are never touched.
          </p>
          <p className="mt-3 text-zinc-500 text-sm">
            You’ll see a small chip in the toolbar — “Auto · &lt;App&gt;” — whenever this is in
            effect.
          </p>
        </>
      ),
    },
    {
      title: 'Resync',
      body: (
        <>
          <p>
            The <strong>Resync</strong> button in the top right re-pulls activation state and
            rescans your Mac for new fonts. Use it after installing fonts in Font Book or signing
            into a new Adobe Fonts session.
          </p>
        </>
      ),
    },
  ];
  return common;
}

export default function WelcomeModal() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const [step, setStep] = useState(0);

  const finishMut = useMutation({
    mutationFn: markOnboarded,
    onSuccess: (updated) => setUser(updated),
  });

  if (!user) return null;
  if (user.onboardedAt) return null;

  const steps = buildSteps(user.role);
  const isLast = step === steps.length - 1;
  const current = steps[step];

  return (
    <div className="fixed inset-0 z-50 bg-zinc-900/60 backdrop-blur-sm flex items-center justify-center p-6">
      <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl w-full max-w-lg">
        <div className="p-6 flex items-start gap-4">
          <img src={keyIcon} alt="" aria-hidden="true" className="h-12 w-12 shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="text-xs uppercase tracking-wider text-zinc-500 mb-1">
              Step {step + 1} of {steps.length}
            </div>
            <h2 className="text-xl font-light tracking-tight">{current.title}</h2>
            <div className="mt-3 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300 space-y-2">
              {current.body}
            </div>
          </div>
        </div>

        <div className="px-6 pb-5 flex items-center gap-2">
          <div className="flex-1 flex items-center gap-1">
            {steps.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === step
                    ? 'w-6 bg-accent'
                    : i < step
                      ? 'w-1.5 bg-accent/60'
                      : 'w-1.5 bg-zinc-300 dark:bg-zinc-700'
                }`}
              />
            ))}
          </div>
          <button
            onClick={() => finishMut.mutate()}
            disabled={finishMut.isPending}
            className="text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 px-2"
          >
            Skip
          </button>
          {step > 0 && (
            <button
              onClick={() => setStep((s) => s - 1)}
              className="text-sm bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 px-3 py-1.5 rounded-md"
            >
              Back
            </button>
          )}
          {isLast ? (
            <button
              onClick={() => finishMut.mutate()}
              disabled={finishMut.isPending}
              className="text-sm bg-zinc-900 text-white hover:bg-black dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white px-4 py-1.5 rounded-md disabled:opacity-50"
            >
              {finishMut.isPending ? 'Finishing…' : 'Get started'}
            </button>
          ) : (
            <button
              onClick={() => setStep((s) => s + 1)}
              className="text-sm bg-zinc-900 text-white hover:bg-black dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white px-4 py-1.5 rounded-md"
            >
              Next
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
