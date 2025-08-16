// ===============================================
// SECRETARY DASHBOARD - MAIN JAVASCRIPT FILE
// ===============================================

// Supabase Configuration
const supabaseUrl = "https://zefsmckaihzfiqqbdake.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InplZnNtY2thaWh6ZmlxcWJkYWtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQyMzUzNTgsImV4cCI6MjA2OTgxMTM1OH0.vktk2VkEPtMclb6jb_pFa1DbrqWX9SOZRsBR577o5mc";
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

// ===============================================
// GLOBAL VARIABLES
// ===============================================
let students = [];
let courses = [];
let subscriptions = [];
let payments = [];
let attendances = [];
let teachers = [];
let modules = [];
let currentCourseModules = [];
let currentCourseLessons = [];
let currentCourseId = null;
let lastAttendanceUpdate = null;
let attendanceRefreshInterval = null;

// ===============================================
// INITIALIZATION
// ===============================================
document.addEventListener('DOMContentLoaded', async function() {
    try {
        // Check authentication
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (!session) {
            window.location.href = 'index.html';
            return;
        }

        // Load user data
        await loadUserData(session.user.id);
        
        // Load initial data
        await loadInitialData();
        
        // Setup realtime subscriptions
        initRealtimeSubscriptions();
        
        // Load current user for secretary attendance
        await loadCurrentUser();
        
        // Load dashboard and show default tab
        await loadDashboardData();
        await loadRecentActivity();
        switchTab('dashboard');

    } catch (error) {
        console.error('Initialization error:', error);
        showStatus('خطأ في تحميل النظام', 'error');
        window.location.href = 'index.html';
    }
});

// ===============================================
// USER AUTHENTICATION & DATA
// ===============================================
async function loadUserData(userId) {
    const { data: userData, error: userError } = await supabaseClient
        .from('users')
        .select('full_name, role')
        .eq('id', userId)
        .single();

    if (userError && userError.code !== 'PGRST116') {
        throw userError;
    }

    if (userData) {
        document.getElementById('userName').textContent = userData.full_name || 'المسؤول';
        window.userRole = userData.role;
    }
}

async function loadCurrentUser() {
    const { data, error } = await supabaseClient.auth.getUser();
    if (error) {
        console.error("خطأ في جلب بيانات المستخدم:", error);
        return;
    }
    if (data?.user) {
        window.userId = data.user.id;
        loadSecretaryStatus();
    }
}

// ===============================================
// INITIAL DATA LOADING
// ===============================================
async function loadInitialData() {
    try {
        // Load courses
        const { data: coursesData, error: coursesError } = await supabaseClient
            .from('courses')
            .select('*')
            .order('created_at', { ascending: false });
        if (coursesError) throw coursesError;
        courses = coursesData || [];

        // Load modules
        const { data: modulesData, error: modulesError } = await supabaseClient
            .from('modules')
            .select('*')
            .order('course_id')
            .order('order');
        if (modulesError) throw modulesError;
        modules = modulesData || [];

        // Load students
        const { data: studentsData, error: studentsError } = await supabaseClient
            .from('students')
            .select('*')
            .order('created_at', { ascending: false });
        if (studentsError) throw studentsError;
        students = studentsData || [];

        // Load teachers
        const { data: teachersData, error: teachersError } = await supabaseClient
            .from('users')
            .select('id, full_name')
            .eq('role', 'teacher');
        if (teachersError) throw teachersError;
        teachers = teachersData || [];

    } catch (error) {
        console.error('Error loading initial data:', error);
        throw error;
    }
}

// ===============================================
// REALTIME SUBSCRIPTIONS
// ===============================================
function initRealtimeSubscriptions() {
    if (typeof supabaseClient === 'undefined') return;

    const tables = ["students", "courses", "subscriptions", "payments", "attendances", "exams"];
    tables.forEach((table) => {
        try {
            supabaseClient
                .channel(table + "_changes")
                .on('postgres_changes', { event: '*', schema: 'public', table }, async () => {
                    await updateCurrentTab();
                })
                .subscribe();
        } catch (error) {
            console.warn(`Failed to subscribe to ${table} changes:`, error);
        }
    });
}

