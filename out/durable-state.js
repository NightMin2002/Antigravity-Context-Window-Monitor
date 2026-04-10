"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.DurableState = void 0;
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const DEFAULT_STATE = {
    version: 1,
    global: {},
    workspaces: {},
};
function getDefaultStateFilePath() {
    if (process.platform === 'win32' && process.env.APPDATA) {
        return path.join(process.env.APPDATA, 'Antigravity Context Monitor', 'state-v1.json');
    }
    if (process.platform === 'darwin') {
        return path.join(os.homedir(), 'Library', 'Application Support', 'Antigravity Context Monitor', 'state-v1.json');
    }
    const stateHome = process.env.XDG_STATE_HOME || path.join(os.homedir(), '.local', 'state');
    return path.join(stateHome, 'antigravity-context-monitor', 'state-v1.json');
}
function hasOwn(target, key) {
    return Object.prototype.hasOwnProperty.call(target, key);
}
class DurableState {
    static SAVE_DEBOUNCE_MS = 250;
    _filePath;
    _data;
    _lastSerialized;
    _saveTimer;
    _pendingVersion = 0;
    _writtenVersion = 0;
    _flushInFlight = null;
    _waiters = new Map();
    constructor(filePath = getDefaultStateFilePath()) {
        this._filePath = filePath;
        this._data = this._load();
        this._lastSerialized = this._serialize(this._data);
    }
    globalBucket(fallback) {
        return this._createBucket('global', undefined, fallback);
    }
    workspaceBucket(workspaceKey, fallback) {
        return this._createBucket('workspace', workspaceKey, fallback);
    }
    getFilePath() {
        return this._filePath;
    }
    exists() {
        return fs.existsSync(this._filePath);
    }
    _createBucket(kind, workspaceKey, fallback) {
        return {
            get: (key, defaultValue) => {
                const source = kind === 'global'
                    ? this._data.global
                    : (this._data.workspaces[workspaceKey || '__default__'] || {});
                if (hasOwn(source, key)) {
                    return source[key];
                }
                const fallbackValue = fallback?.get(key, defaultValue) ?? defaultValue;
                this._set(kind, key, fallbackValue, workspaceKey);
                return fallbackValue;
            },
            update: async (key, value) => {
                await this._set(kind, key, value, workspaceKey);
                if (fallback) {
                    await fallback.update(key, value);
                }
            },
        };
    }
    _set(kind, key, value, workspaceKey) {
        if (kind === 'global') {
            this._data.global[key] = value;
        }
        else {
            const bucketKey = workspaceKey || '__default__';
            if (!this._data.workspaces[bucketKey]) {
                this._data.workspaces[bucketKey] = {};
            }
            this._data.workspaces[bucketKey][key] = value;
        }
        return this._scheduleSave();
    }
    _load() {
        try {
            if (!fs.existsSync(this._filePath)) {
                return { ...DEFAULT_STATE };
            }
            const raw = fs.readFileSync(this._filePath, 'utf8');
            const parsed = JSON.parse(raw);
            if (parsed.version !== 1) {
                return { ...DEFAULT_STATE };
            }
            return {
                version: 1,
                global: parsed.global || {},
                workspaces: parsed.workspaces || {},
            };
        }
        catch {
            return { ...DEFAULT_STATE };
        }
    }
    _serialize(data) {
        return JSON.stringify(data, null, 2);
    }
    _scheduleSave() {
        this._pendingVersion++;
        const version = this._pendingVersion;
        const pending = new Promise(resolve => {
            const waiters = this._waiters.get(version) || [];
            waiters.push(resolve);
            this._waiters.set(version, waiters);
        });
        if (this._saveTimer) {
            clearTimeout(this._saveTimer);
        }
        this._saveTimer = setTimeout(() => {
            this._saveTimer = undefined;
            void this._flush();
        }, DurableState.SAVE_DEBOUNCE_MS);
        return pending;
    }
    _resolveWaitersUpTo(version) {
        for (const waiterVersion of [...this._waiters.keys()]) {
            if (waiterVersion > version) {
                continue;
            }
            const waiters = this._waiters.get(waiterVersion) || [];
            this._waiters.delete(waiterVersion);
            for (const resolve of waiters) {
                resolve();
            }
        }
    }
    async _flush() {
        if (this._flushInFlight) {
            await this._flushInFlight;
            return;
        }
        const targetVersion = this._pendingVersion;
        const serialized = this._serialize(this._data);
        if (serialized === this._lastSerialized) {
            this._writtenVersion = Math.max(this._writtenVersion, targetVersion);
            this._resolveWaitersUpTo(this._writtenVersion);
            return;
        }
        this._flushInFlight = (async () => {
            try {
                await fs.promises.mkdir(path.dirname(this._filePath), { recursive: true });
                await fs.promises.writeFile(this._filePath, serialized, 'utf8');
                this._lastSerialized = serialized;
            }
            catch {
                // Ignore persistence failures; VS Code state remains as fallback.
            }
            finally {
                this._writtenVersion = Math.max(this._writtenVersion, targetVersion);
                this._resolveWaitersUpTo(this._writtenVersion);
                this._flushInFlight = null;
                if (!this._saveTimer && this._pendingVersion > this._writtenVersion) {
                    void this._flush();
                }
            }
        })();
        await this._flushInFlight;
    }
}
exports.DurableState = DurableState;
//# sourceMappingURL=durable-state.js.map