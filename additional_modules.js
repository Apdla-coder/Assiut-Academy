// ===============================================
// ADDITIONAL MODULES FOR SECRETARY DASHBOARD
// ===============================================

// ===============================================
// COURSES MANAGEMENT
// ===============================================
async function loadCourses() {
    try {
        const container = document.getElementById('coursesContainer');
        container.innerHTML = createLoadingHTML('جارٍ تحميل بيانات الكورسات...');

        const { data, error } = await supabaseClient
            .from('courses')
            .select('*, users(full_name)')
            .order('created_at', { ascending: false });

        if (error) throw error;
        courses = data || [];

        container.innerHTML = createCoursesTableHTML(data);

    } catch (error) {
        console.error('Error loading courses:', error);
        showErrorInContainer('coursesContainer', 'خطأ في تحميل بيانات الكورسات');
    }
}

function createCoursesTableHTML(coursesData) {
    return `
        <div class="table-container">
            <button class="btn btn-primary" onclick="showAddCourseModal()" style="margin-bottom: 20px;">
                <i class="fas fa-plus"></i> إضافة دورة جديدة
            </button>
            <table>
                <thead>
                    <tr>
                        <th>اسم الدورة</th>
                        <th>الوصف</th>
                        <th>السعر</th>
                        <th>المعلم المسؤول</th>
                        <th>تاريخ البداية</th>
                        <th>تاريخ النهاية</th>
                        <th>الإجراءات</th>
                    </tr>
                </thead>
                <tbody>
                    ${coursesData.map(createCourseRowHTML).join('')}
                </tbody>
            </table>
        </div>
    `;
}

function createCourseRowHTML(course) {
    return `
        <tr>
            <td><a href="#" onclick="showCourseDetails('${course.id}'); return false;" style="color: var(--primary); text-decoration: underline;">${course.name}</a></td>
            <td>${course.description || '-'}</td>
            <td>${formatCurrency(course.price)}</td>
            <td>${course.users?.full_name || '-'}</td>
            <td>${course.start_date ? formatDate(course.start_date) : '-'}</td>
            <td>${course.end_date ? formatDate(course.end_date) : '-'}</td>
            <td class="action-buttons">
                <button class="action-btn edit-btn" onclick="showEditCourseModal('${course.id}')">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="action-btn delete-btn" onclick="deleteCourse('${course.id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `;
}

async function showAddCourseModal() {
    const modal = document.getElementById('courseModal');
    modal.style.display = 'flex';

    document.getElementById('courseModalTitle').textContent = 'إضافة دورة جديدة';
    document.getElementById('courseForm').reset();
    document.getElementById('courseId').value = '';

    // Populate teachers dropdown
    const teacherSelect = document.getElementById('teacher');
    teacherSelect.innerHTML = '<option value="">اختر معلماً</option>';
    teachers.forEach(teacher => {
        const option = document.createElement('option');
        option.value = teacher.id;
        option.textContent = teacher.full_name;
        teacherSelect.appendChild(option);
    });

    document.getElementById('courseForm').onsubmit = async function(e) {
        e.preventDefault();
        await addCourse();
    };
}

function showEditCourseModal(courseId) {
    const course = courses.find(c => c.id === courseId);
    if (!course) return;

    const modal = document.getElementById('courseModal');
    modal.style.display = 'flex';

    document.getElementById('courseModalTitle').textContent = 'تعديل بيانات الدورة';
    document.getElementById('courseId').value = course.id;
    document.getElementById('courseName').value = course.name;
    document.getElementById('courseDescription').value = course.description || '';
    document.getElementById('coursePrice').value = course.price || '';
    document.getElementById('startDate').value = course.start_date || '';
    document.getElementById('endDate').value = course.end_date || '';

    // Populate teachers dropdown
    const teacherSelect = document.getElementById('teacher');
    teacherSelect.innerHTML = '<option value="">اختر معلماً</option>';
    teachers.forEach(teacher => {
        const option = document.createElement('option');
        option.value = teacher.id;
        option.textContent = teacher.full_name;
        if (teacher.id === course.teacher_id) {
            option.selected = true;
        }
        teacherSelect.appendChild(option);
    });

    document.getElementById('courseForm').onsubmit = async function(e) {
        e.preventDefault();
        await updateCourse(courseId);
    };
}

async function addCourse() {
    try {
        const courseData = getCourseFormData();
        
        const { data, error } = await supabaseClient
            .from('courses')
            .insert([{
                ...courseData,
                created_at: new Date().toISOString()
            }]);

        if (error) throw error;

        showStatus('تم إضافة الدورة بنجاح');
        closeModal('courseModal');
        await loadCourses();
        await loadDashboardData();

    } catch (error) {
        console.error('Error adding course:', error);
        showStatus('خطأ في إضافة الدورة', 'error');
    }
}

async function updateCourse(courseId) {
    try {
        const courseData = getCourseFormData();

        const { data, error } = await supabaseClient
            .from('courses')
            .update(courseData)
            .eq('id', courseId);

        if (error) throw error;

        showStatus('تم تحديث بيانات الدورة بنجاح');
        closeModal('courseModal');
        await loadCourses();

    } catch (error) {
        console.error('Error updating course:', error);
        showStatus('خطأ في تحديث بيانات الدورة', 'error');
    }
}

function getCourseFormData() {
    return {
        name: document.getElementById('courseName').value.trim(),
        description: document.getElementById('courseDescription').value.trim(),
        price: parseFloat(document.getElementById('coursePrice').value) || 0,
        teacher_id: document.getElementById('teacher').value || null,
        start_date: document.getElementById('startDate').value || null,
        end_date: document.getElementById('endDate').value || null
    };
}