// ===============================================
// TAB MANAGEMENT
// ===============================================
function switchTab(tabName) {
    // Hide all tab contents
    document.querySelectorAll('.tab-content').forEach(content => {
        content.style.display = 'none';
    });

    // Remove active class from all nav links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });

    // Show selected tab
    const activeTab = document.getElementById(`${tabName}Content`);
    if (activeTab) {
        activeTab.style.display = 'block';
    }

    // Load data based on tab
    loadTabData(tabName);

    // Hide sidebar on mobile after tab selection
    if (window.innerWidth <= 768) {
        const sidebar = document.querySelector('.sidebar');
        if (sidebar) sidebar.classList.remove('active');
    }
}

async function loadTabData(tabName) {
    try {
        switch (tabName) {
            case 'dashboard':
                await Promise.all([loadDashboardData(), loadRecentActivity()]);
                break;
            case 'students':
                await loadStudents();
                break;
            case 'courses':
                await loadCourses();
                break;
            case 'subscriptions':
                await loadSubscriptions();
                break;
            case 'payments':
                await loadPayments();
                break;
            case 'attendances':
                await loadAttendances();
                startAttendanceAutoRefresh();
                break;
            case 'teacherExams':
                await loadTeacherExamsForSecretary();
                break;
            case 'parents':
                await loadStudentsForParents();
                break;
            default:
                console.warn('Unknown tab:', tabName);
        }
    } catch (error) {
        console.error(`Error loading ${tabName} data:`, error);
        showStatus(`خطأ في تحميل بيانات ${tabName}`, 'error');
    }
}

async function updateCurrentTab() {
    const visibleTab = document.querySelector('.tab-content[style*="display: block"]');
    if (!visibleTab) return;

    const currentTabId = visibleTab.id;
    const tabName = currentTabId.replace('Content', '');
    
    await loadTabData(tabName);
}

// ===============================================
// DASHBOARD
// ===============================================
async function loadDashboardData() {
    try {
        // Load counts
        const [studentsCount, coursesCount, subscriptionsCount] = await Promise.all([
            supabaseClient.from('students').select('id', { count: 'exact' }),
            supabaseClient.from('courses').select('id', { count: 'exact' }),
            supabaseClient.from('subscriptions').select('id', { count: 'exact' })
        ]);

        // Update UI
        updateElement('totalStudents', studentsCount.count || 0);
        updateElement('totalCourses', coursesCount.count || 0);
        updateElement('totalSubscriptions', subscriptionsCount.count || 0);

        // Load today's attendance count
        await loadTodayAttendance();

        // Initialize charts
        await initCharts();

    } catch (error) {
        console.error('Error loading dashboard data:', error);
        showStatus('خطأ في تحميل بيانات لوحة التحكم', 'error');
    }
}

async function loadTodayAttendance() {
    try {
        const today = new Date().toISOString().split('T')[0];
        const { data: todayAttendances, error } = await supabaseClient
            .from('attendances')
            .select('date')
            .eq('date', today);

        if (error) throw error;

        updateElement('totalRevenue', todayAttendances?.length || 0);
    } catch (error) {
        console.error("Error loading today's attendance:", error);
        updateElement('totalRevenue', 0);
    }
}

async function initCharts() {
    if (window.initChartsRunning) return;
    window.initChartsRunning = true;

    try {
        // Destroy existing charts
        destroyExistingCharts();

        // Get canvas elements
        const studentsCtx = getCanvasContext('studentsChart');
        const revenueCtx = getCanvasContext('revenueChart');
        
        if (!studentsCtx || !revenueCtx) {
            console.warn("Canvas elements not found");
            return;
        }

        // Students distribution chart
        await createStudentsChart(studentsCtx);
        
        // Revenue chart
        await createRevenueChart(revenueCtx);

    } catch (error) {
        console.error('Error initializing charts:', error);
    } finally {
        window.initChartsRunning = false;
    }
}

