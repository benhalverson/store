import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = {
  children: ReactNode;
};

type State = {
  error: Error | null;
};

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Unhandled React error:", error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ error: null });
  };

  render() {
    if (!this.state.error) {
      return this.props.children;
    }

    return (
      <main className="min-h-screen bg-white px-6 py-16">
        <div
          role="alert"
          className="mx-auto flex max-w-xl flex-col items-start gap-4">
          <p className="text-sm font-medium uppercase tracking-wide text-red-600">
            Something went wrong
          </p>
          <h1 className="text-2xl font-semibold text-gray-900">
            We couldn&apos;t load this page.
          </h1>
          <p className="text-gray-600">
            Please try again. If it keeps happening, head back home and reload
            the product.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={this.handleRetry}
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
              Try again
            </button>
            <a
              href="/"
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
              Go home
            </a>
          </div>
        </div>
      </main>
    );
  }
}
