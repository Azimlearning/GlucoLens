import { Component, ErrorInfo, ReactNode } from "react"
import { Card } from "@/components/shared/Card"
import { Button } from "@/components/shared/Button"

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  message: string
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, message: "" }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <Card className="text-center">
          <p className="text-2xl mb-3">Something went wrong</p>
          <p className="text-sm text-slate-500 mb-4">
            An unexpected error occurred. Please try again.
          </p>
          <Button
            variant="secondary"
            onClick={() => this.setState({ hasError: false, message: "" })}
          >
            Reset
          </Button>
        </Card>
      )
    }
    return this.props.children
  }
}
