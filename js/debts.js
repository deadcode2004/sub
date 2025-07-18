document.addEventListener('DOMContentLoaded', function () {

    // --- Get DOM Elements ---
    const debtsTableBody = document.getElementById('debts-table-body');
    const paymentModalEl = document.getElementById('paymentModal');
    const paymentModal = new bootstrap.Modal(paymentModalEl);
    const paymentForm = document.getElementById('paymentForm');
    const paymentCustomerId = document.getElementById('paymentCustomerId');
    const paymentCustomerName = document.getElementById('paymentCustomerName');
    const paymentRemainingAmount = document.getElementById('paymentRemainingAmount');
    const amountToPay = document.getElementById('amountToPay');

    // --- Fetch and Render Functions ---
    async function fetchAndRenderDebts() {
        try {
            const response = await fetch('/api/customers/debts');
            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.message || 'فشل في تحميل بيانات المديونيات.');
            }

            renderDebtsTable(result.debts);
        } catch (error) {
            console.error('Error fetching debts:', error);
            debtsTableBody.innerHTML = `<tr><td colspan="7" class="text-center text-danger">${error.message}</td></tr>`;
        }
    }

    function renderDebtsTable(debts) {
        debtsTableBody.innerHTML = '';

        if (debts.length === 0) {
            debtsTableBody.innerHTML = '<tr><td colspan="7" class="text-center">لا يوجد عملاء عليهم مديونيات حاليًا.</td></tr>';
            return;
        }

        debts.forEach(debt => {
            const endDate = new Date(debt.subscription_end_date);
            const isActive = endDate >= new Date();
            const statusText = isActive ? 'نشط' : 'منتهي';
            const statusBadge = isActive ? 'bg-success' : 'bg-danger';
            const lastPaymentDate = debt.payment_date ? new Date(debt.payment_date).toLocaleDateString('ar-EG') : 'N/A';

            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${debt.name || 'غير متوفر'}</td>
                <td>${debt.phone || 'غير متوفر'}</td>
                <td>${new Date(debt.subscription_end_date).toLocaleDateString('ar-EG')}</td>
                <td>${debt.total_price}</td>
                <td>${debt.amount_paid}</td>
                <td>${debt.remaining_amount}</td>
                <td>
                    <span class="badge ${statusBadge}">${statusText}</span>
                </td>
                <td>
                    <button class="btn btn-success btn-sm pay-btn" 
                            data-id="${debt.id}" 
                            data-name="${debt.name}" 
                            data-remaining="${debt.remaining_amount}">
                        تسديد
                    </button>
                    <button class="btn btn-warning btn-sm whatsapp-btn" 
                            data-phone="${debt.phone}" 
                            data-name="${debt.name}" 
                            data-remaining="${debt.remaining_amount}">
                        تذكير واتساب
                    </button>
                </td>
            `;
            debtsTableBody.appendChild(row);
        });
    }

    // --- Event Listeners ---
    debtsTableBody.addEventListener('click', function (e) {
        const target = e.target.closest('button');
        if (!target) return;

        const id = target.dataset.id;
        const name = target.dataset.name;
        const remaining = target.dataset.remaining;
        const phone = target.dataset.phone;

        // Handle Pay Button
        if (target.classList.contains('pay-btn')) {
            paymentCustomerId.value = id;
            paymentCustomerName.textContent = name;
            paymentRemainingAmount.value = remaining;
            amountToPay.value = '';
            amountToPay.max = remaining;
            paymentModal.show();
        }

        // Handle WhatsApp Button
        if (target.classList.contains('whatsapp-btn')) {
            if (phone && phone !== 'undefined') {
                const message = `مرحباً ${name}، نود تذكيرك بوجود مبلغ متبقي وقدره ${remaining} جنيه على اشتراكك في الجيم. يرجى السداد في أقرب وقت. شكراً لك.`;
                const whatsappUrl = `https://wa.me/2${phone}?text=${encodeURIComponent(message)}`;
                window.open(whatsappUrl, '_blank');
            } else {
                alert('رقم هاتف العميل غير متوفر.');
            }
        }
    });

    // Listener for Payment Form
    paymentForm.addEventListener('submit', async function (e) {
        e.preventDefault();
        const customerId = paymentCustomerId.value;
        const amount = parseFloat(amountToPay.value);

        if (isNaN(amount) || amount <= 0) {
            return alert('الرجاء إدخال مبلغ صحيح للدفع.');
        }

        try {
            const response = await fetch(`/api/customers/${customerId}/pay-debt`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ amount })
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.message || 'فشل في تسجيل الدفعة.');
            }

            paymentModal.hide();
            alert('تم تسجيل الدفعة بنجاح!');
            fetchAndRenderDebts(); // Refresh the table

        } catch (error) {
            console.error('Error submitting payment:', error);
            alert(`خطأ: ${error.message}`);
        }
    });

    // --- Initial Load ---
    fetchAndRenderDebts();
});