async function deleteCourse(courseId) {
    if (!confirm('هل أنت متأكد من حذف هذه الدورة؟ سيتم فحص السجلات المرتبطة أولاً.')) return;

    try {
        // Check dependencies
        const dependencies = await checkCourseDependencies(courseId);
        
        if (dependencies.hasDependencies) {
            const proceed = confirm('يوجد سجلات مرتبطة بهذه الدورة. هل تريد حذف هذه السجلات أولاً ثم حذف الدورة؟');
            if (!proceed) {
                showStatus('تم إلغاء حذف الدورة', 'info');
                return;
            }
            
            await deleteCourseDependencies(courseId);
        }

        const { error } = await supabaseClient.from('courses').delete().eq('id', courseId);
        if (error) throw error;

        showStatus('تم حذف الدورة وكل السجلات المرتبطة');
        await loadCourses();
        await loadDashboardData();

    } catch (error) {
        console.error('Error deleting course:', error);
        showStatus('خطأ في حذف الدورة', 'error');
    }
}

async function checkCourseDependencies(courseId) {
    const [attendances, lessons, subscriptions, payments, modules] = await Promise.all([
        supabaseClient.from('attendances').select('id').eq('course_id', courseId).limit(1),
        supabaseClient.from('lessons').select('id').eq('course_id', courseId).limit(1),
        supabaseClient.from('subscriptions').select('id').eq('course_id', courseId).limit(1),
        supabaseClient.from('payments').select('id').eq('course_id', courseId).limit(1),
        supabaseClient.from('modules').select('id').eq('course_id', courseId).limit(1)
    ]);

    return {
        hasDependencies: !!(attendances.data?.length || lessons.data?.length || 
                          subscriptions.data?.length || payments.data?.length || 
                          modules.data?.length)
    };
}

async function deleteCourseDependencies(courseId) {
    const deleteOperations = [
        supabaseClient.from('attendances').delete().eq('course_id', courseId),
        supabaseClient.from('payments').delete().eq('course_id', courseId),
        supabaseClient.from('subscriptions').delete().eq('course_id', courseId),
        supabaseClient.from('lessons').delete().eq('course_id', courseId),
        supabaseClient.from('modules').delete().eq('course_id', courseId)
    ];

    for (const operation of deleteOperations) {
        const { error } = await operation;
        if (error) throw error;
    }
}

// ===============================================
// SUBSCRIPTIONS MANAGEMENT
// ===============================================
async function loadSubscriptions() {
    try {
        const container = document.getElementById('subscriptionsContainer');
        container.innerHTML = createLoadingHTML('جارٍ تحميل بيانات الاشتراكات...');

        const { data, error } = await supabaseClient
            .from('subscriptions')
            .select('*, students(full_name), courses(name)')
            .order('subscribed_at', { ascending: false });

        if (error) throw error;
        subscriptions = data || [];

        container.innerHTML = createSubscriptionsHTML(data);

    } catch (error) {
        console.error('Error loading subscriptions:', error);
        showErrorInContainer('subscriptionsContainer', 'خطأ في تحميل بيانات الاشتراكات');
    }
}

function createSubscriptionsHTML(subscriptionsData) {
    // Group subscriptions by course
    const subscriptionsByCourse = {};
    subscriptionsData.forEach(subscription => {
        const courseId = subscription.course_id;
        if (!subscriptionsByCourse[courseId]) {
            subscriptionsByCourse[courseId] = {
                courseName: subscription.courses?.name || 'دورة غير معروفة',
                students: []
            };
        }
        subscriptionsByCourse[courseId].students.push(subscription);
    });

    let html = `
        <div class="table-container">
            <button class="btn btn-primary" onclick="showAddSubscriptionModal()" style="margin-bottom: 20px;">
                <i class="fas fa-plus"></i> إضافة اشتراك جديد
            </button>
            <div class="courses-subscriptions-list">
    `;

    Object.values(subscriptionsByCourse).forEach(courseData => {
        html += `
            <div class="course-subscriptions-section">
                <h3>الدورة: ${courseData.courseName}</h3>
                <table>
                    <thead>
                        <tr>
                            <th>الطالب</th>
                            <th>تاريخ الاشتراك</th>
                            <th>الحالة</th>
                            <th>ملاحظات</th>
                            <th>الإجراءات</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        courseData.students.forEach(subscription => {
            html += `
                <tr>
                    <td>${subscription.students?.full_name || '-'}</td>
                    <td>${formatDate(subscription.subscribed_at)}</td>
                    <td><span class="status ${subscription.status}">${subscription.status === 'active' ? 'نشط' : 'غير نشط'}</span></td>
                    <td>${subscription.notes || '-'}</td>
                    <td class="action-buttons">
                        <button class="action-btn edit-btn" onclick="showEditSubscriptionModal('${subscription.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn delete-btn" onclick="deleteSubscription('${subscription.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        });

        html += `
                    </tbody>
                </table>
            </div>
            <hr style="margin: 20px 0;">
        `;
    });

    html += `</div></div>`;
    return html;
}

async function showAddSubscriptionModal() {
    const modal = document.getElementById('subscriptionModal');
    modal.style.display = 'flex';

    document.getElementById('subscriptionModalTitle').textContent = 'إضافة اشتراك جديد';
    document.getElementById('subscriptionForm').reset();
    document.getElementById('subscriptionId').value = '';

    // Set today's date as default
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('subscriptionDate').value = today;

    // Populate dropdowns
    populateStudentsDropdown('student');
    populateCoursesDropdown('course');

    document.getElementById('subscriptionForm').onsubmit = async function(e) {
        e.preventDefault();
        await addSubscription();
    };
}

