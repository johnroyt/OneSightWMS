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
    transferOrderCreate: 'https://c2ect483.caspio.com/dp/975940000c138cee47294410a15e/emb?OrderType=Transfer', // Replace with actual
    returnOrderCreate: 'https://c2ect483.caspio.com/dp/9759400return_form/emb',     // Replace with actual
    purchaseOrderCreate: 'https://c2ect483.caspio.com/dp/97594000e5a237cd35884e7997e9/emb', // Update with actual PO Create DataPage URL
    purchaseOrderCreates: 'https://c2ect483.caspio.com/dp/97594000e5a237cd35884e7997e9/emb', // Update with actual PO Create DataPage URL
    shipmentCreate: 'https://c2ect483.caspio.com/dp/9759400020270d4c4dbb4f508ce2/emb',
    usageCreate: 'https://c2ect483.caspio.com/dp/97594000usage_form/emb',          // Replace with actual
    specialRequestCreate: 'https://c2ect483.caspio.com/dp/97594000aaa51875ed3a4123a20d/emb', // Replace with actual
    // Add other DataPage identifiers and URLs as needed
};

// Define standard modal option configurations
const MODAL_OPTIONS = {
    orderTypes: {
        title: 'Order Type',
        name: 'orderType',
        items: [
            { label: 'Transfer', value: 'transfer', dataPageKey: 'transferOrderCreate', formName: 'Transfer' },
            { label: 'Customer Order', value: 'customer', dataPageKey: 'customerOrderCreate', formName: 'Customer Order' }        ]
    },
    // Add more option sets as needed
};

