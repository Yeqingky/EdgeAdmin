import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Page render error', error, info)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="ui negative message">
          <div>页面渲染失败：{this.state.error.message}</div>
          <button className="ui button small" style={{ marginTop: '0.8em' }} onClick={() => this.setState({ error: null })}>
            重试
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
