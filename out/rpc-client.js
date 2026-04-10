"use strict";
// ─── RPC Client ──────────────────────────────────────────────────────────────
// Extracted from tracker.ts for single-responsibility.
// Generic Connect-RPC caller for Antigravity Language Server communication.
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.rpcCall = rpcCall;
const https = __importStar(require("https"));
const http = __importStar(require("http"));
const constants_1 = require("./constants");
/**
 * Generic Connect-RPC caller.
 * - Checks HTTP status code — non-2xx responses are rejected.
 * - Supports AbortSignal for cancellation on extension deactivate.
 * - Guards against abnormally large responses (50 MB limit).
 * - Uses `settled` flag to prevent double resolve/reject from abort + error overlap.
 */
function rpcCall(ls, endpoint, body, timeoutMs = 10000, signal) {
    return new Promise((resolve, reject) => {
        // Early abort check
        if (signal?.aborted) {
            reject(new Error('RPC aborted'));
            return;
        }
        let settled = false;
        const safeResolve = (value) => {
            if (settled) {
                return;
            }
            settled = true;
            cleanupAbortListener();
            resolve(value);
        };
        const safeReject = (err) => {
            if (settled) {
                return;
            }
            settled = true;
            cleanupAbortListener();
            reject(err);
        };
        const postData = JSON.stringify(body);
        const options = {
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
        let onAbort;
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
            res.on('data', (chunk) => {
                bodySize += typeof chunk === 'string' ? Buffer.byteLength(chunk) : chunk.length;
                if (bodySize > constants_1.MAX_RESPONSE_BODY_SIZE) {
                    req.destroy();
                    safeReject(new Error(`RPC response exceeded ${constants_1.MAX_RESPONSE_BODY_SIZE} bytes`));
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
                    safeResolve(JSON.parse(data));
                }
                catch (e) {
                    safeReject(new Error(`Failed to parse RPC response: ${data.substring(0, 200)}`));
                }
            });
        });
        req.on('error', (e) => { safeReject(e); });
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
//# sourceMappingURL=rpc-client.js.map