"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateModelDisplayNames = exports.getModelDisplayName = exports.getContextLimit = void 0;
exports.estimateTokensFromText = estimateTokensFromText;
exports.getAllTrajectories = getAllTrajectories;
exports.normalizeUri = normalizeUri;
exports.processSteps = processSteps;
exports.getTrajectoryTokenUsage = getTrajectoryTokenUsage;
exports.fetchFullUserStatus = fetchFullUserStatus;
exports.fetchModelConfigs = fetchModelConfigs;
exports.getContextUsage = getContextUsage;
const rpc_client_1 = require("./rpc-client");
const models_1 = require("./models");
Object.defineProperty(exports, "getContextLimit", { enumerable: true, get: function () { return models_1.getContextLimit; } });
Object.defineProperty(exports, "getModelDisplayName", { enumerable: true, get: function () { return models_1.getModelDisplayName; } });
Object.defineProperty(exports, "updateModelDisplayNames", { enumerable: true, get: function () { return models_1.updateModelDisplayNames; } });
const constants_1 = require("./constants");
// ─── Token Estimation from Text ──────────────────────────────────────────────
/**
 * Estimate token count from raw text content.
 * Uses character-based heuristic: ASCII ~4 chars/token, non-ASCII ~1.5 chars/token.
 */
function estimateTokensFromText(text) {
    if (!text) {
        return 0;
    }
    let asciiChars = 0;
    let nonAsciiChars = 0;
    for (let i = 0; i < text.length; i++) {
        if (text.charCodeAt(i) < 128) {
            asciiChars++;
        }
        else {
            nonAsciiChars++;
        }
    }
    return Math.ceil(asciiChars / 4 + nonAsciiChars / 1.5);
}
// ─── Trajectory Queries ───────────────────────────────────────────────────────
/**
 * Get all cascade trajectories (conversations) from the LS.
 */
async function getAllTrajectories(ls, signal) {
    const resp = await (0, rpc_client_1.rpcCall)(ls, 'GetAllCascadeTrajectories', {
        metadata: { ideName: 'antigravity', extensionName: 'antigravity' }
    }, 10000, signal);
    const summaries = resp.trajectorySummaries;
    if (!summaries) {
        return [];
    }
    const result = [];
    for (const [cascadeId, data] of Object.entries(summaries)) {
        let requestedModel = '';
        let generatorModel = '';
        const latestTask = data.latestTaskBoundaryStep;
        const latestNotify = data.latestNotifyUserStep;
        for (const latest of [latestTask, latestNotify]) {
            if (latest) {
                const step = latest.step;
                if (step) {
                    const meta = step.metadata;
                    if (meta) {
                        if (meta.generatorModel) {
                            generatorModel = meta.generatorModel;
                        }
                        const rm = meta.requestedModel;
                        if (rm?.model) {
                            requestedModel = rm.model;
                        }
                    }
                }
            }
        }
        const workspaces = data.workspaces;
        const workspaceUris = [];
        if (workspaces) {
            for (const ws of workspaces) {
                const uri = ws.workspaceFolderAbsoluteUri;
                if (uri) {
                    workspaceUris.push(uri);
                }
            }
        }
        // Extract Git info from first workspace
        const firstWs = workspaces?.[0];
        const repo = firstWs?.repository;
        const repositoryName = repo?.computedName || '';
        const gitOriginUrl = repo?.gitOriginUrl || '';
        const branchName = firstWs?.branchName || '';
        const gitRootUri = firstWs?.gitRootAbsoluteUri || '';
        result.push({
            cascadeId,
            trajectoryId: data.trajectoryId || '',
            summary: data.summary || cascadeId,
            stepCount: data.stepCount || 0,
            status: data.status || 'unknown',
            lastModifiedTime: data.lastModifiedTime || '',
            createdTime: data.createdTime || '',
            requestedModel: requestedModel || generatorModel,
            generatorModel,
            workspaceUris,
            lastUserInputTime: data.lastUserInputTime || '',
            lastUserInputStepIndex: data.lastUserInputStepIndex || 0,
            repositoryName,
            gitOriginUrl,
            branchName,
            gitRootUri,
        });
    }
    // Sort by lastModifiedTime descending (most recent first)
    result.sort((a, b) => {
        if (!a.lastModifiedTime) {
            return 1;
        }
        if (!b.lastModifiedTime) {
            return -1;
        }
        return b.lastModifiedTime.localeCompare(a.lastModifiedTime);
    });
    return result;
}
/**
 * Normalize a URI for comparison:
 * - Strip vscode-remote:// scheme+authority (e.g., vscode-remote://wsl+Ubuntu/path → /path)
 * - Strip file:// prefix
 * - URL-decode (handle %20 etc.)
 * - Remove trailing slash
 * - Lowercase for macOS/Windows case-insensitive FS
 */
