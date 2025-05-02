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
            alert('Opening Create PO form...');
        }
        
        function navigateTo(page) {
            const pageMap = {
                'Dashboard': 'index.html',
                'Purchase Orders': 'pages/purchase-orders/index.html',
                'Inventory': 'pages/inventory/index.html',
                'Transfers': 'pages/transfers/index.html',
                'Usage': 'pages/usage/index.html',
                'Clinics & Events': 'pages/clinics/index.html'
            };
            
            if (pageMap[page]) {
                window.location.href = pageMap[page];
            }
        }
                
        // Initialize page
        document.addEventListener('DOMContentLoaded', function() {
            // Add click handlers to navigation items
            const navItems = document.querySelectorAll('.nav-item');
            navItems.forEach(item => {
                item.addEventListener('click', function(e) {
                    e.preventDefault();
                    // Remove active class from all items
                    navItems.forEach(nav => nav.classList.remove('active'));
                    // Add active class to clicked item
                    this.classList.add('active');
                    // Navigate to page (you can implement page switching logic here)
                    const pageName = this.textContent.trim();
                    navigateTo(pageName);
                });
            });
            
            // Handle notification clicks
            document.querySelector('.notification-bell').addEventListener('click', function() {
                alert('Opening notifications...');
            });
        });