// Tab switching functionality
function switchTab(event, tabId) {
    // Hide all tab contents
    const tabContents = document.getElementsByClassName('tab-content');
    for (let i = 0; i < tabContents.length; i++) {
        tabContents[i].classList.remove('active');
    }
    
    // Remove active class from all tabs
    const tabs = document.getElementsByClassName('tab');
    for (let i = 0; i < tabs.length; i++) {
        tabs[i].classList.remove('active');
    }
    
    // Show selected tab content and mark tab as active
    document.getElementById(tabId).classList.add('active');
    event.currentTarget.classList.add('active');
}

// Store Caspio DataPage URLs in a configuration object
const CASPIO_DATAPAGES = {
    customerOrderCreate: 'https://c2ect483.caspio.com/dp/975940000c138cee4729441Q0a15e/emb',
    transferOrderCreate: 'https://c2ect483.caspio.com/dp/975940000c138cee47294410a15e/emb?OrderType=Transfer',
    returnOrderCreate: 'https://c2ect483.caspio.com/dp/9759400return_form/emb',
    purchaseOrderCreate: 'https://c2ect483.caspio.com/dp/97594000e5a237cd35884e7997e9/emb',
    purchaseOrderCreates: 'https://c2ect483.caspio.com/dp/97594000e5a237cd35884e7997e9/emb',
    shipmentCreate: 'https://c2ect483.caspio.com/dp/9759400020270d4c4dbb4f508ce2/emb',
    specialRequestCreate: 'https://c2ect483.caspio.com/dp/97594000aaa51875ed3a4123a20d/emb',
    productCreate: 'https://c2ect483.caspio.com/dp/975940003387a5d0a52d4dd584fe/emb',
    modelStockCreate: 'https://c2ect483.caspio.com/dp/9759400006122dd8bc2842fa9cb0/emb',
    transactionCreate: 'https://c2ect483.caspio.com/dp/97594000588934525a27433b83a7/emb'

};

const MODAL_OPTIONS = {
    orderTypes: {
        title: 'Order Type',
        name: 'orderType',
        items: [
            { label: 'Transfer', value: 'transfer', dataPageKey: 'transferOrderCreate', formName: 'Transfer' },
            { label: 'Model Stock Replenishment', value: 'modelstock', dataPageKey: 'modelStockCreate', formName: 'Model Stock Replenishment' }
        ]
    },
};

// Generic modal system
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
                    <span class="close-modal" onclick="closeGenericModal()">&times;</span>
                </div>
                <div class="modal-body">
                    <div id="generic-modal-options-container" style="margin-bottom:1rem; display:none;">
                    </div>
                    <div id="generic-modal-form-container" class="datapage-container">
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }
    
    const titleEl = document.getElementById('generic-modal-title');
    const optionsContainer = document.getElementById('generic-modal-options-container');
    const formContainer = document.getElementById('generic-modal-form-container');

    if (!titleEl || !optionsContainer || !formContainer) {
        console.error('Generic modal elements not found!');
        return;
    }

    titleEl.textContent = config.title || 'Create New Item';

    optionsContainer.innerHTML = '';
    optionsContainer.style.display = 'none';

    if (config.options) {
        optionsContainer.style.display = 'block';
        const optionsTitle = document.createElement('div');
        optionsTitle.className = 'nav-section-title';
        optionsTitle.textContent = config.options.title || 'Select Type';
        optionsContainer.appendChild(optionsTitle);

        const optionsRadioGroup = document.createElement('div');
        optionsRadioGroup.className = 'order-type-options';
        optionsRadioGroup.style.display = 'flex';
        optionsRadioGroup.style.gap = '1rem';
        optionsRadioGroup.style.marginTop = '0.5rem';

        config.options.items.forEach((item, index) => {
            const label = document.createElement('label');
            label.style.flex = '1';
            label.style.padding = '1rem';
            label.style.border = '1px solid #e2e8f0';
            label.style.borderRadius = '8px';
            label.style.cursor = 'pointer';

            const radio = document.createElement('input');
            radio.type = 'radio';
            radio.name = config.options.name || 'modalItemType';
            radio.value = item.value;
            if (index === 0 || item.checked) {
                radio.checked = true;
            }

            radio.addEventListener('change', () => {
                loadDataPageIntoModal(item.dataPageKey, config.params, formContainer, item.formName);
            });

            const span = document.createElement('span');
            span.style.fontWeight = '500';
            span.style.marginLeft = '0.5rem';
            span.textContent = item.label;

            label.appendChild(radio);
            label.appendChild(span);
            optionsRadioGroup.appendChild(label);
        });
        optionsContainer.appendChild(optionsRadioGroup);

        const initiallyCheckedOption = config.options.items.find((item, index) => index === 0 || item.checked) || config.options.items[0];
        if (initiallyCheckedOption) {
            loadDataPageIntoModal(initiallyCheckedOption.dataPageKey, config.params, formContainer, initiallyCheckedOption.formName);
        }
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
        console.error(`DataPage URL for key '${dataPageKey}' not found.`);
        return;
    }

    let fullUrl = dataPageUrl;
    if (params) {
        const urlParams = new URLSearchParams();
        for (const key in params) {
            urlParams.append(key, params[key]);
        }
        if (urlParams.toString()) {
            fullUrl += (dataPageUrl.includes('?') ? '&' : '?') + urlParams.toString();
        }
    }

    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = fullUrl;
    container.appendChild(script);
}

