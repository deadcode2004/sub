document.addEventListener('DOMContentLoaded', function () {
    const totalRevenueEl = document.getElementById('totalRevenue');
    const totalExpensesEl = document.getElementById('totalExpenses');
    const netProfitEl = document.getElementById('netProfit');
    const transactionsTableBody = document.getElementById('transactionsTableBody');
    const expenseForm = document.getElementById('expenseForm');
    const addExpenseModal = new bootstrap.Modal(document.getElementById('addExpenseModal'));
    const editExpenseModal = new bootstrap.Modal(document.getElementById('editExpenseModal'));
    const editExpenseForm = document.getElementById('editExpenseForm');
    const editExpenseId = document.getElementById('editExpenseId');
    const editExpenseDescription = document.getElementById('editExpenseDescription');
    const editExpenseAmount = document.getElementById('editExpenseAmount');

    let currentExpenses = []; // Cache for PDF generation

    async function loadDataAndRender() {
        try {
            // Fetch summary
            const summaryRes = await fetch('/api/accounting/summary');
            const summaryResult = await summaryRes.json();
            if (!summaryResult.success) throw new Error(summaryResult.message);
            const { totalRevenue, totalExpenses, netProfit } = summaryResult.summary;
            totalRevenueEl.textContent = `${totalRevenue.toFixed(2)} ج.م`;
            totalExpensesEl.textContent = `${totalExpenses.toFixed(2)} ج.م`;
            netProfitEl.textContent = `${netProfit.toFixed(2)} ج.م`;

            // Fetch expenses
            const expensesRes = await fetch('/api/expenses');
            const expensesResult = await expensesRes.json();
            if (!expensesResult.success) throw new Error(expensesResult.message);
            currentExpenses = expensesResult.expenses;
            renderExpensesTable(currentExpenses);

        } catch (error) {
            console.error('Error loading accounting data:', error);
            transactionsTableBody.innerHTML = `<tr><td colspan="4" class="text-center text-danger">${error.message}</td></tr>`;
        }
    }

    function renderExpensesTable(expenses) {
        transactionsTableBody.innerHTML = '';
        if (expenses.length === 0) {
            transactionsTableBody.innerHTML = '<tr><td colspan="4" class="text-center">لا توجد مصروفات مسجلة.</td></tr>';
            return;
        }

        expenses.forEach(t => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${new Date(t.date).toLocaleDateString('ar-EG')}</td>
                <td>${t.description}</td>
                <td>${t.amount.toFixed(2)} ج.م</td>
                <td>
                    <button class="btn btn-sm btn-outline-success me-2" data-action="edit" data-id="${t.id}" title="تعديل"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-sm btn-outline-danger" data-action="delete" data-id="${t.id}" title="حذف"><i class="fas fa-trash"></i></button>
                </td>
            `;
            transactionsTableBody.appendChild(row);
        });
    }

    expenseForm.addEventListener('submit', async function (e) {
        e.preventDefault();
        const description = document.getElementById('expenseDescription').value;
        const amount = document.getElementById('expenseAmount').value;
        try {
            const response = await fetch('/api/expenses', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ description, amount })
            });
            const result = await response.json();
            if (!result.success) throw new Error(result.message);
            expenseForm.reset();
            addExpenseModal.hide();
            loadDataAndRender();
        } catch (error) {
            console.error('Error adding expense:', error);
            alert(error.message);
        }
    });

    transactionsTableBody.addEventListener('click', async function(e) {
        const button = e.target.closest('button');
        if (!button) return;

        const action = button.dataset.action;
        const id = button.dataset.id;

        if (action === 'delete') {
            if (confirm('هل أنت متأكد من حذف هذا المصروف؟')) {
                try {
                    const response = await fetch(`/api/expenses/${id}`, { method: 'DELETE' });
                    const result = await response.json();
                    if (!result.success) throw new Error(result.message);
                    loadDataAndRender();
                } catch (error) {
                    console.error('Error deleting expense:', error);
                    alert(error.message);
                }
            }
        } else if (action === 'edit') {
            const expenseToEdit = currentExpenses.find(exp => exp.id == id);
            if (expenseToEdit) {
                editExpenseId.value = id;
                editExpenseDescription.value = expenseToEdit.description;
                editExpenseAmount.value = expenseToEdit.amount;
                editExpenseModal.show();
            }
        }
    });

    editExpenseForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const id = editExpenseId.value;
        const description = editExpenseDescription.value;
        const amount = parseFloat(editExpenseAmount.value);

        try {
            const response = await fetch(`/api/expenses/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ description, amount })
            });
            const result = await response.json();
            if (!result.success) throw new Error(result.message);
            editExpenseModal.hide();
            loadDataAndRender();
        } catch (error) {
            console.error('Error updating expense:', error);
            alert(error.message);
        }
    });

    // Initial load
    loadDataAndRender();

    // --- PDF Generation Logic ---
    const downloadPdfBtn = document.getElementById('downloadPdfBtn');
    if (downloadPdfBtn) {
        downloadPdfBtn.addEventListener('click', function generateAccountingPdf() {
            const downloadBtn = document.getElementById('downloadPdfBtn');
            const addExpenseBtn = document.getElementById('addExpenseBtn');
            const originalBtnContent = downloadBtn.innerHTML;
            downloadBtn.disabled = true;
            downloadBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> جاري الإنشاء...';

            const element = document.getElementById('accounting-content');
            const textElements = element.querySelectorAll('.text-white');
            const originalCards = element.querySelectorAll('.card');
            const expensesCard = document.getElementById('expensesCard');
            const originalStyles = new Map();

            const pdfTableContainer = document.createElement('div');
            pdfTableContainer.id = 'pdf-temp-table';
            let expensesTableHtml = '<h4 class="text-center mb-3" style="color: black; font-family: Courier, monospace;">سجل المصروفات</h4>';
            
            if (currentExpenses.length > 0) {
                expensesTableHtml += `
                    <table class="table table-bordered text-center" style="font-family: Courier, monospace;">
                        <thead class="table-dark">
                            <tr>
                                <th>التاريخ</th>
                                <th>الوصف</th>
                                <th>المبلغ (جنيه)</th>
                            </tr>
                        </thead>
                        <tbody>
                `;
                currentExpenses.forEach(e => {
                    expensesTableHtml += `
                        <tr>
                            <td>${new Date(e.date).toLocaleDateString('ar-EG')}</td>
                            <td>${e.description}</td>
                            <td>${parseFloat(e.amount).toLocaleString('ar-EG')}</td>
                        </tr>
                    `;
                });
                expensesTableHtml += '</tbody></table>';
            } else {
                expensesTableHtml += '<p class="text-center">لا توجد مصروفات مسجلة.</p>';
            }
            pdfTableContainer.innerHTML = expensesTableHtml;

            textElements.forEach(el => {
                originalStyles.set(el, { color: el.style.color });
                el.style.color = 'black';
            });
            originalCards.forEach(card => {
                originalStyles.set(card, { className: card.className });
                if (card.id !== 'expensesCard') {
                    card.className = 'card bg-light mb-3';
                }
            });

            addExpenseBtn.style.display = 'none';
            expensesCard.style.display = 'none';
            element.appendChild(pdfTableContainer);

            const opt = {
                margin: 0.5,
                filename: 'Accounting-Report.pdf',
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2, useCORS: true, letterRendering: true, backgroundColor: '#ffffff' },
                jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
            };

            const restoreUI = () => {
                textElements.forEach(el => { el.style.color = originalStyles.get(el).color; });
                originalCards.forEach(card => { card.className = originalStyles.get(card).className; });
                addExpenseBtn.style.display = 'inline-block';
                expensesCard.style.display = 'block';
                const tempTable = document.getElementById('pdf-temp-table');
                if (tempTable) tempTable.remove();
                downloadBtn.disabled = false;
                downloadBtn.innerHTML = originalBtnContent;
            };

            html2pdf().from(element).set(opt).save().then(restoreUI).catch(err => {
                console.error("Error generating PDF:", err);
                alert("عفواً، حدث خطأ أثناء إنشاء ملف PDF.");
                restoreUI();
            });
        });
    } else {
        console.error('Download PDF button not found!');
    }
});
