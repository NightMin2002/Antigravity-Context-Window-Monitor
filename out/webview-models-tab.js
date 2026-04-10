"use strict";
// ─── Models Tab Content Builder ─────────────────────────────────────────────
// Centralizes model-related information: default model, personal model quota,
// and GM-derived model DNA.
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildModelsTabContent = buildModelsTabContent;
const i18n_1 = require("./i18n");
const webview_icons_1 = require("./webview-icons");
const webview_profile_tab_1 = require("./webview-profile-tab");
const pricing_panel_1 = require("./pricing-panel");
function buildModelsTabContent(userInfo, configs, gmSummary, persistedModelDNA) {
    const parts = [];
    const sortedConfigs = userInfo ? (0, webview_profile_tab_1.sortModels)(configs, userInfo.modelSortOrder) : configs;
    const defaultModelHtml = (0, webview_profile_tab_1.buildDefaultModelCard)(userInfo);
    if (defaultModelHtml) {
        parts.push(defaultModelHtml);
    }
    const quotaHtml = (0, webview_profile_tab_1.buildModelQuotaGrid)(sortedConfigs);
    if (quotaHtml) {
        parts.push(quotaHtml);
    }
    const modelDNAHtml = (0, pricing_panel_1.buildModelDNACards)(gmSummary, persistedModelDNA, sortedConfigs);
    if (modelDNAHtml) {
        parts.push(modelDNAHtml);
    }
    else {
        parts.push(`
            <section class="card empty">
                <h2>${webview_icons_1.ICON.bolt} ${(0, i18n_1.tBi)('Model Info', '模型信息')}</h2>
                <p class="empty-desc">${(0, i18n_1.tBi)('Model information will appear after GM data is available.', '待 GM 数据可用后，这里会显示模型信息。')}</p>
            </section>`);
    }
    if (parts.length === 0) {
        return `
            <section class="card empty">
                <h2>${webview_icons_1.ICON.bolt} ${(0, i18n_1.tBi)('Models', '模型')}</h2>
                <p class="empty-desc">${(0, i18n_1.tBi)('Waiting for model-related data from LS...', '等待 LS 返回模型相关数据...')}</p>
            </section>`;
    }
    return parts.join('');
}
//# sourceMappingURL=webview-models-tab.js.map