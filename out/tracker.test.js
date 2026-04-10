"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const tracker_1 = require("./tracker");
const constants_1 = require("./constants");
// ─── normalizeUri ────────────────────────────────────────────────────────────
(0, vitest_1.describe)('normalizeUri', () => {
    (0, vitest_1.it)('should strip file:/// prefix', () => {
        (0, vitest_1.expect)((0, tracker_1.normalizeUri)('file:///home/user/project')).toBe('/home/user/project');
    });
    (0, vitest_1.it)('should strip vscode-remote:// scheme+authority (WSL)', () => {
        const result = (0, tracker_1.normalizeUri)('vscode-remote://wsl+Ubuntu/home/user/project');
        (0, vitest_1.expect)(result).toBe('/home/user/project');
    });
    (0, vitest_1.it)('should strip vscode-remote:// scheme+authority (SSH)', () => {
        const result = (0, tracker_1.normalizeUri)('vscode-remote://ssh-remote+myhost/home/user/project');
        (0, vitest_1.expect)(result).toBe('/home/user/project');
    });
    (0, vitest_1.it)('should produce same result for file:// and vscode-remote:// with same path', () => {
        const fileUri = (0, tracker_1.normalizeUri)('file:///home/user/project');
        const remoteUri = (0, tracker_1.normalizeUri)('vscode-remote://wsl+Ubuntu/home/user/project');
        (0, vitest_1.expect)(remoteUri).toBe(fileUri);
    });
    (0, vitest_1.it)('should decode URL-encoded characters', () => {
        (0, vitest_1.expect)((0, tracker_1.normalizeUri)('file:///home/user/my%20project')).toBe('/home/user/my project');
    });
    (0, vitest_1.it)('should remove trailing slash', () => {
        (0, vitest_1.expect)((0, tracker_1.normalizeUri)('file:///home/user/project/')).toBe('/home/user/project');
    });
});
// ─── estimateTokensFromText ──────────────────────────────────────────────────
(0, vitest_1.describe)('estimateTokensFromText', () => {
    (0, vitest_1.it)('should return 0 for empty string', () => {
        (0, vitest_1.expect)((0, tracker_1.estimateTokensFromText)('')).toBe(0);
    });
    (0, vitest_1.it)('should estimate ASCII text at ~4 chars/token', () => {
        const text = 'Hello World!'; // 12 ASCII chars → ceil(12/4) = 3
        (0, vitest_1.expect)((0, tracker_1.estimateTokensFromText)(text)).toBe(3);
    });
    (0, vitest_1.it)('should estimate non-ASCII text at ~1.5 chars/token', () => {
        const text = '你好世界'; // 4 non-ASCII chars → ceil(4/1.5) = 3
        (0, vitest_1.expect)((0, tracker_1.estimateTokensFromText)(text)).toBe(3);
    });
    (0, vitest_1.it)('should handle mixed ASCII and non-ASCII', () => {
        const text = 'Hello 你好'; // 6 ASCII + 2 non-ASCII → ceil(6/4 + 2/1.5) = ceil(1.5 + 1.33) = 3
        (0, vitest_1.expect)((0, tracker_1.estimateTokensFromText)(text)).toBe(3);
    });
});
// ─── processSteps ────────────────────────────────────────────────────────────
(0, vitest_1.describe)('processSteps', () => {
    (0, vitest_1.it)('should return zero values for empty steps', () => {
        const result = (0, tracker_1.processSteps)([]);
        (0, vitest_1.expect)(result.contextUsed).toBe(0 + 10_000 + 0); // SYSTEM_PROMPT_OVERHEAD fallback only
        (0, vitest_1.expect)(result.isEstimated).toBe(true);
        (0, vitest_1.expect)(result.model).toBe('');
        (0, vitest_1.expect)(result.imageGenStepCount).toBe(0);
    });
    (0, vitest_1.it)('should count user input steps via text estimation', () => {
        const steps = [
            {
                type: constants_1.StepType.USER_INPUT,
                userInput: { userResponse: 'Hello World!' }, // 12 ASCII → 3 tokens
            }
        ];
        const result = (0, tracker_1.processSteps)(steps);
        // Fallback path: SYSTEM_PROMPT_OVERHEAD + estimationOverhead
        (0, vitest_1.expect)(result.isEstimated).toBe(true);
        (0, vitest_1.expect)(result.estimatedDeltaSinceCheckpoint).toBeGreaterThan(0);
    });
    (0, vitest_1.it)('should use fixed constant when userInput object is missing', () => {
        const steps = [
            { type: constants_1.StepType.USER_INPUT }
        ];
        const result = (0, tracker_1.processSteps)(steps);
        // Should use USER_INPUT_OVERHEAD = 500 as fallback
        (0, vitest_1.expect)(result.isEstimated).toBe(true);
        (0, vitest_1.expect)(result.contextUsed).toBe(10_000 + 500); // SYSTEM_PROMPT_OVERHEAD + USER_INPUT_OVERHEAD
    });
    (0, vitest_1.it)('should extract model from checkpoint modelUsage', () => {
        const steps = [
            {
                type: constants_1.StepType.CHECKPOINT,
                metadata: {
                    modelUsage: {
                        model: 'MODEL_PLACEHOLDER_M37',
                        inputTokens: '50000',
                        outputTokens: '5000',
                        responseOutputTokens: '0',
                        cacheReadTokens: '10000',
                    }
                }
            }
        ];
        const result = (0, tracker_1.processSteps)(steps);
        (0, vitest_1.expect)(result.model).toBe('MODEL_PLACEHOLDER_M37');
        (0, vitest_1.expect)(result.isEstimated).toBe(false);
        (0, vitest_1.expect)(result.inputTokens).toBe(50000);
        (0, vitest_1.expect)(result.totalOutputTokens).toBe(5000);
        (0, vitest_1.expect)(result.contextUsed).toBe(55000); // inputTokens + outputTokens
        (0, vitest_1.expect)(result.lastModelUsage?.cacheReadTokens).toBe(10000);
    });
    (0, vitest_1.it)('should detect compression when checkpoint inputTokens drops', () => {
        const steps = [
            {
                type: constants_1.StepType.CHECKPOINT,
                metadata: {
                    modelUsage: {
                        inputTokens: '100000',
                        outputTokens: '5000',
                    }
                }
            },
            {
                type: constants_1.StepType.CHECKPOINT,
                metadata: {
                    modelUsage: {
                        inputTokens: '50000', // dropped 50K — should trigger compression
                        outputTokens: '3000',
                    }
                }
            }
        ];
        const result = (0, tracker_1.processSteps)(steps);
        (0, vitest_1.expect)(result.checkpointCompressionDetected).toBe(true);
        (0, vitest_1.expect)(result.checkpointCompressionDrop).toBe(50000);
    });
    (0, vitest_1.it)('should NOT detect compression for small drops', () => {
        const steps = [
            {
                type: constants_1.StepType.CHECKPOINT,
                metadata: {
                    modelUsage: {
                        inputTokens: '100000',
                        outputTokens: '5000',
                    }
                }
            },
            {
                type: constants_1.StepType.CHECKPOINT,
                metadata: {
                    modelUsage: {
                        inputTokens: '98000', // dropped only 2K — below COMPRESSION_MIN_DROP
                        outputTokens: '3000',
                    }
                }
            }
        ];
        const result = (0, tracker_1.processSteps)(steps);
        (0, vitest_1.expect)(result.checkpointCompressionDetected).toBe(false);
    });
    (0, vitest_1.it)('should detect image generation by step type', () => {
        const steps = [
            { type: 'CORTEX_STEP_TYPE_IMAGE_GENERATE', metadata: {} },
        ];
        const result = (0, tracker_1.processSteps)(steps);
        (0, vitest_1.expect)(result.imageGenStepCount).toBe(1);
    });
    (0, vitest_1.it)('should detect image generation by model name (nano banana)', () => {
        const steps = [
            {
                type: 'CORTEX_STEP_TYPE_PLANNER_RESPONSE',
                plannerResponse: { response: 'image generated' },
                metadata: { generatorModel: 'nano_banana_pro_v2' }
            },
        ];
        const result = (0, tracker_1.processSteps)(steps);
        (0, vitest_1.expect)(result.imageGenStepCount).toBe(1);
    });
    (0, vitest_1.it)('should not double-count image gen steps', () => {
        const steps = [
            {
                type: 'CORTEX_STEP_TYPE_IMAGE_GENERATE',
                metadata: { generatorModel: 'nano_banana_pro' }
            },
        ];
        const result = (0, tracker_1.processSteps)(steps);
        (0, vitest_1.expect)(result.imageGenStepCount).toBe(1); // Only counted once
    });
    (0, vitest_1.it)('should track toolCallOutputTokens', () => {
        const steps = [
            {
                type: 'CORTEX_STEP_TYPE_TOOL_RESULT',
                metadata: { toolCallOutputTokens: 1500, generatorModel: 'MODEL_PLACEHOLDER_M37' }
            },
            {
                type: 'CORTEX_STEP_TYPE_TOOL_RESULT',
                metadata: { toolCallOutputTokens: 2500, generatorModel: 'MODEL_PLACEHOLDER_M37' }
            }
        ];
        const result = (0, tracker_1.processSteps)(steps);
        (0, vitest_1.expect)(result.totalToolCallOutputTokens).toBe(4000);
        (0, vitest_1.expect)(result.stepDetails).toHaveLength(2);
    });
    (0, vitest_1.it)('should prioritize requestedModel over generatorModel', () => {
        const steps = [
            {
                type: constants_1.StepType.PLANNER_RESPONSE,
                plannerResponse: { response: 'test' },
                metadata: {
                    generatorModel: 'MODEL_A',
                    requestedModel: { model: 'MODEL_B' }
                }
            }
        ];
        const result = (0, tracker_1.processSteps)(steps);
        (0, vitest_1.expect)(result.model).toBe('MODEL_B');
    });
    (0, vitest_1.it)('should reset estimation overhead after checkpoint', () => {
        const steps = [
            {
                type: constants_1.StepType.USER_INPUT,
                userInput: { userResponse: 'Long question about something' },
            },
            {
                type: constants_1.StepType.CHECKPOINT,
                metadata: {
                    modelUsage: {
                        inputTokens: '80000',
                        outputTokens: '4000',
                    }
                }
            },
            {
                type: constants_1.StepType.USER_INPUT,
                userInput: { userResponse: 'Short' },
            }
        ];
        const result = (0, tracker_1.processSteps)(steps);
        // After checkpoint, only the last user input contributes to delta
        (0, vitest_1.expect)(result.inputTokens).toBe(80000);
        (0, vitest_1.expect)(result.isEstimated).toBe(true); // Has estimated delta after checkpoint
        // estimatedDelta should be small (only "Short" ≈ 2 tokens)
        (0, vitest_1.expect)(result.estimatedDeltaSinceCheckpoint).toBeLessThan(100);
    });
});
//# sourceMappingURL=tracker.test.js.map