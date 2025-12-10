type EventListener = (...args: any[]) => void;

class EventEmitter {
  private events: Map<string, Set<EventListener>> = new Map();

  on(event: string, listener: EventListener): this {
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }
    this.events.get(event)!.add(listener);
    return this;
  }

  off(event: string, listener: EventListener): this {
    const listeners = this.events.get(event);
    if (listeners) {
      listeners.delete(listener);
    }
    return this;
  }

  emit(event: string, ...args: any[]): boolean {
    const listeners = this.events.get(event);
    if (!listeners || listeners.size === 0) {
      return false;
    }
    listeners.forEach(listener => {
      listener(...args);
    });
    return true;
  }

  once(event: string, listener: EventListener): this {
    const onceWrapper = (...args: any[]) => {
      listener(...args);
      this.off(event, onceWrapper);
    };
    return this.on(event, onceWrapper);
  }
}

/**
 * Configuration options for Aria2 client
 */
interface Aria2Options {
  host?: string;
  port?: number;
  secure?: boolean;
  secret?: string;
  path?: string;
  WebSocket?: typeof WebSocket;
  fetch?: typeof fetch;
}

/**
 * JSON-RPC request structure
 */
interface JSONRPCRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: string;
  params?: any[];
}

/**
 * JSON-RPC response structure
 */
interface JSONRPCResponse {
  jsonrpc: '2.0';
  id: string | number;
  result?: any;
  error?: {
    code: number;
    message: string;
  };
}

/**
 * JSON-RPC notification structure
 */
interface JSONRPCNotification {
  jsonrpc: '2.0';
  method: string;
  params: any[];
}

/**
 * Callback for pending RPC requests
 */
interface RPCCallback {
  resolve: (value: any) => void;
  reject: (reason: any) => void;
}

/**
 * Aria2 client for browser and Node.js
 */
export default class Aria2 extends EventEmitter {
  private readonly host: string;
  private readonly port: number;
  private readonly secure: boolean;
  private readonly secret: string;
  private readonly path: string;
  private readonly _fetch: typeof fetch;
  private readonly WebSocketClass: typeof WebSocket;
  private id: number = 0;
  private ws: WebSocket | null = null;
  private callbacks: Map<number, RPCCallback> = new Map();

  constructor(options: Aria2Options = {}) {
    super();

    this.host = options.host || 'localhost';
    this.port = options.port || 6800;
    this.secure = options.secure || false;
    this.secret = options.secret || '';
    this.path = options.path || '/jsonrpc';

    // For Node.js compatibility, allow passing WebSocket and fetch
    this.WebSocketClass =
      options.WebSocket ||
      (typeof WebSocket !== 'undefined' ? WebSocket : (null as any));
    this._fetch =
      options.fetch || (typeof fetch !== 'undefined' ? fetch : (null as any));

    if (!this.WebSocketClass) {
      throw new Error(
        'WebSocket is not available. Please provide it via options.WebSocket',
      );
    }
    if (!this._fetch) {
      throw new Error(
        'fetch is not available. Please provide it via options.fetch',
      );
    }
  }

  /**
   * Open WebSocket connection
   */
  async open(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws) {
        resolve();
        return;
      }

      const protocol = this.secure ? 'wss' : 'ws';
      const url = `${protocol}://${this.host}:${this.port}${this.path}`;

      this.ws = new this.WebSocketClass(url);

      this.ws.onopen = () => {
        this.emit('open');
        resolve();
      };

      this.ws.onerror = error => {
        reject(error);
      };

      this.ws.onclose = () => {
        this.ws = null;
        this.emit('close');
      };

