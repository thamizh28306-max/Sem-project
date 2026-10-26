import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[DataZen ErrorBoundary caught]:', error, errorInfo);
  }

  private handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            padding: '40px 20px',
            maxWidth: 520,
            margin: '60px auto',
            textAlign: 'center',
            background: 'white',
            borderRadius: 16,
            boxShadow: 'var(--shadow)',
            border: '1px solid var(--border)',
          }}
          role="alert"
        >
          <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>⚠️</div>
          <h2
            style={{
              fontFamily: 'var(--font-head)',
              fontSize: '1.25rem',
              color: 'var(--slate)',
              marginBottom: 8,
            }}
          >
            {this.props.fallbackTitle || 'Something went wrong in this view'}
          </h2>
          <p
            style={{
              fontSize: '0.85rem',
              color: 'var(--muted)',
              marginBottom: 20,
              lineHeight: 1.6,
            }}
          >
            {this.state.error?.message || 'An unexpected rendering error occurred.'}
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button
              type="button"
              className="btn-primary"
              onClick={this.handleReset}
              style={{ padding: '8px 18px', fontSize: '0.85rem' }}
            >
              Try Again
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={this.handleReload}
              style={{ padding: '8px 18px', fontSize: '0.85rem' }}
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