function showEditSubscriptionModal(subscriptionId) {
    const subscription = subscriptions.find(s => s.id === subscriptionId);
    if (!subscription) return;

    const modal = document.getElementById('subscriptionModal');
    modal.style.display = 'flex';

    document.getElementById('subscriptionModalTitle').textContent = 'تعديل بيانات الاشتراك';
    document.getElementById('subscriptionId').value = subscription.id;
    document.getElementById('subscriptionDate').value = subscription.subscribed_at.split('T')[0];
    document.getElementById('subscriptionStatus').value = subscription.status;
    document.getElementById('subscriptionNotes').value = subscription.notes || '';

    // Populate dropdowns with current selections
    populateStudentsDropdown('student', subscription.student_id);
    populateCoursesDropdown('course', subscription.course_id);

    document.getElementById('subscriptionForm').onsubmit = async function(e) {
        e.preventDefault();
        await updateSubscription(subscriptionId);
    };
}

async function addSubscription() {
    try {
        const subscriptionData = getSubscriptionFormData();

        const { data, error } = await supabaseClient
            .from('subscriptions')
            .insert([subscriptionData]);

        if (error) throw error;

        showStatus('تم إضافة الاشتراك بنجاح');
        closeModal('subscriptionModal');
        await loadSubscriptions();

    } catch (error) {
        console.error('Error adding subscription:', error);
        showStatus('خطأ في إضافة الاشتراك', 'error');
    }
}

async function updateSubscription(subscriptionId) {
    try {
        const subscriptionData = getSubscriptionFormData();

        const { data, error } = await supabaseClient
            .from('subscriptions')
            .update(subscriptionData)
            .eq('id', subscriptionId);

        if (error) throw error;

        showStatus('تم تحديث بيانات الاشتراك بنجاح');
        closeModal('subscriptionModal');
        await loadSubscriptions();

    } catch (error) {
        console.error('Error updating subscription:', error);
        showStatus('خطأ في تحديث بيانات الاشتراك', 'error');
    }
}

function getSubscriptionFormData() {
    return {
        student_id: document.getElementById('student').value,
        course_id: document.getElementById('course').value,
        subscribed_at: document.getElementById('subscriptionDate').value,
        status: document.getElementById('subscriptionStatus').value,
        notes: document.getElementById('subscriptionNotes').value
    };
}

async function deleteSubscription(subscriptionId) {
    if (!confirm('هل أنت متأكد من حذف هذا الاشتراك؟')) return;

    try {
        const { error } = await supabaseClient
            .from('subscriptions')
            .delete()
            .eq('id', subscriptionId);

        if (error) throw error;

        showStatus('تم حذف الاشتراك بنجاح');
        await loadSubscriptions();

    } catch (error) {
        console.error('Error deleting subscription:', error);
        showStatus('خطأ في حذف الاشتراك', 'error');
    }
}

// ===============================================
// PAYMENTS MANAGEMENT
// ===============================================
async function loadPayments() {
    try {
        const container = document.getElementById('paymentsContainer');
        container.innerHTML = createLoadingHTML('جارٍ تحميل بيانات المدفوعات...');

        const { data, error } = await supabaseClient
            .from('payments')
            .select('*, students(full_name), courses(name)')
            .order('paid_at', { ascending: false });

        if (error) throw error;
        payments = data || [];

        container.innerHTML = createPaymentsHTML(data);

    } catch (error) {
        console.error('Error loading payments:', error);
        showErrorInContainer('paymentsContainer', 'خطأ في تحميل بيانات المدفوعات');
    }
}

function createPaymentsHTML(paymentsData) {
    // Group payments by student
    const paymentsByStudent = {};
    paymentsData.forEach(payment => {
        const studentId = payment.student_id;
        if (!paymentsByStudent[studentId]) {
            paymentsByStudent[studentId] = {
                studentName: payment.students?.full_name || 'طالب غير معروف',
                payments: []
            };
        }
        paymentsByStudent[studentId].payments.push(payment);
    });

    let html = `
        <div class="table-container">
            <button class="btn btn-primary" onclick="showAddPaymentModal()" style="margin-bottom: 20px;">
                <i class="fas fa-plus"></i> إضافة دفعة جديدة
            </button>
            <div class="students-payments-list">
    `;

    Object.values(paymentsByStudent).forEach(studentData => {
        html += `
            <div class="student-payments-section">
                <h3>مدفوعات الطالب: ${studentData.studentName}</h3>
                <table>
                    <thead>
                        <tr>
                            <th>الدورة</th>
                            <th>المبلغ المدفوع</th>
                            <th>إجمالي الدورة</th>
                            <th>المتبقي</th>
                            <th>طريقة الدفع</th>
                            <th>التاريخ</th>
                            <th>الحالة</th>
                            <th>الإجراءات</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        studentData.payments.forEach(payment => {
            const remaining = (payment.total_amount || 0) - (payment.amount || 0);
            html += `
                <tr>
                    <td>${payment.courses?.name || '-'}</td>
                    <td>${formatCurrency(payment.amount)}</td>
                    <td>${formatCurrency(payment.total_amount)}</td>
                    <td>${formatCurrency(remaining)}</td>
                    <td><span class="payment-method ${payment.method}">${getPaymentMethodText(payment.method)}</span></td>
                    <td>${formatDate(payment.paid_at)}</td>
                    <td><span class="status ${payment.status}">${getPaymentStatusText(payment.status)}</span></td>
                    <td class="action-buttons">
                        <button class="action-btn edit-btn" onclick="showEditPaymentModal('${payment.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn view-btn" onclick="showPaymentReceipt('${payment.id}')">
                            <i class="fas fa-print"></i>
                        </button>
                        <button class="action-btn delete-btn" onclick="deletePayment('${payment.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        });

        html += `
                    </tbody>
                </table>
            </div>
            <hr style="margin: 20px 0;">
        `;
    });

    html += `</div></div>`;
    return html;
}

function getPaymentMethodText(method) {
    const methods = {
        'cash': 'نقداً',
        'card': 'بطاقة',
        'transfer': 'تحويل'
    };
    return methods[method] || method;
}

function getPaymentStatusText(status) {
    const statuses = {
        'paid': 'مدفوع',
        'pending': 'معلق',
        'cancelled': 'ملغى'
    };
    return statuses[status] || status;
}

