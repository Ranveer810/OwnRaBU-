import React from "react";

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error?: Error }>{
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: any) {
    // error reporting service ya logging yahan add kar sakte ho
    console.error(error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ color: '#f00', padding: 40, textAlign: 'center' }}>
          <h1>Something went wrong.</h1>
          <pre>{this.state.error?.message}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}
