document.addEventListener('DOMContentLoaded', function() {
    'use strict';

    // --- DOM Elements ---
    const totalCustomersEl = document.getElementById('totalCustomers');
    const activeCustomersEl = document.getElementById('activeCustomers');
    const monthlyRevenueEl = document.getElementById('monthlyRevenue');
    const newThisMonthEl = document.getElementById('newThisMonth');
    const expiringSoonCountEl = document.getElementById('expiringSoonCount');
    const recentTransactionsList = document.getElementById('recentTransactionsList');
    const expiryList = document.getElementById('expiryList');
    const expiryModalEl = document.getElementById('expiryModal');

    // Disable buttons that are no longer relevant
    const exportBtn = document.getElementById('exportBtn');
    const importFile = document.getElementById('importFile');
    const resetDataBtn = document.getElementById('resetDataBtn');
    if(exportBtn) exportBtn.classList.add('disabled');
    if(importFile) importFile.disabled = true;
    if(resetDataBtn) resetDataBtn.classList.add('disabled');


    function fetchAndDisplayStats() {
        fetch('http://localhost:3000/api/dashboard-stats')
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    updateUI(data.stats);
                } else {
                    console.error('Failed to load dashboard stats:', data.message);
                    alert('فشل تحميل إحصائيات لوحة التحكم.');
                }
            })
            .catch(error => {
                console.error('Error fetching dashboard stats:', error);
                // You might want to display an error message to the user in the UI
            });
    }

    function updateUI(stats) {
        // Update stat cards
        if (totalCustomersEl) totalCustomersEl.textContent = stats.totalCustomers || 0;
        if (activeCustomersEl) activeCustomersEl.textContent = stats.activeCustomers || 0;
        if (monthlyRevenueEl) monthlyRevenueEl.textContent = `${(stats.monthlyRevenue || 0).toLocaleString()} د.ع`;
        if (newThisMonthEl) newThisMonthEl.textContent = stats.newSubscribersMonthly || 0;
        if (expiringSoonCountEl) expiringSoonCountEl.textContent = stats.expiringSoon ? stats.expiringSoon.length : 0;

        // Update recent transactions list
        if (recentTransactionsList) {
            recentTransactionsList.innerHTML = '';
            if (stats.recentTransactions && stats.recentTransactions.length > 0) {
                stats.recentTransactions.forEach(t => {
                    const li = document.createElement('li');
                    li.className = 'list-group-item d-flex justify-content-between align-items-center';
                    li.innerHTML = `
                        <span>${t.name}</span>
                        <span class="text-success fw-bold">+${(t.amount || 0).toLocaleString()} د.ع</span>
                    `;
                    recentTransactionsList.appendChild(li);
                });
            } else {
                recentTransactionsList.innerHTML = '<li class="list-group-item text-center">لا توجد معاملات حديثة</li>';
            }
        }

        // Update and show expiring soon modal/list
        if (stats.expiringSoon) {
            populateExpiringSoonList(stats.expiringSoon);
            showExpiryModal(stats.expiringSoon);
        }
    }

    function populateExpiringSoonList(expiringCustomers) {
        if (!expiryList) return;
        expiryList.innerHTML = '';

        if (expiringCustomers.length > 0) {
            expiringCustomers.forEach(customer => {
                const li = document.createElement('li');
                li.className = 'list-group-item';
                const endDate = new Date(customer.end_date);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                endDate.setHours(0, 0, 0, 0);
                const timeDiff = endDate.getTime() - today.getTime();
                const dayDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));

                let badgeClass = 'bg-warning text-dark';
                let statusText = `ينتهي بعد ${dayDiff} يوم`;
                if (dayDiff === 0) {
                    badgeClass = 'bg-danger';
                    statusText = 'ينتهي اليوم';
                }

                li.innerHTML = `
                    <div class="d-flex w-100 justify-content-between">
                        <h6 class="mb-1">${customer.name}</h6>
                        <small><span class="badge ${badgeClass}">${statusText}</span></small>
                    </div>
                    <p class="mb-1">تاريخ الانتهاء: ${endDate.toLocaleDateString('ar-IQ')}</p>
                `;
                expiryList.appendChild(li);
            });
        } else {
            expiryList.innerHTML = '<li class="list-group-item text-center">لا توجد اشتراكات على وشك الانتهاء.</li>';
        }
    }

    function showExpiryModal(expiringSoonCustomers) {
        if (!expiryModalEl || expiringSoonCustomers.length === 0) return;

        const lastShown = localStorage.getItem('expiryModalLastShown');
        const todayStr = new Date().toISOString().split('T')[0];
        if (lastShown === todayStr) return;

        const expiryModal = new bootstrap.Modal(expiryModalEl);
        expiryModal.show();
        localStorage.setItem('expiryModalLastShown', todayStr);
    }

    // --- Initial Page Load & Refresh ---
    fetchAndDisplayStats();
    setInterval(fetchAndDisplayStats, 60000); // Refresh stats every minute
});