async function showAddPaymentModal() {
    const modal = document.getElementById('paymentModal');
    modal.style.display = 'flex';

    document.getElementById('paymentModalTitle').textContent = 'إضافة دفعة جديدة';
    document.getElementById('paymentForm').reset();
    document.getElementById('paymentId').value = '';

    // Set today's date as default
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('paymentDate').value = today;

    // Populate dropdowns
    populateStudentsDropdown('paymentStudent');
    populateCoursesDropdown('paymentCourse');

    // Add event listener for course selection to auto-fill total amount
    const courseSelect = document.getElementById('paymentCourse');
    courseSelect.onchange = updateCourseTotalAmount;

    document.getElementById('paymentForm').onsubmit = async function(e) {
        e.preventDefault();
        await addPayment();
    };
}

function showEditPaymentModal(paymentId) {
    const payment = payments.find(p => p.id === paymentId);
    if (!payment) return;

    const modal = document.getElementById('paymentModal');
    modal.style.display = 'flex';

    document.getElementById('paymentModalTitle').textContent = 'تعديل بيانات الدفعة';
    document.getElementById('paymentId').value = payment.id;
    document.getElementById('amount').value = payment.amount || '';
    document.getElementById('totalAmount').value = payment.total_amount || '';
    document.getElementById('paymentMethod').value = payment.method;
    document.getElementById('paymentDate').value = payment.paid_at.split('T')[0];
    document.getElementById('paymentStatus').value = payment.status;
    document.getElementById('paymentNotes').value = payment.notes || '';

    // Populate dropdowns with current selections
    populateStudentsDropdown('paymentStudent', payment.student_id);
    populateCoursesDropdown('paymentCourse', payment.course_id);

    const courseSelect = document.getElementById('paymentCourse');
    courseSelect.onchange = updateCourseTotalAmount;

    document.getElementById('paymentForm').onsubmit = async function(e) {
        e.preventDefault();
        await updatePayment(paymentId);
    };
}

async function addPayment() {
    try {
        const paymentData = getPaymentFormData();

        const { data, error } = await supabaseClient
            .from('payments')
            .insert([paymentData]);

        if (error) throw error;

        showStatus('تم إضافة الدفعة بنجاح');
        closeModal('paymentModal');
        await loadPayments();

    } catch (error) {
        console.error('Error adding payment:', error);
        showStatus('خطأ في إضافة الدفعة', 'error');
    }
}

async function updatePayment(paymentId) {
    try {
        const paymentData = getPaymentFormData();

        const { data, error } = await supabaseClient
            .from('payments')
            .update(paymentData)
            .eq('id', paymentId);

        if (error) throw error;

        showStatus('تم تحديث بيانات الدفعة بنجاح');
        closeModal('paymentModal');
        await loadPayments();

    } catch (error) {
        console.error('Error updating payment:', error);
        showStatus('خطأ في تحديث بيانات الدفعة', 'error');
    }
}

function getPaymentFormData() {
    return {
        student_id: document.getElementById('paymentStudent').value,
        course_id: document.getElementById('paymentCourse').value,
        amount: parseFloat(document.getElementById('amount').value),
        total_amount: parseFloat(document.getElementById('totalAmount').value),
        method: document.getElementById('paymentMethod').value,
        paid_at: document.getElementById('paymentDate').value,
        status: document.getElementById('paymentStatus').value,
        notes: document.getElementById('paymentNotes').value
    };
}

function updateCourseTotalAmount() {
    const courseSelect = document.getElementById('paymentCourse');
    const selectedOption = courseSelect.options[courseSelect.selectedIndex];
    const totalAmountInput = document.getElementById('totalAmount');

    if (selectedOption && selectedOption.value && totalAmountInput) {
        const course = courses.find(c => c.id === selectedOption.value);
        if (course && course.price) {
            totalAmountInput.value = course.price.toFixed(2);
        }
    }
}

async function deletePayment(paymentId) {
    if (!confirm('هل أنت متأكد من حذف هذه الدفعة؟')) return;

    try {
        const { error } = await supabaseClient
            .from('payments')
            .delete()
            .eq('id', paymentId);

        if (error) throw error;

        showStatus('تم حذف الدفعة بنجاح');
        await loadPayments();

    } catch (error) {
        console.error('Error deleting payment:', error);
        showStatus('خطأ في حذف الدفعة', 'error');
    }
}

// ===============================================
// ATTENDANCES MANAGEMENT
// ===============================================
async function loadAttendances() {
    try {
        const container = document.getElementById('attendancesContainer');
        container.innerHTML = createLoadingHTML('جارٍ تحميل إحصائيات الحضور...');

        const { data, error } = await supabaseClient
            .from('attendances')
            .select('course_id, status, students(full_name), courses(name)');

        if (error) throw error;

        if (!data || data.length === 0) {
            container.innerHTML = '<div class="table-container"><p class="no-data">لا توجد سجلات حضور.</p></div>';
            return;
        }

        container.innerHTML = createAttendanceStatsHTML(data);

    } catch (error) {
        console.error('Error loading attendances:', error);
        showErrorInContainer('attendancesContainer', 'خطأ في تحميل إحصائيات الحضور');
    }
}