// Generic modal system
function openGenericModal(config) {
    // Check if the generic modal exists, otherwise create it
    let modal = document.getElementById('generic-modal');
    if (!modal) {
        // Create the modal element
        modal = document.createElement('div');
        modal.id = 'generic-modal';
        modal.className = 'modal';
        modal.style.display = 'none';
        
        // Create the modal HTML structure
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

    // Set modal title
    titleEl.textContent = config.title || 'Create New Item';

    // Clear previous content
    optionsContainer.innerHTML = '';
    optionsContainer.style.display = 'none';

    // Handle options (like order type selection)
    if (config.options) {
        optionsContainer.style.display = 'block';
        const optionsTitle = document.createElement('div');
        optionsTitle.className = 'nav-section-title';
        optionsTitle.textContent = config.options.title || 'Select Type';
        optionsContainer.appendChild(optionsTitle);

        const optionsRadioGroup = document.createElement('div');
        optionsRadioGroup.className = 'order-type-options'; // Or a more generic class
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
            if (index === 0 || item.checked) { // Default check the first or specified item
                radio.checked = true;
            }

            // Event listener to load the specific DataPage when an option changes
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

        // Load initial DataPage based on the default checked option
        const initiallyCheckedOption = config.options.items.find((item, index) => index === 0 || item.checked) || config.options.items[0];
        if (initiallyCheckedOption) {
            loadDataPageIntoModal(initiallyCheckedOption.dataPageKey, config.params, formContainer, initiallyCheckedOption.formName);
        }
    } else if (config.dataPageKey) {
        // If no options, load the specified DataPage directly
        loadDataPageIntoModal(config.dataPageKey, config.params, formContainer, config.formName);
    }

    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function loadDataPageIntoModal(dataPageKey, params, container, formName) {
    // Clear the container
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

    // Create the script that will load the Caspio form
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = fullUrl;
    
    // Append the script to load the form
    container.appendChild(script);
}

function closeGenericModal() {
    const modal = document.getElementById('generic-modal');
    if (modal) {
        modal.style.display = 'none';
    }
    document.body.style.overflow = 'auto';
    
    // Clean up containers
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
    // Find all elements with the modal-trigger class
    const modalTriggers = document.querySelectorAll('.modal-trigger');
    
    // Add click event listener to each trigger
    modalTriggers.forEach(trigger => {
        trigger.addEventListener('click', function() {
            // Get configuration from data attributes
            const config = {
                title: this.getAttribute('data-modal-title') || 'Create New Item',
                formName: this.getAttribute('data-modal-form-name'),
                dataPageKey: this.getAttribute('data-modal-key')
            };
            
            // Check if this modal has options
            if (this.hasAttribute('data-modal-options')) {
                // Get the options configuration from the MODAL_OPTIONS object
                const optionsKey = this.getAttribute('data-modal-options');
                if (MODAL_OPTIONS[optionsKey]) {
                    config.options = MODAL_OPTIONS[optionsKey];
                }
            }
            
            // Check for additional parameters
            if (this.hasAttribute('data-modal-params')) {
                try {
                    config.params = JSON.parse(this.getAttribute('data-modal-params'));
                } catch (e) {
                    console.error('Invalid JSON in data-modal-params:', e);
                }
            }
            
            // Open the modal with the configuration
            openGenericModal(config);
        });
    });
}

// Filter orders by type
function filterOrderType(event, type) {
    // Remove active class from all tabs
    const tabs = document.getElementsByClassName('order-type-tab');
    for (let i = 0; i < tabs.length; i++) {
        tabs[i].classList.remove('active');
    }
    
    // Add active class to clicked tab
    event.currentTarget.classList.add('active');
    
    // Here you would update the DataPage with the filtered content
    console.log(`Filtering orders by type: ${type}`);
    
    // In a real implementation, you would update the DataPage parameters to filter by order type
}

// Function to log consumption
function logConsumption() {
    window.location.href = 'pages/usage/log-consumption.html';
}

// Updated navigateTo function that works both locally and on GitHub Pages
function navigateTo(page) {
    // Define your paths relative to the repo root
    const paths = {
        'Dashboard': 'index.html',
        'Purchase Orders': 'pages/purchase-orders/index.html',
        'Orders': 'pages/orders/index.html',
        'Warehouse Tasks': 'pages/tasks/index.html',
        'Inventory': 'pages/inventory/index.html',
        'Shipments': 'pages/shipments/index.html',
        'Usage': 'pages/usage/index.html',
        'SpecialRequests': 'pages/specialrequests/index.html',
        'Clinics & Events': 'pages/clinics/index.html',
        'Location Labels': 'pages/management/barcodeLocationGen.html'
    };
    
    if (paths[page]) {
        // Get the current URL
        const currentUrl = window.location.href;
        
        // Extract the base URL (everything up to the repository root)
        // This handles both local and GitHub Pages deployments
        const baseUrl = currentUrl.split('/').slice(0, 3).join('/');
        
        // For GitHub Pages, we need to add the repository name
        let repoPath = '';
        if (window.location.hostname.includes('github.io')) {
            // Extract the repository name from the URL
            const pathParts = window.location.pathname.split('/');
            if (pathParts.length > 1) {
                repoPath = '/' + pathParts[1];
            }
        }
        
        // Construct the full URL
        const newUrl = baseUrl + repoPath + '/' + paths[page];
        
        // Navigate to the new URL
        window.location.href = newUrl;
    } else {
        console.error('No route found for:', page);
    }
}

// Function to generate sidebar HTML
function generateSidebar(activePage) {
    return `
        <aside class="sidebar">
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
                    <div class="nav-icon">⚙️</div>Warehouse Tasks
                </a>
                <a href="javascript:void(0)" data-page="Inventory" class="nav-item ${activePage === 'Inventory' ? 'active' : ''}">
                    <div class="nav-icon">📦</div>
                    Inventory
                </a>
                <a href="javascript:void(0)" data-page="Shipments" class="nav-item ${activePage === 'Shipments' ? 'active' : ''}">
                    <div class="nav-icon">🚚</div>
                    Shipments
                </a>
                <a href="javascript:void(0)" data-page="Usage" class="nav-item ${activePage === 'Usage' ? 'active' : ''}">
                    <div class="nav-icon">👓</div>
                    Usage
                </a>
                <a href="javascript:void(0)" data-page="SpecialRequests" class="nav-item ${activePage === 'Special Project Requests' ? 'active' : ''}">
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
                <!-- Add data-page to other nav items too -->
            </nav>
            
            <div class="user-profile">
                <div class="user-avatar">JD</div>
                <div class="user-info">
                    <div class="user-name">John Doe</div>
                    <div class="user-role">Warehouse Manager</div>
                </div>
            </div>
        </aside>
    `;
}

// Function to generate header HTML
function generateHeader(pageTitle, additionalButtons = '') {
    return `
        <header class="header">
            <div class="header-left">
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
    // Handle generic modal
    const genericModal = document.getElementById('generic-modal');
    if (genericModal && event.target === genericModal) {
        closeGenericModal();
    }
});

function initializeNavigation() {
    document.addEventListener('click', function(e) {
        const navItem = e.target.closest('.nav-item');
        
        if (navItem) {
            e.preventDefault();
            
            // Always use data-page attribute
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

// Make sure initialization runs after DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing...');
    initializeNavigation();
    initializeModalTriggers();
});

/**
 * Initialize page with standard sidebar, header, and navigation
 * @param {string} activePage - Current page name for highlighting in sidebar
 * @param {string} pageTitle - Title to display in the header
 * @param {string} additionalButtons - Optional HTML for additional header buttons
 */
function initializePage(activePage, pageTitle, additionalButtons = '') {
    // Generate sidebar and header
    document.getElementById('sidebar-container').innerHTML = generateSidebar(activePage);
    document.getElementById('header-container').innerHTML = generateHeader(pageTitle, additionalButtons);
    
    // Set up navigation event listeners
    initializeNavigation();
    
    // Initialize modal triggers
    initializeModalTriggers();
    
    console.log(`Page initialized: ${activePage}`);
}