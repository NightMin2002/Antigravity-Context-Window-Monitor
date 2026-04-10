"use strict";
// ─── Profile Tab Content Builder ─────────────────────────────────────────────
// Builds HTML for the "Profile" tab: Account info, plan limits,
// and feature/team config. Model-specific content is rendered in Models tab.
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildProfileContent = buildProfileContent;
exports.sortModels = sortModels;
exports.buildModelQuotaGrid = buildModelQuotaGrid;
exports.buildDefaultModelCard = buildDefaultModelCard;
const i18n_1 = require("./i18n");
const reset_time_1 = require("./reset-time");
const webview_icons_1 = require("./webview-icons");
const webview_helpers_1 = require("./webview-helpers");
function formatCreditTypeLabel(creditType) {
    const key = creditType.replace('CREDIT_TYPE_', '');
    const labelMap = {
        PROMPT: ['Prompt Credits', 'Prompt 额度'],
        FLOW: ['Flow Credits', 'Flow 额度'],
        GOOGLE_AI: ['Google AI Credits', 'Google AI 额度'],
        GOOGLE_AI_STUDIO: ['Google AI Studio Credits', 'Google AI Studio 额度'],
    };
    const mapped = labelMap[key];
    return mapped ? (0, i18n_1.tBi)(mapped[0], mapped[1]) : key.replace(/_/g, ' ');
}
// ─── Public API ──────────────────────────────────────────────────────────────
/** Build the complete Profile tab HTML. */
function buildProfileContent(userInfo, configs) {
    if (!userInfo) {
        return `
            <section class="card empty">
                <h2>${webview_icons_1.ICON.user} ${(0, i18n_1.tBi)('Profile', '个人')}</h2>
                <p class="empty-desc">${(0, i18n_1.tBi)('Waiting for user data from LS...', '等待 LS 用户数据...')}</p>
            </section>`;
    }
    return [
        buildAccountSection(userInfo),
        buildLimitsSection(userInfo),
        buildFeatureAndTeamGrid(userInfo),
    ].join('');
}
// ─── Model Sort ──────────────────────────────────────────────────────────────
function sortModels(configs, sortOrder) {
    if (!sortOrder || sortOrder.length === 0) {
        return configs;
    }
    const orderMap = new Map(sortOrder.map((label, i) => [label, i]));
    return [...configs].sort((a, b) => {
        const aIdx = orderMap.get(a.label) ?? 999;
        const bIdx = orderMap.get(b.label) ?? 999;
        return aIdx - bIdx;
    });
}
// ─── Section Builders ────────────────────────────────────────────────────────
function buildAccountSection(userInfo) {
    const tierMap = {
        'TEAMS_TIER_FREE': { bg: 'rgba(156,163,175,0.15)', color: '#9ca3af' },
        'TEAMS_TIER_PRO': { bg: 'rgba(74,222,128,0.15)', color: 'var(--color-ok)' },
        'TEAMS_TIER_TEAMS': { bg: 'rgba(96,165,250,0.15)', color: 'var(--color-info)' },
        'TEAMS_TIER_ENTERPRISE_SAAS': { bg: 'rgba(156,163,175,0.15)', color: '#9ca3af' },
        'TEAMS_TIER_PRO_ULTIMATE': { bg: 'rgba(250,204,21,0.15)', color: 'var(--color-warn)' },
    };
    const tier = tierMap[userInfo.teamsTier] || tierMap['TEAMS_TIER_PRO'];
    const maskedEmail = userInfo.email.replace(/^(.{2}).*(@.*)$/, '$1****$2');
    const promptPct = userInfo.monthlyPromptCredits > 0
        ? Math.round((userInfo.availablePromptCredits / userInfo.monthlyPromptCredits) * 100) : 0;
    const flowPct = userInfo.monthlyFlowCredits > 0
        ? Math.round((userInfo.availableFlowCredits / userInfo.monthlyFlowCredits) * 100) : 0;
    const promptBarColor = promptPct <= 10 ? 'var(--color-danger)' : promptPct <= 30 ? 'var(--color-warn)' : 'var(--color-ok)';
    const flowBarColor = flowPct <= 10 ? 'var(--color-danger)' : flowPct <= 30 ? 'var(--color-warn)' : 'var(--color-info)';
    // Subscription hint
    const subHint = userInfo.upgradeSubscriptionText
        ? `<div class="subscription-hint">${(0, webview_helpers_1.esc)(userInfo.upgradeSubscriptionText)}</div>` : '';
    // Google AI Credits inline
    const validCredits = userInfo.availableCredits.filter(c => c.creditAmount > 0);
    const creditsHtml = validCredits.length > 0
        ? `<div class="gai-credits">${validCredits.map(c => {
            const typeName = formatCreditTypeLabel(c.creditType);
            return `<div class="gai-credit-item">
                        <span class="gai-label">${(0, webview_helpers_1.esc)(typeName)}</span>
                        <span class="gai-value">${c.creditAmount.toLocaleString()}</span>
                    </div>`;
        }).join('')}</div>` : '';
    return `
        <section class="card">
            <h2>
                ${webview_icons_1.ICON.user}
                ${(0, i18n_1.tBi)('Account', '账户')}
                <span class="tier-badge" style="background:${tier.bg};color:${tier.color}">${(0, webview_helpers_1.esc)(userInfo.planName)}</span>
                ${userInfo.userTierName ? `<span class="tier-badge tier-sub" style="background:rgba(255,255,255,0.06);color:var(--color-text-dim)">${(0, webview_helpers_1.esc)(userInfo.userTierName)}</span>` : ''}
                <button class="privacy-btn" id="privacyToggle" aria-label="${(0, i18n_1.tBi)('Toggle privacy mask', '切换隐私遮罩')}">${webview_icons_1.ICON.shield}</button>
            </h2>
            <div class="account-info">
                <span class="account-name" data-real="${(0, webview_helpers_1.esc)(userInfo.name)}" data-masked="${(0, webview_helpers_1.esc)(userInfo.name.charAt(0))}***">${(0, webview_helpers_1.esc)(userInfo.name)}</span>
                <span class="account-email" data-real="${(0, webview_helpers_1.esc)(userInfo.email)}" data-masked="${(0, webview_helpers_1.esc)(maskedEmail)}">${(0, webview_helpers_1.esc)(userInfo.email)}</span>
            </div>
            <p class="privacy-hint">${(0, i18n_1.tBi)('Privacy mask is ON by default. Click the shield button above to reveal sensitive data.', '隐私遮罩默认开启。点击上方 🛡️ 按钮可显示/隐藏真实信息。')}</p>
            ${subHint}
            <div class="credits-section">
                <div class="credit-row">
                    <div class="credit-header">
                        <span>${(0, i18n_1.tBi)('Prompt Credits', 'Prompt 额度')}</span>
                        <span>${userInfo.availablePromptCredits.toLocaleString()} / ${userInfo.monthlyPromptCredits.toLocaleString()}</span>
                    </div>
                    <div class="credit-bar-wrap">
                        <div class="credit-bar" style="width:${promptPct}%;background:${promptBarColor}"></div>
                    </div>
                </div>
                <div class="credit-row">
                    <div class="credit-header">
                        <span>${(0, i18n_1.tBi)('Flow Credits', 'Flow 额度')}</span>
                        <span>${userInfo.availableFlowCredits.toLocaleString()} / ${userInfo.monthlyFlowCredits.toLocaleString()}</span>
                    </div>
                    <div class="credit-bar-wrap">
                        <div class="credit-bar" style="width:${flowPct}%;background:${flowBarColor}"></div>
                    </div>
                </div>
            </div>
            ${creditsHtml}
        </section>`;
}
function buildModelQuotaGrid(configs) {
    const quotaModels = configs.filter(c => c.quotaInfo);
    if (quotaModels.length === 0) {
        return '';
    }
    const cards = quotaModels.map((c) => {
        const qi = c.quotaInfo;
        const pct = Math.round(qi.remainingFraction * 100);
        const barColor = pct <= 20 ? 'var(--color-danger)' : pct < 80 ? 'var(--color-warn)' : 'var(--color-ok)';
        let resetLabel = '';
        if (qi.resetTime) {
            const countdown = (0, reset_time_1.formatResetCountdown)(qi.resetTime);
            const absolute = (0, reset_time_1.formatResetAbsolute)(qi.resetTime);
            resetLabel = countdown ? `${countdown} · ${absolute}` : absolute;
        }
        // Tag badge (e.g. "New")
        const tagBadge = c.tagTitle
            ? `<span class="model-tag-badge">${(0, webview_helpers_1.esc)(c.tagTitle)}</span>` : '';
        return `
            <div class="model-card">
                <div class="model-card-header">
                    <span class="model-card-name">${(0, webview_helpers_1.esc)(c.label)}${tagBadge}</span>
                    <span class="model-card-pct" style="color:${barColor}">${pct}%</span>
                </div>
                <div class="quota-bar-wrap">
                    <div class="quota-bar" style="width:${pct}%;background:${barColor}"></div>
                </div>
                <div class="model-card-meta">
                    ${resetLabel ? `<span class="model-card-reset">${(0, i18n_1.tBi)('Reset', '重置')} ${resetLabel}</span>` : ''}
                </div>
            </div>`;
    }).join('');
    return `
        <section class="card">
            <h2>${webview_icons_1.ICON.bolt} ${(0, i18n_1.tBi)('Model Quota', '模型配额')}</h2>
            <div class="model-grid">
                ${cards}
            </div>
        </section>`;
}
function buildDefaultModelCard(userInfo) {
    if (!userInfo?.defaultModelLabel) {
        return '';
    }
    return `
        <section class="card">
            <h2>${webview_icons_1.ICON.bolt} ${(0, i18n_1.tBi)('Default Model', '默认模型')}</h2>
            <div class="default-model">${(0, i18n_1.tBi)('Current default', '当前默认')}: <strong>${(0, webview_helpers_1.esc)(userInfo.defaultModelLabel)}</strong></div>
            ${userInfo.userTierDescription
        ? `<p class="raw-desc">${(0, webview_helpers_1.esc)(userInfo.userTierDescription)}</p>`
        : ''}
        </section>`;
}
function buildLimitsSection(userInfo) {
    const fmtLimit = (v) => v === -1 ? '∞' : v.toLocaleString();
    const pl = userInfo.planLimits;
    const limitCards = [
        [(0, i18n_1.tBi)('Max Input Tokens', '最大输入'), fmtLimit(pl.maxNumChatInputTokens)],
        [(0, i18n_1.tBi)('Premium Messages', '高级消息数'), fmtLimit(pl.maxNumPremiumChatMessages)],
        [(0, i18n_1.tBi)('Custom Instructions', '自定义指令'), (0, i18n_1.tBi)(`${fmtLimit(pl.maxCustomChatInstructionCharacters)} chars`, `${fmtLimit(pl.maxCustomChatInstructionCharacters)} 字符`)],
        [(0, i18n_1.tBi)('Pinned Context', '固定上下文'), fmtLimit(pl.maxNumPinnedContextItems)],
        [(0, i18n_1.tBi)('Local Index', '本地索引'), fmtLimit(pl.maxLocalIndexSize)],
        [(0, i18n_1.tBi)('Flex Credits', 'Flex 额度'), (0, i18n_1.tBi)(`${pl.monthlyFlexCreditPurchaseAmount.toLocaleString()} / mo`, `${pl.monthlyFlexCreditPurchaseAmount.toLocaleString()} /月`)],
    ].map(([k, v]) => `
        <div class="profile-metric-card">
            <span class="profile-metric-label">${k}</span>
            <span class="profile-metric-value">${v}</span>
        </div>`).join('');
    return `
        <section class="card">
            <h2>${webview_icons_1.ICON.shield} ${(0, i18n_1.tBi)('Plan Limits', '计划限制')}</h2>
            <div class="profile-metric-grid">${limitCards}</div>
        </section>`;
}
function buildFeatureAndTeamGrid(userInfo) {
    // Feature flags
    const allFeatures = [
        { label: (0, i18n_1.tBi)('Web Search', '网页搜索'), enabled: userInfo.cascadeWebSearchEnabled },
        { label: (0, i18n_1.tBi)('Browser', '浏览器'), enabled: userInfo.browserEnabled },
        { label: (0, i18n_1.tBi)('Knowledge Base', '知识库'), enabled: userInfo.knowledgeBaseEnabled },
        { label: (0, i18n_1.tBi)('Commit Msg', '提交信息'), enabled: userInfo.canGenerateCommitMessages },
        { label: (0, i18n_1.tBi)('Auto Run', '自动执行'), enabled: userInfo.cascadeCanAutoRunCommands },
        { label: (0, i18n_1.tBi)('Background', '后台'), enabled: userInfo.canAllowCascadeInBackground },
        { label: (0, i18n_1.tBi)('Buy Credits', '购买额度'), enabled: userInfo.canBuyMoreCredits },
        { label: (0, i18n_1.tBi)('Fast Autocomplete', '快速补全'), enabled: userInfo.hasAutocompleteFastMode },
        { label: (0, i18n_1.tBi)('Sticky Premium', '锁定高级'), enabled: userInfo.allowStickyPremiumModels },
        { label: (0, i18n_1.tBi)('Command Models', '命令模型'), enabled: userInfo.allowPremiumCommandModels },
        { label: (0, i18n_1.tBi)('Tab Jump', 'Tab 跳转'), enabled: userInfo.hasTabToJump },
        { label: (0, i18n_1.tBi)('Custom Icon', '自定义图标'), enabled: userInfo.canCustomizeAppIcon },
    ];
    const featureTags = allFeatures.map(f => `<span class="feature-tag${f.enabled ? ' enabled' : ''}">${f.label}</span>`).join('');
    // Team config
    const tc = userInfo.teamConfig;
    const teamTags = [
        { label: (0, i18n_1.tBi)('MCP Servers', 'MCP 服务'), enabled: tc.allowMcpServers },
        { label: (0, i18n_1.tBi)('Auto Run Cmd', '自动执行命令'), enabled: tc.allowAutoRunCommands },
        { label: (0, i18n_1.tBi)('Browser Experimental', '浏览器实验'), enabled: tc.allowBrowserExperimentalFeatures },
    ].map(f => `<span class="feature-tag${f.enabled ? ' enabled' : ''}">${f.label}</span>`).join('');
    return `
        <div class="profile-two-col">
            <section class="card profile-panel-card">
                <h2>${webview_icons_1.ICON.bolt} ${(0, i18n_1.tBi)('Feature Flags', '功能开关')}</h2>
                <div class="profile-chip-grid">${featureTags}</div>
            </section>
            <section class="card profile-panel-card">
                <h2>${webview_icons_1.ICON.shield} ${(0, i18n_1.tBi)('Team Config', '团队配置')}</h2>
                <div class="profile-chip-grid">${teamTags}</div>
            </section>
        </div>`;
}
//# sourceMappingURL=webview-profile-tab.js.map