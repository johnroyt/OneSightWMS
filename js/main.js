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

function navigateTo(page) {
    // Check if we're on the root or in a subdirectory
    const isRoot = !window.location.pathname.includes('/pages/');
    
    const pageMap = {
        'Dashboard': isRoot ? 'index.html' : '../../index.html',
        'Purchase Orders': isRoot ? 'pages/purchase-orders/index.html' : '../purchase-orders/index.html',
        'Inventory': isRoot ? 'pages/inventory/index.html' : '../inventory/index.html',
        'Transfers': isRoot ? 'pages/transfers/index.html' : '../transfers/index.html',
        'Usage': isRoot ? 'pages/usage/index.html' : '../usage/index.html',
        'Clinics & Events': isRoot ? 'pages/clinics/index.html' : '../clinics/index.html',
        'Suppliers': '#',
        'Warehouses': '#',
        'Reports': '#',
        'Settings': '#'
    };
    
    if (pageMap[page] && pageMap[page] !== '#') {
        window.location.href = pageMap[page];
    } else if (pageMap[page] === '#') {
        alert(`${page} page is not implemented yet.`);
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
                <a href="#" class="nav-item ${activePage === 'Dashboard' ? 'active' : ''}">
                    <div class="nav-icon">📊</div>
                    Dashboard
                </a>
                <a href="#" class="nav-item ${activePage === 'Purchase Orders' ? 'active' : ''}">
                    <div class="nav-icon">📝</div>
                    Purchase Orders
                </a>
                <a href="#" class="nav-item ${activePage === 'Inventory' ? 'active' : ''}">
                    <div class="nav-icon">📦</div>
                    Inventory
                </a>
                <a href="#" class="nav-item ${activePage === 'Transfers' ? 'active' : ''}">
                    <div class="nav-icon">🔄</div>
                    Transfers
                </a>
                <a href="#" class="nav-item ${activePage === 'Usage' ? 'active' : ''}">
                    <div class="nav-icon">💊</div>
                    Usage
                </a>
            </nav>
            
            <nav class="nav-section">
                <div class="nav-section-title">Management</div>
                <a href="#" class="nav-item ${activePage === 'Clinics & Events' ? 'active' : ''}">
                    <div class="nav-icon">🏥</div>
                    Clinics & Events
                </a>
                <a href="#" class="nav-item">
                    <div class="nav-icon">👥</div>
                    Suppliers
                </a>
                <a href="#" class="nav-item">
                    <div class="nav-icon">🏢</div>
                    Warehouses
                </a>
                <a href="#" class="nav-item">
                    <div class="nav-icon">📈</div>
                    Reports
                </a>
            </nav>
            
            <nav class="nav-section">
                <div class="nav-section-title">System</div>
                <a href="#" class="nav-item">
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

// Function to handle nav links after page load
function initializeNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const pageName = this.textContent.trim();
            navigateTo(pageName);
        });
    });
    
    // Handle notification clicks if bell exists
    const notificationBell = document.querySelector('.notification-bell');
    if (notificationBell) {
        notificationBell.addEventListener('click', function() {
            alert('Opening notifications...');
        });
    }
}

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
    initializeNavigation();
});