function destroyExistingCharts() {
    ['revenueChartInstance', 'studentsChartInstance'].forEach(chartName => {
        if (window[chartName]) {
            try {
                window[chartName].destroy();
            } catch (e) {
                console.warn(`Error destroying ${chartName}:`, e);
            }
            window[chartName] = null;
        }
    });
}

function getCanvasContext(canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return null;
    
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    return ctx;
}

async function createStudentsChart(ctx) {
    try {
        const { data: courseDistribution, error } = await supabaseClient
            .rpc('get_student_course_distribution');

        if (error) throw error;

        const labels = courseDistribution?.map(item => item.course_name) || [];
        const data = courseDistribution?.map(item => item.student_count) || [];
        const backgroundColors = ['#f97316', '#059669', '#f59e0b', '#3b82f6', '#8b5cf6'];

        window.studentsChartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: backgroundColors.slice(0, data.length)
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { position: 'bottom' }
                }
            }
        });
    } catch (error) {
        console.error('Error creating students chart:', error);
    }
}

async function createRevenueChart(ctx) {
    try {
        const { data: paymentsData, error } = await supabaseClient
            .from('payments')
            .select('amount, paid_at, total_amount');

        if (error) throw error;

        const { monthlyPaid, monthlyRemaining, months } = processPaymentsData(paymentsData || []);
        
        const monthLabels = months.map(m => {
            const [year, month] = m.split('-');
            return `${new Date(year, month - 1).toLocaleString('ar-EG', { month: 'long' })} ${year}`;
        });

        const paidData = months.map(m => monthlyPaid[m] || 0);
        const remainingData = months.map(m => monthlyRemaining[m] || 0);

        window.revenueChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: monthLabels,
                datasets: [
                    { label: 'مدفوع', data: paidData, backgroundColor: '#3b82f6' },
                    { label: 'متبقي', data: remainingData, backgroundColor: '#f97316' }
                ]
            },
            options: {
                responsive: true,
                plugins: { legend: { position: 'bottom' } },
                scales: { y: { beginAtZero: true } }
            }
        });

        // Update revenue log
        updateRevenueLog(monthLabels, paidData, remainingData);

    } catch (error) {
        console.error('Error creating revenue chart:', error);
    }
}

function processPaymentsData(paymentsData) {
    const monthlyPaid = {};
    const monthlyRemaining = {};

    paymentsData.forEach(payment => {
        const date = new Date(payment.paid_at);
        if (isNaN(date)) return;
        
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        monthlyPaid[monthKey] = (monthlyPaid[monthKey] || 0) + parseFloat(payment.amount || 0);
        monthlyRemaining[monthKey] = (monthlyRemaining[monthKey] || 0) + 
            Math.max(0, parseFloat(payment.total_amount || 0) - parseFloat(payment.amount || 0));
    });

    const months = Array.from(new Set([
        ...Object.keys(monthlyPaid), 
        ...Object.keys(monthlyRemaining)
    ])).sort();

    return { monthlyPaid, monthlyRemaining, months };
}

function updateRevenueLog(monthLabels, paidData, remainingData) {
    const logContainer = document.getElementById('revenueLog');
    if (!logContainer) return;

    let html = '<table><thead><tr><th>الشهر</th><th>مدفوع</th><th>متبقي</th><th>الإجمالي</th></tr></thead><tbody>';
    
    monthLabels.forEach((label, i) => {
        const total = paidData[i] + remainingData[i];
        html += `<tr>
            <td>${label}</td>
            <td>${paidData[i].toFixed(2)}</td>
            <td>${remainingData[i].toFixed(2)}</td>
            <td>${total.toFixed(2)}</td>
        </tr>`;
    });
    
    html += '</tbody></table>';
    logContainer.innerHTML = html;
}

