"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.expandModelIdsToPool = expandModelIdsToPool;
exports.groupModelIdsByResetPool = groupModelIdsByResetPool;
exports.findLatestQuotaSessionForPool = findLatestQuotaSessionForPool;
const models_1 = require("./models");
function getPoolKey(modelId, configs) {
    const config = configs.find(c => c.model === modelId);
    return (0, models_1.getQuotaPoolKey)(modelId, config?.quotaInfo?.resetTime);
}
function expandModelIdsToPool(modelIds, configs) {
    const targetPoolKeys = new Set();
    for (const config of configs) {
        if (modelIds.includes(config.model)) {
            targetPoolKeys.add((0, models_1.getQuotaPoolKey)(config.model, config.quotaInfo?.resetTime));
        }
    }
    if (targetPoolKeys.size === 0) {
        return [...new Set(modelIds)];
    }
    const poolModels = new Set(modelIds);
    for (const config of configs) {
        if (targetPoolKeys.has((0, models_1.getQuotaPoolKey)(config.model, config.quotaInfo?.resetTime))) {
            poolModels.add(config.model);
        }
    }
    return [...poolModels];
}
function groupModelIdsByResetPool(modelIds, configs) {
    const grouped = new Map();
    for (const modelId of modelIds) {
        const key = getPoolKey(modelId, configs);
        const existing = grouped.get(key) || [];
        existing.push(modelId);
        grouped.set(key, existing);
    }
    return [...grouped.values()].map(ids => expandModelIdsToPool(ids, configs));
}
function findLatestQuotaSessionForPool(poolModelIds, configs, history) {
    const poolLabels = new Set(configs
        .filter(config => poolModelIds.includes(config.model))
        .map(config => config.label));
    for (const session of history) {
        if (poolModelIds.includes(session.modelId)) {
            return session;
        }
        if (session.poolModels?.some(label => poolLabels.has(label))) {
            return session;
        }
        if (poolLabels.has(session.modelLabel)) {
            return session;
        }
    }
    return null;
}
//# sourceMappingURL=pool-utils.js.map