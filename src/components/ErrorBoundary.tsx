import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Catches React render errors and displays them instead of white screen.
 * Helps diagnose mobile-specific crashes.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            padding: 20,
            fontFamily: 'monospace',
            fontSize: 13,
            color: '#C82828',
            background: '#FEE',
            height: '100vh',
            overflow: 'auto',
          }}
        >
          <h2 style={{ fontSize: 16 }}>Erreur GéoMolo</h2>
          <p style={{ fontWeight: 'bold' }}>{this.state.error.message}</p>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: 11 }}>{this.state.error.stack}</pre>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: 16,
              padding: '8px 16px',
              background: '#185FA5',
              color: 'white',
              border: 'none',
              borderRadius: 4,
              fontSize: 14,
            }}
          >
            Recharger
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
