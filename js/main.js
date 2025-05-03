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
    console.log('Navigation function called');
    console.log('Trying to navigate to:', page);
    console.log('Current URL:', window.location.href);
    
    const routes = {
        'Dashboard': 'index.html',
        'Purchase Orders': 'pages/purchase-orders/index.html',
        'Inventory': 'pages/inventory/index.html',
        'Transfers': 'pages/transfers/index.html',
        'Usage': 'pages/usage/index.html',
        'Clinics & Events': 'pages/clinics/index.html'
    };
    
    console.log('Available routes:', routes);
    console.log('Route exists?', routes.hasOwnProperty(page));
    
    if (routes[page]) {
        const targetUrl = routes[page];
        console.log('Found route:', targetUrl);
        console.log('About to navigate to:', targetUrl);
        
        // Force navigation even if on same page
        if (window.location.href.includes('index.html') && targetUrl === 'index.html') {
            console.log('Already on dashboard, forcing reload');
            window.location.reload();
        } else {
            console.log('Navigating to new page');
            window.location.href = targetUrl;
        }
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
                <a href="javascript:void(0)" class="nav-item ${activePage === 'Dashboard' ? 'active' : ''}">
                    <div class="nav-icon">📊</div>
                    Dashboard
                </a>
                <a href="javascript:void(0)" class="nav-item ${activePage === 'Purchase Orders' ? 'active' : ''}">
                    <div class="nav-icon">📝</div>
                    Purchase Orders
                </a>
                <a href="javascript:void(0)" class="nav-item ${activePage === 'Inventory' ? 'active' : ''}">
                    <div class="nav-icon">📦</div>
                    Inventory
                </a>
                <a href="javascript:void(0)" class="nav-item ${activePage === 'Transfers' ? 'active' : ''}">
                    <div class="nav-icon">🔄</div>
                    Transfers
                </a>
                <a href="javascript:void(0)" class="nav-item ${activePage === 'Usage' ? 'active' : ''}">
                    <div class="nav-icon">💊</div>
                    Usage
                </a>
            </nav>
            
            <nav class="nav-section">
                <div class="nav-section-title">Management</div>
                <a href="javascript:void(0)" class="nav-item ${activePage === 'Clinics & Events' ? 'active' : ''}">
                    <div class="nav-icon">🏥</div>
                    Clinics & Events
                </a>
                <a href="javascript:void(0)" class="nav-item">
                    <div class="nav-icon">👥</div>
                    Suppliers
                </a>
                <a href="javascript:void(0)" class="nav-item">
                    <div class="nav-icon">🏢</div>
                    Warehouses
                </a>
                <a href="javascript:void(0)" class="nav-item">
                    <div class="nav-icon">📈</div>
                    Reports
                </a>
            </nav>
            
            <nav class="nav-section">
                <div class="nav-section-title">System</div>
                <a href="javascript:void(0)" class="nav-item">
                    <div class="nav-icon">⚙️</div>
                    Settings
                </a>
            </nav>
            
            <div class="user-profile">
                <div class="user-avatar">JD</div>
                <div class="user-info">
                    <div class="user-name">John Doe</div>
                    <div class="user-role">Administrator</div>
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

function initializeNavigation() {
    console.log('Initializing navigation...');
    
    // Use event delegation on document
    document.addEventListener('click', function(e) {
        console.log('Click detected on:', e.target);
        
        // Check if clicked element or parent is a nav item
        const navItem = e.target.closest('.nav-item');
        
        if (navItem) {
            console.log('Nav item clicked:', navItem);
            e.preventDefault();
            e.stopPropagation();
            
            // Get page name from text content
            const pageName = navItem.textContent.trim();
            console.log('Extracted page name:', pageName);
            
            navigateTo(pageName);
            return false;
        }
    });
    
    console.log('Navigation initialization complete');
}

// Make sure initialization runs after DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing...');
    initializeNavigation();
});