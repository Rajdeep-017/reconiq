import { Component, type ErrorInfo, type ReactNode } from 'react'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if ((import.meta as any).env?.DEV) {
      console.error('Unhandled UI error', error, info.componentStack)
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-[#03040B] px-6 text-center text-white">
          <div className="max-w-md">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#38BDF8]">
              ReconIQ
            </p>
            <h1 className="mt-3 font-display text-2xl font-semibold">Something went wrong.</h1>
            <p className="mt-3 text-sm leading-relaxed text-white/50">
              The page could not be rendered. Reload to try again; your saved data is not affected.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-6 rounded-full bg-gradient-to-r from-[#2563FF] to-[#168BFF] px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#2563FF]/30"
            >
              Reload page
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
