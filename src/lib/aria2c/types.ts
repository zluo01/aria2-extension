import { z } from 'zod';

export type Aria2ClientType = 'ws' | 'http';

/**
 * JSON-RPC request structure
 */
export interface JSONRPCRequest {
  jsonrpc: '2.0';
  id: string;
  method: string;
  params?: any[];
}

/**
 * JSON-RPC response structure
 */
export const JSONRPCResponseSchema = z.union([
  z.object({
    jsonrpc: z.literal('2.0'),
    id: z.string(),
    result: z.any(),
  }),
  z.object({
    jsonrpc: z.literal('2.0'),
    id: z.string(),
    error: z.object({
      code: z.number(),
      message: z.string(),
    }),
  }),
]);
