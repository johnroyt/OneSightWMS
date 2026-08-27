(function () {
    'use strict';

    const API_URL = /^(?:localhost|127\.0\.0\.1)$/.test(window.location.hostname)
        ? 'https://onesight-wms-dashboard-preview.operations-78f.workers.dev/dashboard'
        : 'https://onesight-wms-dashboard.operations-78f.workers.dev/dashboard';
    const numberFormatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
    const dateFormatter = new Intl.DateTimeFormat('en-US', {
        month: 'short', day: 'numeric', year: 'numeric', timeZone: 'America/Chicago'
    });
    const dateTimeFormatter = new Intl.DateTimeFormat('en-US', {
        month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'America/Chicago'
    });

    const cardFilters = {
        readyToPick: item => item.type === 'Ready to pick' || item.type === 'Partial pick' || item.type === 'Over-picked items',
        staged: item => item.type === 'Staged / in transit',
        receiving: item => item.type === 'Overdue receiving' || item.type === 'Partial receipt',
        counts: item => item.type === 'Open count session',
        inventoryExceptions: item => item.type === 'Negative on hand'
    };

    let dashboardData = null;
    let activeFilter = 'all';
    let activeCard = '';
    let activeActivityPeriod = 'month';
    let dashboardStarted = false;

    function escapeHtml(value) {
        return String(value == null ? '' : value)
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#039;');
    }

    function safeUrl(value) {
        const url = String(value || '');
        return /^(?:pages\/|\.\/|\/)/.test(url) ? url : '#';
    }

    function asDate(value) {
        if (!value) return null;
        const result = new Date(value);
        return Number.isNaN(result.getTime()) ? null : result;
    }

    function formatDate(value) {
        const result = asDate(value);
        return result ? dateFormatter.format(result) : 'No due date';
    }

    function formatDateTime(value) {
        const result = asDate(value);
        return result ? dateTimeFormatter.format(result) : '—';
    }

    function formatNumber(value) {
        return numberFormatter.format(Number(value) || 0);
    }

    function countLabel(value, singular, plural = `${singular}s`) {
        const count = Number(value) || 0;
        return `${formatNumber(count)} ${count === 1 ? singular : plural}`;
    }

    function slug(value) {
        return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    }

    function setMessage(message) {
        const element = document.getElementById('dashboard-message');
        if (!element) return;
        element.hidden = !message;
        element.textContent = message || '';
    }

    function startDashboard() {
        if (dashboardStarted) return;
        dashboardStarted = true;
        loadDashboard(false);
    }

    function initializeDashboardAuthentication() {
        if (window.WMSCurrentUser && window.WMSCurrentUser.authenticated) {
            startDashboard();
            return;
        }
        window.addEventListener('wms:user-authenticated', startDashboard, { once: true });
    }

    function renderCards(cards) {
        document.querySelectorAll('.dashboard-kpi[data-card]').forEach(element => {
            const card = cards[element.dataset.card] || { value: 0, detail: 'No current exceptions', tone: 'good' };
            element.classList.remove('is-loading');
            element.dataset.tone = card.tone || 'good';
            element.querySelector('[data-kpi-value]').textContent = formatNumber(card.value);
            element.querySelector('[data-kpi-detail]').textContent = card.detail;
        });
    }

    function filteredAttention() {
        if (!dashboardData) return [];
        let items = dashboardData.attention || [];
        if (activeCard && cardFilters[activeCard]) items = items.filter(cardFilters[activeCard]);
        if (activeFilter === 'urgent') items = items.filter(item => item.priority === 'urgent');
        if (activeFilter === 'warehouse') items = items.filter(item => /warehouse|receiving/i.test(item.owner || ''));
        if (activeFilter === 'inventory') items = items.filter(item => /inventory/i.test(item.owner || '') || /count|negative/i.test(item.type || ''));
        return items;
    }

    function dueOrAge(item) {
        if (item.dueDate) return formatDate(item.dueDate);
        if (Number.isFinite(item.ageDays)) return `${item.ageDays} day${item.ageDays === 1 ? '' : 's'} open`;
        return 'Review now';
    }

    function renderAttention() {
        const body = document.getElementById('attention-body');
        const count = document.getElementById('attention-count');
        if (!body || !count) return;
        const items = filteredAttention();
        count.textContent = formatNumber(items.length);
        if (!items.length) {
            body.innerHTML = '<tr class="empty-row"><td colspan="6">No work matches this filter.</td></tr>';
            return;
        }
        body.innerHTML = items.map(item => `
            <tr>
                <td><span class="priority-chip ${escapeHtml(item.priority)}">${escapeHtml(item.priority)}</span></td>
                <td><span class="work-title">${escapeHtml(item.title)}</span><span class="work-detail">${escapeHtml(item.type)} · ${escapeHtml(item.detail)}</span></td>
                <td><span class="context-main" title="${escapeHtml(item.context)}">${escapeHtml(item.context)}</span></td>
                <td class="mono">${escapeHtml(dueOrAge(item))}</td>
                <td class="owner-cell">${escapeHtml(item.owner)}</td>
                <td><a class="row-action" href="${escapeHtml(safeUrl(item.actionUrl))}">${escapeHtml(item.actionLabel)} →</a></td>
            </tr>`).join('');
    }

    function renderReadiness(items) {
        const list = document.getElementById('readiness-list');
        if (!list) return;
        if (!items.length) {
            list.innerHTML = '<div class="panel-loading">No orders are due in the next 45 days.</div>';
            return;
        }
        list.innerHTML = items.map(item => {
            const dateClass = item.daysUntilDue < 0 ? ' is-overdue' : '';
            const dueLabel = item.daysUntilDue === 0 ? 'Due today' : item.daysUntilDue === 1 ? 'Due tomorrow' : `${item.daysUntilDue} days`;
            const flags = [
                item.criticalShortages ? `<span class="readiness-flag danger">${formatNumber(item.criticalShortages)} stockouts</span>` : '',
                item.inboundUnits ? `<span class="readiness-flag inbound">${formatNumber(item.inboundUnits)} inbound</span>` : '',
                item.linesRemaining ? `<span class="readiness-flag">${formatNumber(item.linesRemaining)} lines remain</span>` : ''
            ].filter(Boolean).join('');
            return `
                <a class="readiness-item" href="${escapeHtml(safeUrl(item.actionUrl))}">
                    <div><div class="readiness-name" title="${escapeHtml(item.name)}">${escapeHtml(item.name)}</div><div class="readiness-meta">${escapeHtml(item.destination)} · <span class="status-chip ${slug(item.status)}">${escapeHtml(item.status)}</span></div></div>
                    <div class="readiness-date${dateClass}">${escapeHtml(dueLabel)}<br>${escapeHtml(formatDate(item.dueDate))}</div>
                    <div class="readiness-progress"><div class="progress"><span style="width:${Math.max(0, Math.min(100, item.pickedPercent || 0))}%"></span></div><span class="readiness-progress-label">${formatNumber(item.pickedPercent)}% picked</span></div>
                    ${flags ? `<div class="readiness-flags">${flags}</div>` : ''}
                </a>`;
        }).join('');
    }

    function renderShortages(items, definition, summary) {
        const body = document.getElementById('shortages-body');
        const count = document.getElementById('shortages-count');
        const scope = document.getElementById('shortage-scope');
        if (!body || !count) return;
        count.textContent = formatNumber(summary?.total ?? items.length);
        if (scope) scope.textContent = definition || '';
        if (!items.length) {
            body.innerHTML = '<tr class="empty-row"><td colspan="6">No scoped replenishment gaps found.</td></tr>';
            return;
        }
        body.innerHTML = items.slice(0, 12).map(item => `
            <tr>
                <td><span class="product-name" title="${escapeHtml(item.product)}">${escapeHtml(item.product)}</span><span class="product-type">${escapeHtml(item.productType)} · ${escapeHtml(item.upc)}</span></td>
                <td>${escapeHtml(item.location)}</td>
                <td class="num ${item.stockout ? 'stockout-value' : ''}">${formatNumber(item.onHand)}</td>
                <td class="num">${formatNumber(item.target)}</td>
                <td class="num">${formatNumber(item.inbound)}</td>
                <td class="num stockout-value">${formatNumber(item.gap)}</td>
            </tr>`).join('');
    }

    function renderTrust(countHealth, inventoryHealth) {
        document.getElementById('trust-open-counts').textContent = formatNumber(countHealth.openSessions);
        document.getElementById('trust-old-counts').textContent = formatNumber(countHealth.olderThanTarget);
        document.getElementById('trust-negative').textContent = formatNumber(countHealth.negativeBalances);
        document.getElementById('trust-blank').textContent = formatNumber(countHealth.blankQuantities);
        const list = document.getElementById('inventory-health-list');
        if (!inventoryHealth.length) {
            list.innerHTML = '<div class="panel-loading">No location-level gaps found.</div>';
            return;
        }
        list.innerHTML = inventoryHealth.slice(0, 6).map(item => `
            <div class="health-row"><span class="health-location" title="${escapeHtml(item.location)}">${escapeHtml(item.location)}</span><span class="health-values"><strong>${formatNumber(item.stockouts)}</strong> stockouts · ${formatNumber(item.shortages)} gaps</span></div>
        `).join('');
    }

    function movementRoute(item) {
        const from = item.fromLocation || '';
        const to = item.location || '';
        if (from && to && from !== to) return `${from} → ${to}`;
        return to || from || 'Location not recorded';
    }

    function renderWarehouseActivity(activity) {
        const periods = activity && activity.periods || {};
        const period = periods[activeActivityPeriod] || periods[activity && activity.defaultPeriod] || null;
        const body = document.getElementById('activity-body');
        const footnote = document.getElementById('activity-footnote');

        document.querySelectorAll('[data-activity-period]').forEach(button => {
            button.classList.toggle('active', button.dataset.activityPeriod === activeActivityPeriod);
        });

        if (!period) {
            document.getElementById('activity-picked-units').textContent = '—';
            document.getElementById('activity-picked-detail').textContent = 'Awaiting dashboard API update';
            document.getElementById('activity-deliveries').textContent = '—';
            document.getElementById('activity-deliveries-detail').textContent = 'Awaiting dashboard API update';
            document.getElementById('activity-po-units').textContent = '—';
            document.getElementById('activity-po-detail').textContent = 'Awaiting dashboard API update';
            if (body) body.innerHTML = '<tr class="empty-row"><td colspan="5">Team activity will appear when the updated dashboard API is available.</td></tr>';
            return;
        }

        const totals = period.totals || {};
        document.getElementById('activity-picked-units').textContent = formatNumber(totals.pickedUnits);
        document.getElementById('activity-picked-detail').textContent = `${countLabel(totals.pickedLines, 'line')} · ${countLabel(totals.pickedOrders, 'order')}`;
        document.getElementById('activity-deliveries').textContent = formatNumber(totals.deliveriesLogged);
        document.getElementById('activity-deliveries-detail').textContent = countLabel(totals.trackingNumbers, 'tracking number');
        document.getElementById('activity-po-units').textContent = formatNumber(totals.poReceivedUnits);
        document.getElementById('activity-po-detail').textContent = `${countLabel(totals.poReceiptPostings, 'posting')} · ${countLabel(totals.purchaseOrders, 'PO')}`;

        const people = Array.isArray(period.people) ? period.people : [];
        if (body) {
            body.innerHTML = people.length ? people.map(person => `
                <tr>
                    <td><span class="activity-person">${escapeHtml(person.name)}</span></td>
                    <td class="num"><span class="activity-primary">${formatNumber(person.pickedUnits)}</span><span class="activity-secondary">${countLabel(person.pickedLines, 'line')}</span></td>
                    <td class="num">${formatNumber(person.pickedOrders)}</td>
                    <td class="num"><span class="activity-primary">${formatNumber(person.deliveriesLogged)}</span><span class="activity-secondary">${countLabel(person.trackingNumbers, 'tracking number')}</span></td>
                    <td class="num"><span class="activity-primary">${formatNumber(person.poReceivedUnits)}</span><span class="activity-secondary">${countLabel(person.poReceiptPostings, 'posting')}</span></td>
                </tr>`).join('') : '<tr class="empty-row"><td colspan="5">No recorded activity for this period.</td></tr>';
        }

        if (footnote) {
            const definitions = activity.definitions || {};
            footnote.textContent = [definitions.picking, definitions.deliveries, definitions.poReceiving, 'Different work types are shown separately and are not combined into a score.']
                .filter(Boolean).join(' ');
        }
    }

    function renderMovements(items) {
        const list = document.getElementById('movements-list');
        if (!list) return;
        if (!items.length) {
            list.innerHTML = '<div class="panel-loading">No recent movement records found.</div>';
            return;
        }
        list.innerHTML = items.slice(0, 7).map(item => `
            <div class="movement-item">
                <div class="movement-item-top">
                    <span class="movement-chip ${slug(item.type)}">${escapeHtml(item.type)}</span>
                    <strong>${formatNumber(item.quantity)} units</strong>
                </div>
                <span class="movement-product" title="${escapeHtml(item.product)}">${escapeHtml(item.product)}</span>
                <span class="movement-meta" title="${escapeHtml(movementRoute(item))}">${escapeHtml(formatDateTime(item.date))} · ${escapeHtml(movementRoute(item))}${item.reference ? ` · ${escapeHtml(item.reference)}` : ''}</span>
            </div>`).join('');
    }

    function render(data) {
        dashboardData = data;
        renderCards(data.cards || {});
        renderAttention();
        renderReadiness(data.readiness || []);
        renderShortages(data.shortages || [], data.definitions && data.definitions.shortageScope, data.shortageSummary);
        renderTrust(data.countHealth || {}, data.inventoryHealth || []);
        renderWarehouseActivity(data.warehouseActivity || {});
        renderMovements(data.recentMovements || []);
        const asOf = document.getElementById('dashboard-as-of');
        if (asOf) asOf.textContent = `Updated ${formatDateTime(data.asOf)} CT`;
    }

    async function loadDashboard(forceRefresh) {
        const button = document.getElementById('dashboard-refresh');
        if (button) { button.disabled = true; button.classList.add('is-spinning'); }
        setMessage('');
        try {
            const url = new URL(API_URL);
            if (forceRefresh) url.searchParams.set('refresh', '1');
            const response = await fetch(url, { method: 'GET', credentials: 'include', headers: { 'Accept': 'application/json' } });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(data.error || `Dashboard request failed (${response.status})`);
            render(data);
        } catch (error) {
            setMessage(`${error.message || 'Dashboard data could not be loaded.'} Existing WMS forms and pages remain available from the navigation.`);
            const asOf = document.getElementById('dashboard-as-of');
            if (asOf) asOf.textContent = 'Live data unavailable';
        } finally {
            if (button) { button.disabled = false; button.classList.remove('is-spinning'); }
        }
    }

    function bindEvents() {
        document.getElementById('dashboard-refresh')?.addEventListener('click', () => loadDashboard(true));
        document.querySelectorAll('[data-activity-period]').forEach(button => {
            button.addEventListener('click', () => {
                activeActivityPeriod = button.dataset.activityPeriod || 'month';
                renderWarehouseActivity(dashboardData && dashboardData.warehouseActivity || {});
            });
        });
        document.querySelectorAll('.attention-filter').forEach(button => {
            button.addEventListener('click', () => {
                activeFilter = button.dataset.filter || 'all';
                activeCard = '';
                document.querySelectorAll('.attention-filter').forEach(item => item.classList.toggle('active', item === button));
                document.querySelectorAll('.dashboard-kpi').forEach(item => item.classList.remove('is-selected'));
                renderAttention();
            });
        });
        document.querySelectorAll('.dashboard-kpi[data-card]').forEach(button => {
            button.addEventListener('click', () => {
                const selected = button.dataset.card || '';
                activeCard = activeCard === selected ? '' : selected;
                activeFilter = 'all';
                document.querySelectorAll('.attention-filter').forEach(item => item.classList.toggle('active', item.dataset.filter === 'all'));
                document.querySelectorAll('.dashboard-kpi').forEach(item => item.classList.toggle('is-selected', activeCard && item === button));
                renderAttention();
                document.querySelector('.attention-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            });
        });
    }

    document.addEventListener('DOMContentLoaded', function () {
        bindEvents();
        initializeDashboardAuthentication();
    });
})();
