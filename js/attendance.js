document.addEventListener('DOMContentLoaded', function() {

    // --- DOM Elements ---
    const barcodeInput = document.getElementById('barcodeInput');
    const scanStatus = document.getElementById('scanStatus');
    const customerInfo = document.getElementById('customerInfo');
    const customerName = document.getElementById('customerName');
    const customerNumber = document.getElementById('customerNumber');
    const subscriptionStatus = document.getElementById('subscriptionStatus');
    const attendanceTime = document.getElementById('attendanceTime');
    const attendanceTableBody = document.getElementById('attendanceTableBody');
    const deleteAllBtn = document.getElementById('deleteAllBtn');
    const dateFilter = document.getElementById('dateFilter');
    let infoCardTimer;

    const API_URL = 'http://localhost:3000/api/attendance';

    // --- Utility Functions ---
    const toISODateString = (date) => {
        return new Date(date.getTime() - (date.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
    };

    // --- Core Functions ---
    async function renderAttendanceTable(dateString) {
        attendanceTableBody.innerHTML = '<tr><td colspan="4" class="text-center">جاري التحميل...</td></tr>';
        try {
            const response = await fetch(`${API_URL}?date=${dateString}`);
            const result = await response.json();

            if (!result.success) {
                throw new Error(result.message);
            }

            attendanceTableBody.innerHTML = '';
            const records = result.data;

            if (records.length === 0) {
                attendanceTableBody.innerHTML = `<tr><td colspan="4" class="text-center">لا توجد سجلات لهذا اليوم.</td></tr>`;
                return;
            }

            records.forEach(record => {
                const row = attendanceTableBody.insertRow();
                const statusClass = record.status === 'present' ? 'text-success' : 'text-danger';
                const statusText = record.status === 'present' ? 'حاضر' : 'غائب';

                row.innerHTML = `
                    <td>${record.customer_name || 'N/A'}</td>
                    <td>${new Date(record.id).toLocaleString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: true })}</td>
                    <td class="${statusClass} fw-bold">${statusText}</td>
                    <td>
                        <button class="btn btn-sm btn-danger delete-btn" data-id="${record.id}" title="حذف السجل">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                `;
            });
        } catch (error) {
            console.error('Error fetching attendance:', error);
            attendanceTableBody.innerHTML = `<tr><td colspan="4" class="text-center text-danger">فشل تحميل السجلات.</td></tr>`;
        }
    }

    async function registerAttendance(customerId) {
        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ customerId })
            });
            const result = await response.json();

            showStatus(result.message, result.success ? 'success' : (response.status === 409 ? 'info' : 'danger'));

            if (result.success) {
                displayCustomerCard(result.data.customer, new Date());
                renderAttendanceTable(dateFilter.value);
            }
        } catch (error) {
            console.error('Error registering attendance:', error);
            showStatus('خطأ في الاتصال بالخادم.', 'danger');
        }
    }

    function showStatus(message, type) {
        scanStatus.textContent = message;
        scanStatus.className = `alert alert-${type} mt-2`;
    }

    function displayCustomerCard(customer, time) {
        customerInfo.style.display = 'block';
        customerName.textContent = `الاسم: ${customer.name}`;
        customerNumber.textContent = `رقم العضوية: ${customer.id}`;
        subscriptionStatus.textContent = `الحالة: نشط حتى ${new Date(customer.end_date).toLocaleDateString('ar-EG')}`;
        attendanceTime.textContent = `وقت الحضور: ${time.toLocaleString('ar-EG', { hour: 'numeric', minute: '2-digit', hour12: true })}`;

        clearTimeout(infoCardTimer);
        infoCardTimer = setTimeout(() => { customerInfo.style.display = 'none'; }, 30000);
    }

    // --- Event Listeners ---
    let typingTimer;
    barcodeInput.addEventListener('input', () => {
        clearTimeout(typingTimer);
        typingTimer = setTimeout(() => {
            const customerId = barcodeInput.value.trim();
            if (customerId) {
                registerAttendance(customerId);
                barcodeInput.value = '';
                barcodeInput.focus();
            }
        }, 300);
    });

    dateFilter.addEventListener('change', () => {
        renderAttendanceTable(dateFilter.value);
    });

    deleteAllBtn.addEventListener('click', async () => {
        const selectedDate = dateFilter.value;
        if (!selectedDate) {
            alert('الرجاء تحديد تاريخ أولاً.');
            return;
        }
        if (confirm(`هل أنت متأكد من حذف جميع سجلات الحضور ليوم ${selectedDate}؟`)) {
            try {
                const response = await fetch(`${API_URL}?date=${selectedDate}`, { method: 'DELETE' });
                const result = await response.json();
                alert(result.message);
                if (result.success) {
                    renderAttendanceTable(selectedDate);
                }
            } catch (error) {
                 alert('فشل حذف السجلات.');
            }
        }
    });

    attendanceTableBody.addEventListener('click', async (e) => {
        const deleteButton = e.target.closest('.delete-btn');
        if (deleteButton) {
            const recordId = deleteButton.dataset.id;
            if (confirm('هل أنت متأكد من حذف هذا السجل؟')) {
                try {
                    const response = await fetch(`${API_URL}/${recordId}`, { method: 'DELETE' });
                    const result = await response.json();
                    if (result.success) {
                        renderAttendanceTable(dateFilter.value);
                    }
                    alert(result.message);
                } catch (error) {
                    alert('فشل حذف السجل.');
                }
            }
        }
    });

    // --- Initial Setup ---
    dateFilter.value = toISODateString(new Date());
    renderAttendanceTable(dateFilter.value);
    barcodeInput.focus();
});