// ─── RPC Client ──────────────────────────────────────────────────────────────
// Extracted from tracker.ts for single-responsibility.
// Generic Connect-RPC caller for Antigravity Language Server communication.

import * as https from 'https';
import * as http from 'http';
import { LSInfo } from './discovery';
import { MAX_RESPONSE_BODY_SIZE } from './constants';

/**
 * Generic Connect-RPC caller.
 * - Checks HTTP status code — non-2xx responses are rejected.
 * - Supports AbortSignal for cancellation on extension deactivate.
 * - Guards against abnormally large responses (50 MB limit).
 * - Uses `settled` flag to prevent double resolve/reject from abort + error overlap.
 */
export function rpcCall(
    ls: LSInfo,
    endpoint: string,
    body: Record<string, unknown>,
    timeoutMs: number = 10000,
    signal?: AbortSignal
): Promise<Record<string, unknown>> {
    return new Promise((resolve, reject) => {
        // Early abort check
        if (signal?.aborted) {
            reject(new Error('RPC aborted'));
            return;
        }

        let settled = false;
        const safeResolve = (value: Record<string, unknown>) => {
            if (settled) { return; }
            settled = true;
            cleanupAbortListener();
            resolve(value);
        };
        const safeReject = (err: Error) => {
            if (settled) { return; }
            settled = true;
            cleanupAbortListener();
            reject(err);
        };

        const postData = JSON.stringify(body);

        const options: https.RequestOptions = {
            hostname: '127.0.0.1',
            port: ls.port,
            path: `/exa.language_server_pb.LanguageServerService/${endpoint}`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Connect-Protocol-Version': '1',
                'x-codeium-csrf-token': ls.csrfToken,
                'Content-Length': Buffer.byteLength(postData)
            },
            timeout: timeoutMs,
            rejectUnauthorized: false
        };

        // Track abort handler for cleanup after request completes
        let onAbort: (() => void) | undefined;
        const cleanupAbortListener = () => {
            if (onAbort && signal) {
                signal.removeEventListener('abort', onAbort);
                onAbort = undefined;
            }
        };

        const transport = ls.useTls ? https : http;
        const req = transport.request(options, (res) => {
            let data = '';
            let bodySize = 0;
            res.on('data', (chunk: Buffer | string) => {
                bodySize += typeof chunk === 'string' ? Buffer.byteLength(chunk) : chunk.length;
                if (bodySize > MAX_RESPONSE_BODY_SIZE) {
                    req.destroy();
                    safeReject(new Error(`RPC response exceeded ${MAX_RESPONSE_BODY_SIZE} bytes`));
                    return;
                }
                data += chunk;
            });
            res.on('end', () => {
                if (res.statusCode && (res.statusCode < 200 || res.statusCode >= 300)) {
                    safeReject(new Error(`RPC HTTP ${res.statusCode}: ${data.substring(0, 200)}`));
                    return;
                }
                try {
                    safeResolve(JSON.parse(data) as Record<string, unknown>);
                } catch (e) {
                    safeReject(new Error(`Failed to parse RPC response: ${data.substring(0, 200)}`));
                }
            });
        });

        req.on('error', (e) => { safeReject(e as Error); });
        req.on('timeout', () => { req.destroy(); safeReject(new Error('RPC timeout')); });

        // Abort listener — destroy the request on signal abort
        if (signal) {
            onAbort = () => {
                req.destroy();
                safeReject(new Error('RPC aborted'));
            };
            signal.addEventListener('abort', onAbort, { once: true });
        }

        req.write(postData);
        req.end();
    });
}
