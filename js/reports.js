let revenueChart, subscribersChart;

document.addEventListener('DOMContentLoaded', function () {
    const monthSelect = document.getElementById('monthSelect');
    const yearSelect = document.getElementById('yearSelect');
    const generateReportBtn = document.getElementById('generateReportBtn');
    const reportResult = document.getElementById('reportResult');
    const noDataMessage = document.getElementById('noDataMessage');
    const totalRevenueEl = document.getElementById('totalRevenue');
    const newSubscribersEl = document.getElementById('newSubscribers');
    const reportMonthEl = document.getElementById('reportMonth');
    const reportYearEl = document.getElementById('reportYear');
    const downloadPdfBtn = document.getElementById('downloadPdfBtn');
    const chartYearEl = document.getElementById('chartYear');
    const revenueChartCanvas = document.getElementById('revenueChart');
    const subscribersChartCanvas = document.getElementById('subscribersChart');

    function populateSelectors() {
        const monthNames = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
        monthSelect.innerHTML = '';
        monthNames.forEach((month, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = month;
            monthSelect.appendChild(option);
        });

        const currentYear = new Date().getFullYear();
        yearSelect.innerHTML = '';
        for (let year = currentYear; year >= 2023; year--) {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            yearSelect.appendChild(option);
        }

        monthSelect.value = new Date().getMonth();
        yearSelect.value = currentYear;
    }

    function generateReport() {
        const selectedMonth = monthSelect.value;
        const selectedYear = yearSelect.value;

        fetch(`http://localhost:3000/api/reports?year=${selectedYear}&month=${selectedMonth}`)
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    const { report, chartData } = data;

                    // Update UI
                    reportMonthEl.textContent = monthSelect.options[selectedMonth].text;
                    reportYearEl.textContent = selectedYear;
                    totalRevenueEl.textContent = `${(report.totalRevenue || 0).toLocaleString()} د.ع`;
                    newSubscribersEl.textContent = report.newSubscribers || 0;

                    if (report.totalRevenue === 0 && report.newSubscribers === 0) {
                        noDataMessage.style.display = 'block';
                        reportResult.style.display = 'none';
                    } else {
                        noDataMessage.style.display = 'none';
                        reportResult.style.display = 'block';
                    }

                    updateCharts(selectedYear, chartData);
                } else {
                    alert('Failed to generate report: ' + data.message);
                }
            })
            .catch(error => {
                console.error('Error generating report:', error);
                alert('Could not connect to the server to generate the report.');
            });
    }

    function updateCharts(year, chartData) {
        chartYearEl.textContent = year;

        const monthlyRevenue = Array(12).fill(0);
        const monthlyNewSubscribers = Array(12).fill(0);

        chartData.forEach(row => {
            const monthIndex = parseInt(row.month, 10) - 1;
            if (monthIndex >= 0 && monthIndex < 12) {
                monthlyRevenue[monthIndex] = row.revenue;
                monthlyNewSubscribers[monthIndex] = row.new_subscribers;
            }
        });

        const monthLabels = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

        if (revenueChart) revenueChart.destroy();
        revenueChart = new Chart(revenueChartCanvas, {
            type: 'bar',
            data: {
                labels: monthLabels,
                datasets: [{
                    label: 'الإيرادات الشهرية',
                    data: monthlyRevenue,
                    backgroundColor: 'rgba(54, 162, 235, 0.6)',
                }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });

        if (subscribersChart) subscribersChart.destroy();
        subscribersChart = new Chart(subscribersChartCanvas, {
            type: 'line',
            data: {
                labels: monthLabels,
                datasets: [{
                    label: 'المشتركون الجدد شهريًا',
                    data: monthlyNewSubscribers,
                    borderColor: 'rgba(255, 99, 132, 1)',
                    fill: false
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } }
        });
    }

    // PDF generation logic remains the same as it reads from the already rendered UI.
    function generatePDF() {
        const reportMonth = monthSelect.options[monthSelect.value].text;
        const reportYear = yearSelect.value;
        const element = document.getElementById('reportContent');

        const opt = {
            margin: 0.5,
            filename: `report-${reportYear}-${reportMonth}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2 },
            jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
        };

        html2pdf().from(element).set(opt).save();
    }

    populateSelectors();
    generateReport(); // Initial report

    generateReportBtn.addEventListener('click', generateReport);
    downloadPdfBtn.addEventListener('click', generatePDF);
});
