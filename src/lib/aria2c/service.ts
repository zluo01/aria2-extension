import {
  Aria2Options,
  JSONRPCRequest,
  JSONRPCResponse,
} from '@/lib/aria2c/types';

/**
 * Aria2 client for browser and Node.js
 */
export class Aria2 {
  private readonly host: string;
  private readonly port: number;
  private readonly secure: boolean;
  private readonly secret: string;
  private readonly path: string;
  private id: number = 0;
  private ws: WebSocket | null = null;
  private openingPromise: Promise<void> | null = null;
  private callbacks: Map<number, PromiseWithResolvers<any>> = new Map();

  constructor(options: Aria2Options = {}) {
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
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    if (this.openingPromise) {
      return this.openingPromise;
    }

    this.openingPromise = new Promise<void>((resolve, reject) => {
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
        resolve();
      };

      this.ws.onerror = error => {
        clearTimeout(timeout);
        reject(error);
      };

      this.ws.onclose = () => {
        this.ws = null;
        this.rejectPendingCallbacks(new Error('WebSocket closed unexpectedly'));
      };

      this.ws.onmessage = event => {
        this.handleMessage(event.data);
      };
    }).finally(() => {
      this.openingPromise = null;
    });

    return this.openingPromise;
  }

  /**
   * Close WebSocket connection
   */
  close(): void {
    this.ws?.close();
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
      const message: JSONRPCResponse = JSON.parse(data);
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
  private callWs(method: string, params: any[]): Promise<any> {
    const id = ++this.id;
    const request: JSONRPCRequest = { jsonrpc: '2.0', id, method, params };
    const resolvers = Promise.withResolvers<any>();
    this.callbacks.set(id, resolvers);
    this.ws!.send(JSON.stringify(request));
    return resolvers.promise;
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

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: JSONRPCResponse = await response.json();

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