// ===============================================
// RECENT ACTIVITY
// ===============================================
async function loadRecentActivity() {
    try {
        const activityList = document.getElementById('activityList');
        activityList.innerHTML = createLoadingHTML('جارٍ تحميل آخر الأنشطة...');

        // Fetch recent activities
        const [subscriptionsData, paymentsData, attendancesData] = await Promise.all([
            supabaseClient.from('subscriptions')
                .select('id, subscribed_at, students(full_name), courses(name)')
                .order('subscribed_at', { ascending: false })
                .limit(3),
            supabaseClient.from('payments')
                .select('id, paid_at, students(full_name), courses(name)')
                .order('paid_at', { ascending: false })
                .limit(3),
            supabaseClient.from('attendances')
                .select('id, date, students(full_name), courses(name)')
                .order('date', { ascending: false })
                .limit(3)
        ]);

        // Process and combine activities
        const allActivities = combineActivities([
            ...subscriptionsData.data?.map(item => ({ type: 'subscription', ...item })) || [],
            ...paymentsData.data?.map(item => ({ type: 'payment', ...item })) || [],
            ...attendancesData.data?.map(item => ({ type: 'attendance', ...item })) || []
        ]);

        // Display activities
        activityList.innerHTML = allActivities.length === 0 
            ? '<p class="no-activity">لا توجد أنشطة حديثة</p>'
            : allActivities.map(createActivityHTML).join('');

    } catch (error) {
        console.error('Error loading recent activity:', error);
        document.getElementById('activityList').innerHTML = '<p class="error">خطأ في تحميل آخر الأنشطة</p>';
        showStatus('خطأ في تحميل آخر الأنشطة', 'error');
    }
}

function combineActivities(activities) {
    return activities
        .sort((a, b) => {
            const dateA = a.subscribed_at || a.paid_at || a.date;
            const dateB = b.subscribed_at || b.paid_at || b.date;
            return new Date(dateB) - new Date(dateA);
        })
        .slice(0, 5);
}

function createActivityHTML(activity) {
    const { icon, title, description, date } = getActivityDetails(activity);
    
    return `
        <li class="activity-item">
            <div class="activity-icon ${activity.type}">
                <i class="fas ${icon}"></i>
            </div>
            <div class="activity-content">
                <h4>${title}</h4>
                <p>${description}</p>
                <small>${date}</small>
            </div>
        </li>
    `;
}

function getActivityDetails(activity) {
    const studentName = activity.students?.full_name || 'طالب';
    const courseName = activity.courses?.name || 'دورة';

    switch(activity.type) {
        case 'subscription':
            return {
                icon: 'fa-file-contract',
                title: 'اشتراك جديد',
                description: `${studentName} اشترك في ${courseName}`,
                date: formatDate(activity.subscribed_at)
            };
        case 'payment':
            return {
                icon: 'fa-money-bill-wave',
                title: 'دفعة جديدة',
                description: `${studentName} دفع لـ ${courseName}`,
                date: formatDate(activity.paid_at)
            };
        case 'attendance':
            return {
                icon: 'fa-calendar-check',
                title: 'تسجيل حضور',
                description: `${studentName} حضر ${courseName}`,
                date: formatDate(activity.date)
            };
        default:
            return {
                icon: 'fa-info-circle',
                title: 'نشاط',
                description: 'نشاط جديد',
                date: ''
            };
    }
}

// ===============================================
// STUDENTS MANAGEMENT
// ===============================================
async function loadStudents() {
    try {
        const container = document.getElementById('studentsContainer');
        container.innerHTML = createLoadingHTML('جارٍ تحميل بيانات الطلبة...');

        const { data, error } = await supabaseClient
            .from('students')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        students = data || [];

        container.innerHTML = createStudentsTableHTML(data);

    } catch (error) {
        console.error('Error loading students:', error);
        showErrorInContainer('studentsContainer', 'خطأ في تحميل بيانات الطلبة');
    }
}

