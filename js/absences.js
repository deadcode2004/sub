document.addEventListener('DOMContentLoaded', function() {

    // --- DOM Elements ---
    const absenceTableBody = document.getElementById('attendanceTableBody'); // The ID from HTML is 'attendanceTableBody'
    const dateFilter = document.getElementById('dateFilter');
    const deleteAllBtn = document.getElementById('deleteAllBtn');

    // --- Utility Functions ---
    const toISODateString = (date) => date.toISOString().split('T')[0];

    // --- Core API and Render Functions ---
    async function fetchAndRenderAbsences(dateString) {
        if (!dateString) {
            console.error('Date string is required to fetch absences.');
            absenceTableBody.innerHTML = `<tr><td colspan="3" class="text-center text-danger">الرجاء تحديد تاريخ.</td></tr>`;
            return;
        }

        try {
            const response = await fetch(`/api/absences?date=${dateString}`);
            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.message || 'فشل في تحميل بيانات الغياب.');
            }

            renderAbsenceTable(result.absences, dateString);
        } catch (error) {
            console.error('Error fetching absences:', error);
            absenceTableBody.innerHTML = `<tr><td colspan="3" class="text-center text-danger">${error.message}</td></tr>`;
        }
    }

    function renderAbsenceTable(absences, dateString) {
        absenceTableBody.innerHTML = '';

        if (absences.length === 0) {
            absenceTableBody.innerHTML = `<tr><td colspan="3" class="text-center">لا يوجد غياب مسجل لهذا اليوم.</td></tr>`;
            return;
        }

        absences.forEach(customer => {
            const row = absenceTableBody.insertRow();
            row.innerHTML = `
                <td>${customer.name || 'N/A'}</td>
                <td>${dateString}</td>
                <td>غائب</td>
            `;
        });
    }

    // --- Event Listeners ---
    dateFilter.addEventListener('change', () => {
        fetchAndRenderAbsences(dateFilter.value);
    });

    // --- Initial Setup ---
    // Hide unnecessary elements for this page
    const barcodeSection = document.getElementById('barcodeInput')?.parentElement;
    if (barcodeSection) barcodeSection.style.display = 'none';

    const scanStatus = document.getElementById('scanStatus');
    if (scanStatus) scanStatus.style.display = 'none';
    
    const customerInfo = document.getElementById('customerInfo');
    if(customerInfo) customerInfo.style.display = 'none';

    // The 'Delete All' button is confusing for derived data like absences.
    // It's better to hide it to avoid misuse.
    if(deleteAllBtn) deleteAllBtn.style.display = 'none';

    // Set initial date and load data
    const todayDateString = toISODateString(new Date());
    dateFilter.value = todayDateString;
    fetchAndRenderAbsences(todayDateString);
});
