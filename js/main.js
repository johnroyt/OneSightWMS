/* =========================================================================
   OneSight WMS — main.js (redesigned shell)
   Drop-in replacement for js/main.js. Keeps every public API the existing
   pages use: switchTab, openGenericModal, closeGenericModal,
   loadDataPageIntoModal, initializeModalTriggers, filterOrderType,
   logConsumption, navigateTo, generateSidebar, generateHeader,
   initializeNavigation, setWMSUser, initializePage, CASPIO_DATAPAGES,
   MODAL_OPTIONS.
   ========================================================================= */

/* ---------- Inline icon set (Lucide-ish, 1.6 stroke) -------------------- */
const WMS_ICONS = {
    box: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.6"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.27 6.96 8.73 5.05 8.73-5.05"/><path d="M12 22.08V12"/></svg>',
    eye: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.6"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>',
    dashboard: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.6"><rect x="3" y="3" width="7" height="9" rx="1.2"/><rect x="14" y="3" width="7" height="5" rx="1.2"/><rect x="14" y="12" width="7" height="9" rx="1.2"/><rect x="3" y="16" width="7" height="5" rx="1.2"/></svg>',
    purchase: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.6"><path d="M14 3v4a1 1 0 0 0 1 1h4"/><path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2Z"/><path d="M9 13h6M9 17h6"/></svg>',
    orders: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.6"><path d="M9 14l2 2 4-4"/><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18"/></svg>',
    tasks: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.6"><path d="m3 17 2 2 4-4"/><path d="m3 7 2 2 4-4"/><path d="M13 6h8M13 12h8M13 18h8"/></svg>',
    inventory: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.6"><path d="M3 7l9-4 9 4-9 4-9-4Z"/><path d="M3 12l9 4 9-4"/><path d="M3 17l9 4 9-4"/></svg>',
    products: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.6"><path d="M20.59 13.41 13.42 20.58a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82Z"/><circle cx="7" cy="7" r="1.5"/></svg>',
    truck: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.6"><path d="M14 18V6h2l4 4v8h-2"/><path d="M2 6h12v12H8"/><circle cx="6" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></svg>',
    swap: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.6"><path d="M7 7h13l-3-3"/><path d="M17 17H4l3 3"/></svg>',
    wrench: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.6"><path d="M14.7 6.3a4 4 0 0 0 5 5l-1.4-1.4 2.1-2.1a6 6 0 0 1-7.8 7.8l-7 7a2.1 2.1 0 0 1-3-3l7-7a6 6 0 0 1 7.8-7.8l-2.1 2.1Z"/></svg>',
    clinic: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.6"><path d="M3 21V8l9-5 9 5v13"/><path d="M9 21v-6h6v6"/><path d="M12 9v4M10 11h4"/></svg>',
    label: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.6"><path d="M20.59 13.41 13.42 20.58a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82Z"/><circle cx="7" cy="7" r="1.5"/></svg>',
    scan: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.6"><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><path d="M7 12h10"/></svg>',
    inbox: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.6"><path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11Z"/></svg>',
    bell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.6"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>',
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.6"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8"><path d="M12 5v14M5 12h14"/></svg>',
    chevronRight: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8"><path d="m9 6 6 6-6 6"/></svg>',
    arrowRight: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8"><path d="M5 12h14M13 5l7 7-7 7"/></svg>',
    download: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.6"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/></svg>',
    filter: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.6"><path d="M3 5h18M6 12h12M10 19h4"/></svg>',
    info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.6"><circle cx="12" cy="12" r="10"/><path d="M12 8h.01"/><path d="M11 12h1v4h1"/></svg>',
    settings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.6"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/></svg>',
    more: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8"><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></svg>'
};

function icon(name) { return WMS_ICONS[name] || ''; }

/* ---------- Tab switching (legacy API) ---------------------------------- */
function switchTab(event, tabId) {
    const tabContents = document.getElementsByClassName('tab-content');
    for (let i = 0; i < tabContents.length; i++) tabContents[i].classList.remove('active');
    const tabs = document.getElementsByClassName('tab');
    for (let i = 0; i < tabs.length; i++) tabs[i].classList.remove('active');
    document.getElementById(tabId).classList.add('active');
    event.currentTarget.classList.add('active');
}

