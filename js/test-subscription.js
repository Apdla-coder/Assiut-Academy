// دالة اختبار التنبيه
function testSubscriptionAlert(simulatedDate) {
    // حفظ الدالة الأصلية
    const originalDate = Date;
    
    // تعديل دالة Date للمحاكاة
    global.Date = class extends Date {
        constructor(...args) {
            if (args.length === 0) {
                return new originalDate(simulatedDate);
            }
            return new originalDate(...args);
        }
        
        static now() {
            return new Date(simulatedDate).getTime();
        }
    };

    // تنفيذ الاختبار
    checkSubscriptionDate();
    
    // إعادة الدالة الأصلية
    global.Date = originalDate;
}