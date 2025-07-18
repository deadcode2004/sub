const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const cors = require('cors');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = 'database.db';

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Connect to SQLite database
// Use a persistent disk path for Render, fallback to local for development
const DB_PATH = process.env.RENDER_DISK_PATH || '.';
const db = new sqlite3.Database(`${DB_PATH}/database.db`, (err) => {
    if (err) {
        return console.error('Error opening database', err.message);
    }
    console.log('Connected to the SQLite database.');

    db.serialize(() => {
        // Create users table
        db.run(`CREATE TABLE IF NOT EXISTS expenses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            description TEXT NOT NULL,
            amount REAL NOT NULL,
            date TEXT NOT NULL
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS attendance (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            customer_id TEXT NOT NULL,
            customer_name TEXT NOT NULL,
            attendance_date TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'present',
            FOREIGN KEY (customer_id) REFERENCES customers (id) ON DELETE CASCADE
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL
        )`, (err) => {
            if (err) return console.error('Error creating users table', err.message);
            // Add a default admin user if the table is empty
            db.get('SELECT COUNT(*) as count FROM users', (err, row) => {
                if (err) return console.error('DB error', err.message);
                if (row.count === 0) {
                    bcrypt.hash('password123', 10, (err, hash) => {
                        if (err) return console.error('Hashing error', err.message);
                        db.run('INSERT INTO users (email, password) VALUES (?, ?)', ['admin@example.com', hash], (err) => {
                            if (err) return console.error('Insert error', err.message);
                            console.log('Default admin user created.');
                        });
                    });
                }
            });
        });

        // Create customers table
        db.run(`CREATE TABLE IF NOT EXISTS customers (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            phone TEXT,
            dob TEXT,
            gender TEXT,
            subscription_type TEXT,
            subscription_duration_months INTEGER,
            start_date TEXT,
            end_date TEXT,
            subscription_status TEXT,
            total_price REAL,
            amount_paid REAL,
            remaining_amount REAL,
            discount_percentage REAL,
            payment_method TEXT,
            last_payment_date TEXT,
            original_price REAL,
            payment_status TEXT,
            notes TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )`, (err) => {
            if (err) console.error('Error creating customers table', err.message);
        });

        // Create transactions table
        db.run(`CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            customer_id TEXT NOT NULL,
            amount REAL NOT NULL,
            payment_date TEXT NOT NULL,
            payment_type TEXT, 
            details TEXT,
            payment_method TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (customer_id) REFERENCES customers (id) ON DELETE CASCADE
        )`, (err) => {
            if (err) console.error('Error creating transactions table', err.message);
        });

        // Create settings table
        db.run(`CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT
        )`);
    });
});

// --- API Endpoints ---

// Update Credentials Endpoint
app.post('/api/update-credentials', (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ success: false, message: 'البريد الإلكتروني وكلمة المرور الجديدة مطلوبان' });
    }

    bcrypt.hash(password, 10, (err, hash) => {
        if (err) {
            console.error('Error hashing password for update', err);
            return res.status(500).json({ success: false, message: 'خطأ أثناء تشفير كلمة المرور' });
        }

        // This assumes we are updating the first user (the admin).
        // In a multi-user system, you'd use a WHERE clause with a user ID.
        db.run('UPDATE users SET email = ?, password = ? WHERE id = 1', [email, hash], function(err) {
            if (err) {
                console.error('Error updating credentials in DB', err.message);
                return res.status(500).json({ success: false, message: 'فشل تحديث البيانات في قاعدة البيانات' });
            }
            res.json({ success: true, message: 'تم تحديث بيانات تسجيل الدخول بنجاح!' });
        });
    });
});

