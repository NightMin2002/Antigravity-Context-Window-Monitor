// ─── GM Types ────────────────────────────────────────────────────────────────
// All type definitions for GM (Generator Metadata) tracking.

/** completionConfig extracted from chatModel */
export interface GMCompletionConfig {
    maxTokens: number;
    temperature: number;
    firstTemperature: number;
    topK: number;
    topP: number;
    numCompletions: number;
    stopPatternCount: number;
}

/** Token source breakdown group from chatStartMetadata.contextWindowMetadata.tokenBreakdown */
export interface TokenBreakdownGroup {
    name: string;     // e.g. "System Prompt", "Chat Messages"
    type: string;     // e.g. TOKEN_TYPE_SYSTEM_PROMPT
    tokens: number;
    children: { name: string; tokens: number }[];
}

export type GMModelAccuracy = 'exact' | 'placeholder';
export type GMPromptSource = 'none' | 'messagePrompts' | 'messageMetadata';

export interface GMUserMessageAnchor {
    stepIndex: number;
    text: string;
}

/** Checkpoint summary extracted from {{ CHECKPOINT N }} messages in messagePrompts */
export interface GMCheckpointSummary {
    /** Checkpoint number (e.g. 21 from {{ CHECKPOINT 21 }}) */
    checkpointNumber: number;
    /** Step index where this checkpoint was injected */
    stepIndex: number;
    /** Token count consumed by this checkpoint message */
    tokens: number;
    /** Full checkpoint text (USER Objective + Session Summary + Code Summary) */
    fullText: string;
}

/** A single LLM invocation entry from generatorMetadata */
export interface GMCallEntry {
    stepIndices: number[];
    executionId: string;
    model: string;           // e.g. MODEL_PLACEHOLDER_M26
    modelDisplay: string;    // e.g. Claude Opus 4
    responseModel: string;   // e.g. claude-opus-4-6-thinking
    modelAccuracy: GMModelAccuracy;
    inputTokens: number;
    outputTokens: number;
    thinkingTokens: number;
    responseTokens: number;
    cacheReadTokens: number;
    cacheCreationTokens: number;
    apiProvider: string;     // e.g. API_PROVIDER_ANTHROPIC_VERTEX
    ttftSeconds: number;
    streamingSeconds: number;
    credits: number;
    creditType: string;
    hasError: boolean;
    errorMessage: string;
    /** Context window usage at call time (if available) */
    contextTokensUsed: number;
    /** Model configuration parameters */
    completionConfig: GMCompletionConfig | null;
    /** First N chars of system prompt (if available) */
    systemPromptSnippet: string;
    /** Number of tools available */
    toolCount: number;
    /** Tool names list */
    toolNames: string[];
    /** Prompt section titles */
    promptSectionTitles: string[];
    /** Best-effort prompt snippet recovered from GM payload */
    promptSnippet: string;
    /** Which GM field produced promptSnippet */
    promptSource: GMPromptSource;
    /** Number of messagePrompts entries if present */
    messagePromptCount: number;
    /** messageMetadata top-level keys */
    messageMetadataKeys: string[];
    /** responseHeader top-level keys */
    responseHeaderKeys: string[];
    /** Explicit user messages recovered from messagePrompts */
    userMessageAnchors: GMUserMessageAnchor[];
    /** Per-step AI response snippets extracted from messagePrompts SYSTEM messages.
     *  Key = stepIdx from messageMetadata, Value = cleaned prompt text. */
    aiSnippetsByStep: Record<number, string>;
    /** Number of retries for this call */
    retries: number;
    /** Stop reason from plannerResponse (e.g. STOP_REASON_STOP_PATTERN) */
    stopReason: string;
    /** Retry overhead: total input tokens wasted across all retries */
    retryTokensIn: number;
    /** Retry overhead: total output tokens wasted across all retries */
    retryTokensOut: number;
    /** Retry overhead: total credits consumed by retries */
    retryCredits: number;
    /** Retry error messages */
    retryErrors: string[];
    /** Seconds since last LLM invocation */
    timeSinceLastInvocation: number;
    /** Token breakdown groups: context composition at call time */
    tokenBreakdownGroups: TokenBreakdownGroup[];
    /** chatStartMetadata.createdAt */
    createdAt: string;
    /** chatStartMetadata.latestStableMessageIndex */
    latestStableMessageIndex: number;
    /** chatStartMetadata.startStepIndex */
    startStepIndex: number;
    /** chatStartMetadata.checkpointIndex */
    checkpointIndex: number;
    /** Checkpoint summaries extracted from messagePrompts */
    checkpointSummaries: GMCheckpointSummary[];
}

