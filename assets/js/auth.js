// التحقق من تسجيل الدخول
if (!SecureStorage.getItem('loggedInUser')) {
    // التحقق من أننا لسنا في صفحة تسجيل الدخول
    if (window.location.pathname !== '/index.html' && window.location.pathname !== '/index.htm') {
        // إعادة التوجيه إلى صفحة تسجيل الدخول
        window.location.href = 'index.html';
    }
}