/* ---------- Caspio config (unchanged) ----------------------------------- */
const CASPIO_DATAPAGES = {
    customerOrderCreate:   'https://c2ect483.caspio.com/dp/975940000c138cee4729441Q0a15e/emb',
    transferOrderCreate:   'https://c2ect483.caspio.com/dp/975940000c138cee47294410a15e/emb?OrderType=Transfer',
    returnOrderCreate:     'https://c2ect483.caspio.com/dp/9759400return_form/emb',
    purchaseOrderCreate:   'https://c2ect483.caspio.com/dp/97594000e5a237cd35884e7997e9/emb',
    purchaseOrderCreates:  'https://c2ect483.caspio.com/dp/97594000e5a237cd35884e7997e9/emb',
    shipmentCreate:        'https://c2ect483.caspio.com/dp/9759400020270d4c4dbb4f508ce2/emb',
    specialRequestCreate:  'https://c2ect483.caspio.com/dp/97594000aaa51875ed3a4123a20d/emb',
    productCreate:         'https://c2ect483.caspio.com/dp/975940003387a5d0a52d4dd584fe/emb',
    modelStockCreate:      'https://c2ect483.caspio.com/dp/9759400006122dd8bc2842fa9cb0/emb',
    transactionCreate:     'https://c2ect483.caspio.com/dp/97594000588934525a27433b83a7/emb'
};

const MODAL_OPTIONS = {
    orderTypes: {
        title: 'Order Type',
        name: 'orderType',
        items: [
            { label: 'Transfer',                 value: 'transfer',  dataPageKey: 'transferOrderCreate', formName: 'Transfer' },
            { label: 'Model Stock Replenishment', value: 'modelstock', dataPageKey: 'modelStockCreate',   formName: 'Model Stock Replenishment' }
        ]
    }
};