function createStudentsTableHTML(studentsData) {
    return `
        <div class="table-container">
            <button class="btn btn-primary" onclick="showAddStudentModal()" style="margin-bottom: 20px;">
                <i class="fas fa-plus"></i> إضافة طالب جديد
            </button>
            <table>
                <thead>
                    <tr>
                        <th>الاسم</th>
                        <th>البريد الإلكتروني</th>
                        <th>رقم هاتف الطالب</th>
                        <th>رقم ولي الأمر</th>
                        <th>تاريخ التسجيل</th>
                        <th>الإجراءات</th>
                    </tr>
                </thead>
                <tbody>
                    ${studentsData.map(createStudentRowHTML).join('')}
                </tbody>
            </table>
        </div>
    `;
}

function createStudentRowHTML(student) {
    return `
        <tr>
            <td>${student.full_name}</td>
            <td>${student.email || '-'}</td>
            <td>${student.phone || '-'}</td>
            <td>${student.parent_phone || '-'}</td>
            <td>${formatDate(student.created_at)}</td>
            <td class="action-buttons">
                <button class="action-btn view-btn" onclick="showStudentFullDetails('${student.id}')">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="action-btn edit-btn" onclick="showEditStudentModal('${student.id}')">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="action-btn delete-btn" onclick="deleteStudent('${student.id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `;
}

function filterStudents() {
    const searchTerm = document.getElementById('studentSearch').value.toLowerCase();
    const filteredStudents = students.filter(student =>
        student.full_name.toLowerCase().includes(searchTerm) ||
        (student.email && student.email.toLowerCase().includes(searchTerm)) ||
        (student.phone && student.phone.includes(searchTerm)) ||
        (student.parent_phone && student.parent_phone.includes(searchTerm))
    );

    const container = document.getElementById('studentsContainer');
    container.innerHTML = createStudentsTableHTML(filteredStudents);
}

async function showAddStudentModal() {
    const modal = document.getElementById('studentModal');
    modal.style.display = 'flex';

    document.getElementById('studentModalTitle').textContent = 'إضافة طالب جديد';
    document.getElementById('studentForm').reset();
    document.getElementById('studentId').value = '';

    document.getElementById('studentForm').onsubmit = async function(e) {
        e.preventDefault();
        await addStudent();
    };
}

function showEditStudentModal(studentId) {
    const student = students.find(s => s.id === studentId);
    if (!student) return;

    const modal = document.getElementById('studentModal');
    modal.style.display = 'flex';

    document.getElementById('studentModalTitle').textContent = 'تعديل بيانات الطالب';
    document.getElementById('studentId').value = student.id;
    document.getElementById('fullName').value = student.full_name;
    document.getElementById('email').value = student.email || '';
    document.getElementById('phone').value = student.phone || '';
    document.getElementById('parentPhone').value = student.parent_phone || '';

    document.getElementById('studentForm').onsubmit = async function(e) {
        e.preventDefault();
        await updateStudent(studentId);
    };
}

async function addStudent() {
    try {
        const studentData = getStudentFormData();
        
        const { data, error } = await supabaseClient
            .from('students')
            .insert([{
                ...studentData,
                created_at: new Date().toISOString()
            }]);

        if (error) throw error;

        showStatus('تم إضافة الطالب بنجاح');
        closeModal('studentModal');
        await loadStudents();
        await loadDashboardData();

    } catch (error) {
        console.error('Error adding student:', error);
        showStatus('خطأ في إضافة الطالب', 'error');
    }
}

async function updateStudent(studentId) {
    try {
        const studentData = getStudentFormData();

        const { data, error } = await supabaseClient
            .from('students')
            .update(studentData)
            .eq('id', studentId);

        if (error) throw error;

        showStatus('تم تحديث بيانات الطالب بنجاح');
        closeModal('studentModal');
        await loadStudents();

    } catch (error) {
        console.error('Error updating student:', error);
        showStatus('خطأ في تحديث بيانات الطالب', 'error');
    }
}

