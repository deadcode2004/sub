(function() {
    const isAuthenticated = sessionStorage.getItem('isAuthenticated');
    if (!isAuthenticated) {
        // If the user is not authenticated, redirect to the login page.
        // The current path is saved to allow redirection back after login, if desired.
        const currentPath = window.location.pathname.split('/').pop();
        if (currentPath && currentPath !== 'index.html') {
            // Avoid redirect loops for the login page itself
            window.location.href = 'index.html';
        }
    }
})();