/* ---------- Generic modal (refreshed UI, same API) ---------------------- */
function openGenericModal(config) {
    let modal = document.getElementById('generic-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'generic-modal';
        modal.className = 'modal';
        modal.style.display = 'none';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2 id="generic-modal-title" class="card-title">Modal Title</h2>
                    <span class="close-modal" onclick="closeGenericModal()" aria-label="Close">&times;</span>
                </div>
                <div class="modal-body">
                    <div id="generic-modal-options-container" style="margin-bottom:14px; display:none;"></div>
                    <div id="generic-modal-form-container" class="datapage-container"></div>
                </div>
            </div>`;
        document.body.appendChild(modal);
    }

    const titleEl = document.getElementById('generic-modal-title');
    const optionsContainer = document.getElementById('generic-modal-options-container');
    const formContainer = document.getElementById('generic-modal-form-container');
    if (!titleEl || !optionsContainer || !formContainer) { console.error('Generic modal elements not found'); return; }

    titleEl.textContent = config.title || 'Create New Item';
    optionsContainer.innerHTML = '';
    optionsContainer.style.display = 'none';

    if (config.options) {
        optionsContainer.style.display = 'block';
        const optionsTitle = document.createElement('div');
        optionsTitle.className = 'nav-section-title';
        optionsTitle.style.color = 'var(--c-ink-3)';
        optionsTitle.style.padding = '0';
        optionsTitle.style.marginBottom = '8px';
        optionsTitle.textContent = config.options.title || 'Select Type';
        optionsContainer.appendChild(optionsTitle);

        const group = document.createElement('div');
        group.className = 'order-type-options';

        config.options.items.forEach((item, index) => {
            const label = document.createElement('label');
            const radio = document.createElement('input');
            radio.type = 'radio';
            radio.name = config.options.name || 'modalItemType';
            radio.value = item.value;
            if (index === 0 || item.checked) radio.checked = true;
            radio.addEventListener('change', () => loadDataPageIntoModal(item.dataPageKey, config.params, formContainer, item.formName));
            const span = document.createElement('span');
            span.textContent = item.label;
            label.appendChild(radio);
            label.appendChild(span);
            group.appendChild(label);
        });
        optionsContainer.appendChild(group);

        const checked = config.options.items.find((it, i) => i === 0 || it.checked) || config.options.items[0];
        if (checked) loadDataPageIntoModal(checked.dataPageKey, config.params, formContainer, checked.formName);
    } else if (config.dataPageKey) {
        loadDataPageIntoModal(config.dataPageKey, config.params, formContainer, config.formName);
    }

    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function loadDataPageIntoModal(dataPageKey, params, container, formName) {
    container.innerHTML = '';
    const dataPageUrl = CASPIO_DATAPAGES[dataPageKey];
    if (!dataPageUrl) {
        container.innerHTML = `<p>Error: DataPage URL for key '${dataPageKey}' not found.</p>`;
        return;
    }
    let fullUrl = dataPageUrl;
    if (params) {
        const urlParams = new URLSearchParams();
        for (const k in params) urlParams.append(k, params[k]);
        if (urlParams.toString()) fullUrl += (dataPageUrl.includes('?') ? '&' : '?') + urlParams.toString();
    }
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = fullUrl;
    container.appendChild(script);
}

function closeGenericModal() {
    const modal = document.getElementById('generic-modal');
    if (modal) modal.style.display = 'none';
    document.body.style.overflow = 'auto';
    const formContainer = document.getElementById('generic-modal-form-container');
    if (formContainer) formContainer.innerHTML = '';
    const optionsContainer = document.getElementById('generic-modal-options-container');
    if (optionsContainer) { optionsContainer.innerHTML = ''; optionsContainer.style.display = 'none'; }
}

/* ---------- Modal triggers / order filters / consumption ---------------- */
function initializeModalTriggers() {
    document.querySelectorAll('.modal-trigger').forEach(trigger => {
        if (trigger.__wmsBound) return;
        trigger.__wmsBound = true;
        trigger.addEventListener('click', function() {
            const config = {
                title: this.getAttribute('data-modal-title') || 'Create New Item',
                formName: this.getAttribute('data-modal-form-name'),
                dataPageKey: this.getAttribute('data-modal-key')
            };
            if (this.hasAttribute('data-modal-options')) {
                const k = this.getAttribute('data-modal-options');
                if (MODAL_OPTIONS[k]) config.options = MODAL_OPTIONS[k];
            }
            if (this.hasAttribute('data-modal-params')) {
                try { config.params = JSON.parse(this.getAttribute('data-modal-params')); }
                catch (e) { console.error('Invalid JSON in data-modal-params:', e); }
            }
            openGenericModal(config);
        });
    });
}

function filterOrderType(event, type) {
    document.querySelectorAll('.order-type-tab').forEach(t => t.classList.remove('active'));
    event.currentTarget.classList.add('active');
    console.log('Filtering orders by type:', type);
}

function logConsumption() { window.location.href = 'pages/usage/log-consumption.html'; }

/* ---------- Navigation -------------------------------------------------- */
function navigateTo(page) {
    const paths = {
        'Dashboard':         'index.html',
        'Purchase Orders':   'pages/purchase-orders/index.html',
        'Orders':            'pages/orders/index.html',
        'Warehouse Tasks':   'pages/tasks/index.html',
        'Inventory':         'pages/inventory/index.html',
        'Products':          'pages/products/index.html',
        'Shipments':         'pages/shipments/index.html',
        'Transactions':      'pages/usage/index.html',
        'SpecialRequests':   'pages/specialrequests/index.html',
        'Clinics & Events':  'pages/clinics/index.html',
        'Location Labels':   'pages/management/barcodeLocationGen.html',
        'Scan-O-Matic':      'pages/management/ScanOMatic.html',
        'ROC Request':       'rocrequest/index.html'
    };
    if (!paths[page]) { console.error('No route found for:', page); return; }
    const baseUrl = window.location.href.split('/').slice(0, 3).join('/');
    let repoPath = '';
    if (window.location.hostname.includes('github.io')) {
        const parts = window.location.pathname.split('/');
        if (parts.length > 1) repoPath = '/' + parts[1];
    }
    window.location.href = baseUrl + repoPath + '/' + paths[page];
}

/* ---------- Sidebar / header generators -------------------------------- */
const SIDEBAR_NAV = {
    Main: [
        { label: 'Dashboard',         icon: 'dashboard' },
        { label: 'Purchase Orders',   icon: 'purchase'  },
        { label: 'Orders',            icon: 'orders',    display: 'Orders & Transfers' },
        { label: 'Warehouse Tasks',   icon: 'tasks'     },
        { label: 'Inventory',         icon: 'inventory' },
        { label: 'Products',          icon: 'products'  },
        { label: 'Shipments',         icon: 'truck'     },
        { label: 'Transactions',      icon: 'swap'      },
        { label: 'SpecialRequests',   icon: 'wrench',    display: 'Special Requests' }
    ],
    Management: [
        { label: 'Clinics & Events',  icon: 'clinic'    },
        { label: 'Location Labels',   icon: 'label'     },
        { label: 'Scan-O-Matic',      icon: 'scan'      },
        { label: 'ROC Request',       icon: 'inbox'     }
    ]
};

function generateSidebar(activePage) {
    const navHTML = Object.entries(SIDEBAR_NAV).map(([sectionName, items]) => `
        <nav class="nav-section">
            <div class="nav-section-title">${sectionName}</div>
            ${items.map(it => `
                <a href="javascript:void(0)" data-page="${it.label}" class="nav-item ${activePage === it.label ? 'active' : ''}">
                    <span class="nav-icon">${icon(it.icon)}</span>
                    <span>${it.display || it.label}</span>
                </a>`).join('')}
        </nav>`).join('');

    return `
        <div class="sidebar-overlay" id="sidebar-overlay" onclick="closeSidebar()"></div>
        <aside class="sidebar" id="main-sidebar">
            <div class="logo">
                <div class="logo-mark">${icon('eye')}</div>
                <div class="logo-wordmark">
                    <span class="name">OneSight WMS</span>
                    <span class="sub">Warehouse Mgmt</span>
                </div>
            </div>
            ${navHTML}
            <div class="user-profile" id="wms-user-profile" style="visibility:hidden;">
                <div class="user-avatar" id="wms-user-avatar">?</div>
                <div class="user-info">
                    <div class="user-name" id="wms-user-name">Loading…</div>
                    <div class="user-role" id="wms-user-role"></div>
                </div>
            </div>
            <div id="wms-user-script" style="display:none;"></div>
        </aside>`;
}

function generateHeader(pageTitle, additionalButtons = '') {
    return `
        <header class="header">
            <div class="header-left">
                <button class="hamburger-btn" onclick="toggleSidebar()" aria-label="Toggle menu">&#9776;</button>
                <h1 class="page-title">${pageTitle}</h1>
            </div>
            <div class="header-right">
                <div class="global-search">
                    <span style="display:flex">${icon('search')}</span>
                    <input type="text" placeholder="Search SKUs, orders, locations…" />
                    <kbd>⌘K</kbd>
                </div>
                <button class="icon-btn notification-bell" aria-label="Notifications">
                    ${icon('bell')}
                    <span class="notification-badge">3</span>
                </button>
                <button class="icon-btn" aria-label="Settings">${icon('settings')}</button>
                ${additionalButtons}
            </div>
        </header>`;
}

/* ---------- Click handler / user profile / page bootstrap -------------- */
window.addEventListener('click', function(event) {
    const genericModal = document.getElementById('generic-modal');
    if (genericModal && event.target === genericModal) closeGenericModal();
});

function setWMSUser(fullName, jobTitle) {
    const nameEl = document.getElementById('wms-user-name');
    const roleEl = document.getElementById('wms-user-role');
    const avatarEl = document.getElementById('wms-user-avatar');
    const profileEl = document.getElementById('wms-user-profile');
    if (nameEl) nameEl.textContent = fullName;
    if (roleEl) roleEl.textContent = jobTitle;
    if (avatarEl) {
        const parts = fullName.trim().split(' ');
        avatarEl.textContent = (parts[0][0] + (parts[1] ? parts[1][0] : '')).toUpperCase();
    }
    if (profileEl) profileEl.style.visibility = 'visible';
}

function initializeNavigation() {
    document.addEventListener('click', function(e) {
        const navItem = e.target.closest('.nav-item');
        if (!navItem) return;
        e.preventDefault();
        const pageName = navItem.getAttribute('data-page');
        if (pageName) navigateTo(pageName);
    });
}

document.addEventListener('DOMContentLoaded', function() {
    initializeNavigation();
    initializeModalTriggers();
});

function toggleSidebar() {
    const sidebar = document.getElementById('main-sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    const opening = !sidebar.classList.contains('open');
    sidebar.classList.toggle('open', opening);
    overlay.classList.toggle('visible', opening);
}

function closeSidebar() {
    const sidebar = document.getElementById('main-sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (sidebar) sidebar.classList.remove('open');
    if (overlay) overlay.classList.remove('visible');
}

/**
 * Initialize page with standard sidebar, header, and navigation
 * @param {string} activePage - Current page name for highlighting in sidebar
 * @param {string} pageTitle - Title to display in the header
 * @param {string} additionalButtons - Optional HTML for additional header buttons
 */
function initializePage(activePage, pageTitle, additionalButtons = '') {
    const faviconLink = document.createElement('link');
    faviconLink.rel = 'icon';
    faviconLink.type = 'image/png';
    const _base = window.location.href.split('/').slice(0, 3).join('/');
    const _repo = window.location.hostname.includes('github.io') ? '/' + window.location.pathname.split('/')[1] : '';
    faviconLink.href = _base + _repo + '/images/wmslogo.jpg';
    document.head.appendChild(faviconLink);

    document.getElementById('sidebar-container').innerHTML = generateSidebar(activePage);
    document.getElementById('header-container').innerHTML = generateHeader(pageTitle, additionalButtons);

    const userScriptContainer = document.getElementById('wms-user-script');
    if (userScriptContainer) {
        const script = document.createElement('script');
        script.type = 'text/javascript';
        script.src = 'https://c2ect483.caspio.com/dp/97594000b114afb38f244fcbb64f/emb';
        userScriptContainer.appendChild(script);
    }

    initializeNavigation();
    initializeModalTriggers();
}
