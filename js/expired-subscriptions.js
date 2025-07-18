document.addEventListener('DOMContentLoaded', function () {
    // --- DOM Elements ---
    const tableBody = document.getElementById('expiring-customers-table-body');
    const renewalModalEl = document.getElementById('renewalModal');
    const renewalModal = new bootstrap.Modal(renewalModalEl);
    const renewalForm = document.getElementById('renewalForm');
    const renewalCustomerId = document.getElementById('renewalCustomerId');
    const renewalCustomerName = document.getElementById('renewalCustomerName');
    const renewalSubscriptionType = document.getElementById('renewalSubscriptionType');
    const renewalDuration = document.getElementById('renewalDuration');
    const renewalDurationLabel = document.querySelector('label[for="renewalDuration"]');
    const renewalOfferInfo = document.getElementById('renewalOfferInfo');
    const renewalStartDate = document.getElementById('renewalStartDate');
    const renewalPrice = document.getElementById('renewalPrice');
    const renewalAmountPaid = document.getElementById('renewalAmountPaid');
    const renewalRemainingAmount = document.getElementById('renewalRemainingAmount');

    let currentCustomers = []; // Cache for customer data

    // --- API Functions ---
    async function fetchExpiringCustomers() {
        try {
            const response = await fetch('/api/subscriptions/expired-and-expiring');
            const result = await response.json();
            if (result.success) {
                currentCustomers = result.data;
                renderTable(currentCustomers);
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            console.error('Error fetching customers:', error);
            tableBody.innerHTML = '<tr><td colspan="7" class="text-center text-danger">فشل تحميل البيانات.</td></tr>';
        }
    }

    // --- Core Functions ---
    function renderTable(customers) {
        tableBody.innerHTML = '';
        if (customers.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="7" class="text-center">لا يوجد اشتراكات منتهية أو على وشك الانتهاء.</td></tr>';
            return;
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        customers.forEach(customer => {
            const endDate = new Date(customer.end_date);
            endDate.setHours(0, 0, 0, 0);
            const timeDiff = endDate.getTime() - today.getTime();
            const dayDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));

            let statusBadge, statusText;
            if (dayDiff < 0) {
                statusBadge = 'bg-danger';
                statusText = `منتهي منذ ${Math.abs(dayDiff)} يوم/أيام`;
            } else {
                statusBadge = 'bg-warning text-dark';
                statusText = dayDiff === 0 ? 'ينتهي اليوم' : `باقي ${dayDiff} يوم/أيام`;
            }

            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${customer.name || 'N/A'}</td>
                <td>${new Date(customer.end_date).toLocaleDateString('ar-EG')}</td>
                <td>${customer.total_paid || 0}</td>
                <td>${(customer.total_paid - customer.remaining_amount) || 0}</td>
                <td>${customer.remaining_amount || 0}</td>
                <td><span class="badge ${statusBadge}">${statusText}</span></td>
                <td>
                    <button class="btn btn-sm btn-success renew-btn" data-id="${customer.id}">تجديد</button>
                    <button class="btn btn-sm btn-info whatsapp-btn" data-id="${customer.id}">WhatsApp</button>
                </td>
            `;
            tableBody.appendChild(row);
        });
    }

    function calculateEndDate() {
        const startDate = new Date(renewalStartDate.value);
        const duration = parseInt(renewalDuration.value, 10);
        const type = renewalSubscriptionType.value;
        let endDate = new Date(startDate);

        if (isNaN(startDate.getTime()) || isNaN(duration) || duration <= 0) return;

        if (type === 'monthly') {
            endDate.setMonth(startDate.getMonth() + duration);
        } else if (type === 'half-monthly') {
            endDate.setDate(startDate.getDate() + duration * 15);
        }
        // Set the hidden end date value if needed, or just use it in submission
    }

    function calculateRemaining() {
        const price = parseFloat(renewalPrice.value) || 0;
        const paid = parseFloat(renewalAmountPaid.value) || 0;
        renewalRemainingAmount.value = (price - paid).toFixed(2);
    }

    // --- Event Listeners ---
    tableBody.addEventListener('click', function(e) {
        const target = e.target.closest('button');
        if (!target) return;

        const customerId = target.dataset.id;
        const customer = currentCustomers.find(c => c.id == customerId);
        if (!customer) return;

        if (target.classList.contains('renew-btn')) {
            renewalCustomerId.value = customer.id;
            renewalCustomerName.value = customer.name;
            renewalSubscriptionType.value = 'monthly'; // Default
            renewalDuration.value = 1;
            renewalPrice.value = '';
            renewalAmountPaid.value = '';
            renewalStartDate.value = new Date().toISOString().split('T')[0];
            calculateRemaining();
            calculateEndDate();
            renewalModal.show();
        }

        if (target.classList.contains('whatsapp-btn')) {
            const message = `مرحباً ${customer.name}, نود تذكيرك بأن اشتراكك في النادي قد انتهى أو على وشك الانتهاء. يرجى التوجه للإدارة للتجديد.`;
            const whatsappUrl = `https://wa.me/${customer.phone}?text=${encodeURIComponent(message)}`;
            window.open(whatsappUrl, '_blank');
        }
    });

    renewalForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const customerId = renewalCustomerId.value;

        const startDate = new Date(renewalStartDate.value);
        const duration = parseInt(renewalDuration.value, 10);
        const type = renewalSubscriptionType.value;
        let endDate = new Date(startDate);
        if (type === 'monthly') {
            endDate.setMonth(startDate.getMonth() + duration);
        } else {
            endDate.setDate(startDate.getDate() + duration * 15);
        }

        const renewalData = {
            newEndDate: endDate.toISOString().split('T')[0],
            newSubscriptionPrice: renewalPrice.value,
            newAmountPaid: renewalAmountPaid.value,
            newRemainingAmount: renewalRemainingAmount.value,
            paymentMethod: 'cash', // Or get from form
            subscriptionType: type
        };

        try {
            const response = await fetch(`/api/customers/${customerId}/renew`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(renewalData)
            });
            const result = await response.json();
            alert(result.message);
            if (result.success) {
                renewalModal.hide();
                fetchExpiringCustomers(); // Refresh the table
            }
        } catch (error) {
            alert('فشل في تجديد الاشتراك.');
            console.error('Renewal error:', error);
        }
    });

    // Listen for changes to auto-calculate
    renewalPrice.addEventListener('input', calculateRemaining);
    renewalAmountPaid.addEventListener('input', calculateRemaining);
    renewalDuration.addEventListener('input', calculateEndDate);
    renewalStartDate.addEventListener('change', calculateEndDate);
    renewalSubscriptionType.addEventListener('change', () => {
        renewalDurationLabel.textContent = renewalSubscriptionType.value === 'monthly' ? 'عدد الشهور' : 'عدد أنصاف الشهور';
        calculateEndDate();
    });

    // --- Initial Load ---
    fetchExpiringCustomers();
});
