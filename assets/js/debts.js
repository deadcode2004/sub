document.addEventListener('DOMContentLoaded', function () {
    const debtsTableBody = document.getElementById('debts-table-body');
    const customers = JSON.parse(localStorage.getItem('customers')) || [];

    const indebtedCustomers = customers.filter(customer => {
        return customer.paymentInfo && parseFloat(customer.paymentInfo.remainingAmount) > 0;
    });

    if (indebtedCustomers.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = `<td colspan="5" class="text-center">لا يوجد عملاء عليهم مديونيات حالياً.</td>`;
        debtsTableBody.appendChild(row);
        return;
    }

    indebtedCustomers.forEach(customer => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${customer.personalInfo.name}</td>
            <td>${customer.personalInfo.phone}</td>
            <td>${customer.paymentInfo.amountPaid || '0.00'}</td>
            <td>${customer.paymentInfo.remainingAmount}</td>
            <td>
                <button class="btn btn-success btn-sm" onclick="settleDebt('${customer.personalInfo.phone}')">تسوية</button>
                <button class="btn btn-info btn-sm" onclick="sendReminder('${customer.personalInfo.phone}', '${customer.paymentInfo.remainingAmount}')">إرسال تذكير</button>
            </td>
        `;
        debtsTableBody.appendChild(row);
    });
});

function settleDebt(phone) {
    let customers = JSON.parse(localStorage.getItem('customers')) || [];
    const customerIndex = customers.findIndex(c => c.personalInfo.phone === phone);

    if (customerIndex !== -1) {
        customers[customerIndex].paymentInfo.remainingAmount = 0;
        localStorage.setItem('customers', JSON.stringify(customers));
        alert('تمت تسوية المبلغ بنجاح!');
        location.reload();
    } else {
        alert('لم يتم العثور على العميل.');
    }
}

function sendReminder(phone, remainingAmount) {
    const message = `مرحباً، نود تذكيركم بوجود مبلغ متبقي وقدره ${remainingAmount} على اشتراككم في الجيم. يرجى تسويته في أقرب وقت ممكن.`;
    const whatsappUrl = `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
}