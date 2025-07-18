document.addEventListener('DOMContentLoaded', function () {
    const API_BASE_URL = 'http://localhost:3000';
    // --- Element References ---
    const customerNameEl = document.getElementById('customerName');
    const countdownTimerEl = document.getElementById('countdownTimer');
    const statusMessageEl = document.getElementById('statusMessage');
    const countdownContainer = document.querySelector('.countdown-container');

    // --- Get Customer Data ---
    const urlParams = new URLSearchParams(window.location.search);
    const customerId = urlParams.get('id');

    if (!customerId) {
        countdownContainer.innerHTML = '<h1>خطأ: لم يتم تحديد هوية العميل.</h1>';
        return;
    }

    fetch(`${API_BASE_URL}/api/customers/${customerId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Network response was not ok, status: ${response.status}`);
            }
            return response.json();
        })
        .then(customer => {
            if (!customer || !customer.id) { // Check if a valid customer object was returned
                countdownContainer.innerHTML = `<h1>خطأ: لم يتم العثور على بيانات للعميل بالهوية ${customerId}.</h1>`;
                return;
            }

            // --- Get End Date ---
            const endDateString = customer.end_date;
            customerNameEl.textContent = customer.name;

            if (!endDateString || isNaN(new Date(endDateString))) {
                countdownTimerEl.textContent = 'اشتراك غير صالح';
                statusMessageEl.textContent = 'لا يوجد تاريخ انتهاء صحيح لهذا الاشتراك.';
                statusMessageEl.classList.add('text-warning');
                return;
            }

            const endDate = new Date(endDateString);

            // --- Countdown Logic ---
            function updateCountdown() {
                const now = new Date().getTime();
                const distance = endDate.getTime() - now;

                if (distance < 0) {
                    clearInterval(countdownInterval);
                    countdownTimerEl.textContent = "00:00:00:00";
                    statusMessageEl.textContent = 'لقد انتهى الاشتراك بالفعل.';
                    statusMessageEl.classList.remove('text-info', 'text-warning');
                    statusMessageEl.classList.add('text-danger');
                    return;
                }

                const days = Math.floor(distance / (1000 * 60 * 60 * 24));
                const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((distance % (1000 * 60)) / 1000);

                countdownTimerEl.textContent = `${String(days).padStart(2, '0')}:${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
                statusMessageEl.textContent = 'أيام : ساعات : دقائق : ثواني';
                statusMessageEl.classList.remove('text-danger', 'text-warning');
                statusMessageEl.classList.add('text-info');
            }

            // --- Start Countdown ---
            const countdownInterval = setInterval(updateCountdown, 1000);
            updateCountdown(); // Initial call to display immediately
        })
        .catch(error => {
            console.error('Error fetching customer:', error);
            countdownContainer.innerHTML = '<h1>خطأ: لم يتم تحميل بيانات العميل.</h1>';
        });
});
