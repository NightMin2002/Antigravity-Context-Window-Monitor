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
exports.buildChatHistoryTabContent = buildChatHistoryTabContent;
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const i18n_1 = require("./i18n");
const tracker_1 = require("./tracker");
const webview_helpers_1 = require("./webview-helpers");
const webview_icons_1 = require("./webview-icons");
function getAntigravityRoot() {
    return path.join(os.homedir(), '.gemini', 'antigravity');
}
function exists(targetPath) {
    try {
        fs.accessSync(targetPath);
        return true;
    }
    catch {
        return false;
    }
}
function fileUriToPath(uri) {
    if (!uri) {
        return '';
    }
    if (uri.startsWith('file:///')) {
        const raw = decodeURIComponent(uri.replace('file:///', ''));
        return process.platform === 'win32'
            ? raw.replace(/\//g, path.sep)
            : '/' + raw;
    }
    return uri;
}
function getWorkspaceLabel(workspaceUri, repositoryName) {
    const localPath = fileUriToPath(workspaceUri);
    const cleanPath = localPath.replace(/[\\/]+$/, '');
    const base = cleanPath ? path.basename(cleanPath) : '';
    const label = base || repositoryName || (0, i18n_1.tBi)('Unscoped', '未分组');
    const subtitle = repositoryName && repositoryName !== label
        ? repositoryName
        : (cleanPath || (0, i18n_1.tBi)('No workspace path', '无工作区路径'));
    return { label, subtitle, localPath: cleanPath };
}
function getGMStats(cascadeId, gmSummary, gmConversations) {
    const conversation = gmSummary?.conversations.find(item => item.cascadeId === cascadeId)
        || gmConversations?.[cascadeId]
        || null;
    if (!conversation || conversation.calls.length === 0) {
        return { calls: 0, credits: 0, latestModel: '' };
    }
    let credits = 0;
    for (const call of conversation.calls) {
        credits += call.credits;
    }
    const latestCall = conversation.calls[conversation.calls.length - 1];
    return {
        calls: conversation.calls.length,
        credits,
        latestModel: latestCall.responseModel || latestCall.modelDisplay || latestCall.model || '',
    };
}
function buildEntries(trajectories, currentUsage, gmSummary, gmConversations, currentWorkspaceUri) {
    const antigravityRoot = getAntigravityRoot();
    const normalizedCurrentWorkspace = currentWorkspaceUri ? (0, tracker_1.normalizeUri)(currentWorkspaceUri) : '';
    const currentRepoName = currentUsage?.repositoryName || '';
    return trajectories.map((trajectory) => {
        const workspaceUri = trajectory.workspaceUris[0] || trajectory.gitRootUri || '';
        const workspaceMeta = getWorkspaceLabel(workspaceUri, trajectory.repositoryName);
        const normalizedWorkspace = workspaceUri ? (0, tracker_1.normalizeUri)(workspaceUri) : '';
        const gmStats = getGMStats(trajectory.cascadeId, gmSummary, gmConversations);
        const pbPath = path.join(antigravityRoot, 'conversations', `${trajectory.cascadeId}.pb`);
        const brainDir = path.join(antigravityRoot, 'brain', trajectory.cascadeId);
        const recordingDir = path.join(antigravityRoot, 'browser_recordings', trajectory.cascadeId);
        const modelId = trajectory.requestedModel || trajectory.generatorModel || '';
        return {
            cascadeId: trajectory.cascadeId,
            title: trajectory.summary || `${(0, i18n_1.tBi)('Conversation', '对话')} ${trajectory.cascadeId.substring(0, 8)}`,
            workspaceLabel: workspaceMeta.label,
            workspacePath: workspaceMeta.localPath,
            workspaceUri,
            repositoryName: trajectory.repositoryName,
            branchName: trajectory.branchName,
            status: trajectory.status.replace('CASCADE_STATUS_', '').replace('CASCADE_RUN_STATUS_', ''),
            modelLabel: (0, tracker_1.getModelDisplayName)(modelId || ''),
            stepCount: trajectory.stepCount,
            createdTime: trajectory.createdTime,
            lastModifiedTime: trajectory.lastModifiedTime,
            lastUserInputTime: trajectory.lastUserInputTime,
            isCurrentSession: currentUsage?.cascadeId === trajectory.cascadeId,
            isCurrentWorkspace: !!normalizedCurrentWorkspace && normalizedWorkspace === normalizedCurrentWorkspace,
            isCurrentRepo: !!currentRepoName && trajectory.repositoryName === currentRepoName,
            hasPb: exists(pbPath),
            hasBrain: exists(brainDir),
            hasRecording: exists(recordingDir),
            gmCalls: gmStats.calls,
            gmCredits: gmStats.credits,
            latestGMModel: gmStats.latestModel,
        };
    }).sort((a, b) => Date.parse(b.lastModifiedTime || '') - Date.parse(a.lastModifiedTime || ''));
}
function buildGroups(entries) {
    const grouped = new Map();
    for (const entry of entries) {
        const key = entry.workspacePath || entry.repositoryName || entry.workspaceLabel;
        const existing = grouped.get(key);
        if (existing) {
            existing.entries.push(entry);
            existing.isCurrentWorkspace = existing.isCurrentWorkspace || entry.isCurrentWorkspace;
            continue;
        }
        grouped.set(key, {
            key,
            label: entry.workspaceLabel,
            subtitle: entry.workspacePath || entry.repositoryName || (0, i18n_1.tBi)('No workspace path', '无工作区路径'),
            entries: [entry],
            isCurrentWorkspace: entry.isCurrentWorkspace,
        });
    }
    return [...grouped.values()]
        .sort((a, b) => {
        if (a.isCurrentWorkspace !== b.isCurrentWorkspace) {
            return a.isCurrentWorkspace ? -1 : 1;
        }
        const aLatest = Date.parse(a.entries[0]?.lastModifiedTime || '') || 0;
        const bLatest = Date.parse(b.entries[0]?.lastModifiedTime || '') || 0;
        return bLatest - aLatest;
    });
}
function renderSummary(entries, groups) {
    const currentWorkspaceCount = entries.filter(entry => entry.isCurrentWorkspace).length;
    const runningCount = entries.filter(entry => entry.status === 'RUNNING').length;
    const recordableCount = entries.filter(entry => entry.hasBrain || entry.hasPb || entry.hasRecording).length;
    return `
        <div class="history-stats-grid">
            <section class="card history-stat-card">
                <div class="history-stat-value">${entries.length}</div>
                <div class="history-stat-label">${(0, i18n_1.tBi)('Conversations', '对话')} · ${groups.length} ${(0, i18n_1.tBi)('groups', '组')}</div>
            </section>
            <section class="card history-stat-card">
                <div class="history-stat-value">${currentWorkspaceCount}</div>
                <div class="history-stat-label">${(0, i18n_1.tBi)('Workspace', '工作区')} · ${runningCount} ${(0, i18n_1.tBi)('running', '运行中')}</div>
            </section>
            <section class="card history-stat-card">
                <div class="history-stat-value">${recordableCount}</div>
                <div class="history-stat-label">${(0, i18n_1.tBi)('Recordable', '可备份')}</div>
            </section>
        </div>`;
}
function renderShortcuts(entries, currentUsage) {
    const currentRepoName = currentUsage?.repositoryName || entries.find(entry => entry.isCurrentRepo)?.repositoryName || '';
    const currentWorkspaceCount = entries.filter(entry => entry.isCurrentWorkspace).length;
    const currentRepoCount = currentRepoName ? entries.filter(entry => entry.isCurrentRepo).length : 0;
    const recordableCount = entries.filter(entry => entry.hasBrain || entry.hasPb || entry.hasRecording).length;
    const cards = [
        {
            filter: 'current',
            icon: webview_icons_1.ICON.folder,
            kicker: (0, i18n_1.tBi)('Quick Entry', '固定入口'),
            title: (0, i18n_1.tBi)('Current Workspace', '当前工作区'),
            subtitle: (0, i18n_1.tBi)(`${currentWorkspaceCount} conversations ready to continue`, `${currentWorkspaceCount} 条对话可继续`),
            count: currentWorkspaceCount,
            active: currentWorkspaceCount > 0,
        },
        {
            filter: 'currentrepo',
            icon: webview_icons_1.ICON.git,
            kicker: (0, i18n_1.tBi)('Quick Entry', '固定入口'),
            title: currentRepoName || (0, i18n_1.tBi)('Current Repository', '当前仓库'),
            subtitle: currentRepoName
                ? (0, i18n_1.tBi)(`${currentRepoCount} conversations under this repo`, `${currentRepoCount} 条对话归属这个仓库`)
                : (0, i18n_1.tBi)('Current conversation has no repository metadata yet', '当前对话暂时没有仓库元数据'),
            count: currentRepoCount,
            active: currentRepoCount > 0,
        },
        {
            filter: 'recordable',
            icon: webview_icons_1.ICON.database,
            kicker: (0, i18n_1.tBi)('Quick Entry', '固定入口'),
            title: (0, i18n_1.tBi)('Backup Ready', '可备份记录'),
            subtitle: (0, i18n_1.tBi)(`${recordableCount} conversations already have local artifacts`, `${recordableCount} 条对话已有本地记录`),
            count: recordableCount,
            active: recordableCount > 0,
        },
    ];
    return `
        <section class="history-shortcuts-grid">
            ${cards.map(card => `
                <button
                    class="history-shortcut-card${card.active ? '' : ' is-disabled'}"
                    data-history-shortcut="${card.filter}"
                    ${card.active ? '' : 'disabled'}
                >
                    <div class="history-shortcut-head">
                        <span class="history-shortcut-kicker">${card.kicker}</span>
                        <span class="history-shortcut-count">${card.count}</span>
                    </div>
                    <div class="history-shortcut-title">${card.icon} ${(0, webview_helpers_1.esc)(card.title)}</div>
                    <div class="history-shortcut-subtitle">${(0, webview_helpers_1.esc)(card.subtitle)}</div>
                </button>
            `).join('')}
        </section>`;
}
function renderToolbar() {
    return `
        <section class="card history-toolbar-card">
            <div class="history-toolbar-grid">
                <label class="history-search-field">
                    <span class="history-search-label">${webview_icons_1.ICON.chat} ${(0, i18n_1.tBi)('Search', '搜索')}</span>
                    <input
                        id="historySearchInput"
                        class="history-search-input"
                        type="text"
                        placeholder="${(0, webview_helpers_1.esc)((0, i18n_1.tBi)('Search title / folder / repo / model', '搜索标题 / 文件夹 / 仓库 / 模型'))}"
                        autocomplete="off"
                        spellcheck="false"
                    />
                </label>
                <div class="history-filter-bar" role="tablist" aria-label="${(0, webview_helpers_1.esc)((0, i18n_1.tBi)('Session catalog filters', '会话目录筛选'))}">
                    <button class="history-filter-btn is-active" data-history-filter="all">${(0, i18n_1.tBi)('All', '全部')}</button>
                    <button class="history-filter-btn" data-history-filter="current">${(0, i18n_1.tBi)('Current Workspace', '当前工作区')}</button>
                    <button class="history-filter-btn" data-history-filter="currentrepo">${(0, i18n_1.tBi)('Current Repo', '当前仓库')}</button>
                    <button class="history-filter-btn" data-history-filter="running">${(0, i18n_1.tBi)('Running', '运行中')}</button>
                    <button class="history-filter-btn" data-history-filter="recordable">${(0, i18n_1.tBi)('Recordable', '可备份')}</button>
                </div>
            </div>
        </section>`;
}
function renderGroup(group, index) {
    const runningCount = group.entries.filter(entry => entry.status === 'RUNNING').length;
    const recordableCount = group.entries.filter(entry => entry.hasPb || entry.hasBrain || entry.hasRecording).length;
    const openAttr = group.isCurrentWorkspace || index === 0 ? ' open' : '';
    const rows = group.entries.map((entry) => {
        const searchCorpus = [
            entry.title,
            entry.workspaceLabel,
            entry.workspacePath,
            entry.repositoryName,
            entry.branchName,
            entry.modelLabel,
            entry.latestGMModel,
        ].join(' ').toLowerCase();
        const statusClass = entry.status === 'RUNNING'
            ? 'is-running'
            : entry.status === 'FINISHED'
                ? 'is-finished'
                : 'is-idle';
        const storageBadges = [];
        if (entry.hasBrain) {
            storageBadges.push(`<span class="history-storage-badge">${(0, i18n_1.tBi)('Brain', 'Brain')}</span>`);
        }
        if (entry.hasRecording) {
            storageBadges.push(`<span class="history-storage-badge">${(0, i18n_1.tBi)('Recording', '录屏')}</span>`);
        }
        if (entry.hasPb) {
            storageBadges.push(`<span class="history-storage-badge">${(0, i18n_1.tBi)('PB', 'PB')}</span>`);
        }
        const gmBits = [];
        if (entry.gmCalls > 0) {
            gmBits.push(`${entry.gmCalls} ${(0, i18n_1.tBi)('calls', '调用')}`);
        }
        if (entry.gmCredits > 0) {
            gmBits.push(`${entry.gmCredits} ${(0, i18n_1.tBi)('cr', '积分')}`);
        }
        if (entry.latestGMModel) {
            gmBits.push(entry.latestGMModel);
        }
        return `
            <article
                class="history-row${entry.isCurrentSession ? ' is-current-session' : ''}"
                data-history-row="true"
                data-search="${(0, webview_helpers_1.esc)(searchCorpus)}"
                data-current-workspace="${entry.isCurrentWorkspace ? 'true' : 'false'}"
                data-current-repo="${entry.isCurrentRepo ? 'true' : 'false'}"
                data-running="${entry.status === 'RUNNING' ? 'true' : 'false'}"
                data-recordable="${entry.hasPb || entry.hasBrain || entry.hasRecording ? 'true' : 'false'}"
            >
                <div class="history-row-main">
                    <div class="history-row-header">
                        <div class="history-row-title-wrap">
                            <h3 class="history-row-title">${(0, webview_helpers_1.esc)(entry.title)}</h3>
                            <div class="history-row-subtitle">${(0, webview_helpers_1.esc)(entry.repositoryName || entry.workspaceLabel)}</div>
                        </div>
                        <div class="history-row-badges">
                            ${entry.isCurrentSession ? `<span class="history-badge is-current">${(0, i18n_1.tBi)('Current', '当前')}</span>` : ''}
                            ${entry.isCurrentWorkspace ? `<span class="history-badge is-workspace">${(0, i18n_1.tBi)('Workspace', '本工作区')}</span>` : ''}
                            ${entry.isCurrentRepo ? `<span class="history-badge is-repo">${(0, i18n_1.tBi)('Repo', '当前仓库')}</span>` : ''}
                            <span class="history-badge ${statusClass}">${(0, webview_helpers_1.esc)(entry.status || 'UNKNOWN')}</span>
                        </div>
                    </div>
                    <div class="history-row-meta">
                        <span class="history-meta-chip">${webview_icons_1.ICON.folder} ${(0, webview_helpers_1.esc)(entry.workspaceLabel)}</span>
                        ${entry.branchName ? `<span class="history-meta-chip">${webview_icons_1.ICON.branch} ${(0, webview_helpers_1.esc)(entry.branchName)}</span>` : ''}
                        ${entry.modelLabel ? `<span class="history-meta-chip">${webview_icons_1.ICON.bolt} ${(0, webview_helpers_1.esc)(entry.modelLabel)}</span>` : ''}
                        <span class="history-meta-chip">${webview_icons_1.ICON.chart} ${entry.stepCount} ${(0, i18n_1.tBi)('steps', '步')}</span>
                    </div>
                    <div class="history-spotlight-grid">
                        <div class="history-spotlight-card is-credit${entry.gmCredits > 0 ? '' : ' is-muted'}">
                            <div class="history-spotlight-label">${(0, i18n_1.tBi)('Cumulative Credits', '累计积分')}</div>
                            <div class="history-spotlight-value">${entry.gmCredits > 0 ? `${entry.gmCredits} ${(0, i18n_1.tBi)('cr', '积分')}` : '—'}</div>
                        </div>
                        <div class="history-spotlight-card is-model${entry.latestGMModel ? '' : ' is-muted'}">
                            <div class="history-spotlight-label">${(0, i18n_1.tBi)('Latest Actual Model', '最后实际模型')}</div>
                            <div class="history-spotlight-value is-model-name">${entry.latestGMModel ? (0, webview_helpers_1.esc)(entry.latestGMModel) : '—'}</div>
                        </div>
                    </div>
                    <div class="history-row-foot">
                        <span class="history-foot-item">${(0, i18n_1.tBi)('Modified', '修改')} ${(0, webview_helpers_1.formatTime)(entry.lastModifiedTime)}</span>
                        <span class="history-foot-item">${(0, i18n_1.tBi)('Created', '创建')} ${(0, webview_helpers_1.formatTime)(entry.createdTime)}</span>
                        ${gmBits.length > 0 ? `<span class="history-foot-item is-gm">${gmBits.join(' · ')}</span>` : ''}
                    </div>
                    ${storageBadges.length > 0 ? `<div class="history-storage-row">${storageBadges.join('')}</div>` : ''}
                </div>
                <div class="history-row-actions">
                    <button
                        class="history-action-btn"
                        data-history-action="workspace"
                        data-history-uri="${(0, webview_helpers_1.esc)(entry.workspaceUri)}"
                        ${entry.workspaceUri ? '' : 'disabled'}
                    >${webview_icons_1.ICON.folder} ${(0, i18n_1.tBi)('Workspace', '工作区')}</button>
                    <button
                        class="history-action-btn is-accent"
                        data-history-action="record"
                        data-cascade-id="${(0, webview_helpers_1.esc)(entry.cascadeId)}"
                    >${webview_icons_1.ICON.chat} ${(0, i18n_1.tBi)('Record Folder', '记录目录')}</button>
                    <button
                        class="history-action-btn"
                        data-history-action="pb"
                        data-cascade-id="${(0, webview_helpers_1.esc)(entry.cascadeId)}"
                        ${entry.hasPb ? '' : 'disabled'}
                    >${webview_icons_1.ICON.file} ${(0, i18n_1.tBi)('PB File', 'PB 文件')}</button>
                </div>
            </article>`;
    }).join('');
    return `
        <details class="collapsible history-group" id="history-group-${index}"${openAttr}>
            <summary>
                <div class="history-group-summary">
                    <div class="history-group-labels">
                        <span class="history-group-title">${(0, webview_helpers_1.esc)(group.label)}</span>
                        <span class="history-group-subtitle">${(0, webview_helpers_1.esc)(group.subtitle)}</span>
                    </div>
                    <div class="history-group-metrics">
                        ${group.isCurrentWorkspace ? `<span class="history-group-chip is-workspace">${(0, i18n_1.tBi)('Current Workspace', '当前工作区')}</span>` : ''}
                        <span class="history-group-chip">${group.entries.length} ${(0, i18n_1.tBi)('items', '条')}</span>
                        <span class="history-group-chip">${runningCount} ${(0, i18n_1.tBi)('running', '运行中')}</span>
                        <span class="history-group-chip">${recordableCount} ${(0, i18n_1.tBi)('recordable', '可备份')}</span>
                    </div>
                </div>
            </summary>
            <div class="details-body history-group-body">
                ${rows}
            </div>
        </details>`;
}
function buildChatHistoryTabContent(trajectories, currentUsage, gmSummary, gmConversations, currentWorkspaceUri) {
    if (!trajectories || trajectories.length === 0) {
        return `<p class="empty-msg">${(0, i18n_1.tBi)('Waiting for trajectory data... the session catalog will appear after the first LS sync.', '正在等待轨迹数据... 首次和 LS 同步后会自动显示会话目录。')}</p>`;
    }
    const entries = buildEntries(trajectories, currentUsage, gmSummary, gmConversations, currentWorkspaceUri);
    const groups = buildGroups(entries);
    return `
        ${renderSummary(entries, groups)}
        ${renderShortcuts(entries, currentUsage)}
        ${renderToolbar()}
        <section class="history-groups" id="historyGroups">
            ${groups.map((group, index) => renderGroup(group, index)).join('')}
        </section>`;
}
//# sourceMappingURL=webview-chat-history-tab.js.map