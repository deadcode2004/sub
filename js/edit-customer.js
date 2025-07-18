document.addEventListener('DOMContentLoaded', function() {
    const urlParams = new URLSearchParams(window.location.search);
    const customerId = urlParams.get('id');
    const editCustomerForm = document.getElementById('editCustomerForm');

    if (!customerId) {
        alert('لم يتم تحديد عميل.');
        window.location.href = 'manage-customers.html';
        return;
    }

    // Fetch customer data from the server to populate the form
    fetch(`http://localhost:3000/api/customers/${customerId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                const customer = data.customer;
                // Populate the form with fetched data
                document.getElementById('name').value = customer.name || '';
                document.getElementById('phone').value = customer.phone || '';
                document.getElementById('dob').value = customer.dob ? new Date(customer.dob).toISOString().split('T')[0] : '';
                document.getElementById('gender').value = customer.gender || 'male';
                document.getElementById('subscriptionType').value = customer.subscription_type || 'monthly';
                document.getElementById('subscriptionDuration').value = customer.subscription_duration_months || '1';
                document.getElementById('startDate').value = customer.start_date ? new Date(customer.start_date).toISOString().split('T')[0] : '';
                document.getElementById('endDate').value = customer.end_date ? new Date(customer.end_date).toISOString().split('T')[0] : '';
                document.getElementById('totalPrice').value = customer.total_price || '';
                document.getElementById('amountPaid').value = customer.amount_paid || '';
                document.getElementById('remainingAmount').value = customer.remaining_amount || '';
                document.getElementById('discount').value = customer.discount_percentage || '0';
                document.getElementById('paymentMethod').value = customer.payment_method || 'cash';
            } else {
                alert('فشل تحميل بيانات العميل: ' + data.message);
                window.location.href = 'manage-customers.html';
            }
        })
        .catch(error => {
            console.error('Error fetching customer data:', error);
            alert('فشل الاتصال بالخادم لجلب بيانات العميل.');
            window.location.href = 'manage-customers.html';
        });

    // Handle form submission to update the customer
    editCustomerForm.addEventListener('submit', function(e) {
        e.preventDefault();

        // Collect data from form
        const updatedData = {
            name: document.getElementById('name').value,
            phone: document.getElementById('phone').value,
            dob: document.getElementById('dob').value,
            gender: document.getElementById('gender').value,
            subscription_type: document.getElementById('subscriptionType').value,
            subscription_duration_months: document.getElementById('subscriptionDuration').value,
            start_date: document.getElementById('startDate').value,
            end_date: document.getElementById('endDate').value,
            total_price: document.getElementById('totalPrice').value,
            amount_paid: document.getElementById('amountPaid').value,
            remaining_amount: document.getElementById('remainingAmount').value,
            discount_percentage: document.getElementById('discount').value,
            payment_method: document.getElementById('paymentMethod').value,
            payment_status: (parseFloat(document.getElementById('remainingAmount').value) <= 0) ? 'مدفوع' : 'غير مدفوع',
            subscription_status: 'نشط' // Assuming it's active upon edit
        };

        fetch(`http://localhost:3000/api/customers/${customerId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updatedData)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert('تم تحديث بيانات العميل بنجاح!');
                window.location.href = 'manage-customers.html';
            } else {
                alert('فشل تحديث البيانات: ' + (data.message || 'خطأ غير معروف'));
            }
        })
        .catch(error => {
            console.error('Error updating customer:', error);
            alert('فشل الاتصال بالخادم لتحديث بيانات العميل.');
        });
    });
});