function createAttendanceStatsHTML(attendanceData) {
    // Group attendance by course
    const statsByCourse = {};
    attendanceData.forEach(att => {
        const courseId = att.course_id;
        const courseName = att.courses?.name || 'غير معروف';

        if (!statsByCourse[courseId]) {
            statsByCourse[courseId] = {
                courseName,
                total: 0,
                present: 0,
                absent: 0,
                late: 0
            };
        }

        statsByCourse[courseId].total++;
        if (att.status === 'present') statsByCourse[courseId].present++;
        if (att.status === 'absent') statsByCourse[courseId].absent++;
        if (att.status === 'late') statsByCourse[courseId].late++;
    });

    let html = `
        <div class="table-container">
            <h3>📊 إحصائيات الحضور حسب الكورسات</h3>
            <button class="btn btn-primary" onclick="showAddAttendanceModal()" style="margin-bottom: 20px;">
                <i class="fas fa-plus"></i> إضافة حضور جديد
            </button>
            <table>
                <thead>
                    <tr>
                        <th>اسم الدورة</th>
                        <th>إجمالي الجلسات</th>
                        <th>الحضور (حاضر)</th>
                        <th>الغياب (غائب)</th>
                        <th>التأخير</th>
                        <th>نسبة الحضور</th>
                    </tr>
                </thead>
                <tbody>
    `;

    for (const courseId in statsByCourse) {
        const stat = statsByCourse[courseId];
        const attendanceRate = stat.total > 0 ? Math.round((stat.present / stat.total) * 100) : 0;

        html += `
            <tr>
                <td><strong>${stat.courseName}</strong></td>
                <td>${stat.total}</td>
                <td><span class="badge success">${stat.present}</span></td>
                <td><span class="badge error">${stat.absent}</span></td>
                <td><span class="badge warning">${stat.late}</span></td>
                <td><strong>${attendanceRate}%</strong></td>
            </tr>
        `;
    }

    html += '</tbody></table></div>';
    return html;
}

async function showAddAttendanceModal() {
    const modal = document.getElementById('attendanceModal');
    modal.style.display = 'flex';

    document.getElementById('attendanceModalTitle').textContent = 'إضافة حضور جديد';
    document.getElementById('attendanceForm').reset();
    document.getElementById('attendanceId').value = '';

    // Set today's date as default
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('attendanceDate').value = today;

    // Populate dropdowns
    populateStudentsDropdown('attendanceStudent');
    populateCoursesDropdown('attendanceCourse');

    document.getElementById('attendanceForm').onsubmit = async function(e) {
        e.preventDefault();
        await addAttendance();
    };
}

async function addAttendance() {
    try {
        const attendanceData = getAttendanceFormData();

        const { data, error } = await supabaseClient
            .from('attendances')
            .insert([attendanceData]);

        if (error) throw error;

        showStatus('تم إضافة الحضور بنجاح');
        closeModal('attendanceModal');
        await loadAttendances();

    } catch (error) {
        console.error('Error adding attendance:', error);
        showStatus('خطأ في إضافة الحضور', 'error');
    }
}

function getAttendanceFormData() {
    return {
        student_id: document.getElementById('attendanceStudent').value,
        course_id: document.getElementById('attendanceCourse').value,
        date: document.getElementById('attendanceDate').value,
        status: document.getElementById('attendanceStatus').value,
        notes: document.getElementById('attendanceNotes').value
    };
}

// ===============================================
// EXAMS MANAGEMENT
// ===============================================
async function loadTeacherExamsForSecretary() {
    try {
        const container = document.getElementById('teacherExamsContainer');
        container.innerHTML = createLoadingHTML('جارٍ تحميل بيانات الاختبارات...');

        const { data, error } = await supabaseClient
            .from('exams')
            .select('id, title, max_score, date, course_id, module_id')
            .order('date', { ascending: false });

        if (error) throw error;

        if (!data || data.length === 0) {
            container.innerHTML = `
                <div class="table-container">
                    <p>⚠️ لا توجد اختبارات.</p>
                    <button class="btn btn-primary" onclick="showAddExamModal()">
                        <i class="fas fa-plus"></i> إضافة اختبار جديد
                    </button>
                </div>
            `;
            return;
        }

        container.innerHTML = createExamsHTML(data);

    } catch (error) {
        console.error('Error loading exams:', error);
        showErrorInContainer('teacherExamsContainer', 'خطأ في تحميل بيانات الاختبارات');
    }
}

function createExamsHTML(examsData) {
    let html = `
        <div class="table-container">
            <button class="btn btn-primary" onclick="showAddExamModal()" style="margin-bottom: 15px;">
                <i class="fas fa-plus"></i> إضافة اختبار
            </button>
            <table>
                <thead>
                    <tr>
                        <th>العنوان</th>
                        <th>الدورة</th>
                        <th>الوحدة</th>
                        <th>التاريخ</th>
                        <th>الدرجة القصوى</th>
                        <th>الإجراءات</th>
                    </tr>
                </thead>
                <tbody>
    `;

    examsData.forEach(exam => {
        const course = courses.find(c => c.id === exam.course_id);
        const module = modules.find(m => m.id === exam.module_id);

        html += `
            <tr>
                <td>${exam.title}</td>
                <td>${course?.name || '-'}</td>
                <td>${module?.title || '-'}</td>
                <td>${formatDate(exam.date)}</td>
                <td><strong>${exam.max_score}</strong></td>
                <td class="action-buttons">
                    <button class="btn btn-sm btn-warning" onclick="showEditExamModal(${exam.id})">تعديل</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteExam(${exam.id})">حذف</button>
                </td>
            </tr>
        `;
    });

    html += '</tbody></table></div>';
    return html;
}

async function showAddExamModal() {
    const modal = document.getElementById('examModal');
    modal.style.display = 'flex';

    document.getElementById('examModalTitle').textContent = 'إضافة اختبار جديد';
    document.getElementById('examForm').reset();
    document.getElementById('examId').value = '';

    // Populate courses dropdown
    populateCoursesDropdown('examCourse');

    // Setup course change handler to update modules
    const courseSelect = document.getElementById('examCourse');
    courseSelect.onchange = function() {
        updateModuleSelect(this.value);
    };

    document.getElementById('examForm').onsubmit = async function(e) {
        e.preventDefault();
        await saveExam();
    };
}

function updateModuleSelect(courseId) {
    const moduleSelect = document.getElementById('examModule');
    moduleSelect.innerHTML = '<option value="">اختر وحدة</option>';

    const filteredModules = modules.filter(m => m.course_id == courseId);
    filteredModules.forEach(module => {
        const option = document.createElement('option');
        option.value = module.id;
        option.textContent = module.title;
        moduleSelect.appendChild(option);
    });
}

