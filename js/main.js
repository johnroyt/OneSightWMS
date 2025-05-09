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

// Function to create a new order (replaces createNewPO and createNewTransfer)
function createNewOrder() {
    // Show the modal
    document.getElementById('new-order-modal').style.display = 'flex';
    document.body.style.overflow = 'hidden'; // Prevent scrolling behind modal
    
    // Set up event listeners for order type selection
    const orderTypeRadios = document.querySelectorAll('input[name="orderType"]');
    orderTypeRadios.forEach(radio => {
        radio.addEventListener('change', updateOrderForm);
    });
    
    // Load initial form (Customer Order is default)
    updateOrderForm();
}

// Function to update the order form based on selected type
function updateOrderForm() {
    const selectedType = document.querySelector('input[name="orderType"]:checked').value;
    const formContainer = document.getElementById('order-form-container');
    
    // Clear current form
    formContainer.innerHTML = '<p>Loading form for ' + selectedType + ' order...</p>';
    
    // Load the appropriate Caspio DataPage based on order type
    const createOrderScript = document.createElement('script');
    createOrderScript.type = 'text/javascript';
    
    // Set the appropriate DataPage URL based on order type
    if (selectedType === 'customer') {
        createOrderScript.src = 'https://c2ect483.caspio.com/dp/97594000e5a237cd35884e7997e9/emb';
    } else if (selectedType === 'transfer') {
        createOrderScript.src = 'https://c2ect483.caspio.com/dp/9759400transfer_form/emb'; // Replace with actual transfer form URL
    } else if (selectedType === 'return') {
        createOrderScript.src = 'https://c2ect483.caspio.com/dp/9759400return_form/emb'; // Replace with actual return form URL
    }
    
    formContainer.appendChild(createOrderScript);
}

// Function to close the order modal
function closeOrderModal() {
    document.getElementById('new-order-modal').style.display = 'none';
    document.body.style.overflow = 'auto'; // Restore scrolling
}

// Filter orders by type
function filterOrderType(type) {
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

// Function to show the modal (kept for backward compatibility)
function showModal() {
    document.getElementById('create-po-modal').style.display = 'flex';
    document.body.style.overflow = 'hidden'; // Prevent scrolling behind modal
}

// Function to close the modal (kept for backward compatibility)
function closeModal() {
    document.getElementById('create-po-modal').style.display = 'none';
    document.body.style.overflow = 'auto'; // Restore scrolling
}

// Legacy function - now redirects to the new createNewOrder
function createNewPO() {
    createNewOrder();
}

// Legacy function - now redirects to the new createNewOrder with pre-selected transfer type
function createNewTransfer() {
    createNewOrder();
    // Pre-select the transfer radio button
    const transferRadio = document.querySelector('input[name="orderType"][value="transfer"]');
    if (transferRadio) {
        transferRadio.checked = true;
        updateOrderForm();
    }
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
        'Inventory': 'pages/inventory/index.html',
        'Shipments': 'pages/shipments/index.html',
        'Usage': 'pages/usage/index.html',
        'SpecialRequests': 'pages/specialrequests/index.html',
        'Clinics & Events': 'pages/clinics/index.html'
    };
    
    // For backward compatibility
    if (page === 'Transfers') {
        page = 'Orders';
    }
    
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
    // Map old active pages to new ones for backward compatibility
    if (activePage === 'Transfers') {
        activePage = 'Orders';
    }
    
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
    // Handle Order modal
    const orderModal = document.getElementById('new-order-modal');
    if (orderModal && event.target === orderModal) {
        closeOrderModal();
    }
    
    // Handle legacy PO modal for backward compatibility
    const poModal = document.getElementById('create-po-modal');
    if (poModal && event.target === poModal) {
        closeModal();
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
    
    console.log(`Page initialized: ${activePage}`);
}