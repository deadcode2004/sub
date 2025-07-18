document.addEventListener('DOMContentLoaded', function() {

    // --- Element Definitions ---
    const addCustomerForm = document.getElementById('addCustomerForm');
    // Personal Info
    const customerIdEl = document.getElementById('customerId');
    const customerNameEl = document.getElementById('customerName');
    const customerPhoneEl = document.getElementById('customerPhone');
    const customerDobEl = document.getElementById('customerDob');
    const customerGenderEl = document.getElementById('customerGender');
    // Subscription Info
    const subTypeEl = document.getElementById('subscriptionType');
    const subMonthsEl = document.getElementById('subscriptionMonths');
    const startDateEl = document.getElementById('startDate');
    const endDateEl = document.getElementById('endDate');
    const offerInfoEl = document.getElementById('offer-info');
    // Payment Info
    const originalPriceEl = document.getElementById('originalPrice');
    const discountEl = document.getElementById('discount');
    const finalPriceEl = document.getElementById('finalPrice');
    const paidAmountEl = document.getElementById('paidAmount');
    const remainingAmountEl = document.getElementById('remainingAmount');
    const paymentDateEl = document.getElementById('paymentDate');
    const paymentMethodEl = document.getElementById('paymentMethod');
    const paymentStatusEl = document.getElementById('paymentStatus');

    // Check if all critical elements exist
    if (!addCustomerForm || !subTypeEl || !originalPriceEl) {
        console.error('CRITICAL: A required form element could not be found. Script will not run.');
        return;
    }

    // --- Event Listener for Form Submission ---
    addCustomerForm.addEventListener('submit', function(event) {
        event.preventDefault();

        const customerId = customerIdEl.value.trim();
        if (!customerId) {
            alert('يرجى مسح أو إدخال رقم عضوية.');
            return;
        }

        const finalPrice = parseFloat(finalPriceEl.value) || 0;
        const paidAmount = parseFloat(paidAmountEl.value) || 0;

        const customerData = {
            id: customerId,
            personalInfo: {
                name: customerNameEl.value,
                phone: customerPhoneEl.value,
                dob: customerDobEl.value,
                gender: customerGenderEl.value,
            },
            subscriptionInfo: {
                type: subTypeEl.value,
                duration: subMonthsEl.value,
                startDate: startDateEl.value,
                endDate: endDateEl.value,
                status: paidAmount == 0 ? 'قيد الانتظار' : 'نشط'
            },
            paymentInfo: {
                total: finalPrice.toFixed(2),
                amountPaid: paidAmount.toFixed(2),
                remainingAmount: (finalPrice - paidAmount).toFixed(2),
                discount: discountEl.value,
                paymentMethod: paymentMethodEl.value,
                lastPaymentDate: paymentDateEl.value,
                originalPrice: originalPriceEl.value,
                status: paidAmount == 0 ? 'لم يدفع' : ((finalPrice - paidAmount) > 0 ? 'جزئي' : 'مدفوع')
            },
            paymentHistory: [{
                date: paymentDateEl.value,
                amount: paidAmount,
                type: 'New',
                details: 'دفعة أولى عند الاشتراك الجديد'
            }]
        };

        // API call to the server
        fetch('http://localhost:3000/api/customers', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(customerData)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert(data.message);
                window.location.href = 'manage-customers.html';
            } else {
                alert('فشل: ' + data.message);
            }
        })
        .catch(error => {
            console.error('Error adding customer:', error);
            alert('لا يمكن الاتصال بالخادم. تأكد من أن الخادم يعمل.');
        });
    });

    // --- Calculation Functions ---
    function updateSubscriptionDetails() {
        const subType = subTypeEl.value;
        const duration = parseInt(subMonthsEl.value) || 0;
        const startDateValue = startDateEl.value;

        // Clear end date and offer text initially
        endDateEl.value = '';
        offerInfoEl.textContent = '';

        if (!startDateValue || duration <= 0) {
            return; // Exit if no valid start date or duration
        }

        const startDate = new Date(startDateValue);
        if (isNaN(startDate.getTime())) {
            return; // Exit if the start date is invalid
        }

        let freeMonths = 0;
        if (subType === 'monthly') {
            if (duration === 4) freeMonths = 1;
            if (duration === 8) freeMonths = 3;
            if (duration === 12) freeMonths = 5;
            if (freeMonths > 0) {
                offerInfoEl.textContent = `عرض خاص: ${duration} + ${freeMonths} أشهر مجانًا`;
            }
        }

        let endDate = new Date(startDate);
        if (subType === 'half-monthly') {
            endDate.setDate(endDate.getDate() + (duration * 15));
        } else { // 'monthly'
            endDate.setMonth(endDate.getMonth() + duration + freeMonths);
        }

        // Set the final end date value if it's a valid date
        if (!isNaN(endDate.getTime())) {
            endDateEl.value = endDate.toISOString().split('T')[0];
        }
    }

    function calculatePayment() {
        const originalPrice = parseFloat(originalPriceEl.value) || 0;
        const discount = parseFloat(discountEl.value) || 0;
        const paidAmount = parseFloat(paidAmountEl.value) || 0;
        const finalPrice = originalPrice - (originalPrice * (discount / 100));
        finalPriceEl.value = finalPrice.toFixed(2);
        const remainingAmount = finalPrice - paidAmount;
        remainingAmountEl.value = remainingAmount.toFixed(2);
        if (finalPrice > 0 && remainingAmount <= 0) {
            paymentStatusEl.value = 'مدفوع بالكامل';
        } else if (paidAmount > 0 && remainingAmount > 0) {
            paymentStatusEl.value = 'مدفوع جزئياً';
        } else {
            paymentStatusEl.value = 'قيد الانتظار';
        }
    }

    // --- Initial Setup and Event Listeners ---
    subTypeEl.addEventListener('change', updateSubscriptionDetails);
    subMonthsEl.addEventListener('input', updateSubscriptionDetails);
    startDateEl.addEventListener('change', updateSubscriptionDetails);
    originalPriceEl.addEventListener('input', calculatePayment);
    discountEl.addEventListener('input', calculatePayment);
    paidAmountEl.addEventListener('input', calculatePayment);

    const today = new Date().toISOString().split('T')[0];
    startDateEl.value = today;
    paymentDateEl.value = today;
    updateSubscriptionDetails();
    calculatePayment();
});

