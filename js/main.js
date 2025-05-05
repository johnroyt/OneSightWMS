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

// Function to create a new PO
function createNewPO() {
    // This will open your Caspio Create PO form
    window.location.href = 'pages/purchase-orders/create.html';
}

// Function to create a new transfer
function createNewTransfer() {
    // This will open your Caspio Create Transfer form
    alert('Opening Create Transfer form...');
}

// Function to log consumption
function logConsumption() {
    window.location.href = 'pages/usage/log-consumption.html';
}

// Fixed navigation function
function navigateTo(page) {
    const routes = {
        'Dashboard': '/index.html',
        'Purchase Orders': '/pages/purchase-orders/index.html',
        'Inventory': '/pages/inventory/index.html',
        'Transfers': '/pages/transfers/index.html',
        'Usage': '/pages/usage/index.html',
        'Clinics & Events': '/pages/clinics/index.html'
    };
    
    if (routes[page]) {
        // Using absolute path with leading slash
        window.location.href = routes[page];
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
                    <div class="nav-icon">📝</div>
                    Purchase Orders
                </a>
                <a href="javascript:void(0)" data-page="Inventory" class="nav-item ${activePage === 'Inventory' ? 'active' : ''}">
                    <div class="nav-icon">📦</div>
                    Inventory
                </a>
                <a href="javascript:void(0)" data-page="Transfers" class="nav-item ${activePage === 'Transfers' ? 'active' : ''}">
                    <div class="nav-icon">🔄</div>
                    Transfers
                </a>
                <a href="javascript:void(0)" data-page="Usage" class="nav-item ${activePage === 'Usage' ? 'active' : ''}">
                    <div class="nav-icon">💊</div>
                    Usage
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
            
            <!-- ... rest of sidebar ... -->
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