document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const errorMessage = document.getElementById('errorMessage');

    loginForm.addEventListener('submit', async function(event) {
        event.preventDefault();
        errorMessage.style.display = 'none'; // Hide previous errors

        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        try {
            const response = await fetch('http://localhost:3000/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                // Login successful
                console.log('Login successful');
                sessionStorage.setItem('isAuthenticated', 'true'); // Set auth flag
                window.location.href = 'dashboard.html';
            } else {
                // Login failed, show error message from server
                errorMessage.textContent = data.message || 'فشل تسجيل الدخول. يرجى التحقق من البيانات المدخلة.';
                errorMessage.style.display = 'block';
            }
        } catch (error) {
            // Network or server error
            console.error('Login error:', error);
            errorMessage.textContent = 'لا يمكن الاتصال بالخادم. تأكد من أن الخادم يعمل.';
            errorMessage.style.display = 'block';
        }
    });
});
