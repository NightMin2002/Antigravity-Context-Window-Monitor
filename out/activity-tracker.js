"use strict";
// ─── Activity Tracker (Barrel Re-export) ─────────────────────────────────────
// This file exists for backward compatibility.
// All logic has been modularized into src/activity/.
// External consumers can continue to:  import { ... } from './activity-tracker';
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActivityTracker = exports.normalizeStepsByModelRecord = exports.mergeGMStats = exports.mergeActivityStats = exports.mergeCountRecord = exports.sameStepDistribution = exports.buildGMVirtualPreview = exports.extractNotifyMessage = exports.isLowSignalPromptSnippet = exports.buildLegacyStepEventIdentity = exports.buildRawStepFingerprint = exports.buildGMEventKey = exports.sameTriggeredByScope = exports.extractToolName = exports.extractToolDetail = exports.stepDurationTool = exports.stepDurationReasoning = exports.truncate = exports.classifyStep = void 0;
var activity_1 = require("./activity");
Object.defineProperty(exports, "classifyStep", { enumerable: true, get: function () { return activity_1.classifyStep; } });
Object.defineProperty(exports, "truncate", { enumerable: true, get: function () { return activity_1.truncate; } });
Object.defineProperty(exports, "stepDurationReasoning", { enumerable: true, get: function () { return activity_1.stepDurationReasoning; } });
Object.defineProperty(exports, "stepDurationTool", { enumerable: true, get: function () { return activity_1.stepDurationTool; } });
Object.defineProperty(exports, "extractToolDetail", { enumerable: true, get: function () { return activity_1.extractToolDetail; } });
Object.defineProperty(exports, "extractToolName", { enumerable: true, get: function () { return activity_1.extractToolName; } });
Object.defineProperty(exports, "sameTriggeredByScope", { enumerable: true, get: function () { return activity_1.sameTriggeredByScope; } });
Object.defineProperty(exports, "buildGMEventKey", { enumerable: true, get: function () { return activity_1.buildGMEventKey; } });
Object.defineProperty(exports, "buildRawStepFingerprint", { enumerable: true, get: function () { return activity_1.buildRawStepFingerprint; } });
Object.defineProperty(exports, "buildLegacyStepEventIdentity", { enumerable: true, get: function () { return activity_1.buildLegacyStepEventIdentity; } });
Object.defineProperty(exports, "isLowSignalPromptSnippet", { enumerable: true, get: function () { return activity_1.isLowSignalPromptSnippet; } });
Object.defineProperty(exports, "extractNotifyMessage", { enumerable: true, get: function () { return activity_1.extractNotifyMessage; } });
Object.defineProperty(exports, "buildGMVirtualPreview", { enumerable: true, get: function () { return activity_1.buildGMVirtualPreview; } });
Object.defineProperty(exports, "sameStepDistribution", { enumerable: true, get: function () { return activity_1.sameStepDistribution; } });
Object.defineProperty(exports, "mergeCountRecord", { enumerable: true, get: function () { return activity_1.mergeCountRecord; } });
Object.defineProperty(exports, "mergeActivityStats", { enumerable: true, get: function () { return activity_1.mergeActivityStats; } });
Object.defineProperty(exports, "mergeGMStats", { enumerable: true, get: function () { return activity_1.mergeGMStats; } });
Object.defineProperty(exports, "normalizeStepsByModelRecord", { enumerable: true, get: function () { return activity_1.normalizeStepsByModelRecord; } });
Object.defineProperty(exports, "ActivityTracker", { enumerable: true, get: function () { return activity_1.ActivityTracker; } });
//# sourceMappingURL=activity-tracker.js.map