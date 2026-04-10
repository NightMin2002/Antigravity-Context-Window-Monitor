"use strict";
// ─── Pricing Store ───────────────────────────────────────────────────────────
// Manages model pricing data: default built-in prices, user custom overrides
// persisted via globalState, lookup helpers, and cost calculation.
//
// Extracted from gm-panel.ts to enable the dedicated Pricing tab.
Object.defineProperty(exports, "__esModule", { value: true });
exports.PricingStore = exports.DEFAULT_PRICING = exports.PRICING_LAST_UPDATED = void 0;
exports.findPricing = findPricing;
exports.calculateCosts = calculateCosts;
// ─── Default Pricing Table (per 1M tokens, USD) ─────────────────────────────
// Source: https://platform.claude.com/docs/en/about-claude/pricing
//         https://cloud.google.com/vertex-ai/generative-ai/pricing
// Updated: 2026-03-22
// Cache: Claude cacheWrite = 1.25× input (5-min), cacheRead = 0.1× input
//        Gemini cacheRead = from official table; no separate cacheWrite pricing
// Thinking: = output price (Claude extended thinking / Gemini reasoning output)
exports.PRICING_LAST_UPDATED = '2026-03-22';
exports.DEFAULT_PRICING = {
    // ── Claude (platform.claude.com/docs/en/about-claude/pricing) ─────
    'claude-opus-4-6': { input: 5, output: 25, cacheRead: 0.50, cacheWrite: 6.25, thinking: 25 },
    'claude-sonnet-4-6': { input: 3, output: 15, cacheRead: 0.30, cacheWrite: 3.75, thinking: 15 },
    // ── GPT-OSS (cloud.google.com/vertex-ai/generative-ai/pricing) ───
    'gpt-oss-120b': { input: 0.09, output: 0.36, cacheRead: 0, cacheWrite: 0, thinking: 0.36 },
    // ── Gemini 3.x (cloud.google.com/vertex-ai/generative-ai/pricing) ─
    'gemini-3.1-pro': { input: 2, output: 12, cacheRead: 0.20, cacheWrite: 2.50, thinking: 12 },
    'gemini-3-flash': { input: 0.50, output: 3, cacheRead: 0.05, cacheWrite: 0.625, thinking: 3 },
};
// ─── Pricing Lookup ──────────────────────────────────────────────────────────
/** Find pricing for a model by matching responseModel against a pricing table.
 *  Strategy: exact match → prefix match → fuzzy substring match */
function findPricing(responseModel, table = exports.DEFAULT_PRICING) {
    if (table[responseModel]) {
        return table[responseModel];
    }
    for (const [key, pricing] of Object.entries(table)) {
        if (responseModel.startsWith(key) || key.startsWith(responseModel)) {
            return pricing;
        }
    }
    for (const [key, pricing] of Object.entries(table)) {
        if (responseModel.includes(key) || key.includes(responseModel.split('-').slice(0, 3).join('-'))) {
            return pricing;
        }
    }
    return null;
}
// ─── Cost Calculation ────────────────────────────────────────────────────────
function calculateCosts(summary, customPricing) {
    const mergedTable = { ...exports.DEFAULT_PRICING, ...customPricing };
    const entries = Object.entries(summary.modelBreakdown);
    const rows = [];
    let grandTotal = 0;
    const calcCost = (tokens, pricePerM) => (tokens / 1_000_000) * pricePerM;
    for (const [name, ms] of entries) {
        const pricing = findPricing(ms.responseModel, mergedTable);
        if (!pricing) {
            rows.push({
                name, responseModel: ms.responseModel,
                inputCost: 0, outputCost: 0, cacheCost: 0, cacheWriteCost: 0, thinkingCost: 0, totalCost: 0,
                inputTokens: ms.totalInputTokens, outputTokens: ms.totalOutputTokens,
                cacheTokens: ms.totalCacheRead, cacheWriteTokens: ms.totalCacheCreation,
                thinkingTokens: ms.totalThinkingTokens, pricing: null,
            });
            continue;
        }
        const inputCost = calcCost(ms.totalInputTokens, pricing.input);
        const outputCost = calcCost(ms.totalOutputTokens, pricing.output);
        const cacheCost = calcCost(ms.totalCacheRead, pricing.cacheRead);
        const cacheWriteCost = calcCost(ms.totalCacheCreation, pricing.cacheWrite);
        const thinkingCost = calcCost(ms.totalThinkingTokens, pricing.thinking);
        const totalCost = inputCost + outputCost + cacheCost + cacheWriteCost + thinkingCost;
        grandTotal += totalCost;
        rows.push({
            name, responseModel: ms.responseModel,
            inputCost, outputCost, cacheCost, cacheWriteCost, thinkingCost, totalCost,
            inputTokens: ms.totalInputTokens, outputTokens: ms.totalOutputTokens,
            cacheTokens: ms.totalCacheRead, cacheWriteTokens: ms.totalCacheCreation,
            thinkingTokens: ms.totalThinkingTokens, pricing,
        });
    }
    rows.sort((a, b) => b.totalCost - a.totalCost);
    return { rows, grandTotal };
}
// ─── Pricing Store (globalState persistence) ─────────────────────────────────
const STORAGE_KEY = 'customModelPricing';
class PricingStore {
    _custom = {};
    _globalState = null;
    /** Initialize from globalState */
    init(globalState) {
        this._globalState = globalState;
        this._custom = globalState.get(STORAGE_KEY, {});
    }
    /** Get merged pricing table (custom overrides default) */
    getMerged() {
        return { ...exports.DEFAULT_PRICING, ...this._custom };
    }
    /** Get user custom overrides only */
    getCustom() {
        return { ...this._custom };
    }
    /** Update custom pricing for a model and persist */
    async set(responseModel, pricing) {
        this._custom[responseModel] = pricing;
        await this._persist();
    }
    /** Bulk set custom pricing and persist */
    async setAll(custom) {
        this._custom = { ...custom };
        await this._persist();
    }
    /** Reset all custom pricing to defaults */
    async reset() {
        this._custom = {};
        await this._persist();
    }
    /** Calculate costs using current merged pricing */
    calculateCosts(summary) {
        return calculateCosts(summary, this._custom);
    }
    async _persist() {
        if (this._globalState) {
            await this._globalState.update(STORAGE_KEY, this._custom);
        }
    }
}
exports.PricingStore = PricingStore;
//# sourceMappingURL=pricing-store.js.map