document.addEventListener('DOMContentLoaded', function () {
    const transactionsTableBody = document.getElementById('transactionsTableBody');

    async function fetchAndRenderTransactions() {
        try {
            const response = await fetch('/api/transactions');
            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.message || 'فشل في تحميل سجل المعاملات.');
            }

            renderTable(result.transactions);
        } catch (error) {
            console.error('Error fetching transactions:', error);
            transactionsTableBody.innerHTML = `<tr><td colspan="6" class="text-center text-danger">${error.message}</td></tr>`;
        }
    }

    function renderTable(transactions) {
        transactionsTableBody.innerHTML = '';
        if (transactions.length === 0) {
            transactionsTableBody.innerHTML = '<tr><td colspan="6" class="text-center">لا توجد مدفوعات مسجلة حاليًا.</td></tr>';
            return;
        }

        transactions.forEach(t => {
            const statusBadge = getStatusBadge(t);
            const subTypeDisplayText = t.subscriptionType === 'half-monthly' ? 'نصف شهري' : 'شهري';
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${t.customerName}</td>
                <td>${new Date(t.paymentDate).toLocaleDateString('ar-EG')}</td>
                <td>${t.amountPaid.toFixed(2)} ج.م</td>
                <td>${t.remainingAmount.toFixed(2)} ج.م</td>
                <td>${subTypeDisplayText}</td>
                <td><span class="badge ${statusBadge.className}" style="${statusBadge.style || ''}">${statusBadge.text}</span></td>
            `;
            transactionsTableBody.appendChild(row);
        });
    }

    function getStatusBadge(transaction) {
        if (!transaction.subscriptionEndDate) {
            return { text: 'غير محدد', className: 'bg-secondary' };
        }

        const endDate = new Date(transaction.subscriptionEndDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (endDate < today) {
            return { text: 'منتهي', className: 'bg-danger' };
        }

        const paidMonths = parseInt(transaction.duration);
        let freeMonths = 0;
        if (transaction.subscriptionType === 'monthly') {
            if (paidMonths === 4) freeMonths = 1;
            if (paidMonths === 8) freeMonths = 3;
            if (paidMonths === 12) freeMonths = 5;
        }
        const hasOffer = freeMonths > 0;

        let baseText = 'نشط';
        let finalClassName = 'bg-success';
        let finalStyle = '';

        if (hasOffer) {
            baseText = 'نشط (عرض)';
            finalClassName = '';
            finalStyle = 'background-color: #6f42c1; color: white;';
        }

        // Append payment type context from notes or status
        if (transaction.notes && transaction.notes.includes('اشتراك جديد')) {
             baseText += ' (اشتراك جديد)';
        } else if (transaction.notes && transaction.notes.includes('تجديد اشتراك')) {
             baseText += ' (تجديد)';
        } else if (transaction.status === 'مدفوع' && transaction.remainingAmount <= 0) {
            baseText += ' (اكتمل السداد)';
        }

        return { text: baseText, className: finalClassName, style: finalStyle };
    }

    // Initial load
    fetchAndRenderTransactions();
});
