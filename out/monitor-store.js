"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MonitorStore = void 0;
const STORAGE_KEY = 'monitorSnapshotState';
const MAX_SNAPSHOTS = 200;
function sortByLastModified(usages) {
    return [...usages].sort((a, b) => new Date(b.lastModifiedTime).getTime() - new Date(a.lastModifiedTime).getTime());
}
function sameModelUsage(a, b) {
    if (!a && !b) {
        return true;
    }
    if (!a || !b) {
        return false;
    }
    return a.model === b.model
        && a.inputTokens === b.inputTokens
        && a.outputTokens === b.outputTokens
        && a.responseOutputTokens === b.responseOutputTokens
        && a.cacheReadTokens === b.cacheReadTokens;
}
function sameUsageSnapshot(prev, next) {
    return prev.cascadeId === next.cascadeId
        && prev.model === next.model
        && prev.modelDisplayName === next.modelDisplayName
        && prev.contextUsed === next.contextUsed
        && prev.totalOutputTokens === next.totalOutputTokens
        && prev.totalToolCallOutputTokens === next.totalToolCallOutputTokens
        && prev.contextLimit === next.contextLimit
        && prev.usagePercent === next.usagePercent
        && prev.stepCount === next.stepCount
        && prev.lastModifiedTime === next.lastModifiedTime
        && prev.status === next.status
        && prev.isEstimated === next.isEstimated
        && sameModelUsage(prev.lastModelUsage, next.lastModelUsage)
        && prev.estimatedDeltaSinceCheckpoint === next.estimatedDeltaSinceCheckpoint
        && prev.imageGenStepCount === next.imageGenStepCount
        && prev.compressionDetected === next.compressionDetected
        && prev.checkpointCompressionDrop === next.checkpointCompressionDrop
        && prev.previousContextUsed === next.previousContextUsed
        && prev.hasGaps === next.hasGaps
        && prev.createdTime === next.createdTime
        && prev.lastUserInputTime === next.lastUserInputTime
        && prev.lastUserInputStepIndex === next.lastUserInputStepIndex
        && prev.repositoryName === next.repositoryName
        && prev.gitOriginUrl === next.gitOriginUrl
        && prev.branchName === next.branchName
        && prev.gitRootUri === next.gitRootUri;
}
function sameGMConversationSnapshot(prev, next) {
    return prev.cascadeId === next.cascadeId
        && prev.title === next.title
        && prev.totalSteps === next.totalSteps
        && prev.coveredSteps === next.coveredSteps
        && prev.coverageRate === next.coverageRate
        && (prev.lifetimeCalls || 0) === (next.lifetimeCalls || 0)
        && prev.calls.length === next.calls.length;
}
class MonitorStore {
    _workspaceState = null;
    _snapshots = new Map();
    _gmConversations = new Map();
    _currentCascadeId = null;
    init(workspaceState) {
        this._workspaceState = workspaceState;
        const saved = workspaceState.get(STORAGE_KEY, null);
        if (!saved || saved.version !== 1 || !saved.snapshots) {
            return;
        }
        for (const [cascadeId, usage] of Object.entries(saved.snapshots)) {
            this._snapshots.set(cascadeId, usage);
        }
        for (const [cascadeId, conversation] of Object.entries(saved.gmConversations || {})) {
            this._gmConversations.set(cascadeId, conversation);
        }
        this._currentCascadeId = saved.currentCascadeId || null;
        this._trim();
    }
    restore() {
        return {
            currentUsage: this._currentCascadeId
                ? this._snapshots.get(this._currentCascadeId) || null
                : null,
            allUsages: this.getAll(),
            gmConversations: this.getGMConversations(),
        };
    }
    record(usages, currentCascadeId) {
        let changed = false;
        for (const usage of usages) {
            const prev = this._snapshots.get(usage.cascadeId);
            const next = { ...usage };
            if (prev && sameUsageSnapshot(prev, next)) {
                continue;
            }
            this._snapshots.set(usage.cascadeId, next);
            changed = true;
        }
        if (currentCascadeId && currentCascadeId !== this._currentCascadeId) {
            this._currentCascadeId = currentCascadeId;
            changed = true;
        }
        changed = this._trim() || changed;
        if (changed) {
            this._persist();
        }
    }
    recordGMConversations(conversations) {
        let changed = false;
        for (const conversation of conversations) {
            const prev = this._gmConversations.get(conversation.cascadeId);
            if (prev && sameGMConversationSnapshot(prev, conversation)) {
                continue;
            }
            this._gmConversations.set(conversation.cascadeId, conversation);
            changed = true;
        }
        changed = this._trim() || changed;
        if (changed) {
            this._persist();
        }
    }
    clearGMConversations() {
        this._gmConversations.clear();
        this._persist();
    }
    getAll() {
        return sortByLastModified([...this._snapshots.values()]);
    }
    getSnapshot(cascadeId) {
        return this._snapshots.get(cascadeId) || null;
    }
    getGMConversations() {
        return Object.fromEntries(this._gmConversations.entries());
    }
    _trim() {
        const sorted = sortByLastModified([...this._snapshots.values()]);
        if (sorted.length <= MAX_SNAPSHOTS) {
            return false;
        }
        let changed = false;
        const keepIds = new Set(sorted.slice(0, MAX_SNAPSHOTS).map(usage => usage.cascadeId));
        for (const cascadeId of [...this._snapshots.keys()]) {
            if (!keepIds.has(cascadeId)) {
                this._snapshots.delete(cascadeId);
                changed = true;
            }
        }
        for (const cascadeId of [...this._gmConversations.keys()]) {
            if (!keepIds.has(cascadeId)) {
                this._gmConversations.delete(cascadeId);
                changed = true;
            }
        }
        if (this._currentCascadeId && !this._snapshots.has(this._currentCascadeId)) {
            this._currentCascadeId = sorted[0]?.cascadeId || null;
            changed = true;
        }
        return changed;
    }
    _persist() {
        if (!this._workspaceState) {
            return;
        }
        const snapshots = {};
        for (const [cascadeId, usage] of this._snapshots) {
            snapshots[cascadeId] = usage;
        }
        const gmConversations = {};
        for (const [cascadeId, conversation] of this._gmConversations) {
            gmConversations[cascadeId] = conversation;
        }
        this._workspaceState.update(STORAGE_KEY, {
            version: 1,
            currentCascadeId: this._currentCascadeId,
            snapshots,
            gmConversations,
        });
    }
}
exports.MonitorStore = MonitorStore;
//# sourceMappingURL=monitor-store.js.map