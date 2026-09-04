/* Used by the authenticated Caspio report. Contains no API credentials or data-fetching code. */
(function (root, factory) {
    'use strict';
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    else {
        if (root.WMSSnapshotReport) return;
        root.WMSSnapshotReport = api;
        const refresh = function () { api.enhance(root.document); };
        root.document.addEventListener('DataPageReady', refresh);
        root.document.addEventListener('DOMContentLoaded', refresh);
        root.setInterval(refresh, 15000);
        refresh();
    }
}(typeof window === 'undefined' ? globalThis : window, function () {
    'use strict';
    const BUCKET_HOSTS = new Set([
        'onesight-wms-snapshots-prod.s3.us-east-1.amazonaws.com',
        'onesight-wms-snapshots-prod.s3.amazonaws.com'
    ]);
    // Report Localization MUST be UTC. Parse only explicitly supported formats; never guess local timezone.
    function parseUTC(value) {
        const text = String(value || '').trim();
        let m = text.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?(?:Z|\+00:00)?$/);
        let year, month, day, hour, minute, second, ms = 0;
        if (m) {
            [year, month, day, hour, minute, second] = m.slice(1, 7).map(Number);
            ms = Number((m[7] || '').padEnd(3, '0'));
        } else {
            m = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})\s+(AM|PM)$/i);
            if (!m) return NaN;
            month = +m[1]; day = +m[2]; year = +m[3]; hour = +m[4]; minute = +m[5]; second = +m[6];
            if (hour < 1 || hour > 12) return NaN;
            hour = hour % 12 + (m[7].toUpperCase() === 'PM' ? 12 : 0);
        }
        const time = Date.UTC(year, month - 1, day, hour, minute, second, ms);
        const date = new Date(time);
        if (year < 2000 || date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day || date.getUTCHours() !== hour || date.getUTCMinutes() !== minute || date.getUTCSeconds() !== second) return NaN;
        return time;
    }
    function downloadState(rawURL, rawExpiration, now = Date.now()) {
        let url;
        try { url = new URL(String(rawURL || '').trim()); } catch (_) { return { ready: false }; }
        if (url.protocol !== 'https:' || !BUCKET_HOSTS.has(url.hostname) || url.port || url.username || url.password || url.hash || url.pathname === '/') return { ready: false };
        const required = ['X-Amz-Date', 'X-Amz-Expires', 'X-Amz-Signature', 'X-Amz-Credential', 'X-Amz-Algorithm'];
        if (required.some(key => url.searchParams.getAll(key).length !== 1)) return { ready: false };
        const p = url.searchParams;
        if (p.get('X-Amz-Algorithm') !== 'AWS4-HMAC-SHA256' || !/^[a-f0-9]{64}$/i.test(p.get('X-Amz-Signature'))) return { ready: false };
        const m = p.get('X-Amz-Date').match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/);
        const durationText = p.get('X-Amz-Expires');
        if (!m || !/^\d+$/.test(durationText)) return { ready: false };
        const duration = Number(durationText);
        const signedAt = parseUTC(`${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}Z`);
        const catalogExpiry = parseUTC(rawExpiration);
        const expiresAt = Math.min(catalogExpiry, signedAt + duration * 1000);
        if (!Number.isFinite(now) || !Number.isFinite(expiresAt) || duration < 1 || duration > 604800 || signedAt > now + 60000 || expiresAt <= now + 60000) return { ready: false };
        return { ready: true, href: url.href, expiresAt };
    }
    function formatBytes(value) {
        const n = Number(String(value).replaceAll(',', '').trim());
        if (!String(value).trim() || !Number.isFinite(n) || n < 0) return '—';
        if (n < 1024) return `${n} B`;
        if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
        return `${(n / (1024 * 1024)).toFixed(1)} MB`;
    }
    function enhance(scope) {
        scope.querySelectorAll('.wms-snapshot-size').forEach(el => {
            if (!el.dataset.bytes) el.dataset.bytes = el.textContent.trim();
            el.textContent = formatBytes(el.dataset.bytes);
        });
        scope.querySelectorAll('.wms-snapshot-download').forEach(block => {
            const link = block.querySelector('.wms-snapshot-link');
            const status = block.querySelector('.wms-snapshot-link-status');
            const source = block.querySelector('.wms-snapshot-url');
            const expiration = block.querySelector('.wms-snapshot-expiration');
            const name = block.querySelector('.wms-snapshot-filename');
            if (!link || !status || !source || !expiration) return;
            function update() {
                const state = downloadState(source.textContent, expiration.textContent);
                if (state.ready) {
                    link.href = state.href;
                    link.hidden = false;
                    link.setAttribute('aria-label', `Download ${name ? name.textContent.trim() : 'snapshot file'}`);
                    status.hidden = true;
                } else {
                    link.removeAttribute('href');
                    link.hidden = true;
                    status.hidden = false;
                    status.textContent = 'Link refreshing — refresh files shortly';
                }
                return state.ready;
            }
            update();
            if (!link.dataset.guarded) {
                link.dataset.guarded = 'true';
                link.addEventListener('click', function (event) { if (!update()) event.preventDefault(); });
                link.addEventListener('auxclick', function (event) { if (!update()) event.preventDefault(); });
            }
        });
    }
    return { parseUTC, downloadState, formatBytes, enhance };
}));
