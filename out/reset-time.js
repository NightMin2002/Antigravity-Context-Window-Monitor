"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseResetDate = parseResetDate;
exports.formatResetAbsolute = formatResetAbsolute;
exports.formatResetCountdownFromMs = formatResetCountdownFromMs;
exports.formatResetCountdown = formatResetCountdown;
exports.formatResetContext = formatResetContext;
function pad(value) {
    return value.toString().padStart(2, '0');
}
function parseResetDate(iso) {
    if (!iso) {
        return null;
    }
    try {
        const date = new Date(iso);
        return isNaN(date.getTime()) ? null : date;
    }
    catch {
        return null;
    }
}
function formatResetAbsolute(iso, options) {
    const date = parseResetDate(iso);
    if (!date) {
        return '—';
    }
    const time = options?.includeSeconds
        ? `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
        : `${pad(date.getHours())}:${pad(date.getMinutes())}`;
    return `${pad(date.getMonth() + 1)}/${pad(date.getDate())} ${time}`;
}
function formatResetCountdownFromMs(diffMs) {
    if (diffMs <= 0) {
        return '0m';
    }
    const totalMinutes = Math.floor(diffMs / 60000);
    const days = Math.floor(totalMinutes / (24 * 60));
    const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
    const minutes = totalMinutes % 60;
    if (days > 0) {
        return `${days}d${hours}h`;
    }
    if (hours > 0) {
        return `${hours}h${minutes}m`;
    }
    return `${minutes}m`;
}
function formatResetCountdown(iso, nowMs = Date.now()) {
    const date = parseResetDate(iso);
    if (!date) {
        return '';
    }
    return formatResetCountdownFromMs(date.getTime() - nowMs);
}
function formatResetContext(iso, options) {
    const absolute = formatResetAbsolute(iso, { includeSeconds: options?.includeSeconds });
    if (absolute === '—') {
        return absolute;
    }
    const countdown = formatResetCountdown(iso, options?.nowMs);
    return countdown ? `${countdown} (${absolute})` : absolute;
}
//# sourceMappingURL=reset-time.js.map