const TOKEN_KEY = 'auth_token'
const INITIAL_DELAY_MS = 1_000
const MAX_DELAY_MS = 30_000
const BACKOFF_FACTOR = 2

type EventHandler = (data: unknown) => void

export class WebSocketClient {
  private url: string
  private socket: WebSocket | null = null
  private handlers = new Map<string, Set<EventHandler>>()
  private reconnectDelay = INITIAL_DELAY_MS
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private closed = false

  constructor(url: string) {
    this.url = url
  }

  connect() {
    if (this.socket?.readyState === WebSocket.OPEN) return
    this.closed = false
    this._open()
  }

  disconnect() {
    this.closed = true
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    this.socket?.close()
    this.socket = null
  }

  on(event: string, handler: EventHandler) {
    if (!this.handlers.has(event)) this.handlers.set(event, new Set())
    this.handlers.get(event)!.add(handler)
  }

  off(event: string, handler: EventHandler) {
    this.handlers.get(event)?.delete(handler)
  }

  private _open() {
    const token = localStorage.getItem(TOKEN_KEY)
    const url = token ? `${this.url}?token=${encodeURIComponent(token)}` : this.url

    const socket = new WebSocket(url)
    this.socket = socket

    socket.onopen = () => {
      this.reconnectDelay = INITIAL_DELAY_MS
    }

    socket.onmessage = ({ data }) => {
      try {
        const { event, data: payload } = JSON.parse(data as string)
        this.handlers.get(event)?.forEach(h => h(payload))
      } catch {
        // ignore malformed messages
      }
    }

    socket.onclose = () => {
      if (!this.closed) this._scheduleReconnect()
    }

    socket.onerror = () => {
      socket.close()
    }
  }

  private _scheduleReconnect() {
    this.reconnectTimer = setTimeout(() => {
      this.reconnectDelay = Math.min(this.reconnectDelay * BACKOFF_FACTOR, MAX_DELAY_MS)
      this._open()
    }, this.reconnectDelay)
  }
}

// Singleton instance — configured from env variable
const WS_URL = (import.meta.env.VITE_WS_URL as string | undefined) ?? 'ws://localhost:5000/ws'
export const wsClient = new WebSocketClient(WS_URL)