      this.ws.onmessage = event => {
        this.emit('input', event.data);
        this.handleMessage(event.data);
      };
    });
  }

  /**
   * Close WebSocket connection
   */
  async close(): Promise<void> {
    return new Promise(resolve => {
      if (!this.ws) {
        resolve();
        return;
      }

      this.ws.onclose = () => {
        this.ws = null;
        this.emit('close');
        resolve();
      };

      this.ws.close();
    });
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(data: string): void {
    try {
      const message: JSONRPCResponse | JSONRPCNotification = JSON.parse(data);

      // Handle response
      if ('id' in message) {
        const callback = this.callbacks.get(message.id as number);
        if (callback) {
          this.callbacks.delete(message.id as number);
          if (message.error) {
            callback.reject(new Error(message.error.message));
          } else {
            callback.resolve(message.result);
          }
        }
      }
      // Handle notification
      else if ('method' in message) {
        const method = message.method;
        this.emit(method, message.params);
        // Also emit without "aria2." prefix
        if (method.startsWith('aria2.')) {
          this.emit(method.slice(6), message.params);
        }
      }
    } catch (error) {
      console.error('Failed to parse message:', error);
    }
  }

  /**
   * Build full method name with aria2 prefix if needed
   */
  private buildMethodName(method: string): string {
    if (method.startsWith('system.')) {
      return method;
    }
    if (!method.startsWith('aria2.')) {
      return `aria2.${method}`;
    }
    return method;
  }

  /**
   * Call an aria2 method
   */
  async call(method: string, ...params: any[]): Promise<any> {
    const methodName = this.buildMethodName(method);
    const requestParams = this.secret
      ? [`token:${this.secret}`, ...params]
      : params;

    // Use WebSocket if available
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return this.callWs(methodName, requestParams);
    }
    // Otherwise use HTTP
    return this.callHttp(methodName, requestParams);
  }

  /**
   * Make RPC call via WebSocket
   */
  private async callWs(method: string, params: any[]): Promise<any> {
    return new Promise((resolve, reject) => {
      const id = ++this.id;
      const request: JSONRPCRequest = {
        jsonrpc: '2.0',
        id,
        method,
        params,
      };

      this.callbacks.set(id, { resolve, reject });
      const message = JSON.stringify(request);
      this.emit('output', message);
      this.ws!.send(message);
    });
  }

  /**
   * Make RPC call via HTTP
   */
  private async callHttp(method: string, params: any[]): Promise<any> {
    const id = ++this.id;
    const request: JSONRPCRequest = {
      jsonrpc: '2.0',
      id,
      method,
      params,
    };

    const protocol = this.secure ? 'https' : 'http';
    const url = `${protocol}://${this.host}:${this.port}${this.path}`;

    const message = JSON.stringify(request);
    this.emit('output', message);

    const response = await this._fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: message,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: JSONRPCResponse = await response.json();
    this.emit('input', JSON.stringify(data));

    if (data.error) {
      throw new Error(data.error.message);
    }

    return data.result;
  }

  /**
   * Execute multiple calls in a single request
   */
  async multiCall(calls: (string | number | string[])[][]): Promise<any[]> {
    const multiCallParams = calls.map(call => {
      const [method, ...params] = call;
      return {
        methodName: this.buildMethodName(method as string),
        params: this.secret ? [`token:${this.secret}`, ...params] : params,
      };
    });

    const results = await this.call('system.multicall', multiCallParams);

    // Check for errors in results
    return results.map((result: any[], index: number) => {
      if (result.length === 0) {
        throw new Error(`Call ${index} failed: empty result`);
      }
      if (
        result[0] &&
        typeof result[0] === 'object' &&
        'faultString' in result[0]
      ) {
        throw new Error(result[0].faultString);
      }
      return result[0];
    });
  }

  /**
   * Execute batch calls (returns array of promises)
   */
  async batch(
    calls: (string | number | string[])[][],
  ): Promise<Promise<any>[]> {
    return calls.map(call => {
      const [method, ...params] = call;
      return this.call(method as string, ...params);
    });
  }

  /**
   * List available notifications
   */
  async listNotifications(): Promise<string[]> {
    const notifications = await this.call('system.listNotifications');
    return notifications.map((notification: string) =>
      notification.startsWith('aria2.') ? notification.slice(6) : notification,
    );
  }

  /**
   * List available methods
   */
  async listMethods(): Promise<string[]> {
    const methods = await this.call('system.listMethods');
    return methods.map((method: string) =>
      method.startsWith('aria2.') ? method.slice(6) : method,
    );
  }
}