function normalizeUri(uri) {
    let normalized = uri;
    // Handle vscode-remote:// URIs — extract just the path portion
    // e.g., vscode-remote://wsl+Ubuntu/home/user/project → /home/user/project
    // e.g., vscode-remote://ssh-remote+host/home/user/project → /home/user/project
    const remoteMatch = normalized.match(/^vscode-remote:\/\/[^/]+(\/.*)/);
    if (remoteMatch) {
        normalized = remoteMatch[1];
    }
    normalized = normalized.replace(/^file:\/\/\//, '/');
    normalized = normalized.replace(/^file:\/\//, '');
    try {
        normalized = decodeURIComponent(normalized);
    }
    catch {
        // If decoding fails, keep as-is
    }
    // Windows: strip leading / before drive letter (e.g., /c:/ → c:/)
    if (process.platform === 'win32') {
        normalized = normalized.replace(/^\/([a-zA-Z]:)/, '$1');
    }
    normalized = normalized.replace(/\/$/, '');
    if (process.platform === 'darwin' || process.platform === 'win32') {
        normalized = normalized.toLowerCase();
    }
    return normalized;
}
// ─── Step Processing ──────────────────────────────────────────────────────────
/** Process a user input step and return estimated tokens. */
function processUserInputStep(step) {
    const ui = step.userInput;
    const userText = ui?.userResponse || '';
    return ui ? estimateTokensFromText(userText) : constants_1.USER_INPUT_OVERHEAD;
}
/** Process a planner response step and return estimated tokens. */
function processPlannerResponseStep(step) {
    const pr = step.plannerResponse;
    const responseText = pr?.response || '';
    const thinkingText = pr?.thinking || '';
    let toolCallsText = '';
    const toolCalls = pr?.toolCalls;
    if (toolCalls) {
        for (const tc of toolCalls) {
            toolCallsText += tc.argumentsJson || '';
        }
    }
    const totalText = responseText + thinkingText + toolCallsText;
    return pr ? estimateTokensFromText(totalText) : constants_1.PLANNER_RESPONSE_ESTIMATE;
}
/** Check if a step is an image generation step by type or model. */
function isImageGenStep(stepType, stepModel) {
    if (constants_1.IMAGE_GEN_STEP_KEYWORDS.some(kw => stepType.includes(kw))) {
        return true;
    }
    if (stepModel) {
        const lower = stepModel.toLowerCase();
        return constants_1.IMAGE_GEN_MODEL_KEYWORDS.some(kw => lower.includes(kw));
    }
    return false;
}
/** Extract modelUsage from a checkpoint step's metadata. */
function extractCheckpointModelUsage(meta) {
    const mu = meta.modelUsage;
    if (!mu) {
        return null;
    }
    const inputTokens = parseInt(String(mu.inputTokens || '0'), 10);
    const outputTokens = parseInt(String(mu.outputTokens || '0'), 10);
    const responseOutputTokens = parseInt(String(mu.responseOutputTokens || '0'), 10);
    const cacheReadTokens = parseInt(String(mu.cacheReadTokens || '0'), 10);
    const model = mu.model || '';
    if (inputTokens > 0 || outputTokens > 0) {
        return { model, inputTokens, outputTokens, responseOutputTokens, cacheReadTokens };
    }
    return null;
}
/**
 * Process an array of trajectory steps and compute token usage.
 * Pure function — no RPC calls, no side effects.
 */
function processSteps(steps) {
    let toolOutputTokens = 0;
    let model = '';
    const stepDetails = [];
    let lastModelUsage = null;
    let imageGenStepCount = 0;
    const imageGenStepIndices = new Set();
    let estimationOverhead = 0;
    let outputTokensSinceCheckpoint = 0;
    let prevCheckpointInputTokens = -1;
    let checkpointCompressionDetected = false;
    let checkpointCompressionDrop = 0;
    for (let globalStepIdx = 0; globalStepIdx < steps.length; globalStepIdx++) {
        const step = steps[globalStepIdx];
        const meta = step.metadata;
        const stepType = step.type || '';
        // Count user input steps
        if (stepType === constants_1.StepType.USER_INPUT) {
            estimationOverhead += processUserInputStep(step);
        }
        // Count planner response steps
        if (stepType === constants_1.StepType.PLANNER_RESPONSE) {
            estimationOverhead += processPlannerResponseStep(step);
        }
        // Extract modelUsage from CHECKPOINT steps
        if (stepType === constants_1.StepType.CHECKPOINT && meta) {
            const usage = extractCheckpointModelUsage(meta);
            if (usage) {
                // Detect compression by comparing consecutive checkpoint inputTokens
                if (prevCheckpointInputTokens > 0 && usage.inputTokens < prevCheckpointInputTokens) {
                    const drop = prevCheckpointInputTokens - usage.inputTokens;
                    if (drop > constants_1.COMPRESSION_MIN_DROP) {
                        checkpointCompressionDetected = true;
                        checkpointCompressionDrop = drop;
                    }
                }
                prevCheckpointInputTokens = usage.inputTokens;
                lastModelUsage = usage;
                estimationOverhead = 0;
                outputTokensSinceCheckpoint = 0;
            }
            // Log retryInfos (observation mode — NOT added to totals)
            const retryInfos = meta.retryInfos;
            if (retryInfos && retryInfos.length > 0) {
                let retryInputTokens = 0;
                let retryOutputTokens = 0;
                for (const retry of retryInfos) {
                    const retryUsage = retry.usage;
                    if (retryUsage) {
                        retryInputTokens += parseInt(String(retryUsage.inputTokens || '0'), 10);
                        retryOutputTokens += parseInt(String(retryUsage.outputTokens || '0'), 10);
                    }
                }
                console.log(`[ContextMonitor] Checkpoint retryInfos: ${retryInfos.length} retries, ` +
                    `retryInputTokens=${retryInputTokens}, retryOutputTokens=${retryOutputTokens}, ` +
                    `mainInputTokens=${usage?.inputTokens ?? 0}, mainOutputTokens=${usage?.outputTokens ?? 0}`);
            }
        }
        // Detect image generation steps
        const stepModel = meta ? (meta.generatorModel || '') : '';
        if (isImageGenStep(stepType, stepModel) && !imageGenStepIndices.has(globalStepIdx)) {
            imageGenStepIndices.add(globalStepIdx);
            imageGenStepCount++;
        }
        if (!meta) {
            continue;
        }
        const outputTokens = meta.toolCallOutputTokens || 0;
        if (outputTokens > 0) {
            toolOutputTokens += outputTokens;
            outputTokensSinceCheckpoint += outputTokens;
            stepDetails.push({
                type: stepType,
                toolCallOutputTokens: outputTokens,
                model: stepModel
            });
        }
        // Track the latest model used (for dynamic model switching)
        if (stepModel) {
            model = stepModel;
        }
        // Checkpoint modelUsage.model has higher priority than generatorModel,
        // BUT skip ghost/internal models (e.g. M50 = Flash Lite used for checkpoint summarization)
        if (lastModelUsage && lastModelUsage.model && !models_1.GHOST_CHECKPOINT_MODELS.has(lastModelUsage.model)) {
            model = lastModelUsage.model;
        }
        // requestedModel is highest priority (user's explicit selection)
        const rm = meta.requestedModel;
        if (rm?.model) {
            model = rm.model;
        }
    }
    const estimatedDelta = outputTokensSinceCheckpoint + estimationOverhead;
    // Priority 1: Use inputTokens + outputTokens from the last checkpoint + estimated delta
    if (lastModelUsage && lastModelUsage.inputTokens > 0) {
        return {
            inputTokens: lastModelUsage.inputTokens,
            totalOutputTokens: lastModelUsage.outputTokens,
            totalToolCallOutputTokens: toolOutputTokens,
            contextUsed: lastModelUsage.inputTokens + lastModelUsage.outputTokens + estimatedDelta,
            isEstimated: estimatedDelta > 0,
            model,
            stepDetails,
            lastModelUsage,
            estimatedDeltaSinceCheckpoint: estimatedDelta,
            imageGenStepCount,
            hasGaps: false,
            checkpointCompressionDetected,
            checkpointCompressionDrop,
        };
    }
    // Fallback: estimate total context window usage
    const estimatedTotal = toolOutputTokens + constants_1.SYSTEM_PROMPT_OVERHEAD + estimationOverhead;
    return {
        inputTokens: 0,
        totalOutputTokens: 0,
        totalToolCallOutputTokens: toolOutputTokens,
        contextUsed: estimatedTotal,
        isEstimated: true,
        model,
        stepDetails,
        lastModelUsage: null,
        estimatedDeltaSinceCheckpoint: estimatedTotal,
        imageGenStepCount,
        hasGaps: false,
        checkpointCompressionDetected: false,
        checkpointCompressionDrop: 0,
    };
}
/**
 * Get context window usage for a cascade by iterating through steps.
 * Fetches steps in batches from the LS via RPC.
 */
async function getTrajectoryTokenUsage(ls, cascadeId, totalSteps, signal) {
    const maxSteps = Math.max(totalSteps, 0);
    const allSteps = [];
    let hasGaps = false;
    // Build batch ranges
    const batchRanges = [];
    for (let start = 0; start < maxSteps; start += constants_1.STEP_BATCH_SIZE) {
        batchRanges.push({ start, end: Math.min(start + constants_1.STEP_BATCH_SIZE, maxSteps) });
    }
    // Process batches in groups to avoid bursting concurrent RPC calls
    for (let groupStart = 0; groupStart < batchRanges.length; groupStart += constants_1.MAX_CONCURRENT_BATCHES) {
        const group = batchRanges.slice(groupStart, groupStart + constants_1.MAX_CONCURRENT_BATCHES);
        const groupResults = await Promise.allSettled(group.map(({ start, end }) => (0, rpc_client_1.rpcCall)(ls, 'GetCascadeTrajectorySteps', {
            cascadeId,
            startIndex: start,
            endIndex: end
        }, 30000, signal)));
        for (let i = 0; i < groupResults.length; i++) {
            const result = groupResults[i];
            if (result.status === 'fulfilled') {
                const steps = result.value.steps;
                if (steps && steps.length > 0) {
                    allSteps.push(...steps);
                }
            }
            else {
                const { start, end } = group[i];
                console.warn(`[ContextMonitor] Failed to fetch steps batch [${start}-${end}] ` +
                    `for cascade ${cascadeId.substring(0, 8)}: ${result.reason}`);
                hasGaps = true;
            }
        }
    }
    const result = processSteps(allSteps);
    result.hasGaps = hasGaps;
    return result;
}
// ─── Full User Status from GetUserStatus ─────────────────────────────────────
/**
 * Fetch full user status including model configs, plan info, and credits.
 */
async function fetchFullUserStatus(ls, signal) {
    try {
        const resp = await (0, rpc_client_1.rpcCall)(ls, 'GetUserStatus', {
            metadata: { ideName: 'antigravity', extensionName: 'antigravity' }
        }, 10000, signal);
        const userStatus = resp.userStatus;
        if (!userStatus) {
            return { configs: [], userInfo: null };
        }
        // ─── Model Configs ───
        const configData = userStatus.cascadeModelConfigData;
        const rawConfigs = configData?.clientModelConfigs;
        const configs = (rawConfigs || []).map(c => {
            const qi = c.quotaInfo;
            const mimeTypes = c.supportedMimeTypes;
            return {
                model: c.modelOrAlias?.model || '',
                label: c.label || '',
                supportsImages: c.supportsImages || false,
                quotaInfo: qi ? {
                    remainingFraction: qi.remainingFraction ?? 0, // LS omits field when exhausted
                    resetTime: qi.resetTime || '',
                } : undefined,
                allowedTiers: c.allowedTiers || [],
                tagTitle: c.tagTitle || undefined,
                mimeTypeCount: mimeTypes ? Object.keys(mimeTypes).length : 0,
                isRecommended: c.isRecommended || false,
                supportedMimeTypes: mimeTypes ? Object.keys(mimeTypes) : [],
            };
        }).filter(c => c.model && c.label);
        // ─── Plan Info ───
        const planStatus = userStatus.planStatus;
        const planInfo = planStatus?.planInfo;
        const userTier = userStatus.userTier;
        const teamCfg = planInfo?.defaultTeamConfig;
        const defaultOverride = configData?.defaultOverrideModelConfig;
        const defaultModelId = defaultOverride?.modelOrAlias?.model || '';
        const defaultModelCfg = configs.find(c => c.model === defaultModelId);
        const rawCredits = userTier?.availableCredits || [];
        // Deep-mined fields
        const tierDescription = userTier?.description || '';
        const upgradeText = userTier?.upgradeSubscriptionText || '';
        const clientModelSorts = configData?.clientModelSorts || [];
        let modelSortOrder = [];
        if (clientModelSorts.length > 0) {
            const sortGroups = clientModelSorts[0].groups || [];
            if (sortGroups.length > 0) {
                modelSortOrder = sortGroups[0].modelLabels || [];
            }
        }
        const parseNum = (v) => {
            if (typeof v === 'number') {
                return v;
            }
            if (typeof v === 'string') {
                const n = parseInt(v, 10);
                return isNaN(n) ? 0 : n;
            }
            return 0;
        };
        const userInfo = planInfo ? {
            name: userStatus.name || '',
            email: userStatus.email || '',
            planName: planInfo.planName || '',
            teamsTier: planInfo.teamsTier || '',
            monthlyPromptCredits: planInfo.monthlyPromptCredits || 0,
            monthlyFlowCredits: planInfo.monthlyFlowCredits || 0,
            availablePromptCredits: planStatus?.availablePromptCredits ?? 0,
            availableFlowCredits: planStatus?.availableFlowCredits ?? 0,
            userTierName: userTier?.name || '',
            userTierId: userTier?.id || '',
            defaultModelLabel: defaultModelCfg?.label || defaultModelId || '',
            planLimits: {
                maxNumChatInputTokens: parseNum(planInfo.maxNumChatInputTokens),
                maxNumPremiumChatMessages: parseNum(planInfo.maxNumPremiumChatMessages),
                maxCustomChatInstructionCharacters: parseNum(planInfo.maxCustomChatInstructionCharacters),
                maxNumPinnedContextItems: parseNum(planInfo.maxNumPinnedContextItems),
                maxLocalIndexSize: parseNum(planInfo.maxLocalIndexSize),
                monthlyFlexCreditPurchaseAmount: planInfo.monthlyFlexCreditPurchaseAmount || 0,
            },
            teamConfig: {
                allowMcpServers: teamCfg?.allowMcpServers || false,
                allowAutoRunCommands: teamCfg?.allowAutoRunCommands || false,
                allowBrowserExperimentalFeatures: teamCfg?.allowBrowserExperimentalFeatures || false,
            },
            availableCredits: rawCredits.map(c => ({
                creditType: c.creditType || '',
                creditAmount: parseNum(c.creditAmount),
                minimumCreditAmountForUsage: parseNum(c.minimumCreditAmountForUsage),
            })),
            // Feature flags
            canBuyMoreCredits: planInfo.canBuyMoreCredits || false,
            browserEnabled: planInfo.browserEnabled || false,
            cascadeWebSearchEnabled: planInfo.cascadeWebSearchEnabled || false,
            knowledgeBaseEnabled: planInfo.knowledgeBaseEnabled || false,
            canGenerateCommitMessages: planInfo.canGenerateCommitMessages || false,
            cascadeCanAutoRunCommands: planInfo.cascadeCanAutoRunCommands || false,
            canAllowCascadeInBackground: planInfo.canAllowCascadeInBackground || false,
            hasAutocompleteFastMode: planInfo.hasAutocompleteFastMode || false,
            allowStickyPremiumModels: planInfo.allowStickyPremiumModels || false,
            allowPremiumCommandModels: planInfo.allowPremiumCommandModels || false,
            hasTabToJump: planInfo.hasTabToJump || false,
            canCustomizeAppIcon: planInfo.canCustomizeAppIcon || false,
            // Deep-mined fields
            userTierDescription: tierDescription,
            upgradeSubscriptionText: upgradeText,
            modelSortOrder,
        } : null;
        // Attach raw LS response for transparency panel
        if (userInfo) {
            userInfo._rawResponse = resp;
        }
        return { configs, userInfo, rawResponse: resp };
    }
    catch {
        return { configs: [], userInfo: null };
    }
}
/**
 * @deprecated Use `fetchFullUserStatus()` instead.
 * Backward-compatible wrapper — returns only model configs (no user info).
 */
async function fetchModelConfigs(ls, signal) {
    const result = await fetchFullUserStatus(ls, signal);
    return result.configs;
}
/**
 * Get full context usage for a specific cascade.
 */
async function getContextUsage(ls, trajectory, customLimits, signal) {
    const result = await getTrajectoryTokenUsage(ls, trajectory.cascadeId, trajectory.stepCount, signal);
    const effectiveModel = result.model || trajectory.requestedModel || trajectory.generatorModel;
    const contextLimit = (0, models_1.getContextLimit)(effectiveModel, customLimits);
    const usagePercent = contextLimit > 0 ? (result.contextUsed / contextLimit) * 100 : 0;
    return {
        cascadeId: trajectory.cascadeId,
        title: trajectory.summary,
        model: effectiveModel,
        modelDisplayName: (0, models_1.getModelDisplayName)(effectiveModel),
        contextUsed: result.contextUsed,
        totalOutputTokens: result.totalOutputTokens,
        totalToolCallOutputTokens: result.totalToolCallOutputTokens,
        contextLimit,
        usagePercent,
        stepCount: trajectory.stepCount,
        lastModifiedTime: trajectory.lastModifiedTime,
        status: trajectory.status,
        isEstimated: result.isEstimated,
        lastModelUsage: result.lastModelUsage,
        estimatedDeltaSinceCheckpoint: result.estimatedDeltaSinceCheckpoint,
        imageGenStepCount: result.imageGenStepCount,
        compressionDetected: result.checkpointCompressionDetected,
        checkpointCompressionDrop: result.checkpointCompressionDrop,
        hasGaps: result.hasGaps,
        // Extended transparency fields
        createdTime: trajectory.createdTime,
        lastUserInputTime: trajectory.lastUserInputTime,
        lastUserInputStepIndex: trajectory.lastUserInputStepIndex,
        repositoryName: trajectory.repositoryName,
        gitOriginUrl: trajectory.gitOriginUrl,
        branchName: trajectory.branchName,
        gitRootUri: trajectory.gitRootUri,
    };
}
//# sourceMappingURL=tracker.js.map