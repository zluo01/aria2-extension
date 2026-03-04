import {
  Aria2Options,
  JSONRPCNotification,
  JSONRPCRequest,
  JSONRPCResponse,
  RPCCallback,
} from '@/lib/aria2c/types';

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
 * Aria2 client for browser and Node.js
 */
export class Aria2 extends EventEmitter {
  private readonly host: string;
  private readonly port: number;
  private readonly secure: boolean;
  private readonly secret: string;
  private readonly path: string;
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
  }

  /**
   * Open WebSocket connection
   */
  async open(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      const protocol = this.secure ? 'wss' : 'ws';
      const url = `${protocol}://${this.host}:${this.port}${this.path}`;

      this.ws = new WebSocket(url);

      const timeout = setTimeout(() => {
        this.ws?.close();
        this.ws = null;
        reject(new Error('WebSocket connection timed out'));
      }, 10_000);

      this.ws.onopen = () => {
        clearTimeout(timeout);
        this.emit('open');
        resolve();
      };

      this.ws.onerror = error => {
        clearTimeout(timeout);
        reject(error);
      };

      this.ws.onclose = () => {
        this.ws = null;
        this.emit('close');
        this.rejectPendingCallbacks(new Error('WebSocket closed unexpectedly'));
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
    if (!this.ws) {
      return;
    }
    return new Promise(resolve => {
      this.once('close', resolve);
      this.ws!.close();
    });
  }

  private rejectPendingCallbacks(reason: Error): void {
    for (const cb of this.callbacks.values()) {
      cb.reject(reason);
    }
    this.callbacks.clear();
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

    const response = await fetch(url, {
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