function getStudentFormData() {
    return {
        full_name: document.getElementById('fullName').value,
        email: document.getElementById('email').value,
        phone: document.getElementById('phone').value,
        parent_phone: document.getElementById('parentPhone').value
    };
}

async function deleteStudent(studentId) {
    if (!confirm('هل أنت متأكد من حذف هذا الطالب؟ سيتم أيضاً حذف السجلات المرتبطة.')) return;

    try {
        // Check for dependencies
        const dependencies = await checkStudentDependencies(studentId);
        
        if (dependencies.hasDependencies) {
            const proceed = confirm('يوجد سجلات مرتبطة بهذا الطالب. هل تريد حذف هذه السجلات أولاً ثم حذف الطالب؟');
            if (!proceed) {
                showStatus('تم إلغاء حذف الطالب', 'info');
                return;
            }
            
            await deleteDependencies(studentId);
        }

        // Delete student
        const { error } = await supabaseClient.from('students').delete().eq('id', studentId);
        if (error) throw error;

        showStatus('تم حذف الطالب وجميع السجلات المرتبطة');
        await loadStudents();
        await loadDashboardData();

    } catch (error) {
        console.error('Error deleting student:', error);
        showStatus('خطأ في حذف الطالب', 'error');
    }
}

async function checkStudentDependencies(studentId) {
    const [attendances, payments, subscriptions] = await Promise.all([
        supabaseClient.from('attendances').select('id').eq('student_id', studentId).limit(1),
        supabaseClient.from('payments').select('id').eq('student_id', studentId).limit(1),
        supabaseClient.from('subscriptions').select('id').eq('student_id', studentId).limit(1)
    ]);

    return {
        hasDependencies: !!(attendances.data?.length || payments.data?.length || subscriptions.data?.length)
    };
}

async function deleteDependencies(studentId) {
    const deleteOperations = [
        supabaseClient.from('attendances').delete().eq('student_id', studentId),
        supabaseClient.from('payments').delete().eq('student_id', studentId),
        supabaseClient.from('subscriptions').delete().eq('student_id', studentId)
    ];

    for (const operation of deleteOperations) {
        const { error } = await operation;
        if (error) throw error;
    }
}

// ===============================================
// SECRETARY ATTENDANCE
// ===============================================
async function loadSecretaryStatus() {
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabaseClient
        .from('secretary_attendance')
        .select('*')
        .eq('date', today)
        .eq('secretary_id', window.userId)
        .maybeSingle();

    if (error) {
        console.error("خطأ في تحميل حالة السكرتير:", error);
        return;
    }

    updateSecretaryUI(data);
}

function updateSecretaryUI(data) {
    const statusEl = document.getElementById('secretaryStatus');
    const checkInBtn = document.getElementById('checkInBtn');
    const checkOutBtn = document.getElementById('checkOutBtn');

    if (!data) {
        statusEl.textContent = "⏳ لم يتم تسجيل الحضور بعد";
        checkInBtn.disabled = false;
        checkOutBtn.disabled = true;
    } else if (data && !data.check_out) {
        statusEl.textContent = "✅ تم تسجيل الحضور (في انتظار الانصراف)";
        checkInBtn.disabled = true;
        checkOutBtn.disabled = false;
    } else {
        statusEl.textContent = "👋 تم تسجيل الحضور والانصراف";
        checkInBtn.disabled = true;
        checkOutBtn.disabled = true;
    }
}

async function checkInSecretary() {
    const today = new Date().toISOString().split('T')[0];

    const { error } = await supabaseClient
        .from('secretary_attendance')
        .insert([{
            date: today,
            check_in: new Date().toISOString(),
            secretary_id: window.userId
        }]);

    if (error) {
        console.error("❌ خطأ في تسجيل الحضور:", error);
        showStatus('خطأ في تسجيل الحضور', 'error');
    } else {
        showStatus('✅ تم تسجيل الحضور', 'success');
        loadSecretaryStatus();
    }
}

