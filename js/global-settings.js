document.addEventListener('DOMContentLoaded', function() {
    const API_BASE_URL = 'http://localhost:3000';
    // Fetch all settings from the server and then apply them.
    fetch(`${API_BASE_URL}/api/settings`)
        .then(response => response.json())
        .then(data => {
            if (data.success && data.settings) {
                loadGlobalSiteLogo(data.settings.site_logo);
                loadGlobalSiteFavicon(data.settings.site_favicon);
            }
        })
        .catch(error => {
            console.error('Error fetching global settings:', error);
        });
});

/**
 * Finds any image with the class 'site-logo' and updates its source
 * with the logo saved in SecureStorage.
 */
function loadGlobalSiteLogo(logoUrl) {
    if (!logoUrl) return;
    const logoElements = document.querySelectorAll('.site-logo');
    if (logoElements.length > 0) {
        logoElements.forEach(logoEl => {
            logoEl.src = logoUrl;
        });
    }
}

/**
 * Finds the favicon link element and updates its href with the 
 * favicon saved in SecureStorage.
 */
function loadGlobalSiteFavicon(faviconUrl) {
    if (!faviconUrl) return;
    const faviconElement = document.getElementById('site-favicon');
    if (faviconElement) {
        faviconElement.href = faviconUrl;
    }
}
