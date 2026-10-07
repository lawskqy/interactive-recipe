import { Component, type ReactNode } from "react";

export default class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (this.state.failed) return <main id="main" className="empty-state">
      <h1>This page could not be displayed.</h1>
      <p>Your saved preparation is kept in this browser.</p>
      <a href="/collection">Return to the collection</a>
    </main>;
    return this.props.children;
  }
}
