document.addEventListener('DOMContentLoaded', async function () {
    const API_BASE_URL = 'http://localhost:3000';
    let siteSettings = {};
    try {
        const response = await fetch(`${API_BASE_URL}/api/settings`);
        const data = await response.json();
        console.log('Received settings data:', JSON.stringify(data, null, 2));
        if (data.success) {
            siteSettings = data.settings || {};
        } else {
            throw new Error(data.message || 'Failed to load settings');
        }
    } catch (error) {
        console.error('Fatal: Could not load site settings.', error);
        console.error('Error details:', error);
        document.body.innerHTML = `<div class="alert alert-danger m-3">لا يمكن تحميل إعدادات الموقع. يرجى التحقق من الخادم والمحاولة مرة أخرى.</div>`;
        return;
    }
    // --- Password Protection Logic ---
    const passwordModalElement = document.getElementById('passwordModal');
    const passwordModal = new bootstrap.Modal(passwordModalElement);
    const passwordProtectForm = document.getElementById('passwordProtectForm');
    const mainContent = document.getElementById('mainContent');
    const passwordError = document.getElementById('passwordError');

    const HASHED_PASSWORD_KEY = 'admin_password_hash';

    // Function to hash the password
    function hashPassword(password) {
        return CryptoJS.SHA256(password).toString();
    }

    // Show the password modal immediately on page load
    passwordModal.show();

    // Handle password form submission
    passwordProtectForm.addEventListener('submit', function(event) {
        event.preventDefault();
        const enteredPassword = document.getElementById('adminPassword').value;
        const enteredPasswordHash = hashPassword(enteredPassword);
        const storedPasswordHash = siteSettings[HASHED_PASSWORD_KEY];

        if (storedPasswordHash && enteredPasswordHash === storedPasswordHash) {
            // Correct password
            passwordModal.hide();
            mainContent.style.display = 'block';
        } else {
            // Incorrect password
            passwordError.style.display = 'block';
            document.getElementById('adminPassword').value = ''; // Clear input
        }
    });

    // --- End of Password Protection Logic ---

    const credentialsForm = document.getElementById('credentialsForm');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');

    const logoForm = document.getElementById('logoForm');
    const logoUploadInput = document.getElementById('logoUpload');
    const logoPreview = document.getElementById('logoPreview');
    const alertContainer = document.getElementById('alert-container');

    const archivePasswordForm = document.getElementById('archivePasswordForm');
    const archivePasswordInput = document.getElementById('archivePassword');

    // --- Load existing data on page load ---
    function loadExistingData() {
        // Load logo from the already fetched settings
        if (siteSettings.site_logo) {
            logoPreview.src = siteSettings.site_logo;
            logoPreview.style.display = 'block';
        }
    }

    // --- Handle Credentials Form Submission ---
    credentialsForm.addEventListener('submit', async function(event) {
        event.preventDefault();

        const email = usernameInput.value;
        const password = passwordInput.value;

        if (!email || !password) {
            alert('يرجى ملء حقلي البريد الإلكتروني وكلمة المرور.');
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/update-credentials`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (data.success) {
                alert(data.message || 'تم تحديث بيانات تسجيل الدخول بنجاح!');
                credentialsForm.reset();
            } else {
                alert('فشل تحديث البيانات: ' + (data.message || 'خطأ غير معروف'));
            }
        } catch (error) {
            console.error('Error updating credentials:', error);
            alert('فشل الاتصال بالخادم. يرجى المحاولة مرة أخرى.');
        }
    });

    // --- Handle Logo Form Submission ---
    logoForm.addEventListener('submit', function(event) {
        event.preventDefault();
        const file = logoUploadInput.files[0];
        if (!file) {
            showAlert('warning', 'يرجى اختيار ملف شعار أولاً.');
            return;
        }

        const reader = new FileReader();
        reader.onloadend = function() {
            const base64String = reader.result;
            // Save to server
            saveSetting('site_logo', base64String);
            saveSetting('site_favicon', base64String); // Also save as favicon

            logoPreview.src = base64String;
            logoPreview.style.display = 'block';
        };
        reader.readAsDataURL(file);
    });

    function saveSetting(key, value) {
        fetch(`${API_BASE_URL}/api/settings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key, value })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showAlert('success', `تم تحديث ${key === 'site_logo' ? 'الشعار' : 'الإعداد'} بنجاح!`);
            } else {
                showAlert('danger', 'فشل تحديث الإعداد: ' + data.message);
            }
        })
        .catch(error => {
            console.error('Error saving setting:', error);
            showAlert('danger', 'لا يمكن الاتصال بالخادم لحفظ الإعداد.');
        });
    }

    // --- Handle Archive Password Form Submission ---
    if (archivePasswordForm) {
        archivePasswordForm.addEventListener('submit', function (event) {
            event.preventDefault();
            const password = archivePasswordInput.value.trim();

            if (password) {
                // Hash the password using SHA-256
                const hashedPassword = CryptoJS.SHA256(password).toString(CryptoJS.enc.Hex);
                saveSetting('archive_password_hash', hashedPassword);
                showAlert('success', 'تم حفظ كلمة مرور الأرشيف بنجاح!');
                archivePasswordInput.value = ''; // Clear the field after saving
            } else {
                showAlert('danger', 'يرجى إدخال كلمة مرور.');
            }
        });
    }

    // --- Live Preview for Logo Upload ---
    logoUploadInput.addEventListener('change', function() {
        const file = this.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                logoPreview.src = e.target.result;
                logoPreview.style.display = 'block';
            }
            reader.readAsDataURL(file);
        }
    });

    // --- Utility to show alerts ---
    function showAlert(type, message) {
        const alertEl = document.createElement('div');
        alertEl.className = `alert alert-${type} alert-dismissible fade show`;
        alertEl.role = 'alert';
        alertEl.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;
        alertContainer.appendChild(alertEl);

        setTimeout(() => {
            alertEl.remove();
        }, 5000);
    }

    // Initial load
    loadExistingData();
});
