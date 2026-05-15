import { Component, ReactNode } from 'react';

interface State {
  error: Error | null;
}

/**
 * Class-based error boundary — wraps the app so a thrown component surfaces a
 * friendly recoverable screen instead of a blank white viewport. Keeps the
 * tray icon visible in Electron and the auth state intact; the user can reload
 * without losing their session.
 */
export default class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string }): void {
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary]', error, info);
  }

  reset = (): void => this.setState({ error: null });

  render(): ReactNode {
    if (!this.state.error) return this.props.children;
    const message = this.state.error.message || 'Something went wrong.';
    return (
      <div
        role="alert"
        className="min-h-screen flex items-center justify-center bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 px-6"
      >
        <div className="max-w-md text-center">
          <div className="text-5xl text-zinc-300 dark:text-zinc-700 mb-3" aria-hidden="true">!</div>
          <h1 className="text-2xl font-light tracking-tight">Something broke</h1>
          <p className="text-sm text-zinc-500 mt-2">{message}</p>
          <div className="mt-6 flex gap-2 justify-center">
            <button
              onClick={() => {
                this.reset();
                window.location.reload();
              }}
              className="bg-zinc-900 text-white hover:bg-black dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white px-4 py-1.5 rounded-md text-sm"
            >
              Reload
            </button>
            <button
              onClick={this.reset}
              className="bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 px-4 py-1.5 rounded-md text-sm"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }
}
