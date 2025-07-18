// --- FOUC Prevention --- 
// Wait for the entire page to load before showing the body
window.onload = function() {
    document.body.style.opacity = '1';
};

document.addEventListener('DOMContentLoaded', function() {
    // --- Sidebar Toggle Logic ---
    const sidebarCollapse = document.getElementById('sidebarCollapse');
    if (sidebarCollapse) {
        sidebarCollapse.addEventListener('click', function() {
            document.getElementById('sidebar').classList.toggle('active');
            document.getElementById('content').classList.toggle('active');
        });
    }

    // --- Logout Button Logic ---
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            if (typeof SecureStorage !== 'undefined') {
                SecureStorage.removeItem('loggedInUser');
                window.location.href = 'index.html';
            } else {
                console.error('SecureStorage not found. Make sure secure-storage.js is included.');
            }
        });
    }

    // --- Active Sidebar Link Logic ---
    const currentPath = window.location.pathname.split("/").pop();
    const sidebarLinks = document.querySelectorAll('#sidebar .components a');

    sidebarLinks.forEach(link => {
        const linkPath = link.getAttribute('href');
        if (linkPath === currentPath) {
            document.querySelectorAll('#sidebar .components li.active').forEach(li => {
                li.classList.remove('active');
            });
            link.closest('li').classList.add('active');
        }
    });
});
