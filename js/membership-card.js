document.addEventListener('DOMContentLoaded', function () {
    // 2. Get Customer ID from URL
    const API_BASE_URL = 'http://localhost:3000';
    const urlParams = new URLSearchParams(window.location.search);
    const customerId = urlParams.get('id');

    if (!customerId) {
        document.body.innerHTML = '<div class="alert alert-danger">لم يتم تحديد هوية العميل.</div>';
        return;
    }

    // 3. Fetch customer data from API
    fetch(`${API_BASE_URL}/api/customers/${customerId}`)
        .then(response => response.json())
        .then(customer => {
            if (!customer) {
                document.body.innerHTML = `<div class="alert alert-danger">لم يتم العثور على عميل بالهوية ${customerId}.</div>`;
                return;
            }

            // 4. Populate the card with customer data
            document.getElementById('customerName').textContent = customer.personalInfo.name || 'غير متوفر';
            document.getElementById('customerId').textContent = customer.id;

            // Check for subscriptionInfo and a valid endDate
            if (customer.subscriptionInfo && customer.subscriptionInfo.endDate && !isNaN(new Date(customer.subscriptionInfo.endDate))) {
                document.getElementById('endDate').textContent = new Date(customer.subscriptionInfo.endDate).toLocaleDateString('ar-EG');
            } else {
                document.getElementById('endDate').textContent = 'لا يوجد اشتراك';
                console.error(`Customer with ID ${customerId} has an invalid or missing subscription end date.`);
            }

            // 5. Generate Barcode
            try {
                JsBarcode("#barcode", String(customer.id), {
                    format: "CODE128",
                    lineColor: "#000",
                    width: 2,
                    height: 50,
                    displayValue: true
                });
            } catch (e) {
                console.error("Error generating barcode:", e);
                document.getElementById('barcode').parentElement.innerHTML = '<p class="text-danger">خطأ في إنشاء الباركود.</p>';
            }
        })
        .catch(error => {
            console.error('Error fetching customer data:', error);
            document.body.innerHTML = `<div class="alert alert-danger">فشل في تحميل بيانات العميل.</div>`;
        });


});
