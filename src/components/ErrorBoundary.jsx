import { Component } from 'react';

/**
 * ErrorBoundary
 * Catches unhandled render errors and shows a friendly fallback UI
 * instead of a blank screen.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // Log to console in dev; swap for an error-reporting service in prod
    if (import.meta.env.DEV) {
      console.error('[ErrorBoundary]', error, info.componentStack);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-6 text-center">
        <div className="text-5xl mb-4">🏠💥</div>
        <h1 className="text-xl font-bold text-slate-800 mb-2">Something went wrong</h1>
        <p className="text-slate-500 text-sm mb-6 max-w-sm">
          Balay Urios hit an unexpected error. Your data is safe — try reloading.
        </p>
        {import.meta.env.DEV && this.state.error && (
          <pre className="text-left bg-red-50 border border-red-200 rounded-lg p-4 text-xs text-red-700 max-w-lg w-full overflow-auto mb-6">
            {this.state.error.message}
          </pre>
        )}
        <button
          onClick={this.handleReset}
          className="px-5 py-2 bg-[#1a2e4a] text-white rounded-lg text-sm font-medium hover:bg-[#243d61] transition-colors"
        >
          Try again
        </button>
      </div>
    );
  }
}
