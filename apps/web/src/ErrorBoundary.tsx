import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div
          className="card"
          style={{ maxWidth: 500, margin: "2rem auto", textAlign: "center" }}
        >
          <h2 style={{ margin: "0 0 0.5rem" }}>出了点问题</h2>
          <p className="muted">{this.state.error.message}</p>
          <button
            className="btn btn-primary"
            onClick={() => {
              this.setState({ error: null });
              window.location.href = "/";
            }}
          >
            返回首页
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
