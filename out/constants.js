"use strict";
// ─── Step Type Constants ──────────────────────────────────────────────────────
// Extracted from magic strings used across tracker.ts and extension.ts.
Object.defineProperty(exports, "__esModule", { value: true });
exports.COMPRESSION_PERSIST_POLLS = exports.MAX_DISCOVERY_BACKOFF_MS = exports.MAX_BACKOFF_INTERVAL_MS = exports.STEP_BATCH_SIZE = exports.MAX_CONCURRENT_BATCHES = exports.MAX_RESPONSE_BODY_SIZE = exports.COMPRESSION_MIN_DROP = exports.PLANNER_RESPONSE_ESTIMATE = exports.USER_INPUT_OVERHEAD = exports.SYSTEM_PROMPT_OVERHEAD = exports.IMAGE_GEN_MODEL_KEYWORDS = exports.IMAGE_GEN_STEP_KEYWORDS = exports.CascadeStatus = exports.StepType = void 0;
exports.StepType = {
    USER_INPUT: 'CORTEX_STEP_TYPE_USER_INPUT',
    PLANNER_RESPONSE: 'CORTEX_STEP_TYPE_PLANNER_RESPONSE',
    CHECKPOINT: 'CORTEX_STEP_TYPE_CHECKPOINT',
};
// ─── Cascade Status Constants ─────────────────────────────────────────────────
exports.CascadeStatus = {
    RUNNING: 'CASCADE_RUN_STATUS_RUNNING',
};
// ─── Image Generation Detection ───────────────────────────────────────────────
// Keywords used to detect image generation steps (by step type or model name).
exports.IMAGE_GEN_STEP_KEYWORDS = ['IMAGE', 'GENERATE'];
exports.IMAGE_GEN_MODEL_KEYWORDS = ['nano', 'banana', 'image'];
// ─── Token Estimation Constants ──────────────────────────────────────────────
// Rough estimates used as FALLBACK when no text content or checkpoint data
// is available. v1.4.0: Primary estimation now uses actual step text content.
/** Estimated tokens for system prompt + context injected per execution turn.
 *  Measured at ~10,000 tokens via real Antigravity LS sessions. */
exports.SYSTEM_PROMPT_OVERHEAD = 10_000;
/** Fallback estimated tokens per user input message (used when text content unavailable) */
exports.USER_INPUT_OVERHEAD = 500;
/** Fallback estimated tokens per planner response (used when text content unavailable) */
exports.PLANNER_RESPONSE_ESTIMATE = 800;
// ─── Compression Detection ───────────────────────────────────────────────────
/** Minimum inputTokens drop between consecutive checkpoints to flag as compression.
 *  5000 tokens avoids noise from small fluctuations. */
exports.COMPRESSION_MIN_DROP = 5000;
// ─── RPC Limits ──────────────────────────────────────────────────────────────
/** Maximum response body size (50 MB) to prevent OOM from abnormal responses. */
exports.MAX_RESPONSE_BODY_SIZE = 50 * 1024 * 1024;
/** Maximum number of concurrent RPC batch calls for step fetching. */
exports.MAX_CONCURRENT_BATCHES = 5;
/** Number of steps to fetch per RPC call. */
exports.STEP_BATCH_SIZE = 50;
// ─── Polling Backoff ─────────────────────────────────────────────────────────
/** Maximum backoff interval for RPC communication failures: 60 seconds. */
exports.MAX_BACKOFF_INTERVAL_MS = 60_000;
/** Maximum backoff interval for LS discovery failures: 15 seconds.
 *  Lower than RPC backoff so the extension detects a newly started LS quickly. */
exports.MAX_DISCOVERY_BACKOFF_MS = 15_000;
/** Number of poll cycles to persist the compression indicator. */
exports.COMPRESSION_PERSIST_POLLS = 3;
//# sourceMappingURL=constants.js.map