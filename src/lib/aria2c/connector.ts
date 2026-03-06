import {
  Aria2ClientType,
  JSONRPCRequest,
  JSONRPCResponseSchema,
} from '@/lib/aria2c/types';

export function createConnector(
  protocol: Aria2ClientType,
  host: string,
  port: number,
  secure: boolean,
  path: string,
) {
  return protocol === 'ws'
    ? new Aria2WebSocketConnector(host, port, secure, path)
    : new Aria2HttpConnector(host, port, secure, path);
}

export interface Aria2Connector {
  request(method: string, params: any[]): Promise<any>;
  close(): void;
  isAlive(): boolean;
}

class Aria2WebSocketConnector implements Aria2Connector {
  private ws: WebSocket | null;
  private callbacks: Map<string, PromiseWithResolvers<any>>;
  private keepAliveIntervalId: ReturnType<typeof setInterval> | null = null;

  constructor(host: string, port: number, secure: boolean, path: string) {
    const protocol = secure ? 'wss' : 'ws';
    const url = `${protocol}://${host}:${port}${path}`;

    this.callbacks = new Map();
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      console.warn('Aria2 Websocket Connected');
      this.keepAlive();
    };

    this.ws.onerror = error => {
      console.error('Aria2 Websocket Error', JSON.stringify(error));
    };

    this.ws.onclose = () => {
      console.warn('Aria2 Websocket Closed');
      this.ws = null;
      this.rejectAllCallbacks();
    };

    this.ws.onmessage = event => {
      this.handleMessage(event.data);
    };
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(data: string): void {
    try {
      const rpcResponse = JSONRPCResponseSchema.safeParse(JSON.parse(data));
      if (!rpcResponse.success) {
        console.error(
          'Failed to validate JSON-RPC response:',
          rpcResponse.error,
          data,
        );
        return;
      }

      // Server-pushed notification (aria2.onDownloadComplete etc.) — no id.
      if ('method' in rpcResponse.data) {
        return;
      }

      const { id } = rpcResponse.data;
      // id is null when aria2 could not parse our request (JSON-RPC spec §5).
      if (id === null) {
        console.error('Received JSON-RPC error with null id:', data);
        return;
      }

      const callback = this.callbacks.get(id);
      if (!callback) {
        console.error('No callback found for JSON-RPC response id:', id, data);
        return;
      }
      this.callbacks.delete(id);
      if ('result' in rpcResponse.data) {
        callback.resolve(rpcResponse.data.result);
      } else {
        callback.reject(new Error(rpcResponse.data.error.message));
      }
    } catch (error) {
      console.error('Failed to parse message:', error);
    }
  }

  /**
   * Sends a lightweight JSON-RPC request every 20 s to keep the Chrome service worker alive.
   * https://developer.chrome.com/docs/extensions/how-to/web-platform/websockets#websocket-keepalive
   */
  private keepAlive() {
    this.keepAliveIntervalId = setInterval(() => {
      if (this.ws && this.isAlive()) {
        this.request('aria2.getVersion', []).catch(console.error);
      } else {
        this.clearKeepAlive();
      }
    }, 20 * 1000);
  }

  private clearKeepAlive() {
    if (this.keepAliveIntervalId !== null) {
      clearInterval(this.keepAliveIntervalId);
      this.keepAliveIntervalId = null;
    }
  }

  private rejectAllCallbacks() {
    const error = new Error('Aria2 Websocket closed');
    for (const [, callback] of this.callbacks) {
      callback.reject(error);
    }
    this.callbacks.clear();
  }

  close() {
    this.clearKeepAlive();
    this.rejectAllCallbacks();
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.close();
      this.ws = null;
    }
  }

  request(method: string, params: any[]): Promise<any> {
    if (!this.isAlive()) {
      return Promise.reject(new Error('Aria2 Websocket is not connected'));
    }
    const id: string = crypto.randomUUID();
    const request: JSONRPCRequest = { jsonrpc: '2.0', id, method, params };
    const resolvers = Promise.withResolvers<any>();
    this.callbacks.set(id, resolvers);
    this.ws?.send(JSON.stringify(request));
    return resolvers.promise;
  }

  isAlive(): boolean {
    return this.ws != null && this.ws.readyState === WebSocket.OPEN;
  }
}

class Aria2HttpConnector implements Aria2Connector {
  private readonly url: string;

  constructor(host: string, port: number, secure: boolean, path: string) {
    const protocol = secure ? 'https' : 'http';
    this.url = `${protocol}://${host}:${port}${path}`;
  }

  close() {
    // no-op: HTTP connector is stateless
  }

  isAlive(): boolean {
    return true;
  }

  async request(method: string, params: any[]): Promise<any> {
    const id: string = crypto.randomUUID();
    const request: JSONRPCRequest = {
      jsonrpc: '2.0',
      id,
      method,
      params,
    };

    const response = await fetch(this.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const resp = await response.json();
    const rpcResponse = JSONRPCResponseSchema.safeParse(resp);
    if (!rpcResponse.success) {
      throw new Error(
        `Fail to validate response: ${rpcResponse.error.message} for data ${JSON.stringify(resp)}`,
      );
    }

    if ('method' in rpcResponse.data) {
      throw new Error('Unexpected notification received over HTTP');
    }

    if ('error' in rpcResponse.data) {
      throw new Error(rpcResponse.data.error.message);
    }

    return rpcResponse.data.result;
  }
}
