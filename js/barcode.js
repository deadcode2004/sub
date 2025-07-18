document.addEventListener('DOMContentLoaded', function () {
    const API_BASE_URL = 'http://localhost:3000';
    const urlParams = new URLSearchParams(window.location.search);
    const customerId = urlParams.get('id');
    const customerNameEl = document.getElementById('customerName');
    const barcodeContainer = document.getElementById('barcode');

    if (!customerId) {
        customerNameEl.textContent = 'معرّف العميل غير موجود.';
        console.error('No customer ID provided in the URL.');
        return;
    }

    fetch(`${API_BASE_URL}/api/customers/${customerId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Customer not found. Status: ${response.status}`);
            }
            return response.json();
        })
        .then(customer => {
            if (customer && customer.id) {
                customerNameEl.textContent = `مرحباً, ${customer.name || 'عميل'}`;

                JsBarcode(barcodeContainer, customer.id.toString(), {
                    format: "CODE128",
                    lineColor: "#000",
                    width: 2,
                    height: 100,
                    displayValue: true
                });
            } else {
                 throw new Error(`Invalid customer data received for ID ${customerId}`);
            }
        })
        .catch(error => {
            console.error('Error fetching or displaying customer barcode:', error);
            customerNameEl.textContent = 'لم يتم العثور على العميل.';
            barcodeContainer.innerHTML = `<p class="text-danger">${error.message}</p>`;
        });
});