function closeGenericModal() {
    const modal = document.getElementById('generic-modal');
    if (modal) {
        modal.style.display = 'none';
    }
    document.body.style.overflow = 'auto';
    
    const formContainer = document.getElementById('generic-modal-form-container');
    if (formContainer) {
        formContainer.innerHTML = '';
    }
    const optionsContainer = document.getElementById('generic-modal-options-container');
    if (optionsContainer) {
        optionsContainer.innerHTML = '';
        optionsContainer.style.display = 'none';
    }
}

// Data-attribute based modal system
function initializeModalTriggers() {
    const modalTriggers = document.querySelectorAll('.modal-trigger');
    
    modalTriggers.forEach(trigger => {
        trigger.addEventListener('click', function() {
            const config = {
                title: this.getAttribute('data-modal-title') || 'Create New Item',
                formName: this.getAttribute('data-modal-form-name'),
                dataPageKey: this.getAttribute('data-modal-key')
            };
            
            if (this.hasAttribute('data-modal-options')) {
                const optionsKey = this.getAttribute('data-modal-options');
                if (MODAL_OPTIONS[optionsKey]) {
                    config.options = MODAL_OPTIONS[optionsKey];
                }
            }
            
            if (this.hasAttribute('data-modal-params')) {
                try {
                    config.params = JSON.parse(this.getAttribute('data-modal-params'));
                } catch (e) {
                    console.error('Invalid JSON in data-modal-params:', e);
                }
            }
            
            openGenericModal(config);
        });
    });
}

// Filter orders by type
function filterOrderType(event, type) {
    const tabs = document.getElementsByClassName('order-type-tab');
    for (let i = 0; i < tabs.length; i++) {
        tabs[i].classList.remove('active');
    }
    
    event.currentTarget.classList.add('active');
    console.log(`Filtering orders by type: ${type}`);
}

// Function to log consumption
function logConsumption() {
    window.location.href = 'pages/usage/log-consumption.html';
}

// Navigation function
function navigateTo(page) {
    const paths = {
        'Dashboard': 'index.html',
        'Purchase Orders': 'pages/purchase-orders/index.html',
        'Orders': 'pages/orders/index.html',
        'Warehouse Tasks': 'pages/tasks/index.html',
        'Inventory': 'pages/inventory/index.html',
        'Products': 'pages/products/index.html',
        'Shipments': 'pages/shipments/index.html',
        'Transactions': 'pages/usage/index.html',
        'SpecialRequests': 'pages/specialrequests/index.html',
        'Clinics & Events': 'pages/clinics/index.html',
        'Location Labels': 'pages/management/barcodeLocationGen.html',
        'Scan-O-Matic': 'pages/management/ScanOMatic.html',
        'ROC Request': 'rocrequest/index.html'
    };
    
    if (paths[page]) {
        const currentUrl = window.location.href;
        const baseUrl = currentUrl.split('/').slice(0, 3).join('/');
        
        let repoPath = '';
        if (window.location.hostname.includes('github.io')) {
            const pathParts = window.location.pathname.split('/');
            if (pathParts.length > 1) {
                repoPath = '/' + pathParts[1];
            }
        }
        
        const newUrl = baseUrl + repoPath + '/' + paths[page];
        window.location.href = newUrl;
    } else {
        console.error('No route found for:', page);
    }
}

