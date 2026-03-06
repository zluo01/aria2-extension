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
 * JSON-RPC message structure — covers three variants:
 *   - Success response:  { id: string, result }
 *   - Error response:    { id: string | null, error }  (id is null when the
 *                        server could not parse the request, per spec §5)
 *   - Notification:      { method, params }            (server-pushed event,
 *                        no id — e.g. aria2.onDownloadComplete)
 */
export const JSONRPCResponseSchema = z.union([
  z.object({
    jsonrpc: z.literal('2.0'),
    id: z.string(),
    result: z.any(),
  }),
  z.object({
    jsonrpc: z.literal('2.0'),
    id: z.string().nullable(),
    error: z.object({
      code: z.number(),
      message: z.string(),
    }),
  }),
  z.object({
    jsonrpc: z.literal('2.0'),
    method: z.string(),
    params: z.array(z.any()),
  }),
]);
