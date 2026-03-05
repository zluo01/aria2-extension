/**
 * Configuration options for Aria2 client
 */
export interface Aria2Options {
  host?: string;
  port?: number;
  secure?: boolean;
  secret?: string;
  path?: string;
}

/**
 * JSON-RPC request structure
 */
export interface JSONRPCRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: string;
  params?: any[];
}

/**
 * JSON-RPC response structure
 */
export interface JSONRPCResponse {
  jsonrpc: '2.0';
  id: string | number;
  result?: any;
  error?: {
    code: number;
    message: string;
  };
}
