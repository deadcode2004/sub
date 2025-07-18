document.addEventListener('DOMContentLoaded', function () {

    const API_BASE_URL = 'http://localhost:3000';

    const customersTableBody = document.getElementById('customersTableBody');
    const searchInput = document.getElementById('searchInput');
    const customerDetailsModal = new bootstrap.Modal(document.getElementById('customerDetailsModal'));
    const printDetailsBtn = document.getElementById('printDetailsBtn');
    const customerDetailsBody = document.getElementById('customerDetailsBody');
    const whatsappModal = new bootstrap.Modal(document.getElementById('whatsappModal'));
    const whatsappMessage = document.getElementById('whatsappMessage');
    const sendWhatsappBtn = document.getElementById('sendWhatsappBtn');
    const quickMessageModal = new bootstrap.Modal(document.getElementById('quickMessageModal'));
    const quickMessageText = document.getElementById('quickMessageText');
    const sendQuickMessageBtn = document.getElementById('sendQuickMessageBtn');
    const deleteAllBtn = document.getElementById('deleteAllBtn');

    let customers = [];
    let currentQuickMessagePhone = '';

    function debounce(func, delay) {
        let timeout;
        return function (...args) {
            const context = this;
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(context, args), delay);
        };
    }

    function loadCustomers(searchTerm = '') {
        let url = `${API_BASE_URL}/api/customers`;
        if (searchTerm) {
            url += `?search=${encodeURIComponent(searchTerm)}`;
        }

        fetch(url)
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    customers = data.customers;
                    renderTable(customers);
                } else {
                    alert('فشل تحميل بيانات العملاء: ' + data.message);
                    customers = [];
                    renderTable(customers);
                }
            })
            .catch(error => {
                console.error('Error loading customers:', error);
                alert('لا يمكن الاتصال بالخادم. تأكد من أن الخادم يعمل.');
                customersTableBody.innerHTML = '<tr><td colspan="7" class="text-center text-danger">خطأ في الاتصال بالخادم.</td></tr>';
            });
    }

    function renderTable(customersToRender) {
        customersTableBody.innerHTML = '';
        if (!customersToRender || customersToRender.length === 0) {
            customersTableBody.innerHTML = '<tr><td colspan="7" class="text-center">لا يوجد عملاء لعرضهم.</td></tr>';
            return;
        }

        customersToRender.forEach((customer, index) => {
            const endDate = new Date(customer.end_date);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            let statusBadge = (endDate < today) ? '<span class="badge bg-danger">منتهي</span>' : '<span class="badge bg-success">ساري</span>';

            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${customer.name || 'غير متوفر'}</td>
                <td>${customer.phone || 'غير متوفر'}</td>
                <td>${customer.subscription_type ? getSubscriptionTypeText(customer.subscription_type) : 'غير متوفر'}</td>
                <td>${customer.end_date ? new Date(customer.end_date).toLocaleDateString('ar-EG') : 'غير متوفر'}</td>
                <td>${statusBadge}</td>
                <td>
                    <button class="btn btn-info btn-sm" data-action="details" data-id="${customer.id}"><i class="fas fa-info-circle"></i></button>
                    <button class="btn btn-success btn-sm" data-action="whatsapp" data-id="${customer.id}"><i class="fab fa-whatsapp"></i></button>
                    <button class="btn btn-primary btn-sm" data-action="edit" data-id="${customer.id}"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-danger btn-sm" data-action="delete" data-id="${customer.id}"><i class="fas fa-trash"></i></button>
                    <button class="btn btn-secondary btn-sm" data-action="message" data-phone="${customer.phone}"><i class="fas fa-paper-plane"></i></button>
                </td>
            `;
            customersTableBody.appendChild(row);
        });
    }

    function handleTableClick(e) {
        const button = e.target.closest('button');
        if (!button) return;

        const action = button.dataset.action;
        const id = button.dataset.id;

        if (action === 'message') {
            currentQuickMessagePhone = button.dataset.phone;
            quickMessageText.value = '';
            quickMessageModal.show();
            return;
        }
        
        const customer = customers.find(c => c.id === id);
        if (!customer) return;

        switch (action) {
            case 'details':
                displayCustomerDetails(customer);
                break;
            case 'whatsapp':
                openWhatsappModal(customer);
                break;
            case 'edit':
                window.location.href = `edit-customer.html?id=${id}`;
                break;
            case 'delete':
                if (confirm(`هل أنت متأكد من حذف العميل ${customer.name}؟`)) {
                    deleteCustomer(id);
                }
                break;
        }
    }

    function deleteCustomer(id) {
        fetch(`${API_BASE_URL}/api/customers/${id}`, { method: 'DELETE' })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    alert('تم حذف العميل بنجاح.');
                    loadCustomers(searchInput.value.trim()); // Refresh list with current search term
                } else {
                    alert('فشل حذف العميل: ' + data.message);
                }
            })
            .catch(error => {
                console.error('Error deleting customer:', error);
                alert('لا يمكن الاتصال بالخادم.');
            });
    }

    function displayCustomerDetails(customer) {
        customerDetailsBody.innerHTML = `
            <h4>المعلومات الشخصية</h4>
            <p><strong>الاسم:</strong> ${customer.name}</p>
            <p><strong>الهاتف:</strong> ${customer.phone}</p>
            <p><strong>تاريخ الميلاد:</strong> ${customer.dob ? new Date(customer.dob).toLocaleDateString('ar-EG') : 'N/A'}</p>
            <p><strong>الجنس:</strong> ${customer.gender === 'male' ? 'ذكر' : 'أنثى'}</p>
            <hr>
            <h4>معلومات الاشتراك</h4>
            <p><strong>نوع الاشتراك:</strong> ${getSubscriptionTypeText(customer.subscription_type)}</p>
            <p><strong>مدة الاشتراك:</strong> ${getMonthTerm(customer.subscription_duration_months)}</p>
            <p><strong>تاريخ البدء:</strong> ${new Date(customer.start_date).toLocaleDateString('ar-EG')}</p>
            <p><strong>تاريخ الانتهاء:</strong> ${new Date(customer.end_date).toLocaleDateString('ar-EG')}</p>
            <hr>
            <h4>المعلومات المالية</h4>
            <p><strong>السعر الأصلي:</strong> ${customer.original_price} جنيه</p>
            <p><strong>الخصم:</strong> ${customer.discount_percentage}%</p>
            <p><strong>المبلغ الإجمالي بعد الخصم:</strong> ${customer.total_price} جنيه</p>
            <p><strong>المبلغ المدفوع:</strong> ${customer.amount_paid} جنيه</p>
            <p><strong>المبلغ المتبقي:</strong> ${customer.remaining_amount} جنيه</p>
            <p><strong>طريقة الدفع:</strong> ${getPaymentMethodText(customer.payment_method)}</p>
            <p><strong>حالة السداد:</strong> ${customer.payment_status === 'paid' ? '<span class="badge bg-success">مدفوع</span>' : '<span class="badge bg-danger">غير مدفوع</span>'}</p>
        `;
        customerDetailsModal.show();
    }

    function getSubscriptionTypeText(type) {
        const types = { 'monthly': 'شهري', '3-months': '3 شهور', '6-months': '6 شهور', 'yearly': 'سنوي' };
        return types[type] || type;
    }

    function getMonthTerm(count) {
        if (count === 1) return 'شهر واحد';
        if (count === 2) return 'شهرين';
        if (count >= 3 && count <= 10) return `${count} شهور`;
        return `${count} شهر`;
    }

    function getPaymentMethodText(method) {
        switch (method) {
            case 'cash': return 'كاش';
            case 'vodafone': return 'فودافون كاش';
            case 'instapay': return 'انستا باي';
            default: return 'غير محدد';
        }
    }

    function openWhatsappModal(customer) {
        whatsappMessage.value = `مرحباً ${customer.name}, نود تذكيرك بأن اشتراكك في الجيم سينتهي قريباً.`;
        sendWhatsappBtn.onclick = () => {
            const message = whatsappMessage.value;
            const whatsappReadyPhone = formatPhoneNumberForWhatsapp(customer.phone);
            const url = `https://wa.me/${whatsappReadyPhone}?text=${encodeURIComponent(message)}`;
            window.open(url, '_blank');
            whatsappModal.hide();
        };
        whatsappModal.show();
    }

    function formatPhoneNumberForWhatsapp(phone) {
        const cleaned = ('' + phone).replace(/\D/g, '');
        if (cleaned.startsWith('0')) {
            return '20' + cleaned.substring(1);
        }
        return cleaned;
    }

    function printCustomerDetails() {
        const modalContent = document.querySelector('#customerDetailsModal .modal-body').innerHTML;
        const printWindow = window.open('', '', 'height=600,width=800');
        printWindow.document.write(`
            <!DOCTYPE html><html dir="rtl" lang="ar"><head><title>تفاصيل العميل</title>
                <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700&display=swap" rel="stylesheet">
                <style>body{font-family:'Cairo',sans-serif;direction:rtl;padding:20px;}.print-header{text-align:center;margin-bottom:20px;}.print-header h1{margin-bottom:10px;}.print-content{background:white;padding:20px;border-radius:8px;box-shadow:0 0 10px rgba(0,0,0,0.1);}p{margin-bottom:10px;}strong{color:#333;}h4{margin-top:20px;margin-bottom:10px;color:#2c3e50;}hr{border:none;border-top:2px solid #eee;margin:20px 0;}</style>
            </head><body><div class="print-header"><h1>نظام إدارة الجيم</h1><h3>تفاصيل العميل</h3></div><div class="print-content">${modalContent}</div></body></html>`);
        printWindow.document.close();
        printWindow.print();
        printWindow.close();
    }

    // Event Listeners
    if (searchInput) {
        searchInput.addEventListener('input', debounce(e => {
            loadCustomers(e.target.value.trim());
        }, 300));
    }

    if (customersTableBody) {
        customersTableBody.addEventListener('click', handleTableClick);
    }

    if (sendQuickMessageBtn) {
        sendQuickMessageBtn.addEventListener('click', function () {
            const message = quickMessageText.value;
            if (message && currentQuickMessagePhone) {
                const whatsappReadyPhone = formatPhoneNumberForWhatsapp(currentQuickMessagePhone);
                const url = `https://wa.me/${whatsappReadyPhone}?text=${encodeURIComponent(message)}`;
                window.open(url, '_blank');
                quickMessageModal.hide();
            }
        });
    }

    if (deleteAllBtn) {
        deleteAllBtn.addEventListener('click', function () {
            if (confirm('هل أنت متأكد من حذف جميع العملاء وجميع بياناتهم؟ هذا الإجراء لا يمكن التراجع عنه.')) {
                fetch(`${API_BASE_URL}/api/customers/all`, { method: 'DELETE' })
                    .then(response => response.json())
                    .then(data => {
                        if (data.success) {
                            alert('تم حذف جميع العملاء بنجاح.');
                            loadCustomers(); // Refresh the table
                        } else {
                            alert('فشل حذف العملاء: ' + data.message);
                        }
                    })
                    .catch(error => {
                        console.error('Error deleting all customers:', error);
                        alert('لا يمكن الاتصال بالخادم.');
                    });
            }
        });
    }

    if (printDetailsBtn) {
        printDetailsBtn.addEventListener('click', printCustomerDetails);
    }

    // Initial Load
    loadCustomers();
});
