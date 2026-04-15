"use strict";
// ─── Model Context Limits & Display Names ────────────────────────────────────
// Extracted from tracker.ts for single-responsibility.
//
// Real model IDs discovered from Antigravity LS via GetUserStatus API.
// Updated: 2026-03-16
//
// The "MODEL_PLACEHOLDER_Mxx" naming is Antigravity's convention for aliased
// models. Mapping:
//   M37 = Gemini 3.1 Pro (High quality variant)
//   M36 = Gemini 3.1 Pro (Low quality variant)
//   M47 = Gemini 3 Flash (renamed from M18 as of 2026-03-15)
//   M18 = Gemini 3 Flash [Legacy, kept for backward compat]
//   M35 = Claude Sonnet 4.6 (Thinking mode) — 1M context (GA since 2026-03-13)
//   M26 = Claude Opus 4.6 (Thinking mode)  — 1M context (GA since 2026-03-13)
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_CONTEXT_LIMIT = exports.DEFAULT_CONTEXT_LIMITS = void 0;
exports.getContextLimit = getContextLimit;
exports.getModelDisplayName = getModelDisplayName;
exports.resolveModelId = resolveModelId;
exports.normalizeModelDisplayName = normalizeModelDisplayName;
exports.getQuotaPoolKey = getQuotaPoolKey;
exports.updateModelDisplayNames = updateModelDisplayNames;
const i18n_1 = require("./i18n");
// ─── Default Context Limits ──────────────────────────────────────────────────
exports.DEFAULT_CONTEXT_LIMITS = {
    'MODEL_PLACEHOLDER_M37': 1_000_000, // Gemini 3.1 Pro (High)
    'MODEL_PLACEHOLDER_M36': 1_000_000, // Gemini 3.1 Pro (Low)
    'MODEL_PLACEHOLDER_M47': 1_000_000, // Gemini 3 Flash (renamed from M18 as of 2026-03-15)
    'MODEL_PLACEHOLDER_M18': 1_000_000, // [Legacy] Gemini 3 Flash (old ID, kept for backward compat)
    'MODEL_PLACEHOLDER_M35': 1_000_000, // Claude Sonnet 4.6 (Thinking) — updated from 200K
    'MODEL_PLACEHOLDER_M26': 1_000_000, // Claude Opus 4.6 (Thinking)  — updated from 200K
    'MODEL_OPENAI_GPT_OSS_120B_MEDIUM': 128_000, // GPT-OSS 120B (Medium)
};
exports.DEFAULT_CONTEXT_LIMIT = 1_000_000;
// ─── Model Display Names ─────────────────────────────────────────────────────
// `let` — this map is mutated at runtime by `updateModelDisplayNames()`
let modelDisplayNames = {
    'MODEL_PLACEHOLDER_M37': { en: 'Gemini 3.1 Pro (High)', zh: 'Gemini 3.1 Pro (强)' },
    'MODEL_PLACEHOLDER_M36': { en: 'Gemini 3.1 Pro (Low)', zh: 'Gemini 3.1 Pro (弱)' },
    'MODEL_PLACEHOLDER_M47': { en: 'Gemini 3 Flash', zh: 'Gemini 3 Flash' },
    'MODEL_PLACEHOLDER_M18': { en: 'Gemini 3 Flash', zh: 'Gemini 3 Flash' }, // [Legacy] old ID
    'MODEL_PLACEHOLDER_M35': { en: 'Claude Sonnet 4.6 (Thinking)', zh: 'Claude Sonnet 4.6 (思考)' },
    'MODEL_PLACEHOLDER_M26': { en: 'Claude Opus 4.6 (Thinking)', zh: 'Claude Opus 4.6 (思考)' },
    'MODEL_OPENAI_GPT_OSS_120B_MEDIUM': { en: 'GPT-OSS 120B (Medium)', zh: 'GPT-OSS 120B (中)' },
};
const KNOWN_QUOTA_POOLS = {
    'MODEL_PLACEHOLDER_M37': 'gemini-pro',
    'MODEL_PLACEHOLDER_M36': 'gemini-pro',
    'MODEL_PLACEHOLDER_M47': 'gemini-flash',
    'MODEL_PLACEHOLDER_M18': 'gemini-flash',
    'MODEL_PLACEHOLDER_M35': 'claude-premium',
    'MODEL_PLACEHOLDER_M26': 'claude-premium',
    'MODEL_OPENAI_GPT_OSS_120B_MEDIUM': 'claude-premium',
};
function getDisplayCandidates(modelId, entry) {
    const candidates = [modelId, entry.en, entry.zh];
    if (entry.en !== entry.zh) {
        candidates.push(`${entry.en} / ${entry.zh}`);
    }
    return [...new Set(candidates.map(value => value.trim()).filter(Boolean))];
}
// ─── Public API ──────────────────────────────────────────────────────────────
/**
 * Get the context limit for a model.
 */
function getContextLimit(model, customLimits) {
    if (customLimits?.[model] !== undefined) {
        // Clamp to minimum 1 to prevent negative or zero limits
        return Math.max(1, customLimits[model]);
    }
    return exports.DEFAULT_CONTEXT_LIMITS[model] || exports.DEFAULT_CONTEXT_LIMIT;
}
/**
 * Get display name for a model (i18n-aware).
 */
function getModelDisplayName(model) {
    const entry = modelDisplayNames[model];
    if (entry) {
        return (0, i18n_1.tBi)(entry.en, entry.zh);
    }
    return model || (0, i18n_1.tBi)('Unknown Model', '未知模型');
}
/**
 * Resolve either a model ID or any known localized display label back to model ID.
 */
function resolveModelId(modelOrDisplay) {
    const clean = modelOrDisplay.trim();
    if (!clean) {
        return undefined;
    }
    if (modelDisplayNames[clean]) {
        return clean;
    }
    for (const [modelId, entry] of Object.entries(modelDisplayNames)) {
        if (getDisplayCandidates(modelId, entry).includes(clean)) {
            return modelId;
        }
    }
    return undefined;
}
/**
 * Normalize a model ID or historical display label to the current-language display name.
 * Unknown values are returned unchanged.
 */
function normalizeModelDisplayName(modelOrDisplay) {
    const clean = modelOrDisplay.trim();
    if (!clean) {
        return '';
    }
    const modelId = resolveModelId(clean);
    return modelId ? getModelDisplayName(modelId) : clean;
}
/**
 * Return a stable quota-pool key for models known to share quota.
 * Falls back to resetTime/modelId for unknown future models.
 */
function getQuotaPoolKey(modelId, resetTime) {
    const fixedPool = KNOWN_QUOTA_POOLS[modelId];
    if (fixedPool) {
        return fixedPool;
    }
    return resetTime || modelId;
}
/**
 * Update model display names with dynamically fetched model configs.
 * Only appends new entries — hardcoded values are preserved as fallback.
 */
function updateModelDisplayNames(configs) {
    for (const c of configs) {
        if (c.model && c.label && !modelDisplayNames[c.model]) {
            // Dynamic configs come as a single label string; use for both languages
            modelDisplayNames[c.model] = { en: c.label, zh: c.label };
        }
    }
}
//# sourceMappingURL=models.js.map