async function saveExam() {
    try {
        const examData = getExamFormData();

        if (!examData.title || !examData.max_score || !examData.course_id || !examData.module_id) {
            showStatus('يرجى ملء جميع الحقول المطلوبة.', 'error');
            return;
        }

        const examId = document.getElementById('examId').value;
        let result;

        if (examId) {
            result = await supabaseClient.from('exams').update(examData).eq('id', examId);
        } else {
            result = await supabaseClient.from('exams').insert([examData]);
        }

        if (result.error) throw result.error;

        showStatus(`تم ${examId ? 'تحديث' : 'إضافة'} الاختبار بنجاح.`);
        closeModal('examModal');
        await loadTeacherExamsForSecretary();

    } catch (error) {
        console.error('Error saving exam:', error);
        showStatus('حدث خطأ أثناء حفظ الاختبار.', 'error');
    }
}

function getExamFormData() {
    return {
        title: document.getElementById('examTitle').value.trim(),
        max_score: parseFloat(document.getElementById('examMaxScore').value),
        course_id: document.getElementById('examCourse').value,
        module_id: document.getElementById('examModule').value,
        date: document.getElementById('examDate').value
    };
}

async function deleteExam(examId) {
    if (!confirm('هل أنت متأكد من حذف هذا الاختبار؟')) return;

    try {
        const { error } = await supabaseClient.from('exams').delete().eq('id', examId);
        if (error) throw error;

        showStatus('تم حذف الاختبار بنجاح');
        await loadTeacherExamsForSecretary();

    } catch (error) {
        console.error('Error deleting exam:', error);
        showStatus('خطأ في الحذف', 'error');
    }
}

// ===============================================
// PARENTS & WHATSAPP REPORTS
// ===============================================
async function loadStudentsForParents() {
    try {
        const container = document.getElementById('parentsStudentsContainer');
        if (!container) {
            console.error("عنصر 'parentsStudentsContainer' غير موجود في DOM.");
            return;
        }

        container.innerHTML = createLoadingHTML('جاري تحميل بيانات الطلاب...');

        const { data, error } = await supabaseClient
            .from('students')
            .select('*')
            .order('full_name', { ascending: true });

        if (error) throw error;

        if (!data || data.length === 0) {
            container.innerHTML = '<p class="no-data">لا يوجد طلاب مسجلين.</p>';
            return;
        }

        container.innerHTML = createParentsStudentsHTML(data);

    } catch (error) {
        console.error('خطأ في تحميل بيانات أولياء الأمور:', error);
        showErrorInContainer('parentsStudentsContainer', 'حدث خطأ أثناء تحميل بيانات الطلاب.');
    }
}

function createParentsStudentsHTML(studentsData) {
    let html = `
        <table>
            <thead>
                <tr>
                    <th>الاسم</th>
                    <th>رقم ولي الأمر</th>
                    <th>إرسال تقرير واتساب</th>
                </tr>
            </thead>
            <tbody>
    `;

    studentsData.forEach(student => {
        html += `
            <tr>
                <td>${escapeHtml(student.full_name || '')}</td>
                <td>${escapeHtml(student.parent_phone || '')}</td>
                <td>
                    <button class="btn btn-primary" onclick="generateAndSendReport('${student.id}')">
                        إرسال التقرير
                    </button>
                </td>
            </tr>
        `;
    });

    html += '</tbody></table>';
    return html;
}

async function generateAndSendReport(studentId) {
    try {
        // Fetch student details
        const { data: student, error: studentError } = await supabaseClient
            .from('students')
            .select('full_name, phone, parent_phone')
            .eq('id', studentId)
            .single();

        if (studentError) throw studentError;

        if (!student) {
            showStatus('لم يتم العثور على بيانات الطالب.', 'error');
            return;
        }

        // Determine phone number to send report to
        let phoneNumber = student.parent_phone || student.phone;
        if (!phoneNumber) {
            showStatus('بيانات الطالب (رقم الهاتف أو رقم ولي الأمر) غير متوفرة لإرسال التقرير.', 'error');
            return;
        }

        // Format phone number to E.164 format
        const formattedPhoneNumber = formatPhoneNumber(phoneNumber);
        if (!formattedPhoneNumber) {
            showStatus(`خطأ: رقم الهاتف "${phoneNumber}" غير صحيح أو بتنسيق غير مدعوم.`, 'error');
            return;
        }

        // Fetch student's data
        const reportData = await fetchStudentReportData(studentId);
        
        // Generate report message
        const message = generateReportMessage(student.full_name, reportData);

        // Open WhatsApp
        const encodedMessage = encodeURIComponent(message);
        const whatsappUrl = `https://wa.me/${formattedPhoneNumber}?text=${encodedMessage}`;
        
        window.open(whatsappUrl, '_blank');
        showStatus(`جارٍ فتح الواتساب لإرسال التقرير إلى ${student.full_name} (${formattedPhoneNumber})...`, 'success');

    } catch (error) {
        console.error('Error generating or sending report:', error);
        showStatus('حدث خطأ أثناء إنشاء أو إرسال التقرير. يرجى المحاولة لاحقًا.', 'error');
    }
}

function formatPhoneNumber(rawPhoneNumber) {
    // Remove spaces and hyphens
    rawPhoneNumber = rawPhoneNumber.replace(/\s+/g, '').replace(/-/g, '');

    if (rawPhoneNumber.startsWith('+20')) {
        return rawPhoneNumber;
    } else if (rawPhoneNumber.startsWith('0')) {
        return '+20' + rawPhoneNumber.substring(1);
    } else if (/^[0-9]{10}$/.test(rawPhoneNumber)) {
        return '+20' + rawPhoneNumber;
    } else if (rawPhoneNumber.startsWith('20') && /^[0-9]{11,12}$/.test(rawPhoneNumber)) {
        return '+' + rawPhoneNumber;
    }

    // Validate E.164 format
    if (!/^\+[0-9]{10,15}$/.test(rawPhoneNumber)) {
        return null;
    }

    return rawPhoneNumber;
}

