
import React from 'react';

type Props = { children: React.ReactNode; fallback?: React.ReactNode };
type State = { hasError: boolean; error?: any };

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, info: any) {
    // You might send this to your logging backend here
    console.error('UI crashed:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="min-h-screen grid place-items-center bg-gray-50 dark:bg-slate-950 p-6">
          <div className="max-w-md rounded-2xl border bg-white/70 dark:bg-slate-900/70 backdrop-blur p-6 text-center">
            <h1 className="text-xl font-semibold mb-2">Something went wrong</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Try reloading the page. If the problem persists, contact your administrator.</p>
            <button
              onClick={() => location.reload()}
              className="rounded-lg border px-3 py-2 hover:bg-gray-100 dark:hover:bg-slate-800"
            >
              Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