async function checkOutSecretary() {
    const today = new Date().toISOString().split('T')[0];

    const { error } = await supabaseClient
        .from('secretary_attendance')
        .update({ check_out: new Date().toISOString() })
        .eq('date', today)
        .eq('secretary_id', window.userId);

    if (error) {
        console.error("❌ خطأ في تسجيل الانصراف:", error);
        showStatus('خطأ في تسجيل الانصراف', 'error');
    } else {
        showStatus('👋 تم تسجيل الانصراف', 'success');
        loadSecretaryStatus();
    }
}

// ===============================================
// ATTENDANCE AUTO REFRESH
// ===============================================
function startAttendanceAutoRefresh() {
    stopAttendanceAutoRefresh();

    attendanceRefreshInterval = setInterval(() => {
        const attendancesTab = document.getElementById('attendancesContent');
        if (attendancesTab && attendancesTab.style.display !== 'none') {
            loadAttendances();
        } else {
            stopAttendanceAutoRefresh();
        }
    }, 10000);
}

function stopAttendanceAutoRefresh() {
    if (attendanceRefreshInterval) {
        clearInterval(attendanceRefreshInterval);
        attendanceRefreshInterval = null;
    }
}

// Stop refresh when page becomes hidden
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        stopAttendanceAutoRefresh();
    } else {
        const activeTab = document.querySelector('.tab-content[style*="block"]');
        if (activeTab && activeTab.id === 'attendancesContent') {
            startAttendanceAutoRefresh();
        }
    }
});

// ===============================================
// UTILITY FUNCTIONS
// ===============================================
function updateElement(elementId, value) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = value;
    }
}

function createLoadingHTML(message) {
    return `<div class="loading"><div class="loading-spinner"></div><p>${message}</p></div>`;
}

function showErrorInContainer(containerId, message) {
    const container = document.getElementById(containerId);
    if (container) {
        container.innerHTML = `<div class="loading"><p>${message}</p></div>`;
    }
    showStatus(message, 'error');
}

function setActiveLink(element) {
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    element.classList.add('active');
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}

function showStatus(message, type = 'success') {
    const statusEl = document.getElementById('status');
    if (!statusEl) return;

    statusEl.textContent = message;
    statusEl.className = '';
    statusEl.classList.add('show', type);
    
    setTimeout(() => {
        statusEl.classList.remove('show');
    }, 3000);
}

function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-SA', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
}

function formatCurrency(amount) {
    if (!amount) return '0 ج.م';
    return new Intl.NumberFormat('ar-EG', {
        style: 'currency',
        currency: 'EGP'
    }).format(amount);
}

function escapeHtml(text) {
    if (!text) return '';
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// ===============================================
// EVENT LISTENERS
// ===============================================

// Mobile menu toggle
document.getElementById('menuToggle')?.addEventListener('click', function() {
    const sidebar = document.querySelector('.sidebar');
    sidebar?.classList.toggle('active');
});

// Hide sidebar on mobile when clicking a tab
document.querySelectorAll('.tab-link').forEach(link => {
    link.addEventListener('click', () => {
        if (window.innerWidth <= 768) {
            document.getElementById('sidebar')?.classList.remove('active');
        }
    });
});

// Close modals when clicking outside
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
};

// ===============================================
// PLACEHOLDER FUNCTIONS (TO BE IMPLEMENTED)
// ===============================================

// Note: The following functions need to be implemented based on your requirements:
// - loadCourses()
// - loadSubscriptions()
// - loadPayments()
// - loadAttendances()
// - loadTeacherExamsForSecretary()
// - loadStudentsForParents()
// - showStudentFullDetails()
// - generateAndSendReport()

// These would follow similar patterns to the student management functions above.

console.log('Secretary Dashboard initialized');