async function fetchStudentReportData(studentId) {
    const [subscriptions, payments, attendances] = await Promise.all([
        supabaseClient.from('subscriptions')
            .select('subscribed_at, status, notes, course:courses(name)')
            .eq('student_id', studentId),
        supabaseClient.from('payments')
            .select('amount, paid_at, method, status, notes, course:courses(name)')
            .eq('student_id', studentId),
        supabaseClient.from('attendances')
            .select('date, status, notes, course:courses(name)')
            .eq('student_id', studentId)
    ]);

    return {
        subscriptions: subscriptions.data || [],
        payments: payments.data || [],
        attendances: attendances.data || []
    };
}

function generateReportMessage(studentName, reportData) {
    let message = `*تقرير الطالب: ${studentName}*\n\n`;

    // Subscriptions section
    message += "*الاشتراكات:*\n";
    if (reportData.subscriptions && reportData.subscriptions.length > 0) {
        reportData.subscriptions.forEach(sub => {
            const courseName = sub.course?.name || 'غير محدد';
            const statusText = sub.status === 'active' ? 'نشط' : 'غير نشط';
            const dateStr = formatDate(sub.subscribed_at);
            message += ` - دورة: ${courseName}\n تاريخ: ${dateStr}\n حالة: ${statusText}\n`;
            if (sub.notes) message += ` ملاحظات: ${sub.notes}\n`;
            message += "\n";
        });
    } else {
        message += " لا توجد اشتراكات.\n\n";
    }

    // Payments section
    message += "*المدفوعات:*\n";
    if (reportData.payments && reportData.payments.length > 0) {
        reportData.payments.forEach(pay => {
            const courseName = pay.course?.name || 'غير محدد';
            const methodText = getPaymentMethodText(pay.method);
            const statusText = getPaymentStatusText(pay.status);
            const dateStr = formatDate(pay.paid_at);
            message += ` - دورة: ${courseName}\n مبلغ: ${parseFloat(pay.amount || 0).toFixed(2)} ج.م\n تاريخ: ${dateStr}\n طريقة: ${methodText}\n حالة: ${statusText}\n`;
            if (pay.notes) message += ` ملاحظات: ${pay.notes}\n`;
            message += "\n";
        });
    } else {
        message += " لا توجد مدفوعات.\n\n";
    }

    // Attendance section
    message += "*الحضور:*\n";
    if (reportData.attendances && reportData.attendances.length > 0) {
        const presentCount = reportData.attendances.filter(a => a.status === 'present').length;
        const absentCount = reportData.attendances.filter(a => a.status === 'absent').length;
        const lateCount = reportData.attendances.filter(a => a.status === 'late').length;
        message += ` - حاضر: ${presentCount} مرة\n - غائب: ${absentCount} مرة\n - متأخر: ${lateCount} مرة\n\n`;
    } else {
        message += " لا توجد بيانات حضور.\n\n";
    }

    message += "\n*تم إرسال التقرير من أكاديمية أسيوط.*";
    return message;
}

// ===============================================
// UTILITY FUNCTIONS FOR DROPDOWNS
// ===============================================
function populateStudentsDropdown(selectId, selectedValue = null) {
    const select = document.getElementById(selectId);
    if (!select) return;

    select.innerHTML = '<option value="">اختر طالباً</option>';
    students.forEach(student => {
        const option = document.createElement('option');
        option.value = student.id;
        option.textContent = student.full_name;
        if (selectedValue && student.id === selectedValue) {
            option.selected = true;
        }
        select.appendChild(option);
    });
}

function populateCoursesDropdown(selectId, selectedValue = null) {
    const select = document.getElementById(selectId);
    if (!select) return;

    select.innerHTML = '<option value="">اختر كورساً</option>';
    courses.forEach(course => {
        const option = document.createElement('option');
        option.value = course.id;
        option.textContent = course.name;
        if (selectedValue && course.id === selectedValue) {
            option.selected = true;
        }
        select.appendChild(option);
    });
}

// ===============================================
// STUDENT DETAILS MODAL
// ===============================================
async function showStudentFullDetails(studentId) {
    try {
        const modal = document.getElementById('studentDetailModal');
        modal.style.display = 'flex';
        const content = document.getElementById('studentDetailContent');
        content.innerHTML = createLoadingHTML('جارٍ تحميل كل بيانات الطالب...');

        // Fetch all student data
        const studentData = await fetchCompleteStudentData(studentId);
        
        // Display student details
        content.innerHTML = createStudentDetailsHTML(studentData);

    } catch (error) {
        console.error('حدث خطأ أثناء جلب بيانات الطالب:', error);
        const content = document.getElementById('studentDetailContent');
        content.innerHTML = '<div class="error">حدث خطأ أثناء تحميل بيانات الطالب</div>';
    }
}

async function fetchCompleteStudentData(studentId) {
    const [student, subscriptions, payments, attendances, examScores] = await Promise.all([
        supabaseClient.from('students').select('*').eq('id', studentId).single(),
        supabaseClient.from('subscriptions').select('*, courses(name)').eq('student_id', studentId),
        supabaseClient.from('payments').select('*, courses(name)').eq('student_id', studentId),
        supabaseClient.from('attendances').select('*, courses(name), lessons(title)').eq('student_id', studentId),
        supabaseClient.from('exam_scores').select('*, exams(title, max_score, courses(name))').eq('student_id', studentId)
    ]);

    return {
        student: student.data,
        subscriptions: subscriptions.data || [],
        payments: payments.data || [],
        attendances: attendances.data || [],
        examScores: examScores.data || []
    };
}

