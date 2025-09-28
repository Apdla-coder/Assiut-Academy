// دالة حذف المستخدم
async function deleteUser(userId) {
    let statusMessage;
    try {
        // التأكيد مع رسالة تحذير
        const confirmDelete = confirm(`⚠️ تحذير: سيتم حذف المستخدم بشكل نهائي من النظام والمصادقة.
هل أنت متأكد من حذف هذا المستخدم؟`);
        
        if (!confirmDelete) return;

        // عرض رسالة الانتظار
        const user = usersData.find(u => u.id === userId);
        statusMessage = document.createElement('div');
        statusMessage.className = 'status-message info';
        statusMessage.textContent = `جاري حذف المستخدم ${user?.email || ''}...`;
        document.body.appendChild(statusMessage);

        console.log('Starting deletion for user:', userId);

        // حذف المستخدم من قاعدة البيانات أولاً
        const { error: dbError } = await supabaseAdmin
            .from('users')
            .delete()
            .eq('id', userId);

        if (dbError) {
            console.error('Database deletion error:', dbError);
            throw new Error(`فشل حذف المستخدم من قاعدة البيانات: ${dbError.message}`);
        }

        console.log('Successfully deleted user from database');

        // محاولة حذف المستخدم من Auth
        const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);
        
        if (authError) {
            if (authError.status === 404 || authError.message.includes('Not Found')) {
                console.log('User not found in Auth (might be already deleted)');
            } else {
                console.warn('Warning: Auth deletion failed:', authError);
            }
        } else {
            console.log('Successfully deleted from Auth system');
        }

        // تحديث واجهة المستخدم
        usersData = usersData.filter(u => u.id !== userId);
        renderUsersTable();
        updateStats();

        // إزالة رسالة الانتظار وعرض رسالة النجاح
        if (statusMessage) {
            statusMessage.remove();
        }
        
        alert('✅ تم حذف المستخدم بنجاح');

    } catch (error) {
        console.error('Error deleting user:', error);
        if (statusMessage) {
            statusMessage.remove();
        }
        alert(`❌ حدث خطأ أثناء حذف المستخدم: ${error.message}`);
    }
}