// Login Endpoint
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ success: false, message: 'البريد الإلكتروني وكلمة المرور مطلوبان' });
    }

    db.get('SELECT * FROM users WHERE email = ?', [email], (err, user) => {
        if (err) {
            console.error('Database error during login', err.message);
            return res.status(500).json({ success: false, message: 'خطأ في الخادم' });
        }

        if (!user) {
            return res.status(401).json({ success: false, message: 'بيانات تسجيل الدخول غير صحيحة' });
        }

        // Compare submitted password with stored hash
        bcrypt.compare(password, user.password, (err, isMatch) => {
            if (err) {
                console.error('Error comparing passwords', err);
                return res.status(500).json({ success: false, message: 'خطأ في الخادم' });
            }

            if (isMatch) {
                // Passwords match
                res.json({ success: true, message: 'تم تسجيل الدخول بنجاح' });
            } else {
                // Passwords don't match
                res.status(401).json({ success: false, message: 'بيانات تسجيل الدخول غير صحيحة' });
            }
        });
    });
});

// Endpoint to add a new customer
app.post('/api/customers', (req, res) => {
    const {
        id, personalInfo, subscriptionInfo, paymentInfo, paymentHistory
    } = req.body;

    // Basic validation
    if (!id || !personalInfo || !subscriptionInfo || !paymentInfo) {
        return res.status(400).json({ success: false, message: 'بيانات العميل غير مكتملة.' });
    }

    const customerSql = `INSERT INTO customers (
        id, name, phone, dob, gender, 
        subscription_type, subscription_duration_months, start_date, end_date, subscription_status, 
        total_price, amount_paid, remaining_amount, discount_percentage, payment_method, last_payment_date, original_price, payment_status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    const customerParams = [
        id, personalInfo.name, personalInfo.phone, personalInfo.dob, personalInfo.gender,
        subscriptionInfo.type, subscriptionInfo.duration, subscriptionInfo.startDate, subscriptionInfo.endDate, subscriptionInfo.status,
        paymentInfo.total, paymentInfo.amountPaid, paymentInfo.remainingAmount, paymentInfo.discount, paymentInfo.paymentMethod, paymentInfo.lastPaymentDate, paymentInfo.originalPrice, paymentInfo.status
    ];

    db.run(customerSql, customerParams, function(err) {
        if (err) {
            console.error('Error inserting customer:', err.message);
            // Check for unique constraint violation
            if (err.message.includes('UNIQUE constraint failed')) {
                return res.status(409).json({ success: false, message: 'هذا الباركود مستخدم بالفعل لعميل آخر.' });
            }
            return res.status(500).json({ success: false, message: 'فشل حفظ بيانات العميل في قاعدة البيانات.' });
        }

        // If there's a payment history, insert the first transaction
        if (paymentHistory && paymentHistory.length > 0) {
            const firstTransaction = paymentHistory[0];
            const transactionSql = `INSERT INTO transactions (customer_id, amount, payment_date, payment_type, details, payment_method) VALUES (?, ?, ?, ?, ?, ?)`;
            const transactionParams = [id, firstTransaction.amount, firstTransaction.date, firstTransaction.type, firstTransaction.details, paymentInfo.paymentMethod];

            db.run(transactionSql, transactionParams, (err) => {
                if (err) {
                    console.error('Error inserting transaction:', err.message);
                    // Note: We don't fail the whole operation if transaction fails, but we should log it.
                }
            });
        }

        res.status(201).json({ success: true, message: 'تمت إضافة العميل بنجاح!' });
    });
});

// Endpoint to get all customers
app.get('/api/customers', (req, res) => {
    const { search } = req.query;
    let sql = `SELECT c.*, t.end_date, t.status as subscription_status, p.status as payment_status, p.amount_paid, p.remaining_amount, p.total_price, p.payment_date as last_payment_date FROM customers c LEFT JOIN transactions t ON c.id = t.customer_id LEFT JOIN transactions p ON c.id = p.customer_id`;
    const params = [];

    if (search) {
        sql += ' WHERE c.name LIKE ? OR c.phone LIKE ?';
        params.push(`%${search}%`, `%${search}%`);
    }

    sql += ' ORDER BY c.name;';

    db.all(sql, params, (err, rows) => {
        if (err) {
            console.error('Error fetching customers:', err.message);
            return res.status(500).json({ success: false, message: 'فشل في جلب بيانات العملاء.' });
        }
        res.json({ success: true, customers: rows });
    });
});

// Endpoint to get a single customer by ID
app.get('/api/customers/:id', (req, res) => {
    const { id } = req.params;
    // We join with transactions to get all data needed for the edit form in one go.
    const sql = `
        SELECT 
            c.id, c.name, c.phone, c.dob, c.gender, c.subscription_type, c.subscription_duration_months, c.start_date, c.end_date, c.subscription_status,
            t.total_price, t.amount_paid, t.remaining_amount, t.discount_percentage, t.payment_method, t.last_payment_date, t.original_price, t.payment_status
        FROM customers c
        LEFT JOIN transactions t ON c.id = t.customer_id
        WHERE c.id = ?
        ORDER BY t.last_payment_date DESC
        LIMIT 1;
    `;

    db.get(sql, [id], (err, row) => {
        if (err) {
            console.error(`Error fetching customer ${id}:`, err.message);
            return res.status(500).json({ success: false, message: 'خطأ في الخادم.' });
        }
        if (!row) {
            return res.status(404).json({ success: false, message: 'العميل غير موجود.' });
        }
        res.json({ success: true, customer: row });
    });
});

// Endpoint to update a customer
app.put('/api/customers/:id', (req, res) => {
    const { id } = req.params;
    const {
        name, phone, dob, gender, 
        subscription_type, subscription_duration_months, start_date, end_date, subscription_status,
        total_price, amount_paid, remaining_amount, discount_percentage, payment_method, original_price, payment_status
    } = req.body;

    db.serialize(() => {
        db.run('BEGIN TRANSACTION;');

        const customerSql = `
            UPDATE customers 
            SET name = ?, phone = ?, dob = ?, gender = ?, subscription_type = ?, subscription_duration_months = ?, start_date = ?, end_date = ?, subscription_status = ?
            WHERE id = ?`;
        const customerParams = [name, phone, dob, gender, subscription_type, subscription_duration_months, start_date, end_date, subscription_status, id];

        db.run(customerSql, customerParams, function(err) {
            if (err) {
                db.run('ROLLBACK;');
                console.error('Error updating customer:', err.message);
                return res.status(500).json({ success: false, message: 'فشل تحديث بيانات العميل.' });
            }

            const transactionSql = `
                UPDATE transactions
                SET total_price = ?, amount_paid = ?, remaining_amount = ?, discount_percentage = ?, payment_method = ?, original_price = ?, payment_status = ?
                WHERE customer_id = ?`;
            // Note: This updates the latest transaction. If a customer can have multiple, this logic might need refinement.
            const transactionParams = [total_price, amount_paid, remaining_amount, discount_percentage, payment_method, original_price, payment_status, id];

            db.run(transactionSql, transactionParams, function(err) {
                if (err) {
                    db.run('ROLLBACK;');
                    console.error('Error updating transaction:', err.message);
                    return res.status(500).json({ success: false, message: 'فشل تحديث البيانات المالية.' });
                }

                db.run('COMMIT;', (err) => {
                    if (err) {
                        console.error('Error committing transaction:', err.message);
                        return res.status(500).json({ success: false, message: 'فشل إتمام العملية.' });
                    }
                    res.json({ success: true, message: 'تم تحديث بيانات العميل بنجاح.' });
                });
            });
        });
    });
});

// Endpoint to delete a customer
app.delete('/api/customers/:id', (req, res) => {
    const { id } = req.params;
    const sql = 'DELETE FROM customers WHERE id = ?';

    db.run(sql, id, function(err) {
        if (err) {
            console.error(`Error deleting customer ${id}:`, err.message);
            return res.status(500).json({ success: false, message: 'فشل حذف العميل.' });
        }
        if (this.changes === 0) {
            return res.status(404).json({ success: false, message: 'العميل غير موجود.' });
        }
        res.json({ success: true, message: 'تم حذف العميل بنجاح.' });
    });
});

// Endpoint for generating reports
app.get('/api/reports', (req, res) => {
    const { year, month } = req.query;

    if (!year || !month) {
        return res.status(400).json({ success: false, message: 'Year and month are required.' });
    }

    const monthlyDataSql = `
        SELECT 
            strftime('%m', T1.date) as month,
            SUM(T1.amount) as revenue,
            (SELECT COUNT(*) FROM customers WHERE strftime('%Y-%m', start_date) = T2.year_month) as new_subscribers
        FROM 
            transactions T1
        JOIN 
            (SELECT DISTINCT strftime('%Y-%m', date) as year_month FROM transactions WHERE strftime('%Y', date) = ?) T2 ON strftime('%Y-%m', T1.date) = T2.year_month
        WHERE 
            strftime('%Y', T1.date) = ?
        GROUP BY 
            month
        ORDER BY
            month;
    `;

    const monthlyReportSql = `
        SELECT 
            SUM(amount) as totalRevenue,
            (SELECT COUNT(*) FROM customers WHERE strftime('%Y-%m', start_date) = ?) as newSubscribers
        FROM transactions
        WHERE strftime('%Y-%m', date) = ?;
    `;

    const yearMonth = `${year}-${String(parseInt(month, 10) + 1).padStart(2, '0')}`;

    db.get(monthlyReportSql, [yearMonth, yearMonth], (err, monthlyReport) => {
        if (err) {
            console.error('Error fetching monthly report:', err.message);
            return res.status(500).json({ success: false, message: 'Failed to fetch monthly report data.' });
        }

        db.all(monthlyDataSql, [year, year], (err, yearlyData) => {
            if (err) {
                console.error('Error fetching yearly chart data:', err.message);
                return res.status(500).json({ success: false, message: 'Failed to fetch yearly chart data.' });
            }

            res.json({
                success: true,
                report: {
                    totalRevenue: monthlyReport.totalRevenue || 0,
                    newSubscribers: monthlyReport.newSubscribers || 0,
                },
                chartData: yearlyData
            });
        });
    });
});

// Endpoint for dashboard statistics
app.get('/api/dashboard-stats', async (req, res) => {
    try {
        const queries = {
            totalCustomers: 'SELECT COUNT(*) as count FROM customers',
            activeCustomers: `SELECT COUNT(*) as count FROM customers WHERE subscription_status = 'نشط'`,
            expiringSoon: `SELECT id, name, end_date FROM customers WHERE subscription_status = 'نشط' AND date(end_date) BETWEEN date('now') AND date('now', '+7 days') ORDER BY end_date ASC`,
            monthlyRevenue: `SELECT SUM(amount) as total FROM transactions WHERE strftime('%Y-%m', payment_date) = strftime('%Y-%m', 'now', 'localtime')`,
            newSubscribersMonthly: `SELECT COUNT(*) as count FROM customers WHERE strftime('%Y-%m', start_date) = strftime('%Y-%m', 'now', 'localtime')`,
            recentTransactions: `SELECT c.name, t.amount, t.payment_date FROM transactions t JOIN customers c ON t.customer_id = c.id ORDER BY t.payment_date DESC LIMIT 5`
        };

        const results = {};
        for (const key in queries) {
            results[key] = await new Promise((resolve, reject) => {
                db.all(queries[key], [], (err, rows) => {
                    if (err) return reject(err);
                    // .all returns an array, for counts we need the first row's value
                    if (rows.length > 0 && rows[0].count !== undefined) {
                        resolve(rows[0].count);
                    } else if (rows.length > 0 && rows[0].total !== undefined) {
                        resolve(rows[0].total || 0);
                    } else {
                        resolve(rows); // For lists like expiringSoon or recentTransactions
                    }
                });
            });
        }

        res.json({ success: true, stats: results });

    } catch (err) {
        console.error('Error fetching dashboard stats:', err.message);
        res.status(500).json({ success: false, message: 'Failed to fetch dashboard statistics.' });
    }
});

// --- Attendance API Endpoints ---

// GET attendance records for a specific date
app.get('/api/attendance', (req, res) => {
    const { date } = req.query;
    if (!date) {
        return res.status(400).json({ success: false, message: 'Date query parameter is required.' });
    }

    const sql = 'SELECT * FROM attendance WHERE attendance_date = ? ORDER BY id DESC';
    db.all(sql, [date], (err, rows) => {
        if (err) {
            console.error('Error fetching attendance:', err.message);
            return res.status(500).json({ success: false, message: 'Failed to fetch attendance records.' });
        }
        res.json({ success: true, data: rows });
    });
});

// POST a new attendance record
app.post('/api/attendance', (req, res) => {
    const { customerId } = req.body;
    if (!customerId) {
        return res.status(400).json({ success: false, message: 'Customer ID is required.' });
    }

    const todayStr = new Date().toISOString().split('T')[0];

    // 1. Find the customer
    db.get('SELECT * FROM customers WHERE id = ?', [customerId], (err, customer) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Database error checking customer.' });
        }
        if (!customer) {
            return res.status(404).json({ success: false, message: 'عضو غير موجود!' });
        }
        if (customer.subscription_status !== 'نشط') {
             return res.status(400).json({ success: false, message: 'اشتراك هذا العميل غير نشط!' });
        }

        // 2. Check if already attended today
        db.get('SELECT id FROM attendance WHERE customer_id = ? AND attendance_date = ?', [customerId, todayStr], (err, record) => {
            if (err) {
                return res.status(500).json({ success: false, message: 'Database error checking attendance.' });
            }
            if (record) {
                return res.status(409).json({ success: false, message: 'تم تسجيل حضور هذا العميل بالفعل اليوم!' });
            }

            // 3. Insert new attendance record
            const insertSql = 'INSERT INTO attendance (customer_id, customer_name, attendance_date) VALUES (?, ?, ?)';
            db.run(insertSql, [customerId, customer.name, todayStr], function(err) {
                if (err) {
                    return res.status(500).json({ success: false, message: 'Failed to save attendance.' });
                }
                res.status(201).json({ success: true, message: 'تم تسجيل الحضور بنجاح!', data: { id: this.lastID, customer: customer } });
            });
        });
    });
});

// DELETE an attendance record by its ID
app.delete('/api/attendance/:id', (req, res) => {
    const { id } = req.params;
    const sql = 'DELETE FROM attendance WHERE id = ?';
    db.run(sql, [id], function(err) {
        if (err) {
            return res.status(500).json({ success: false, message: 'Failed to delete attendance record.' });
        }
        if (this.changes === 0) {
            return res.status(404).json({ success: false, message: 'Record not found.' });
        }
        res.json({ success: true, message: 'تم حذف السجل بنجاح.' });
    });
});

// DELETE all attendance records for a specific date
app.delete('/api/attendance', (req, res) => {
    const { date } = req.query;
    if (!date) {
        return res.status(400).json({ success: false, message: 'Date query parameter is required for deletion.' });
    }
    const sql = 'DELETE FROM attendance WHERE attendance_date = ?';
    db.run(sql, [date], function(err) {
        if (err) {
            return res.status(500).json({ success: false, message: 'Failed to delete attendance records for the specified date.' });
        }
        res.json({ success: true, message: `تم حذف جميع سجلات الحضور ليوم ${date}.` });
    });
});


// --- Expired and Expiring Subscriptions API ---

// GET customers with expired or soon-to-expire subscriptions
app.get('/api/subscriptions/expired-and-expiring', (req, res) => {
    const today = new Date().toISOString().split('T')[0];
    const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const sql = `
        SELECT * FROM customers 
        WHERE end_date < ? 
        ORDER BY end_date ASC
    `;

    db.all(sql, [sevenDaysFromNow], (err, rows) => {
        if (err) {
            res.status(500).json({ success: false, message: 'Database error fetching subscriptions.' });
        } else {
            res.json({ success: true, data: rows });
        }
    });
});

// POST to renew a customer's subscription
app.post('/api/customers/:id/renew', (req, res) => {
    const { id } = req.params;
    const {
        newEndDate,
        newSubscriptionPrice,
        newAmountPaid,
        newRemainingAmount,
        paymentMethod,
        subscriptionType
    } = req.body;

    db.get('SELECT * FROM customers WHERE id = ?', [id], (err, customer) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Database error finding customer.' });
        }
        if (!customer) {
            return res.status(404).json({ success: false, message: 'Customer not found.' });
        }

        const oldRemaining = parseFloat(customer.remaining_amount) || 0;
        const totalDue = oldRemaining + parseFloat(newSubscriptionPrice);
        const finalRemaining = totalDue - parseFloat(newAmountPaid);

        db.serialize(() => {
            db.run('BEGIN TRANSACTION;');

            const updateCustomerSql = `
                UPDATE customers 
                SET 
                    end_date = ?,
                    subscription_status = 'نشط',
                    remaining_amount = ?
                WHERE id = ?
            `;
            db.run(updateCustomerSql, [newEndDate, finalRemaining, id], function(err) {
                if (err) {
                    db.run('ROLLBACK;');
                    return res.status(500).json({ success: false, message: 'Failed to update customer subscription.' });
                }

                const insertTransactionSql = `
                    INSERT INTO transactions (customer_id, customer_name, amount, payment_date, type, notes, payment_method)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `;
                const notes = `تجديد اشتراك. السعر: ${newSubscriptionPrice}. المبلغ المدفوع: ${newAmountPaid}. الرصيد القديم: ${oldRemaining}.`;
                const today = new Date().toISOString().split('T')[0];

                db.run(insertTransactionSql, [id, customer.name, newAmountPaid, today, 'تجديد', notes, paymentMethod], function(err) {
                    if (err) {
                        db.run('ROLLBACK;');
                        return res.status(500).json({ success: false, message: 'Failed to create renewal transaction.' });
                    }

                    db.run('COMMIT;', (err) => {
                        if (err) {
                            return res.status(500).json({ success: false, message: 'Failed to commit transaction.' });
                        }
                        res.json({ success: true, message: 'تم تجديد الاشتراك بنجاح!' });
                    });
                });
            });
        });
    });
});
app.get('/api/customers/debts', (req, res) => {
    let sql = `SELECT c.id, c.name, c.phone, t.subscription_end_date, t.total_price, t.amount_paid, t.remaining_amount, t.payment_date
        FROM customers c
        JOIN transactions t ON c.id = t.customer_id
        WHERE t.id = (SELECT id FROM transactions WHERE customer_id = c.id ORDER BY payment_date DESC, id DESC LIMIT 1)
          AND t.remaining_amount > 0;
    `;

    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error('Error fetching indebted customers:', err.message);
            return res.status(500).json({ success: false, message: 'فشل في جلب قائمة المديونيات.' });
        }
        res.json({ success: true, debts: rows });
    });
});

// Endpoint to pay off a debt
app.post('/api/customers/:id/pay-debt', (req, res) => {
    const { id } = req.params;
    const { amount } = req.body;

    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
        return res.status(400).json({ success: false, message: 'الرجاء إدخال مبلغ صحيح.' });
    }

    const paidAmount = parseFloat(amount);

    db.serialize(() => {
        db.run('BEGIN TRANSACTION;');

        // 1. Find the latest transaction for the customer
        const findLatestTransactionSql = `SELECT * FROM transactions WHERE customer_id = ? ORDER BY payment_date DESC, id DESC LIMIT 1`;

        db.get(findLatestTransactionSql, [id], (err, latestTransaction) => {
            if (err) {
                db.run('ROLLBACK;');
                console.error('Error finding latest transaction:', err.message);
                return res.status(500).json({ success: false, message: 'خطأ في الخادم.' });
            }

            if (!latestTransaction) {
                db.run('ROLLBACK;');
                return res.status(404).json({ success: false, message: 'لم يتم العثور على معاملات لهذا العميل.' });
            }

            if (paidAmount > latestTransaction.remaining_amount) {
                db.run('ROLLBACK;');
                return res.status(400).json({ success: false, message: 'المبلغ المدفوع أكبر من الدين المتبقي.' });
            }

            // 2. Update the transaction
            const newRemainingAmount = latestTransaction.remaining_amount - paidAmount;
            const newAmountPaid = latestTransaction.amount_paid + paidAmount;
            const paymentStatus = newRemainingAmount > 0 ? 'جزئي' : 'مدفوع';

            const updateTransactionSql = `
                UPDATE transactions 
                SET amount_paid = ?, remaining_amount = ?, status = ?, payment_date = CURRENT_DATE
                WHERE id = ?
            `;

            db.run(updateTransactionSql, [newAmountPaid, newRemainingAmount, paymentStatus, latestTransaction.id], function(err) {
                if (err) {
                    db.run('ROLLBACK;');
                    console.error('Error updating transaction:', err.message);
                    return res.status(500).json({ success: false, message: 'فشل في تحديث المعاملة.' });
                }

                // 3. Insert into payment history
                const historySql = `INSERT INTO payment_history (customer_id, transaction_id, amount, type, details, payment_date) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`;
                const historyParams = [id, latestTransaction.id, paidAmount, 'تسديد دين', 'تسديد دفعة من المديونية.'];

                db.run(historySql, historyParams, function(err) {
                    if (err) {
                        db.run('ROLLBACK;');
                        console.error('Error inserting payment history:', err.message);
                        return res.status(500).json({ success: false, message: 'فشل في تسجيل تاريخ الدفع.' });
                    }

                    // 4. Commit transaction
                    db.run('COMMIT;', (err) => {
                        if (err) {
                            console.error('Error committing transaction:', err.message);
                            return res.status(500).json({ success: false, message: 'فشل في إتمام العملية.' });
                        }
                        res.json({ success: true, message: 'تم تسجيل الدفعة بنجاح!' });
                    });
                });
            });
        });
    });
});


// Endpoint to get absent customers for a specific date
app.get('/api/absences', (req, res) => {
    const { date } = req.query;

    if (!date) {
        return res.status(400).json({ success: false, message: 'Date parameter is required.' });
    }

    // SQL to get IDs of customers who were present on the given date
    const attendedCustomersSql = `SELECT DISTINCT customer_id FROM attendance WHERE date = ?`;

    // SQL to get all customers who were active on the given date based on their latest transaction
    const activeCustomersSql = `
        SELECT c.id, c.name
        FROM customers c
        WHERE c.id IN (
            SELECT t.customer_id
            FROM transactions t
            WHERE t.id = (SELECT id FROM transactions WHERE customer_id = c.id ORDER BY payment_date DESC, id DESC LIMIT 1)
            AND ? BETWEEN t.subscription_start_date AND t.subscription_end_date
        )
    `;

    db.all(attendedCustomersSql, [date], (err, attendedRows) => {
        if (err) {
            console.error('Error fetching attendance:', err.message);
            return res.status(500).json({ success: false, message: 'فشل في جلب بيانات الحضور.' });
        }
        const attendedIds = new Set(attendedRows.map(r => r.customer_id));

        db.all(activeCustomersSql, [date], (err, activeRows) => {
            if (err) {
                console.error('Error fetching active customers:', err.message);
                return res.status(500).json({ success: false, message: 'فشل في جلب بيانات العملاء النشطين.' });
            }

            const absentCustomers = activeRows.filter(customer => !attendedIds.has(customer.id));
            
            res.json({ success: true, absences: absentCustomers });
        });
    });
});


// Endpoint to get all customer transactions for the accounting page
app.get('/api/transactions', (req, res) => {
    const sql = `
        SELECT 
            c.name AS customerName,
            t.payment_date AS paymentDate,
            t.amount_paid AS amountPaid,
            t.remaining_amount AS remainingAmount,
            t.subscription_type AS subscriptionType,
            t.status,
            t.notes,
            t.subscription_end_date AS subscriptionEndDate,
            t.subscription_duration_months AS duration
        FROM transactions t
        JOIN customers c ON t.customer_id = c.id
        ORDER BY t.payment_date DESC, t.id DESC
    `;

    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error('Error fetching transactions:', err.message);
            return res.status(500).json({ success: false, message: 'فشل في جلب سجل المعاملات.' });
        }
        res.json({ success: true, transactions: rows });
    });
});


// Endpoint for accounting summary
app.get('/api/accounting/summary', (req, res) => {
    const revenueSql = 'SELECT SUM(amount_paid) AS totalRevenue FROM transactions';
    const expensesSql = 'SELECT SUM(amount) AS totalExpenses FROM expenses';

    db.get(revenueSql, [], (err, revenueRow) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Failed to calculate revenue.' });
        }

        db.get(expensesSql, [], (err, expensesRow) => {
            if (err) {
                return res.status(500).json({ success: false, message: 'Failed to calculate expenses.' });
            }

            const totalRevenue = revenueRow.totalRevenue || 0;
            const totalExpenses = expensesRow.totalExpenses || 0;
            const netProfit = totalRevenue - totalExpenses;

            res.json({ 
                success: true, 
                summary: {
                    totalRevenue,
                    totalExpenses,
                    netProfit
                }
            });
        });
    });
});

// Endpoints for expenses CRUD
app.get('/api/expenses', (req, res) => {
    db.all('SELECT * FROM expenses ORDER BY date DESC', [], (err, rows) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Failed to retrieve expenses.' });
        }
        res.json({ success: true, expenses: rows });
    });
});

app.post('/api/expenses', (req, res) => {
    const { description, amount } = req.body;
    if (!description || !amount) {
        return res.status(400).json({ success: false, message: 'Description and amount are required.' });
    }
    const date = new Date().toISOString();
    const sql = 'INSERT INTO expenses (description, amount, date) VALUES (?, ?, ?)';
    db.run(sql, [description, amount, date], function(err) {
        if (err) {
            return res.status(500).json({ success: false, message: 'Failed to add expense.' });
        }
        res.json({ success: true, id: this.lastID });
    });
});

app.put('/api/expenses/:id', (req, res) => {
    const { description, amount } = req.body;
    const { id } = req.params;
    if (!description || !amount) {
        return res.status(400).json({ success: false, message: 'Description and amount are required.' });
    }
    const sql = 'UPDATE expenses SET description = ?, amount = ? WHERE id = ?';
    db.run(sql, [description, amount, id], function(err) {
        if (err) {
            return res.status(500).json({ success: false, message: 'Failed to update expense.' });
        }
        res.json({ success: true, changes: this.changes });
    });
});

app.delete('/api/expenses/:id', (req, res) => {
    const { id } = req.params;
    const sql = 'DELETE FROM expenses WHERE id = ?';
    db.run(sql, [id], function(err) {
        if (err) {
            return res.status(500).json({ success: false, message: 'Failed to delete expense.' });
        }
        res.json({ success: true, changes: this.changes });
    });
});

// Endpoint to delete all customers and related data
// --- Settings API ---

// GET all settings
app.get('/api/settings', (req, res) => {
    db.all('SELECT key, value FROM settings', [], (err, rows) => {
        if (err) {
            console.error('Error fetching settings:', err.message);
            return res.status(500).json({ success: false, message: 'Failed to fetch settings.' });
        }
        const settings = rows.reduce((acc, row) => {
            acc[row.key] = row.value;
            return acc;
        }, {});
        res.json({ success: true, settings });
    });
});

// POST (update) a setting
app.post('/api/settings', (req, res) => {
    const { key, value } = req.body;
    if (!key || value === undefined) {
        return res.status(400).json({ success: false, message: 'Key and value are required.' });
    }

    const sql = `INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`;
    db.run(sql, [key, value], function(err) {
        if (err) {
            console.error('Error saving setting:', err.message);
            return res.status(500).json({ success: false, message: 'Failed to save setting.' });
        }
        res.json({ success: true, message: `Setting '${key}' saved successfully.` });
    });
});

app.delete('/api/customers/all', (req, res) => {
    db.serialize(() => {
        db.run('BEGIN TRANSACTION;');
        db.run('DELETE FROM transactions', [], function(err) {
            if (err) {
                db.run('ROLLBACK;');
                return res.status(500).json({ success: false, message: 'Failed to delete transactions.' });
            }
            db.run('DELETE FROM customers', [], function(err) {
                if (err) {
                    db.run('ROLLBACK;');
                    return res.status(500).json({ success: false, message: 'Failed to delete customers.' });
                }
                db.run('COMMIT;', (err) => {
                    if (err) {
                        return res.status(500).json({ success: false, message: 'Failed to commit transaction.' });
                    }
                    res.json({ success: true, message: 'All customers and their data have been deleted.' });
                });
            });
        });
    });
});

// Add a root route for health checks
app.get('/', (req, res) => {
    res.send('Subscription System API is running!');
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