function createStudentDetailsHTML(data) {
    const student = data.student;
    
    return `
        <div class="student-detail">
            <div class="header-section" style="text-align: center; margin-bottom: 20px;">
                <div class="logo-section" style="margin-bottom: 15px;">
                    <img src="logo.png" alt="شعار المؤسسة" style="max-width: 150px; height: auto;" onerror="this.style.display='none'">
                </div>
                <h3>${student.full_name || '---'}</h3>
            </div>
            
            <div class="detail-section">
                <h4>معلومات أساسية</h4>
                <p><strong>البريد الإلكتروني:</strong> ${student.email || '-'}</p>
                <p><strong>رقم الهاتف:</strong> ${student.phone || '-'}</p>
                <p><strong>رقم ولي الأمر:</strong> ${student.parent_phone || '-'}</p>
                <p><strong>تاريخ التسجيل:</strong> ${student.created_at ? formatDate(student.created_at) : '-'}</p>
            </div>
            
            ${generateSection('سجل الحضور', data.attendances, generateAttendanceTable)}
            ${generateSection('الاشتراكات', data.subscriptions, generateSubscriptionsList)}
            ${generateSection('المدفوعات', data.payments, generatePaymentsList)}
            ${generateSection('الاختبارات', data.examScores, generateExamsTable)}

            <div style="text-align:center; margin-top:20px;">
                <button class="btn btn-primary" onclick="printStudentDetails('${(student.full_name || '').replace(/'/g, "\\'")}')">طباعة جميع البيانات</button>
            </div>
        </div>
    `;
}

function generateSection(title, data, renderer) {
    if (!data || !data.length) return '';
    return `
        <div class="detail-section">
            <h4>${title} (${data.length})</h4>
            ${renderer(data)}
        </div>
    `;
}

function generateAttendanceTable(data) {
    return `
        <table border="1" style="width:100%; border-collapse:collapse;">
            <thead>
                <tr>
                    <th>الدورة/الدرس</th>
                    <th>التاريخ</th>
                    <th>الحالة</th>
                    <th>ملاحظات</th>
                </tr>
            </thead>
            <tbody>
                ${data.map(att => `
                    <tr>
                        <td>${att.lesson_id && att.lessons?.title ? att.lessons.title : att.courses?.name || '---'}</td>
                        <td>${formatDate(att.date)}</td>
                        <td>${att.status}</td>
                        <td>${att.notes || '-'}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function generateSubscriptionsList(data) {
    return `
        <ul>
            ${data.map(sub => `
                <li>${sub.courses?.name || '---'} - ${formatDate(sub.subscribed_at)} - (${sub.status})</li>
            `).join('')}
        </ul>
    `;
}

function generatePaymentsList(data) {
    if (!data || data.length === 0) return '<p>لا توجد مدفوعات.</p>';
    
    return `
        <table style="width:100%; border-collapse:collapse;">
            <thead>
                <tr>
                    <th>الدورة</th>
                    <th>المبلغ المدفوع</th>
                    <th>إجمالي الدورة</th>
                    <th>المتبقي</th>
                    <th>طريقة الدفع</th>
                    <th>التاريخ</th>
                </tr>
            </thead>
            <tbody>
                ${data.map(pay => {
                    const remaining = (pay.total_amount || 0) - (pay.amount || 0);
                    return `
                        <tr>
                            <td>${pay.courses?.name || '-'}</td>
                            <td>${formatCurrency(pay.amount)}</td>
                            <td>${formatCurrency(pay.total_amount)}</td>
                            <td>${formatCurrency(remaining)}</td>
                            <td>${getPaymentMethodText(pay.method)}</td>
                            <td>${formatDate(pay.paid_at)}</td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
    `;
}

function generateExamsTable(data) {
    if (!data || data.length === 0) return '<p>لا توجد اختبارات.</p>';
    
    return `
        <table style="width:100%; border-collapse:collapse;">
            <thead>
                <tr>
                    <th>عنوان الاختبار</th>
                    <th>الدورة</th>
                    <th>الدرجة</th>
                    <th>الدرجة الكاملة</th>
                </tr>
            </thead>
            <tbody>
                ${data.map(exam => `
                    <tr>
                        <td>${exam.exams?.title || '-'}</td>
                        <td>${exam.exams?.courses?.name || '-'}</td>
                        <td>${exam.score ?? '-'}</td>
                        <td>${exam.exams?.max_score ?? '-'}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function printStudentDetails(studentName) {
    const printWindow = window.open('', '_blank');
    const content = document.getElementById('studentDetailContent').innerHTML;
    
    printWindow.document.write(`
        <!DOCTYPE html>
        <html lang="ar" dir="rtl">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>تقرير الطالب - ${studentName}</title>
            <style>
                body { 
                    font-family: 'Tajawal', 'Arial', sans-serif; 
                    margin: 20px;
                    background: #fff;
                    color: #333;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin: 15px 0;
                    font-size: 0.9rem;
                }
                th, td {
                    border: 1px solid #d1d5db;
                    padding: 8px;
                    text-align: center;
                }
                th {
                    background-color: #f9fafb;
                    font-weight: 600;
                }
                .detail-section {
                    margin: 25px 0;
                    page-break-inside: avoid;
                }
                .detail-section h4 {
                    color: #f97316;
                    border-bottom: 1px solid #e5e7eb;
                    padding-bottom: 8px;
                    margin-bottom: 15px;
                }
                @media print {
                    body { padding: 10px; font-size: 12px; }
                    table { font-size: 11px; }
                    th, td { padding: 6px 4px; }
                }
            </style>
        </head>
        <body>
            ${content}
        </body>
        </html>
    `);
    
    printWindow.document.close();
    setTimeout(() => {
        printWindow.focus();
        printWindow.print();
    }, 500);
}

console.log('Additional modules loaded successfully');