/** Aggregated per-model statistics */
export interface GMModelStats {
    callCount: number;
    stepsCovered: number;
    totalInputTokens: number;
    totalOutputTokens: number;
    totalThinkingTokens: number;
    totalCacheRead: number;
    totalCacheCreation: number;
    totalCredits: number;
    avgTTFT: number;        // seconds
    minTTFT: number;
    maxTTFT: number;
    avgStreaming: number;    // seconds
    cacheHitRate: number;   // fraction of calls with cache > 0
    responseModel: string;
    apiProvider: string;
    /** Model DNA: completionConfig (latest seen) */
    completionConfig: GMCompletionConfig | null;
    /** Whether system prompt was seen for this model */
    hasSystemPrompt: boolean;
    /** Number of tools available */
    toolCount: number;
    /** Names of prompt sections */
    promptSectionTitles: string[];
    /** Total retries across all calls */
    totalRetries: number;
    /** Total error count */
    errorCount: number;
    /** Calls with exact responseModel */
    exactCallCount: number;
    /** Calls that only expose placeholder model IDs */
    placeholderOnlyCalls: number;
}

/** Per-conversation GM data */
export interface GMConversationData {
    cascadeId: string;
    title: string;
    totalSteps: number;
    calls: GMCallEntry[];
    /** Max calls observed for this conversation across rewinds/reloads. */
    lifetimeCalls?: number;
    coveredSteps: number;
    coverageRate: number;   // coveredSteps / totalSteps
    /** Deduplicated checkpoint summaries across all calls in this conversation */
    checkpointSummaries: GMCheckpointSummary[];
}

/** Full GM summary for UI rendering */
export interface GMSummary {
    conversations: GMConversationData[];
    modelBreakdown: Record<string, GMModelStats>;
    totalCalls: number;
    totalStepsCovered: number;
    totalCredits: number;
    totalInputTokens: number;
    totalOutputTokens: number;
    totalCacheRead: number;
    totalCacheCreation: number;
    totalThinkingTokens: number;
    /** Context growth data points: step → tokens */
    contextGrowth: { step: number; tokens: number; model: string }[];
    fetchedAt: string;
    /** Global retry overhead: total tokens wasted (input + output) */
    totalRetryTokens: number;
    /** Global retry overhead: credits consumed */
    totalRetryCredits: number;
    /** Global retry count */
    totalRetryCount: number;
    /** Latest token breakdown snapshot (from most recent GM entry) */
    latestTokenBreakdown: TokenBreakdownGroup[];
    /** Stop reason distribution: reason → count */
    stopReasonCounts: Record<string, number>;
}

/** Serialized form for globalState persistence */
export interface GMTrackerState {
    version: 1;
    summary: GMSummary;
    /** cascadeId → stepCount baselines to skip unchanged IDLE conversations */
    baselines: Record<string, number>;
    /** cascadeId → call count baselines to isolate quota cycles (added v1.13.2) */
    callBaselines?: Record<string, number>;
    /** executionIds of calls archived to dailyStore by per-pool resets (added v1.13.4) */
    archivedCallIds?: string[];
    /** Model ID → ISO cutoff timestamp: calls created before cutoff are excluded (added v1.14.0) */
    archivedModelCutoffs?: Record<string, string>;
}

// ─── Clone Utilities ─────────────────────────────────────────────────────────

export function cloneTokenBreakdownGroups(groups: TokenBreakdownGroup[]): TokenBreakdownGroup[] {
    return groups.map(group => ({
        ...group,
        children: group.children.map(child => ({ ...child })),
    }));
}

export function cloneGMCallEntry(call: GMCallEntry): GMCallEntry {
    return {
        ...call,
        stepIndices: [...call.stepIndices],
        toolNames: [...call.toolNames],
        promptSectionTitles: [...call.promptSectionTitles],
        messageMetadataKeys: [...call.messageMetadataKeys],
        responseHeaderKeys: [...call.responseHeaderKeys],
        userMessageAnchors: call.userMessageAnchors.map(anchor => ({ ...anchor })),
        retryErrors: [...call.retryErrors],
        tokenBreakdownGroups: cloneTokenBreakdownGroups(call.tokenBreakdownGroups),
        completionConfig: call.completionConfig ? { ...call.completionConfig } : null,
        checkpointSummaries: call.checkpointSummaries.map(cs => ({ ...cs })),
    };
}

export function cloneConversationData(conversation: GMConversationData): GMConversationData {
    return {
        ...conversation,
        calls: conversation.calls.map(cloneGMCallEntry),
        checkpointSummaries: conversation.checkpointSummaries.map(cs => ({ ...cs })),
    };
}
