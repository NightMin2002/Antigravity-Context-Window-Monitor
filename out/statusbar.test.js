"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const statusbar_1 = require("./statusbar");
// ─── formatTokenCount ─────────────────────────────────────────────────────────
(0, vitest_1.describe)('formatTokenCount', () => {
    (0, vitest_1.it)('should format values >= 1M with M suffix', () => {
        (0, vitest_1.expect)((0, statusbar_1.formatTokenCount)(1_000_000)).toBe('1M');
        (0, vitest_1.expect)((0, statusbar_1.formatTokenCount)(1_500_000)).toBe('1.5M');
        (0, vitest_1.expect)((0, statusbar_1.formatTokenCount)(2_000_000)).toBe('2M');
    });
    (0, vitest_1.it)('should format values >= 1K with k suffix', () => {
        (0, vitest_1.expect)((0, statusbar_1.formatTokenCount)(1_000)).toBe('1k');
        (0, vitest_1.expect)((0, statusbar_1.formatTokenCount)(45_231)).toBe('45.2k');
        (0, vitest_1.expect)((0, statusbar_1.formatTokenCount)(999_999)).toBe('1000k'); // rounds to integer
    });
    (0, vitest_1.it)('should format values < 1K as raw number', () => {
        (0, vitest_1.expect)((0, statusbar_1.formatTokenCount)(0)).toBe('0');
        (0, vitest_1.expect)((0, statusbar_1.formatTokenCount)(500)).toBe('500');
        (0, vitest_1.expect)((0, statusbar_1.formatTokenCount)(999)).toBe('999');
    });
    (0, vitest_1.it)('should clamp negative values to 0', () => {
        (0, vitest_1.expect)((0, statusbar_1.formatTokenCount)(-100)).toBe('0');
    });
});
// ─── formatContextLimit ───────────────────────────────────────────────────────
(0, vitest_1.describe)('formatContextLimit', () => {
    (0, vitest_1.it)('should format 1M limit correctly', () => {
        (0, vitest_1.expect)((0, statusbar_1.formatContextLimit)(1_000_000)).toBe('1M');
    });
    (0, vitest_1.it)('should format 200K limit correctly', () => {
        (0, vitest_1.expect)((0, statusbar_1.formatContextLimit)(200_000)).toBe('200k');
    });
    (0, vitest_1.it)('should format 128K limit correctly', () => {
        (0, vitest_1.expect)((0, statusbar_1.formatContextLimit)(128_000)).toBe('128k');
    });
    (0, vitest_1.it)('should clamp negative values to 0', () => {
        (0, vitest_1.expect)((0, statusbar_1.formatContextLimit)(-1)).toBe('0');
    });
});
// ─── calculateCompressionStats ────────────────────────────────────────────────
function makeUsage(overrides) {
    return {
        cascadeId: 'test-id',
        title: 'Test',
        model: 'MODEL_PLACEHOLDER_M37',
        modelDisplayName: 'Gemini 3.1 Pro',
        contextUsed: 100_000,
        totalOutputTokens: 5_000,
        totalToolCallOutputTokens: 2_000,
        contextLimit: 1_000_000,
        usagePercent: 10,
        stepCount: 5,
        lastModifiedTime: '',
        status: 'IDLE',
        isEstimated: false,
        lastModelUsage: null,
        estimatedDeltaSinceCheckpoint: 0,
        imageGenStepCount: 0,
        compressionDetected: false,
        checkpointCompressionDrop: 0,
        hasGaps: false,
        createdTime: '',
        lastUserInputTime: '',
        lastUserInputStepIndex: 0,
        repositoryName: '',
        gitOriginUrl: '',
        branchName: '',
        gitRootUri: '',
        ...overrides,
    };
}
(0, vitest_1.describe)('calculateCompressionStats', () => {
    (0, vitest_1.it)('should return null when no compression detected', () => {
        const usage = makeUsage({ compressionDetected: false });
        (0, vitest_1.expect)((0, statusbar_1.calculateCompressionStats)(usage)).toBeNull();
    });
    (0, vitest_1.it)('should calculate context drop stats', () => {
        const usage = makeUsage({
            compressionDetected: true,
            previousContextUsed: 200_000,
            contextUsed: 100_000,
        });
        const stats = (0, statusbar_1.calculateCompressionStats)(usage);
        (0, vitest_1.expect)(stats).not.toBeNull();
        (0, vitest_1.expect)(stats.source).toBe('context');
        (0, vitest_1.expect)(stats.dropTokens).toBe(100_000);
        (0, vitest_1.expect)(stats.dropPercent).toBe(50);
    });
    (0, vitest_1.it)('should calculate checkpoint drop stats as fallback', () => {
        const usage = makeUsage({
            compressionDetected: true,
            checkpointCompressionDrop: 50_000,
            lastModelUsage: {
                model: 'M37',
                inputTokens: 80_000,
                outputTokens: 5_000,
                responseOutputTokens: 0,
                cacheReadTokens: 0,
            },
        });
        const stats = (0, statusbar_1.calculateCompressionStats)(usage);
        (0, vitest_1.expect)(stats).not.toBeNull();
        (0, vitest_1.expect)(stats.source).toBe('checkpoint');
        (0, vitest_1.expect)(stats.dropTokens).toBe(50_000);
        // previousInput = 80K + 50K = 130K → dropPercent = 50K/130K ≈ 38.5%
        (0, vitest_1.expect)(stats.dropPercent).toBeCloseTo(38.46, 1);
    });
});
//# sourceMappingURL=statusbar.test.js.map