"use strict";
// ─── WebView Shared Helpers ───────────────────────────────────────────────────
// Shared utility functions used across webview tab builders.
// Eliminates duplication between webview-panel.ts and activity-panel.ts.
Object.defineProperty(exports, "__esModule", { value: true });
exports.esc = esc;
exports.formatTime = formatTime;
exports.formatShortTime = formatShortTime;
exports.formatDuration = formatDuration;
exports.formatFileSize = formatFileSize;
/** Escape HTML special characters. */
function esc(text) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
/** Format ISO timestamp to locale short date+time (local timezone). */
function formatTime(iso) {
    if (!iso) {
        return '—';
    }
    try {
        const d = new Date(iso);
        if (isNaN(d.getTime())) {
            return esc(iso);
        }
        const p = (n) => n.toString().padStart(2, '0');
        return `${p(d.getMonth() + 1)}/${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
    }
    catch {
        return esc(iso);
    }
}
/** Format ISO timestamp to HH:MM:SS only (local timezone). */
function formatShortTime(iso) {
    if (!iso) {
        return '—';
    }
    try {
        const d = new Date(iso);
        if (isNaN(d.getTime())) {
            return iso;
        }
        const p = (n) => n.toString().padStart(2, '0');
        return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
    }
    catch {
        return iso;
    }
}
/** Format milliseconds to human-readable "Xh Ym Zs". */
function formatDuration(ms) {
    if (ms < 0) {
        ms = 0;
    }
    const totalSec = Math.floor(ms / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    if (h > 0) {
        return `${h}h ${m}m ${s}s`;
    }
    if (m > 0) {
        return `${m}m ${s}s`;
    }
    return `${s}s`;
}
/** Format byte count to human-readable size string (e.g. "1.2 MB"). */
function formatFileSize(bytes) {
    if (!Number.isFinite(bytes) || bytes <= 0) {
        return '0 B';
    }
    if (bytes < 1024) {
        return `${Math.round(bytes)} B`;
    }
    if (bytes < 1024 * 1024) {
        return `${(bytes / 1024).toFixed(bytes >= 10 * 1024 ? 0 : 1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(bytes >= 10 * 1024 * 1024 ? 0 : 1)} MB`;
}
//# sourceMappingURL=webview-helpers.js.map