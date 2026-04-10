"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getModelDNAKey = getModelDNAKey;
exports.restoreModelDNAState = restoreModelDNAState;
exports.serializeModelDNAState = serializeModelDNAState;
exports.mergeModelDNAState = mergeModelDNAState;
const models_1 = require("./models");
function getModelDNAKey(displayName, responseModel) {
    const normalizedName = (0, models_1.normalizeModelDisplayName)(displayName) || displayName;
    const resolvedId = (0, models_1.resolveModelId)(normalizedName);
    return resolvedId || responseModel || normalizedName;
}
function cloneCompletionConfig(config) {
    return config ? { ...config } : null;
}
function clonePersistedEntry(entry) {
    return {
        displayName: (0, models_1.normalizeModelDisplayName)(entry.displayName) || entry.displayName,
        responseModel: entry.responseModel,
        apiProvider: entry.apiProvider,
        completionConfig: cloneCompletionConfig(entry.completionConfig),
        hasSystemPrompt: !!entry.hasSystemPrompt,
        toolCount: Math.max(0, entry.toolCount || 0),
        promptSectionTitles: [...(entry.promptSectionTitles || [])],
    };
}
function buildPersistedEntry(name, stats) {
    return {
        displayName: (0, models_1.normalizeModelDisplayName)(name) || name,
        responseModel: stats.responseModel || '',
        apiProvider: stats.apiProvider || '',
        completionConfig: cloneCompletionConfig(stats.completionConfig),
        hasSystemPrompt: !!stats.hasSystemPrompt,
        toolCount: Math.max(0, stats.toolCount || 0),
        promptSectionTitles: [...(stats.promptSectionTitles || [])],
    };
}
function restoreModelDNAState(state) {
    if (!state || state.version !== 1 || !state.entries) {
        return {};
    }
    const restored = {};
    for (const entry of Object.values(state.entries)) {
        const normalizedEntry = clonePersistedEntry(entry);
        const normalizedKey = getModelDNAKey(normalizedEntry.displayName, normalizedEntry.responseModel);
        const existing = restored[normalizedKey];
        if (!existing) {
            restored[normalizedKey] = normalizedEntry;
            continue;
        }
        restored[normalizedKey] = {
            displayName: normalizedEntry.displayName || existing.displayName,
            responseModel: normalizedEntry.responseModel || existing.responseModel,
            apiProvider: normalizedEntry.apiProvider || existing.apiProvider,
            completionConfig: normalizedEntry.completionConfig || existing.completionConfig,
            hasSystemPrompt: existing.hasSystemPrompt || normalizedEntry.hasSystemPrompt,
            toolCount: Math.max(existing.toolCount || 0, normalizedEntry.toolCount || 0),
            promptSectionTitles: normalizedEntry.promptSectionTitles.length >= existing.promptSectionTitles.length
                ? [...normalizedEntry.promptSectionTitles]
                : [...existing.promptSectionTitles],
        };
    }
    return restored;
}
function serializeModelDNAState(entries) {
    const cloned = {};
    for (const [key, entry] of Object.entries(entries)) {
        cloned[key] = clonePersistedEntry(entry);
    }
    return { version: 1, entries: cloned };
}
function mergeModelDNAState(existing, summary) {
    const merged = restoreModelDNAState({
        version: 1,
        entries: existing,
    });
    let changed = Object.keys(merged).length !== Object.keys(existing).length;
    for (const [key, entry] of Object.entries(merged)) {
        merged[key] = clonePersistedEntry(entry);
    }
    if (!summary) {
        return { entries: merged, changed };
    }
    for (const [name, stats] of Object.entries(summary.modelBreakdown)) {
        const key = getModelDNAKey(name, stats.responseModel);
        const next = buildPersistedEntry(name, stats);
        const prev = merged[key];
        if (!prev) {
            merged[key] = next;
            changed = true;
            continue;
        }
        const updated = {
            displayName: next.displayName || prev.displayName,
            responseModel: next.responseModel || prev.responseModel,
            apiProvider: next.apiProvider || prev.apiProvider,
            completionConfig: next.completionConfig || prev.completionConfig,
            hasSystemPrompt: prev.hasSystemPrompt || next.hasSystemPrompt,
            toolCount: Math.max(prev.toolCount || 0, next.toolCount || 0),
            promptSectionTitles: next.promptSectionTitles.length >= prev.promptSectionTitles.length
                ? [...next.promptSectionTitles]
                : [...prev.promptSectionTitles],
        };
        const same = JSON.stringify(prev) === JSON.stringify(updated);
        merged[key] = updated;
        if (!same) {
            changed = true;
        }
    }
    return { entries: merged, changed };
}
//# sourceMappingURL=model-dna-store.js.map