// Function to generate sidebar HTML
function generateSidebar(activePage) {
    return `
        <div class="sidebar-overlay" id="sidebar-overlay" onclick="closeSidebar()"></div>
        <aside class="sidebar" id="main-sidebar">
            <div class="logo">
                <div class="logo-icon"></div>
                <span class="logo-text">WMS</span>
            </div>
            
            <nav class="nav-section">
                <div class="nav-section-title">Main</div>
                <a href="javascript:void(0)" data-page="Dashboard" class="nav-item ${activePage === 'Dashboard' ? 'active' : ''}">
                    <div class="nav-icon">📊</div>
                    Dashboard
                </a>
                <a href="javascript:void(0)" data-page="Purchase Orders" class="nav-item ${activePage === 'Purchase Orders' ? 'active' : ''}">
                    <div class="nav-icon">📋</div>
                    Purchase Orders
                </a>
                <a href="javascript:void(0)" data-page="Orders" class="nav-item ${activePage === 'Orders' ? 'active' : ''}">
                    <div class="nav-icon">📝</div>
                    Orders & Transfers
                </a>
                <a href="javascript:void(0)" data-page="Warehouse Tasks" class="nav-item ${activePage === 'Warehouse Tasks' ? 'active' : ''}">
                    <div class="nav-icon">⚙️</div>
                    Warehouse Tasks
                </a>
                <a href="javascript:void(0)" data-page="Inventory" class="nav-item ${activePage === 'Inventory' ? 'active' : ''}">
                    <div class="nav-icon">📦</div>
                    Inventory
                </a>
                <a href="javascript:void(0)" data-page="Products" class="nav-item ${activePage === 'Products' ? 'active' : ''}">
                    <div class="nav-icon">🏷️</div>
                    Products
                </a>
                <a href="javascript:void(0)" data-page="Shipments" class="nav-item ${activePage === 'Shipments' ? 'active' : ''}">
                    <div class="nav-icon">🚚</div>
                    Shipments
                </a>
                <a href="javascript:void(0)" data-page="Transactions" class="nav-item ${activePage === 'Transactions' ? 'active' : ''}">
                    <div class="nav-icon">🔄</div>
                    Transactions
                </a>
                <a href="javascript:void(0)" data-page="SpecialRequests" class="nav-item ${activePage === 'SpecialRequests' ? 'active' : ''}">
                    <div class="nav-icon">🛠️</div>
                    Special Requests
                </a>
            </nav>
            
            <nav class="nav-section">
                <div class="nav-section-title">Management</div>
                <a href="javascript:void(0)" data-page="Clinics & Events" class="nav-item ${activePage === 'Clinics & Events' ? 'active' : ''}">
                    <div class="nav-icon">🏥</div>
                    Clinics & Events
                </a>
                <a href="javascript:void(0)" data-page="Location Labels" class="nav-item ${activePage === 'Location Labels' ? 'active' : ''}">
                    <div class="nav-icon">🏷️</div>
                    Location Labels
                </a>
                <a href="javascript:void(0)" data-page="Scan-O-Matic" class="nav-item ${activePage === 'Scan-O-Matic' ? 'active' : ''}">
                    <div class="nav-icon">📷</div>
                    Scan-O-Matic
                </a>
                <a href="javascript:void(0)" data-page="ROC Request" class="nav-item ${activePage === 'ROC Request' ? 'active' : ''}">
                    <div class="nav-icon">📥</div>
                    ROC Request
                </a>
            </nav>
            
            <div class="user-profile" id="wms-user-profile" style="visibility:hidden;">
    <div class="user-avatar" id="wms-user-avatar">?</div>
    <div class="user-info">
        <div class="user-name" id="wms-user-name">Loading...</div>
        <div class="user-role" id="wms-user-role"></div>
    </div>
</div>
<div id="wms-user-script" style="display:none;"></div>
        </aside>
    `;
}

// Function to generate header HTML
function generateHeader(pageTitle, additionalButtons = '') {
    return `
        <header class="header">
            <div class="header-left">
                <button class="hamburger-btn" onclick="toggleSidebar()" aria-label="Toggle menu">&#9776;</button>
                <h1 class="page-title">${pageTitle}</h1>
            </div>
            <div class="header-right">
                <div class="notification-bell">
                    <span>🔔</span>
                    <span class="notification-badge">3</span>
                </div>
                ${additionalButtons}
            </div>
        </header>
    `;
}

// Close modal when clicking outside of it
window.addEventListener('click', function(event) {
    const genericModal = document.getElementById('generic-modal');
    if (genericModal && event.target === genericModal) {
        closeGenericModal();
    }
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
        
        if (navItem) {
            e.preventDefault();
            const pageName = navItem.getAttribute('data-page');
            
            if (pageName) {
                console.log('Page name from data attribute:', pageName);
                navigateTo(pageName);
            } else {
                console.error('No data-page attribute found');
            }
        }
    });
}

document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing...');
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
    document.getElementById('sidebar-container').innerHTML = generateSidebar(activePage);
    document.getElementById('header-container').innerHTML = generateHeader(pageTitle, additionalButtons);
    
    // Dynamically inject Caspio user info script so it actually executes
    const userScriptContainer = document.getElementById('wms-user-script');
    if (userScriptContainer) {
        const script = document.createElement('script');
        script.type = 'text/javascript';
        script.src = 'https://c2ect483.caspio.com/dp/97594000b114afb38f244fcbb64f/emb';
        userScriptContainer.appendChild(script);
    }

    initializeNavigation();
    initializeModalTriggers();
    
    console.log(`Page initialized: ${activePage}`);
}