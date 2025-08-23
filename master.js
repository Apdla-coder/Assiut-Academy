 // Supabase Configuration
 const supabaseUrl = "https://zefsmckaihzfiqqbdake.supabase.co"
 const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InplZnNtY2thaWh6ZmlxcWJkYWtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQyMzUzNTgsImV4cCI6MjA2OTgxMTM1OH0.vktk2VkEPtMclb6jb_pFa1DbrqWX9SOZRsBR577o5mc"
 const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey)

 

// === Unified Live Update & Realtime Subscriptions (cleaned) ===

function initRealtimeSubscriptions() {
  if (typeof supabase === 'undefined' && typeof supabaseClient === 'undefined') return;
  const client = typeof supabaseClient !== 'undefined' ? supabaseClient : (typeof supabase !== 'undefined' ? supabase : null);
  if (!client) return;

  const tables = ["students", "courses", "subscriptions", "payments", "attendances", "exams"];
  tables.forEach((table) => {
    try {
      client
        .channel(table + "_changes")
        .on('postgres_changes', { event: '*', schema: 'public', table }, async () => {
          await updateCurrentTab();
        })
        .subscribe();
    } catch (_) {}
  });
}

// Ensure switchTab uses the unified updater
if (typeof switchTab === 'function') {
  // Wrap original if needed (skip if already wrapped)
} else {
  window.switchTab = function(tabName) {
    document.querySelectorAll('.tab-content').forEach((c) => (c.style.display = 'none'));
    document.querySelectorAll('.nav-link').forEach((l) => l.classList.remove('active'));
    const activeTab = document.getElementById(`${tabName}Content`);
    if (activeTab) activeTab.style.display = 'block';
    updateCurrentTab();
  };
}

// Hook on DOMContentLoaded to init realtime once
document.addEventListener('DOMContentLoaded', function() {
  try { initRealtimeSubscriptions(); } catch (_) {}
});
// === end unified block ===

// Global variables
 // متغير لتتبع آخر تحديث لجدول الحضور
let lastAttendanceUpdate = null;
// متغير لتخزين مؤشر التحديث الدوري
let attendanceRefreshInterval = null;
 let students = [];
 let courses = [];
 let subscriptions = [];
 let payments = [];
 let attendances = [];
 let teachers = [];
let modules = []; 
let teacherExams = []; // لتخزين بيانات اختبارات المعلمين

 // Initialize the application
document.addEventListener('DOMContentLoaded', async function() {
 try {
 // Check if user is authenticated
 const { data: { session } } = await supabaseClient.auth.getSession();
 if (!session) {
 window.location.href = 'index.html';
 return;
 }

 // Load user data
 const { data: userData, error: userError } = await supabaseClient
 .from('users')
 .select('full_name, role')
 .eq('id', session.user.id)
 .single();

 if (userError && userError.code !== 'PGRST116') {
 throw userError;
 }

 if (userData) {
 document.getElementById('userName').textContent = userData.full_name || 'المسؤول';
 
 // يمكن تخزين الدور (role) في متغير عالمي إذا كنت ستحتاجه لاحقًا
 window.userRole = userData.role;
 }

 // ====== Cache object for storing data in memory ======
window.cache = {
  students: { data: [], timestamp: 0 },
  courses: { data: [], timestamp: 0 },
  subscriptions: { data: [], timestamp: 0 },
  payments: { data: [], timestamp: 0 }
};

// مدة صلاحية الكاش (مثلاً 5 دقائق)
const CACHE_TTL = 5 * 60 * 1000;

 // ============== تحميل البيانات الأساسية ==============
 // ترتيب التحميل مهم: لا تبدأ بدون هذه البيانات

 // 1. تحميل الكورسات
 const { data: coursesData, error: coursesError } = await supabaseClient
 .from('courses')
 .select('*')
 .order('created_at', { ascending: false });

 if (coursesError) throw coursesError;
 courses = coursesData || []; // تأكد من تعريف `let courses = []` في الأعلى

 // 2. تحميل الوحدات
 const { data: modulesData, error: modulesError } = await supabaseClient
 .from('modules')
 .select('*')
 .order('course_id')
 .order('order');

 if (modulesError) throw modulesError;
 modules = modulesData || []; // تأكد من تعريف `let modules = []` في الأعلى

 // 3. تحميل الطلبة
 const { data: studentsData, error: studentsError } = await supabaseClient
 .from('students')
 .select('*')
 .order('created_at', { ascending: false });

 if (studentsError) throw studentsError;
 students = studentsData || []; // تأكد من تعريف `let students = []` في الأعلى

 // ============== تحميل واجهة النظام بعد تحميل البيانات ==============
 await loadDashboardData();
 await loadRecentActivity();

 // إظهار التبويب الافتراضي (لوحة التحكم)
 switchTab('dashboard');

 } catch (error) {
 console.error('Error loading user data or initial data:', error);
 showStatus('خطأ في تحميل بيانات المستخدم أو البيانات الأساسية', 'error');
 
 // تحويل إلى صفحة تسجيل الدخول في حالة الخطأ
 window.location.href = 'index.html';
 }
});

// setActiveLink: canonical implementation appears later in this file; duplicate removed.

 // دالة بتحدد التبويب اللي ظاهر حاليًا وتشغل دالة التحديث بتاعته

// دالة لتحديث لوحة التحكم والتبويب الحالي
async function updateCurrentView() {
    await loadDashboardData();
    updateCurrentTab();
}
// === Tab management (consolidated) ===
// updateCurrentView above calls the tab updater below. Keep one canonical updateCurrentTab


// =============================================================
// Unified updateCurrentTab (نسخة واحدة فقط)
// =============================================================
function updateCurrentTab() {
  const visibleTab = document.querySelector('.tab-content[style*="display: block"]');
  if (!visibleTab) return;

  const currentTabId = visibleTab.id;
  try {
    switch (currentTabId) {
      case 'dashboardContent':
        loadDashboardData();
        loadRecentActivity();
        break;
      case 'studentsContent':
        loadStudents();
        break;
      case 'coursesContent':
        loadCourses();
        break;
      case 'subscriptionsContent':
        loadSubscriptions();
        break;
      case 'paymentsContent':
        loadPayments();
        break;
      case 'attendancesContent':
        loadAttendances();
        break;
      case 'teacherExamsContent':
        loadTeacherExamsForSecretary();
        break;
      case 'parentsContent':
        loadStudentsForParents();
        break;
      case 'dataManagementContent':
        loadDataManagement();
        break;
      default:
        console.warn('تبويب غير معروف للتحديث:', currentTabId);
    }
  } catch (err) {
    console.error('Error updating current tab:', err);
  }
}

// =============================================================
// switchTab (نسخة واحدة فقط)
// =============================================================
function switchTab(tabName) {
  document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));

  const activeTab = document.getElementById(`${tabName}Content`);
  if (activeTab) activeTab.style.display = 'block';

  updateCurrentTab();
}

// =============================================================================
function closeModal(modalId) {
 const modal = document.getElementById(modalId);
 if (modal) {
 modal.style.display = 'none';
 }
}
function closeModal(modalId) {
 const modal = document.getElementById(modalId);
 if (modal) modal.style.display = 'none';
}

// بدء التحديث الدوري لجدول الحضور
function startAttendanceAutoRefresh() {
  // توقف عن أي تحديث سابق (إن وجد)
  stopAttendanceAutoRefresh();

  // تحديث كل 10 ثوانٍ (يمكن تعديله)
  attendanceRefreshInterval = setInterval(() => {
    // التحقق من أن تبويب الحضور لا يزال مفتوحًا
    const attendancesTab = document.getElementById('attendancesContent');
    if (attendancesTab && attendancesTab.style.display !== 'none') {
      loadAttendances(); // إعادة تحميل البيانات
    } else {
      // إذا تم إغلاق التبويب، توقف عن التحديث
      stopAttendanceAutoRefresh();
    }
  }, 10000); // 10000 ميلي ثانية = 10 ثوانٍ
}

 // إيقاف التحديث الدوري لجدول الحضور
 function stopAttendanceAutoRefresh() {
 if (attendanceRefreshInterval) {
 clearInterval(attendanceRefreshInterval);
 attendanceRefreshInterval = null;

 }
 }

 // إيقاف التحديث عند تبديل التبويب أو إغلاق الصفحة
 // (اختياري، لكن يحسن الأداء)
 document.addEventListener('visibilitychange', () => {
 if (document.hidden) {
 // عندما تصبح الصفحة غير مرئية (مثل تبديل التبويب في المتصفح)
 stopAttendanceAutoRefresh();
 } else {
 // عندما تصبح الصفحة مرئية مرة أخرى
 const activeTab = document.querySelector('.tab-content[style*="block"]');
 if (activeTab && activeTab.id === 'attendancesContent') {
 // إذا كان تبويب الحضور هو المفتوح، أعد بدء التحديث
 startAttendanceAutoRefresh();
 }
 }
 });
// Load dashboard data
// Load dashboard data
async function loadDashboardData() {
  try {
    // Load students count
    const { data: studentsData, error: studentsError } = await supabaseClient
      .from('students')
      .select('id');
    if (studentsError) throw studentsError;
    if (document.getElementById('totalStudents')) {
      document.getElementById('totalStudents').textContent = studentsData.length;
    }

    // Load courses count
    const { data: coursesData, error: coursesError } = await supabaseClient
      .from('courses')
      .select('id');
    if (coursesError) throw coursesError;
    if (document.getElementById('totalCourses')) {
      document.getElementById('totalCourses').textContent = coursesData.length;
    }

    // Load subscriptions count
    const { data: subscriptionsData, error: subscriptionsError } = await supabaseClient
      .from('subscriptions')
      .select('id');
    if (subscriptionsError) throw subscriptionsError;
    if (document.getElementById('totalSubscriptions')) {
      document.getElementById('totalSubscriptions').textContent = subscriptionsData.length;
    }

    // بدل إجمالي الإيرادات بعدد الطلبة الحاضرين اليوم
    try {
      const { data: allPresentAttendances, error: attendancesError } = await supabaseClient
        .from('attendances')
        .select('date');

      if (attendancesError) throw attendancesError;

      const today = new Date();
      const todayString = today.toISOString().split('T')[0];

      const todayPresentCount = allPresentAttendances.filter(att => att.date === todayString).length;

      if (document.getElementById('totalRevenue')) {
        document.getElementById('totalRevenue').textContent = todayPresentCount;
      }
    } catch (err) {
      console.error("Error calculating today's attendance:", err);
      if (document.getElementById('totalRevenue')) {
        document.getElementById('totalRevenue').textContent = 0;
      }
    }

    // Initialize charts
    initCharts();
  } catch (error) {
    console.error('Error loading dashboard data:', error);
    showStatus('خطأ في تحميل بيانات لوحة التحكم', 'error');
  }
}

async function initCharts(tabName) {
  try {
    // ⛔ منع التشغيل المتزامن
    if (window.initChartsRunning) {
      console.warn("initCharts is already running, skipping...");
      return;
    }
    window.initChartsRunning = true;

    // --- Destroy old charts if exist ---
    if (window.revenueChartInstance) {
      try {
        window.revenueChartInstance.destroy();
      } catch (e) {
        console.warn("Error destroying revenueChartInstance:", e);
      }
      window.revenueChartInstance = null;
    }
    if (window.studentsChartInstance) {
      try {
        window.studentsChartInstance.destroy();
      } catch (e) {
        console.warn("Error destroying studentsChartInstance:", e);
      }
      window.studentsChartInstance = null;
    }

    // --- Get Canvas Elements ---
    const studentsCtxElement = document.getElementById('studentsChart');
    const revenueCtxElement = document.getElementById('revenueChart');
    if (!studentsCtxElement || !revenueCtxElement) {
      console.warn("Canvas elements not found. Skipping chart rendering.");
      window.initChartsRunning = false;
      return;
    }

    // --- Clear Canvases before rendering ---
    const studentsCtx = studentsCtxElement.getContext('2d');
    studentsCtx.clearRect(0, 0, studentsCtxElement.width, studentsCtxElement.height);

    const revenueCtx = revenueCtxElement.getContext('2d');
    revenueCtx.clearRect(0, 0, revenueCtxElement.width, revenueCtxElement.height);

    // --- Students Distribution Chart ---
    const { data: courseDistributionData, error: courseDistributionError } =
      await supabaseClient.rpc('get_student_course_distribution');

    let courseLabels = [];
    let courseData = [];
    const backgroundColors = ['#f97316', '#059669', '#f59e0b', '#3b82f6', '#8b5cf6'];

    if (!courseDistributionError && courseDistributionData) {
      courseLabels = courseDistributionData.map(item => item.course_name);
      courseData = courseDistributionData.map(item => item.student_count);
    }

    window.studentsChartInstance = new Chart(studentsCtx, {
      type: 'doughnut',
      data: {
        labels: courseLabels,
        datasets: [{
          data: courseData,
          backgroundColor: backgroundColors.slice(0, courseData.length)
        }]
      },
      options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
    });

    // --- Monthly Revenue Chart ---
    // جلب بيانات المدفوعات فقط
    const { data: paymentsData, error: paymentsError } = await supabaseClient
      .from('payments')
      .select('amount, paid_at, total_amount');
    if (paymentsError) throw paymentsError;

    // حساب المدفوع والمتبقي لكل شهر من جدول المدفوعات مباشرة
    const monthlyPaid = {};
    const monthlyRemaining = {};

    paymentsData.forEach(p => {
      const date = new Date(p.paid_at);
      if (isNaN(date)) return; // تجاهل السجلات غير الصالحة
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthlyPaid[monthKey] = (monthlyPaid[monthKey] || 0) + parseFloat(p.amount || 0);
      monthlyRemaining[monthKey] = (monthlyRemaining[monthKey] || 0) + Math.max(0, parseFloat(p.total_amount || 0) - parseFloat(p.amount || 0));
    });

    const months = Array.from(new Set([...Object.keys(monthlyPaid), ...Object.keys(monthlyRemaining)])).sort();
    const monthLabels = months.map(m => {
      const [year, month] = m.split('-');
      return `${new Date(year, month - 1).toLocaleString('ar-EG', { month: 'long' })} ${year}`;
    });

    const paidData = months.map(m => monthlyPaid[m] || 0);
    const remainingData = months.map(m => monthlyRemaining[m] || 0);

    window.revenueChartInstance = new Chart(revenueCtx, {
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

    // --- Revenue Log Table ---
    const logContainer = document.getElementById('revenueLog');
    if (logContainer) {
      let html = '<table><thead><tr><th>الشهر</th><th>مدفوع</th><th>متبقي</th><th>الإجمالي</th></tr></thead><tbody>';
      months.forEach((_m, i) => {
        const total = paidData[i] + remainingData[i];
        html += `<tr>
          <td>${monthLabels[i]}</td>
          <td>${paidData[i].toFixed(2)}</td>
          <td>${remainingData[i].toFixed(2)}</td>
          <td>${total.toFixed(2)}</td>
        </tr>`;
      });
      html += '</tbody></table>';
      logContainer.innerHTML = html;
    }

    // ✅ فك القفل بعد الانتهاء
    window.initChartsRunning = false;

  } catch (err) {
    window.initChartsRunning = false;
    console.error(`❌ خطأ أثناء تحديث تبويب ${tabName || ''}:`, err);
    showStatus(`خطأ في تحديث ${tabName || 'البيانات'}`, 'error');
  }
}
// Note: updateCurrentTab is implemented once near the top of the file (consolidated
// realtime-aware updater). This duplicate implementation was removed to avoid
// conflicting behavior and keep a single source of truth.

 // Load recent activity
 async function loadRecentActivity() {
 try {
 const activityList = document.getElementById('activityList')
 activityList.innerHTML = `<div class="loading"><div class="loading-spinner"></div><p>جارٍ تحميل آخر الأنشطة...</p></div>`

 // Get recent subscriptions
 const { data: subscriptionsData, error: subscriptionsError } = await supabaseClient
 .from('subscriptions')
 .select(`id, subscribed_at, students (full_name), courses (name)`)
 .order('subscribed_at', { ascending: false })
 .limit(3)

 if (subscriptionsError) throw subscriptionsError

 // Get recent payments
 const { data: paymentsData, error: paymentsError } = await supabaseClient
 .from('payments')
 .select(`id, paid_at, students (full_name), courses (name)`)
 .order('paid_at', { ascending: false })
 .limit(3)

 if (paymentsError) throw paymentsError

 // Get recent attendances
 const { data: attendancesData, error: attendancesError } = await supabaseClient
 .from('attendances')
 .select(`id, date, students (full_name), courses (name)`)
 .order('date', { ascending: false })
 .limit(3)

 if (attendancesError) throw attendancesError

 // Combine and sort activities
 const allActivities = [
 ...subscriptionsData.map(item => ({
 type: 'subscription',
 ...item
 })),
 ...paymentsData.map(item => ({
 type: 'payment',
 ...item
 })),
 ...attendancesData.map(item => ({
 type: 'attendance',
 ...item
 }))
 ].sort((a, b) => {
 const dateA = a.subscribed_at || a.paid_at || a.date
 const dateB = b.subscribed_at || b.paid_at || b.date
 return new Date(dateB) - new Date(dateA)
 }).slice(0, 5)

 // Display activities
 if (allActivities.length === 0) {
 activityList.innerHTML = '<p class="no-activity">لا توجد أنشطة حديثة</p>'
 return
 }

 activityList.innerHTML = allActivities.map(activity => {
 let icon, title, description, date
 
 switch(activity.type) {
 case 'subscription':
 icon = 'fa-file-contract'
 title = 'اشتراك جديد'
 description = `${activity.students?.full_name || 'طالب'} اشترك في ${activity.courses?.name || 'دورة'}`
 date = formatDate(activity.subscribed_at)
 break
 case 'payment':
 icon = 'fa-money-bill-wave'
 title = 'دفعة جديدة'
 description = `${activity.students?.full_name || 'طالب'} دفع لـ ${activity.courses?.name || 'دورة'}`
 date = formatDate(activity.paid_at)
 break
 case 'attendance':
 icon = 'fa-calendar-check'
 title = 'تسجيل حضور'
 description = `${activity.students?.full_name || 'طالب'} حضر ${activity.courses?.name || 'دورة'}`
 date = formatDate(activity.date)
 break
 default:
 icon = 'fa-info-circle'
 title = 'نشاط'
 description = 'نشاط جديد'
 date = ''
 }

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
 `
 }).join('')
 } catch (error) {
 console.error('Error loading recent activity:', error)
 document.getElementById('activityList').innerHTML = '<p class="error">خطأ في تحميل آخر الأنشطة</p>'
 showStatus('خطأ في تحميل آخر الأنشطة', 'error')
 }
 }

// =============================================================================
// دالة تحميل الوحدات (ضرورية)
// =============================================================================
async function loadModules() {
 try {
 const { data, error } = await supabaseClient
 .from('modules')
 .select('*')
 .order('course_id', { ascending: true })
 .order('order', { ascending: true });

 if (error) throw error;

 modules = data || [];

 } catch (err) {
 console.error('❌ خطأ في تحميل الوحدات:', err);
 showStatus('فشل في تحميل الوحدات', 'error');
 }
}


async function loadSubscriptions(extraData = null, searchQuery = '') {
 try {
 const container = document.getElementById('subscriptionsContainer');
 if (!container) {
 console.error("عنصر 'subscriptionsContainer' غير موجود في DOM");
 return;
 }
 container.innerHTML = `<div class="loading"><div class="loading-spinner"></div><p>جارٍ تحميل بيانات الاشتراكات...</p></div>`;

 let data = [];
 if (extraData && extraData.length > 0) {
 data = extraData;
 } else {
 let query = supabaseClient
 .from('subscriptions')
 .select(`*, students(full_name), courses(name)`)
 .order('subscribed_at', { ascending: false });

 if (searchQuery.trim() !== '') {
 query = query.or(`students.full_name.ilike.%${searchQuery}%,courses.name.ilike.%${searchQuery}%`);
 }

 const { data: fetchedData, error } = await query;
 if (error) throw error;
 data = fetchedData;
 }

 subscriptions = data; // حفظ البيانات للبحث لاحقاً

 const subscriptionsByCourse = {};
 data.forEach(subscription => {
 const courseId = subscription.course_id;
 if (!subscriptionsByCourse[courseId]) {
 subscriptionsByCourse[courseId] = {
 courseName: subscription.courses?.name || 'دورة غير معروف',
 students: []
 };
 }
 subscriptionsByCourse[courseId].students.push(subscription);
 });

 let innerHTMLContent = `<div class="table-container">
 <button class="btn btn-primary" onclick="showAddSubscriptionModal()" style="margin-bottom: 20px;">
 <i class="fas fa-plus"></i> إضافة اشتراك جديد
 </button>
 <button class="btn btn-success" onclick="exportSubscriptionsExcel()" style="margin-bottom: 20px; margin-right:10px;">
  <i class="fas fa-file-excel"></i> تحميل بيانات الاشتراكات
</button>

 <div class="courses-subscriptions-list">
 `;

 Object.values(subscriptionsByCourse).forEach(courseData => {
 innerHTMLContent += `
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
 innerHTMLContent += `
 <tr>
 <td>${subscription.students?.full_name || '-'}</td>
 <td>${formatDate(subscription.subscribed_at)}</td>
 <td>${subscription.status === 'active' ? 'نشط' : 'غير نشط'}</td>
 <td>${subscription.notes || '-'}</td>
 <td class="action-buttons">
 <button class="action-btn delete-btn" onclick="deleteSubscription('${subscription.id}')">
 <i class="fas fa-trash"></i>
 </button>
 </td>
 </tr>
 `;
 });

 innerHTMLContent += `
 </tbody>
 </table>
 </div>
 <hr style="margin: 20px 0;">
 `;
 });

 innerHTMLContent += `</div></div>`;
 container.innerHTML = innerHTMLContent;

 } catch (error) {
 console.error('Error loading subscriptions:', error);
 const container = document.getElementById('subscriptionsContainer');
 if (container) {
 container.innerHTML = `<div class="loading"><p>خطأ في تحميل بيانات الاشتراكات: ${error.message}</p></div>`;
 }
 showStatus('خطأ في تحميل بيانات الاشتراكات', 'error');
 }
}

function filterSubscriptions() {
 const searchTerm = document.getElementById('subscriptionSearch').value.toLowerCase();
 const filteredSubscriptions = subscriptions.filter(sub =>
 (sub.students?.full_name && sub.students.full_name.toLowerCase().includes(searchTerm)) ||
 (sub.courses?.name && sub.courses.name.toLowerCase().includes(searchTerm))
 );
 loadSubscriptions(filteredSubscriptions);
}

async function exportSubscriptionsExcel() {
  try {
    const { data, error } = await supabaseClient
      .from('subscriptions')
      .select(`
        status,
        notes,
        subscribed_at,
        students(full_name),
        courses(name)
      `)
      .order('subscribed_at', { ascending: false });

    if (error) throw error;

    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet("الاشتراكات");

    ws.columns = [
      { header: "اسم الطالب", key: "student", width: 25 },
      { header: "اسم الدورة", key: "course", width: 25 },
      { header: "الحالة", key: "status", width: 15 },
      { header: "تاريخ الاشتراك", key: "date", width: 20 },
      { header: "ملاحظات", key: "notes", width: 30 }
    ];

    styleHeader(ws.getRow(1));

    data.forEach(sub => {
      const row = ws.addRow({
        student: sub.students?.full_name || "-",
        course: sub.courses?.name || "-",
        status: sub.status === "active" ? "نشط" : sub.status === "cancelled" ? "ملغي" : sub.status || "-",
        date: sub.subscribed_at ? new Date(sub.subscribed_at).toLocaleDateString("ar-EG") : "-",
        notes: sub.notes || "-"
      });
      styleRow(row);
    });

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `subscriptions_${new Date().toISOString().split('T')[0]}.xlsx`);
    showStatus("✅ تم استخراج بيانات الاشتراكات", "success");
  } catch (err) {
    console.error(err);
    showStatus("❌ خطأ في استخراج بيانات الاشتراكات", "error");
  }
}


// Show add subscription modal
function showAddSubscriptionModal() {
  // Reset form values
  const studentName = document.getElementById("studentName");
  const studentPhone = document.getElementById("studentPhone");
  const studentEmail = document.getElementById("studentEmail");
  const courseSelect = document.getElementById("courseSelect");
  const paymentAmount = document.getElementById("paymentAmount");
  const modalTitle = document.getElementById("subscriptionModalTitle");

  if (studentName) studentName.value = "";
  if (studentPhone) studentPhone.value = "";
  if (studentEmail) studentEmail.value = "";
  if (courseSelect) courseSelect.value = "";
  if (paymentAmount) paymentAmount.value = "";

  // ✅ اعرض الكورسات المحملة في تبويب الكورسات
  if (typeof courses !== "undefined" && courses.length > 0) {
    populateCourseDropdown(courses);
  } else if (cache.courses?.data?.length > 0) {
    populateCourseDropdown(cache.courses.data);
  }

  // عنوان المودال
  if (modalTitle) modalTitle.textContent = "إضافة اشتراك شامل";

  // إظهار المودال
  openModal("subscriptionModal");
}

 // Show edit subscription modal
 function showEditSubscriptionModal(subscriptionId) {
 const subscription = subscriptions.find(s => s.id === subscriptionId)
 if (!subscription) return

 const modal = document.getElementById('subscriptionModal')
 modal.style.display = 'flex'
 
 document.getElementById('subscriptionModalTitle').textContent = 'تعديل بيانات الاشتراك'
 document.getElementById('subscriptionId').value = subscription.id
 document.getElementById('subscriptionDate').value = subscription.subscribed_at.split('T')[0]
 document.getElementById('subscriptionStatus').value = subscription.status
 document.getElementById('subscriptionNotes').value = subscription.notes || ''
 
 // Populate students dropdown and select current student
 const studentSelect = document.getElementById('student')
 studentSelect.innerHTML = '<option value="">اختر طالباً</option>'
 students.forEach(student => {
 const option = document.createElement('option')
 option.value = student.id
 option.textContent = student.full_name
 if (student.id === subscription.student_id) {
 option.selected = true
 }
 studentSelect.appendChild(option)
 })
 
 // Populate courses dropdown and select current course
 const courseSelect = document.getElementById('course')
 courseSelect.innerHTML = '<option value="">اختر كورساً</option>'
 courses.forEach(course => {
 const option = document.createElement('option')
 option.value = course.id
 option.textContent = course.name
 if (course.id === subscription.course_id) {
 option.selected = true
 }
 courseSelect.appendChild(option)
 })
 
 document.getElementById('subscriptionForm').onsubmit = async function(e) {
 e.preventDefault()
 await updateSubscription(subscriptionId)
 }
 }

 // Add subscription
 async function addSubscription() {
 try {
 const studentId = document.getElementById('student').value
 const courseId = document.getElementById('course').value
 const subscribedAt = document.getElementById('subscriptionDate').value
 const status = document.getElementById('subscriptionStatus').value
 const notes = document.getElementById('subscriptionNotes').value

 const { data, error } = await supabaseClient
 .from('subscriptions')
 .insert([{
 student_id: studentId,
 course_id: courseId,
 subscribed_at: subscribedAt,
 status: status,
 notes: notes
 }])

 if (error) throw error

await loadSubscriptions(true);  // تحديث الاشتراكات
await loadPayments(true);       // تحديث المدفوعات لو مرتبطة


 showStatus('تم إضافة الاشتراك بنجاح')
 closeModal('subscriptionModal')
 loadSubscriptions()
 } catch (error) {
 console.error('Error adding subscription:', error)
 showStatus('خطأ في إضافة الاشتراك', 'error')
 }
 }

 // Update subscription
 async function updateSubscription(subscriptionId) {
 try {
 const studentId = document.getElementById('student').value
 const courseId = document.getElementById('course').value
 const subscribedAt = document.getElementById('subscriptionDate').value
 const status = document.getElementById('subscriptionStatus').value
 const notes = document.getElementById('subscriptionNotes').value

 const { data, error } = await supabaseClient
 .from('subscriptions')
 .update({
 student_id: studentId,
 course_id: courseId,
 subscribed_at: subscribedAt,
 status: status,
 notes: notes
 })
 .eq('id', subscriptionId)

 if (error) throw error

 showStatus('تم تحديث بيانات الاشتراك بنجاح')
 closeModal('subscriptionModal')
 loadSubscriptions()
 } catch (error) {
 console.error('Error updating subscription:', error)
 showStatus('خطأ في تحديث بيانات الاشتراك', 'error')
 }
 await updateCurrentTab(); // انتظار انتهاء تحديث كل البيانات
updateCurrentTab(); // بعدين تحديث التبويب الحالي
 }

 // Delete subscription
// Delete subscription (Cascade من DB)
async function deleteSubscription(subscriptionId) {
  if (!confirm('هل أنت متأكد من حذف هذا الاشتراك وكافة المتعلقات به؟')) {
    return;
  }

  try {
    const { error } = await supabaseClient
      .from('subscriptions')
      .delete()
      .eq('id', subscriptionId);

    if (error) throw error;

    showStatus('تم حذف الاشتراك وكافة المتعلقات به بنجاح ✅');
    loadSubscriptions();
  } catch (error) {
    console.error('❌ خطأ في حذف الاشتراك:', error);
    showStatus('خطأ في حذف الاشتراك', 'error');
  }

  await updateCurrentTab();
}


 // Load payments
// ...existing code...
async function loadPayments() {
  try {
    const container = document.getElementById('paymentsContainer');
    if (!container) {
      console.error("عنصر 'paymentsContainer' غير موجود في DOM");
      return;
    }
    container.innerHTML = `<div class="loading"><div class="loading-spinner"></div><p>جارٍ تحميل بيانات المدفوعات...</p></div>`;

    const { data, error } = await supabaseClient
      .from('payments')
      .select(`*, students (full_name), courses (name)`)
      .order('paid_at', { ascending: false });
    if (error) throw error;
    payments = data;

    // Get students and courses for dropdowns (if needed elsewhere or for filtering)
    if (students.length === 0) {
      const { data: studentsData, error: studentsError } = await supabaseClient
        .from('students')
        .select('id, full_name');
      if (studentsError) throw studentsError;
      students = studentsData || [];
    }

    if (courses.length === 0) {
      const { data: coursesData, error: coursesError } = await supabaseClient
        .from('courses')
        .select('id, name'); // <-- fix here: use 'name' not 'full_name'
      if (coursesError) throw coursesError;
      courses = coursesData || [];
    }

    // تنظيم البيانات حسب الطالب
    const paymentsByStudent = {};
    data.forEach(payment => {
      const studentId = payment.student_id;
      if (!paymentsByStudent[studentId]) {
        paymentsByStudent[studentId] = {
          studentName: payment.students?.full_name || 'طالب غير معروف',
          payments: []
        };
      }
      paymentsByStudent[studentId].payments.push(payment);
    });

    // إنشاء HTML لكل طالب
    let innerHTMLContent = `
      <div class="table-container">
        <button class="btn btn-success" onclick="exportPaymentsExcel()" style="margin-bottom: 20px; margin-right:10px;">
  <i class="fas fa-file-excel"></i> تحميل بيانات المدفوعات
</button>

        <div class="students-payments-list">
    `;

    Object.values(paymentsByStudent).forEach(studentData => {
      innerHTMLContent += `
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
        innerHTMLContent += `
          <tr>
            <td>${payment.courses?.name || '-'}</td>
            <td>${formatCurrency(payment.amount).replace('SAR', 'ج.م').replace('EGP', 'ج.م')}</td>
            <td>${formatCurrency(payment.total_amount).replace('SAR', 'ج.م').replace('EGP', 'ج.م')}</td>
            <td>${formatCurrency(remaining).replace('SAR', 'ج.م').replace('EGP', 'ج.م')}</td>
            <td><span class="payment-method ${payment.method}">${payment.method === 'cash' ? 'نقداً' : payment.method === 'card' ? 'بطاقة' : 'تحويل'}</span></td>
            <td>${formatDate(payment.paid_at)}</td>
            <td>${payment.status === 'paid' ? 'مدفوع' : payment.status === 'pending' ? 'معلق' : 'ملغى'}</td>
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
      innerHTMLContent += `
            </tbody>
          </table>
        </div>
        <hr style="margin: 20px 0;">
      `;
    });

    innerHTMLContent += `
        </div> <!-- .students-payments-list -->
      </div> <!-- .table-container -->
    `;

    container.innerHTML = innerHTMLContent;

  } catch (error) {
    console.error('Error loading payments:', error);
    const container = document.getElementById('paymentsContainer');
    if (container) {
      container.innerHTML = `<div class="loading"><p>خطأ في تحميل بيانات المدفوعات: ${error.message}</p></div>`;
    }
    showStatus('خطأ في تحميل بيانات المدفوعات', 'error');
  }
} 
 // Filter payments
 function filterPayments() {
 const searchTerm = document.getElementById('paymentSearch').value.toLowerCase()
 const filteredPayments = payments.filter(payment => 
 (payment.students?.full_name && payment.students.full_name.toLowerCase().includes(searchTerm)) ||
 (payment.courses?.name && payment.courses.name.toLowerCase().includes(searchTerm))
 )
 
 const container = document.getElementById('paymentsContainer')
 container.innerHTML = `
 <div class="table-container">
 <table>
 <thead>
 <tr>
 <th>اسم الطالب</th>
 <th>الدورة</th>
 <th>المبلغ المدفوع</th>
 <th>إجمالي الدورة</th>
 <th>المتبقي</th>
 <th>طريقة الدفع</th>
 <th>الحالة</th>
 <th>الإجراءات</th>
 </tr>
 </thead>
 <tbody>
 ${filteredPayments.map(payment => {
 const remaining = (payment.total_amount || 0) - (payment.amount || 0)
 return `
 <tr>
 <td>${payment.students?.full_name || '-'}</td>
 <td>${payment.courses?.name || '-'}</td>
 <td>${formatCurrency(payment.amount).replace('SAR', 'ج.م')}</td>
 <td>${formatCurrency(payment.total_amount).replace('SAR', 'ج.م')}</td>
 <td>${formatCurrency(remaining).replace('SAR', 'ج.م')}</td>
 <td><span class="payment-method ${payment.method}">${payment.method === 'cash' ? 'نقداً' : payment.method === 'card' ? 'بطاقة' : 'تحويل'}</span></td>
 <td>${payment.status === 'paid' ? 'مدفوع' : payment.status === 'pending' ? 'معلق' : 'ملغى'}</td>
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
</td> </tr>
 `
 }).join('')}
 </tbody>
 </table>
 </div>
 `
 }



function translatePaymentStatus(status) {
  switch (status) {
    case 'paid': return 'مدفوع';
    case 'pending': return 'معلق';
    case 'failed': return 'فشل';
    default: return status || '-';
  }
}

function translatePaymentMethod(method) {
  switch (method) {
    case 'cash': return 'نقدًا';
    case 'transfer': return 'تحويل بنكي';
    case 'card': return 'بطاقة';
    default: return method || '-';
  }
}

async function exportPaymentsExcel() {
  try {
    const { data, error } = await supabaseClient
      .from('payments')
      .select(`
        amount,
        total_amount,
        status,
        method,
        notes,
        paid_at,
        students(full_name),
        courses(name)
      `)
      .order('paid_at', { ascending: false });

    if (error) throw error;

    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet("المدفوعات");

    ws.columns = [
      { header: "اسم الطالب", key: "student", width: 25 },
      { header: "اسم الدورة", key: "course", width: 25 },
      { header: "المبلغ المدفوع", key: "paid", width: 18 },
      { header: "إجمالي المبلغ", key: "total", width: 18 },
      { header: "المبلغ المتبقي", key: "remaining", width: 18 },
      { header: "الحالة", key: "status", width: 15 },
      { header: "طريقة الدفع", key: "method", width: 18 },
      { header: "تاريخ الدفع", key: "date", width: 20 },
      { header: "ملاحظات", key: "notes", width: 30 }
    ];

    styleHeader(ws.getRow(1));

    let totalPaid = 0;
    let totalAmount = 0;

    data.forEach(pay => {
      const remaining = (pay.total_amount || 0) - (pay.amount || 0);
      totalPaid += pay.amount || 0;
      totalAmount += pay.total_amount || 0;

      const row = ws.addRow({
        student: pay.students?.full_name || "-",
        course: pay.courses?.name || "-",
        paid: pay.amount || 0,
        total: pay.total_amount || 0,
        remaining: remaining >= 0 ? remaining : 0,
        status: translatePaymentStatus(pay.status),
        method: translatePaymentMethod(pay.method),
        date: pay.paid_at ? new Date(pay.paid_at).toLocaleDateString("ar-EG") : "-",
        notes: pay.notes || "-"
      });

      styleRow(row);
    });

    const totalRemaining = totalAmount - totalPaid;
    const totalRow = ws.addRow({
      student: "الإجماليات:",
      paid: totalPaid,
      total: totalAmount,
      remaining: totalRemaining
    });

    styleTotalRow(totalRow);

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `payments_${new Date().toISOString().split('T')[0]}.xlsx`);
    showStatus("✅ تم استخراج بيانات المدفوعات بنجاح", "success");
  } catch (err) {
    console.error(err);
    showStatus("❌ خطأ في استخراج بيانات المدفوعات", "error");
  }
}

 // Show edit payment modal
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
 
 // Populate students dropdown and select current student
 const studentSelect = document.getElementById('paymentStudent');
 studentSelect.innerHTML = '<option value="">اختر طالباً</option>';
 students.forEach(student => {
 const option = document.createElement('option');
 option.value = student.id;
 option.textContent = student.full_name;
 if (student.id === payment.student_id) {
 option.selected = true;
 }
 studentSelect.appendChild(option);
 });
 
 // Populate courses dropdown and select current course
 const courseSelect = document.getElementById('paymentCourse');
 courseSelect.innerHTML = '<option value="">اختر كورساً</option>';
 courses.forEach(course => {
 const option = document.createElement('option');
 option.value = course.id;
 option.textContent = course.name;
 option.dataset.price = course.price || 0; // <-- تخزين السعر
 if (course.id === payment.course_id) {
 option.selected = true;
 }
 courseSelect.appendChild(option);
 });
 
 // Add event listener for course change to update total amount <-- ربط مستمع الحدث
 courseSelect.onchange = null; // تأكد من إزالة أي ربط سابق
 courseSelect.onchange = updateCourseTotalAmount; // ربط الحدث بالدالة الصحيحة 

 document.getElementById('paymentForm').onsubmit = async function(e) {
 e.preventDefault();
 await updatePayment(paymentId);
 };
 // ربط مستمعي الحدث للتحديث التلقائي للمبلغ المتبقي
 const totalAmountInput = document.getElementById('totalAmount');
 const amountInput = document.getElementById('amount');

 if (totalAmountInput) {
 // تحديث المتبقي عند تغيير إجمالي الدورة
 totalAmountInput.oninput = updateRemainingAmount;
 }
 if (amountInput) {
 // تحديث المتبقي عند تغيير المبلغ المدفوع
 amountInput.oninput = updateRemainingAmount;
 }
}
// دالة لعرض إيصال الدفع
async function showPaymentReceipt(paymentId) {
 try {
 // التأكد من تحميل البيانات إذا لزم
 if (payments.length === 0) {
 await loadPayments();
 }
 if (students.length === 0) {
 const { data: studentsData } = await supabaseClient.from('students').select('id, full_name');
 students = studentsData || [];
 }
 if (courses.length === 0) {
 const { data: coursesData } = await supabaseClient.from('courses').select('id, full_name');
 courses = coursesData || [];
 }

 const payment = payments.find(p => p.id === paymentId);
 if (!payment) {
 showStatus('الدفعة غير موجودة', 'error');
 return;
 }

 const student = students.find(s => s.id === payment.student_id);
 const course = courses.find(c => c.id === payment.course_id);
 
 const receiptContent = document.getElementById('paymentReceiptContent');
 if (!receiptContent) {
 console.error('عنصر paymentReceiptContent غير موجود');
 return;
 }

 receiptContent.innerHTML = `
 <div style="text-align: center; padding: 20px; direction: rtl; font-family: 'Tajawal', sans-serif;">
 <div id="receiptLogo" style="margin-bottom: 20px;">
 <img src="logo.png" alt="شعار المركز" style="max-width: 100px;"> 
 <h2>Assiut Academy</h2>
 </div>
 <h3>إيصال دفع</h3>
 <hr>
 <div style="text-align: right; margin: 20px 0;">
 <p><strong>رقم الإيصال:</strong> ${payment.id}</p>
 <p><strong>التاريخ:</strong> ${formatDate(payment.paid_at)}</p>
 <p><strong>اسم الطالب:</strong> ${student?.full_name || '-'}</p>
 <p><strong>الدورة:</strong> ${course?.name || '-'}</p>
 <p><strong>المبلغ المدفوع:</strong> ${formatCurrency(payment.amount || 0).replace('SAR', 'ج.م')}</p>
 <p><strong>إجمالي الدورة:</strong> ${formatCurrency(payment.total_amount || 0).replace('SAR', 'ج.م')}</p>
 <p><strong>المتبقي:</strong> ${formatCurrency(Math.max(0, (payment.total_amount || 0) - (payment.amount || 0))).replace('SAR', 'ج.م')}</p>
 <p><strong>طريقة الدفع:</strong> ${payment.method === 'cash' ? 'نقداً' : payment.method === 'card' ? 'بطاقة' : 'تحويل'}</p>
 <p><strong>الحالة:</strong> ${payment.status === 'paid' ? 'مدفوع' : payment.status === 'pending' ? 'معلق' : 'ملغى'}</p>
 </div>
 <hr>
 <p>شكراً لثقتك بنا</p>
 </div>
 `;

 const modal = document.getElementById('paymentReceiptModal');
 if (modal) {
 modal.style.display = 'flex';
 } else {
 console.error('نافذة paymentReceiptModal غير موجودة');
 }
 } catch (error) {
 console.error('Error showing payment receipt:', error);
 showStatus('خطأ في عرض الإيصال', 'error');
 }
}

// دالة لطباعة الإيصال
function printPaymentReceipt() {
 const receiptContent = document.getElementById('paymentReceiptContent');
 if (!receiptContent) {
 showStatus('لا يوجد محتوى للطباعة', 'error');
 return;
 }
 
 const printContent = receiptContent.innerHTML;
 const originalContent = document.body.innerHTML;
 
 document.body.innerHTML = printContent;
 window.print();
 document.body.innerHTML = originalContent;
 // إعادة فتح النافذة بعد الطباعة
 const modal = document.getElementById('paymentReceiptModal');
 if (modal) {
 modal.style.display = 'flex';
 }
}

// دالة لعرض إيصال الحضور

// دالة لطباعة إيصال الحضور
function printAttendanceReceipt() {
 const receiptContent = document.getElementById('attendanceReceiptContent');
 if (!receiptContent) {
 showStatus('لا يوجد محتوى للطباعة', 'error');
 return;
 }
 
 const printContent = receiptContent.innerHTML;
 const originalContent = document.body.innerHTML;
 
 document.body.innerHTML = printContent;
 window.print();
 document.body.innerHTML = originalContent;
 // إعادة فتح النافذة بعد الطباعة
 const modal = document.getElementById('attendanceReceiptModal');
 if (modal) {
 modal.style.display = 'flex';
 }
}
 // دالة لتحديث إجمالي سعر الدورة تلقائيًا عند اختيار الدورة
 async function updateCourseTotalAmount() {
 // الطريقة الجديدة باستخدام dataset
 const courseSelect = document.getElementById('paymentCourse');
 const selectedOption = courseSelect ? courseSelect.options[courseSelect.selectedIndex] : null;

 const totalAmountInput = document.getElementById('totalAmount');

 if (selectedOption && selectedOption.value && totalAmountInput) {
 // جلب السعر من dataset الذي أضفناه سابقًا
 const price = parseFloat(selectedOption.dataset.price) || 0;
 totalAmountInput.value = price.toFixed(2); // تنسيق إلى رقمين عشريين
 // console.log("تم تحديث إجمالي الدورة إلى:", price); // للتصحيح
 } else if (totalAmountInput) {
 // إذا لم يتم اختيار دورة، اجعل الحقل فارغًا
 totalAmountInput.value = '';
 // console.log("تم مسح حقل إجمالي الدورة");
 }
 await updateCurrentTab(); // انتظار انتهاء تحديث كل البيانات
updateCurrentTab(); // بعدين تحديث التبويب الحالي // <-- تحديث كامل بعد تغيير الدورة
 }



 // Update payment
 async function updatePayment(paymentId) {
 try {
 const studentId = document.getElementById('paymentStudent').value
 const courseId = document.getElementById('paymentCourse').value
 const amount = parseFloat(document.getElementById('amount').value)
 const totalAmount = parseFloat(document.getElementById('totalAmount').value)
 const method = document.getElementById('paymentMethod').value
 const paidAt = document.getElementById('paymentDate').value
 const status = document.getElementById('paymentStatus').value
 const notes = document.getElementById('paymentNotes').value

 const { data, error } = await supabaseClient
 .from('payments')
 .update({
 student_id: studentId,
 course_id: courseId,
 amount: amount,
 total_amount: totalAmount,
 method: method,
 paid_at: paidAt,
 status: status,
 notes: notes
 })
 .eq('id', paymentId)

 if (error) throw error

 showStatus('تم تحديث بيانات الدفعة بنجاح')
 closeModal('paymentModal')
 loadPayments()
 } catch (error) {
 console.error('Error updating payment:', error)
 showStatus('خطأ في تحديث بيانات الدفعة', 'error')
 }
 }
// تحديث المبلغ المتبقي تلقائيًا
async function updateRemainingAmount() {
 const totalAmountInput = document.getElementById('totalAmount');
 const amountInput = document.getElementById('amount');
 // افتراض أن هناك عنصر لعرض المتبقي، مثل input غير قابل للتعديل أو span
 // إذا لم يكن موجودًا في HTML، أضفه: <input type="text" id="remainingAmount" readonly>
 const remainingAmountDisplay = document.getElementById('remainingAmount'); 

 if (totalAmountInput && amountInput) {
 const totalAmount = parseFloat(totalAmountInput.value) || 0;
 const amount = parseFloat(amountInput.value) || 0;
 const remaining = totalAmount - amount;

 // إذا كان عنصر عرض المتبقي موجودًا، حدّثه
 if (remainingAmountDisplay) {
 remainingAmountDisplay.value = remaining.toFixed(2);
 }
 console.log(`تم حساب المتبقي: ${totalAmount} - ${amount} = ${remaining}`); // للتصحيح
 } else if (remainingAmountDisplay) {
 // إذا لم يتم إدخال قيم، اجعل المتبقي 0 أو فارغًا
 remainingAmountDisplay.value = '';
 }
 await updateCurrentTab(); // انتظار انتهاء تحديث كل البيانات
updateCurrentTab(); // بعدين تحديث التبويب الحالي // <-- تحديث كامل بعد تغيير المبلغ
}
 // Delete payment
 async function deletePayment(paymentId) {
 if (!confirm('هل أنت متأكد من حذف هذه الدفعة؟')) {
 return
 }

 try {
 const { error } = await supabaseClient
 .from('payments')
 .delete()
 .eq('id', paymentId)

 if (error) throw error

 showStatus('تم حذف الدفعة بنجاح')
 loadPayments()
 } catch (error) {
 console.error('Error deleting payment:', error)
 showStatus('خطأ في حذف الدفعة', 'error')
 }
 await updateCurrentTab(); // انتظار انتهاء تحديث كل البيانات
updateCurrentTab(); // بعدين تحديث التبويب الحالي
 } 
 
 
// دالة تحميل إحصائيات الحضور حسب الكورسات فقط
async function loadAttendances() {
  const container = document.getElementById('attendancesContainer');
  if (!container) return;

  container.innerHTML = `<div class="loading"><div class="loading-spinner"></div><p>جارٍ تحميل إحصائيات الحضور...</p></div>`;

  try {
    const { data, error } = await supabaseClient
      .from('attendances')
      .select(`
        course_id,
        status,
        students(full_name),
        courses(name)
      `);

    if (error) throw error;

    if (!data || data.length === 0) {
      container.innerHTML = `<div class="table-container"><p class="no-data">لا توجد سجلات حضور.</p></div>`;
      return;
    }

    // تجميع البيانات حسب الدورة
    const statsByCourse = {};
    data.forEach(att => {
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

    // بناء الجدول
    let html = `
      <div class="table-container">
        <h3>📊 إحصائيات الحضور حسب الكورسات</h3>
        <table>
          <thead>
            <tr>
              <th>اسم الدورة</th>
              <th>إجمالي الجلسات</th>
              <th>الحضور (حاضر)</th>
              <th>الغياب (غائب)</th>
              <th>التأخير (متأخر)</th>
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

    html += `</tbody></table></div>`;
    container.innerHTML = html;

  } catch (err) {
    console.error('خطأ في تحميل إحصائيات الحضور:', err);
    container.innerHTML = '<p>❌ حدث خطأ أثناء تحميل البيانات.</p>';
    showStatus('فشل في تحميل إحصائيات الحضور', 'error');
  }
}

// دالة عرض سجل الحضور للطالب
function viewStudentAttendance(studentId) {
 const studentRecords = window.addAttendance.filter(att => att.student_id === studentId);
 let content = `<h3>سجل حضور الطالب</h3>`;
 if (studentRecords.length > 0) {
 content += `<p><strong>الاسم:</strong> ${studentRecords[0].students?.full_name || '-'}</p>`;
 content += `<table border="1" cellspacing="0" cellpadding="5">
 <thead>
 <tr>
 <th>الدورة</th>
 <th>التاريخ</th>
 <th>الحالة</th>
 <th>الدرس</th>
 <th>ملاحظات</th>
 </tr>
 </thead>
 <tbody>`;
 studentRecords.forEach(att => {
 content += `<tr>
 <td>${att.courses?.name || '-'}</td>
 <td>${formatDate(att.date)}</td>
 <td>${att.status === 'present' ? 'حاضر' : att.status === 'absent' ? 'غائب' : 'متأخر'}</td>
 <td>${att.lessons?.title || '-'}</td>
 <td>${att.notes || '-'}</td>
 </tr>`;
 });
 content += `</tbody></table>`;
 } else {
 content += `<p>لا يوجد سجل حضور لهذا الطالب.</p>`;
 }

 const modal = window.open('', '', 'width=800,height=600');
 modal.document.write(content);
 modal.document.close();
}
async function exportAttendancesExcel() {
  try {
const { data, error } = await supabaseClient
  .from('attendances')
  .select(`
    date,
    status,
    students(full_name),
    courses(name)
  `)
  .order('date', { ascending: false });


    if (error) throw error;

    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet("الحضور");

    ws.columns = [
      { header: "اسم الطالب", key: "student", width: 25 },
      { header: "اسم الدورة", key: "course", width: 25 },
      { header: "الحالة", key: "status", width: 15 },
      { header: "تاريخ الحضور", key: "date", width: 20 }
    ];

    styleHeader(ws.getRow(1));

    let totalPresent = 0;
    let totalAbsent = 0;

    data.forEach(rec => {
      if (rec.status === "present") totalPresent++;
      if (rec.status === "absent") totalAbsent++;

      const row = ws.addRow({
        student: rec.students?.full_name || "-",
        course: rec.courses?.name || "-",
        status: rec.status === "present" ? "حاضر" : rec.status === "absent" ? "غائب" : rec.status || "-",
date: rec.date ? new Date(rec.date).toLocaleDateString("ar-EG") : "-"
      });
      styleRow(row);
    });

    // صف إجمالي الحضور
    const totalRow = ws.addRow({
      student: "الإجماليات:",
      course: "-",
      status: `حاضر: ${totalPresent} / غائب: ${totalAbsent}`
    });
    styleTotalRow(totalRow);

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `attendance_${new Date().toISOString().split('T')[0]}.xlsx`);
    showStatus("✅ تم استخراج بيانات الحضور", "success");
  } catch (err) {
    console.error(err);
    showStatus("❌ خطأ في استخراج بيانات الحضور", "error");
  }
}


// دالة طباعة سجل الحضور للطالب
function printStudentAttendance(studentId) {
 const studentRecords = window.addAttendance.filter(att => att.student_id === studentId);
 let printContent = `<h2>سجل حضور الطالب</h2>`;
 if (studentRecords.length > 0) {
 printContent += `<p><strong>الاسم:</strong> ${studentRecords[0].students?.full_name || '-'}</p>`;
 printContent += `<table border="1" cellspacing="0" cellpadding="5">
 <thead>
 <tr>
 <th>الدورة</th>
 <th>التاريخ</th>
 <th>الحالة</th>
 <th>الدرس</th>
 <th>ملاحظات</th>
 </tr>
 </thead>
 <tbody>`;
 studentRecords.forEach(att => {
 printContent += `<tr>
 <td>${att.courses?.name || '-'}</td>
 <td>${formatDate(att.date)}</td>
 <td>${att.status === 'present' ? 'حاضر' : att.status === 'absent' ? 'غائب' : 'متأخر'}</td>
 <td>${att.lessons?.title || '-'}</td>
 <td>${att.notes || '-'}</td>
 </tr>`;
 });
 printContent += `</tbody></table>`;
 } else {
 printContent += `<p>لا يوجد سجل حضور لهذا الطالب.</p>`;
 }

 const printWindow = window.open('', '', 'width=800,height=600');
 printWindow.document.write(printContent);
 printWindow.document.close();
 printWindow.print();
}


// ✅ جلب المستخدم الحالي وتخزينه
async function loadCurrentUser() {
  const { data, error } = await supabaseClient.auth.getUser();
  if (error) {
    console.error("خطأ في جلب بيانات المستخدم:", error);
    return;
  }
  if (data?.user) {
    window.userId = data.user.id;
    console.log("✅ Current user loaded:", window.userId);
    // بعد ما نعرف السكرتير، نجيب حالته
    loadSecretaryStatus();
  }
}

// ✅ تحميل حالة السكرتير الحالية
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

  // Guard: ensure we have a user id
  if (!window.userId) {
    console.warn('loadSecretaryStatus: window.userId is not set');
    return;
  }

  const statusEl = document.getElementById('secretaryStatus');
  const checkInBtn = document.getElementById('checkInBtn');
  const checkOutBtn = document.getElementById('checkOutBtn');

  // Helper to safely set disabled state
  const safeSetDisabled = (el, value) => { if (el) el.disabled = !!value; };
  const safeSetText = (el, text) => { if (el) el.textContent = text; };

  if (!data) {
    safeSetText(statusEl, "⏳ لم يتم تسجيل الحضور بعد");
    safeSetDisabled(checkInBtn, false);
    safeSetDisabled(checkOutBtn, true);
  } else if (data && !data.check_out) {
    safeSetText(statusEl, "✅ تم تسجيل الحضور (في انتظار الانصراف)");
    safeSetDisabled(checkInBtn, true);
    safeSetDisabled(checkOutBtn, false);
  } else {
    safeSetText(statusEl, "👋 تم تسجيل الحضور والانصراف");
    safeSetDisabled(checkInBtn, true);
    safeSetDisabled(checkOutBtn, true);
  }
}

// ✅ تسجيل الحضور
async function checkInSecretary() {
  const today = new Date().toISOString().split('T')[0];
  // Ensure we don't insert duplicates: look for existing record for today
  try {
    const { data: existing, error: fetchErr } = await supabaseClient
      .from('secretary_attendance')
      .select('*')
      .eq('date', today)
      .eq('secretary_id', window.userId)
      .maybeSingle();

    if (fetchErr) throw fetchErr;

    if (existing) {
      // If a check-in already exists, do nothing
      if (existing.check_in) {
        showStatus('✅ الحضور مسجل بالفعل لهذا اليوم', 'info');
        loadSecretaryStatus();
        return;
      }
      // If a record exists but check_in is empty, update it
      const { error: updErr } = await supabaseClient
        .from('secretary_attendance')
        .update({ check_in: new Date().toISOString() })
        .eq('id', existing.id);
      if (updErr) throw updErr;
      showStatus('✅ تم تسجيل الحضور', 'success');
      loadSecretaryStatus();
      return;
    }

    // No existing record — insert a new one
    const { error: insertErr } = await supabaseClient
      .from('secretary_attendance')
      .insert([{
        date: today,
        check_in: new Date().toISOString(),
        secretary_id: window.userId
      }]);

    if (insertErr) throw insertErr;
    showStatus('✅ تم تسجيل الحضور', 'success');
    loadSecretaryStatus();
  } catch (error) {
    console.error('❌ خطأ في تسجيل الحضور:', error);
    showStatus('خطأ في تسجيل الحضور', 'error');
  }
}

// ✅ تسجيل الانصراف
async function checkOutSecretary() {
  const today = new Date().toISOString().split('T')[0];
  try {
    // Ensure there is a record to update
    const { data: existing, error: fetchErr } = await supabaseClient
      .from('secretary_attendance')
      .select('*')
      .eq('date', today)
      .eq('secretary_id', window.userId)
      .maybeSingle();

    if (fetchErr) throw fetchErr;

    if (!existing) {
      // No check-in found for today — inform the user
      showStatus('لم يتم العثور على تسجيل حضور اليوم. الرجاء تسجيل الحضور أولاً.', 'warning');
      return;
    }

    if (existing.check_out) {
      showStatus('تم تسجيل الانصراف بالفعل لهذا اليوم', 'info');
      loadSecretaryStatus();
      return;
    }

    const { error: updErr } = await supabaseClient
      .from('secretary_attendance')
      .update({ check_out: new Date().toISOString() })
      .eq('id', existing.id);

    if (updErr) throw updErr;
    showStatus('👋 تم تسجيل الانصراف', 'success');
    loadSecretaryStatus();
  } catch (error) {
    console.error('❌ خطأ في تسجيل الانصراف:', error);
    showStatus('خطأ في تسجيل الانصراف', 'error');
  }
}

// ✅ تحميل المستخدم أول ما الصفحة تفتح
loadCurrentUser();


// Filter attendances
 function filterAttendances() {
 const searchTerm = document.getElementById('attendanceSearch').value.toLowerCase()
 const filteredAttendances = attendances.filter(att => 
 (att.students?.full_name && att.students.full_name.toLowerCase().includes(searchTerm)) ||
 (att.courses?.name && att.courses.name.toLowerCase().includes(searchTerm))
 )
 
 const container = document.getElementById('attendancesContainer')
 container.innerHTML = `
 <div class="table-container">
 <button class="btn btn-primary" onclick="showAddAttendanceModal()" style="margin-bottom: 20px;">
 <i class="fas fa-plus"></i> إضافة حضور جديد
 </button>
 <table>
 <thead>
 <tr>
 <th>اسم الطالب</th>
 <th>الدورة</th>
 <th>التاريخ</th>
 <th>الحالة</th>
 <th>ملاحظات</th>
 <th>الإجراءات</th>
 </tr>
 </thead>
 <tbody>
 ${filteredAttendances.map(attendance => `
 <tr>
 <td>${attendance.students?.full_name || '-'}</td>
 <td>${attendance.courses?.name || '-'}</td>
 <td>${formatDate(attendance.date)}</td>
 <td><span class="attendance-status ${attendance.status}">${attendance.status === 'present' ? 'حاضر' : attendance.status === 'absent' ? 'غائب' : 'متأخر'}</span></td>
 <td>${attendance.notes || '-'}</td>
 <td class="action-buttons">
 <button class="action-btn edit-btn" onclick="showEditAttendanceModal('${attendance.id}')">
 <i class="fas fa-edit"></i>
 </button>
 <button class="action-btn delete-btn" onclick="deleteAttendance('${attendance.id}')">
 <i class="fas fa-trash"></i>
 </button>
 </td>
 </tr>
 `).join('')}
 </tbody>
 </table>
 </div>
 `
 }

 // Show add attendance modal
 async function showAddAttendanceModal() {
 const modal = document.getElementById('attendanceModal')
 modal.style.display = 'flex'
 
 document.getElementById('attendanceModalTitle').textContent = 'إضافة حضور جديد'
 document.getElementById('attendanceForm').reset()
 document.getElementById('attendanceId').value = ''
 
 // Populate students dropdown
 const studentSelect = document.getElementById('attendanceStudent')
 studentSelect.innerHTML = '<option value="">اختر طالباً</option>'
 students.forEach(student => {
 const option = document.createElement('option')
 option.value = student.id
 option.textContent = student.full_name
 studentSelect.appendChild(option)
 })
 
 // Populate courses dropdown
 const courseSelect = document.getElementById('attendanceCourse')
 courseSelect.innerHTML = '<option value="">اختر كورساً</option>'
 courses.forEach(course => {
 const option = document.createElement('option')
 option.value = course.id
 option.textContent = course.name
 courseSelect.appendChild(option)
 })
 
 document.getElementById('attendanceForm').onsubmit = async function(e) {
 e.preventDefault()
 await addAttendance()
 }
 const today = new Date().toISOString().split('T')[0]
 document.getElementById('attendanceDate').value = today

 await updateCurrentTab(); // انتظار انتهاء تحديث كل البيانات
updateCurrentTab(); // بعدين تحديث التبويب الحالي // <-- تحديث كامل بعد إضافة حضور جديد

 }
// دالة لتحديث إجمالي سعر الدورة تلقائياً

 // Show edit attendance modal
 function showEditAttendanceModal(attendanceId) {
 const attendance = attendances.find(a => a.id === attendanceId)
 if (!attendance) return

 const modal = document.getElementById('attendanceModal')
 modal.style.display = 'flex'
 
 document.getElementById('attendanceModalTitle').textContent = 'تعديل بيانات الحضور'
 document.getElementById('attendanceId').value = attendance.id
 document.getElementById('attendanceDate').value = attendance.date
 document.getElementById('attendanceStatus').value = attendance.status
 document.getElementById('attendanceNotes').value = attendance.notes || ''
 
 // Populate students dropdown and select current student
 const studentSelect = document.getElementById('attendanceStudent')
 studentSelect.innerHTML = '<option value="">اختر طالباً</option>'
 students.forEach(student => {
 const option = document.createElement('option')
 option.value = student.id
 option.textContent = student.full_name
 if (student.id === attendance.student_id) {
 option.selected = true
 }
 studentSelect.appendChild(option)
 })
 
 // Populate courses dropdown and select current course
 const courseSelect = document.getElementById('attendanceCourse')
 courseSelect.innerHTML = '<option value="">اختر كورساً</option>'
 courses.forEach(course => {
 const option = document.createElement('option')
 option.value = course.id
 option.textContent = course.name
 if (course.id === attendance.course_id) {
 option.selected = true
 }
 courseSelect.appendChild(option)
 })
 
 document.getElementById('attendanceForm').onsubmit = async function(e) {
 e.preventDefault()
 await updateAttendance(attendanceId)
 }
 }

 // Add attendance
 async function addAttendance() {
 try {
 const studentId = document.getElementById('attendanceStudent').value
 const courseId = document.getElementById('attendanceCourse').value
 const attendanceDate = document.getElementById('attendanceDate').value
 const status = document.getElementById('attendanceStatus').value
 const notes = document.getElementById('attendanceNotes').value

 const { data, error } = await supabaseClient
 .from('attendances')
 .insert([{
 student_id: studentId,
 course_id: courseId,
 date: attendanceDate,
 status: status,
 notes: notes
 }])

 if (error) throw error

 showStatus('تم إضافة الحضور بنجاح')
 closeModal('attendanceModal')
 loadAttendances()
 } catch (error) {
 console.error('Error adding attendance:', error)
 showStatus('خطأ في إضافة الحضور', 'error')
 }
 }

 // Update attendance
 async function updateAttendance(attendanceId) {
 try {
 const studentId = document.getElementById('attendanceStudent').value
 const courseId = document.getElementById('attendanceCourse').value
 const attendanceDate = document.getElementById('attendanceDate').value
 const status = document.getElementById('attendanceStatus').value
 const notes = document.getElementById('attendanceNotes').value

 const { data, error } = await supabaseClient
 .from('attendances')
 .update({
 student_id: studentId,
 course_id: courseId,
 date: attendanceDate,
 status: status,
 notes: notes
 })
 .eq('id', attendanceId)

 if (error) throw error

 showStatus('تم تحديث بيانات الحضور بنجاح')
 closeModal('attendanceModal')
 loadAttendances()
 } catch (error) {
 console.error('Error updating attendance:', error)
 showStatus('خطأ في تحديث بيانات الحضور', 'error')
 }

 await updateCurrentTab(); // انتظار انتهاء تحديث كل البيانات
updateCurrentTab(); // بعدين تحديث التبويب الحالي // <-- تحديث كامل بعد تغيير الحضور

 }

 // Delete attendance
 async function deleteAttendance(attendanceId) {
 if (!confirm('هل أنت متأكد من حذف هذا الحضور؟')) {
 return
 }

 try {
 const { error } = await supabaseClient
 .from('attendances')
 .delete()
 .eq('id', attendanceId)

 if (error) throw error

 showStatus('تم حذف الحضور بنجاح')
 loadAttendances()
 } catch (error) {
 console.error('Error deleting attendance:', error)
 showStatus('خطأ في حذف الحضور', 'error')
 }
 await updateCurrentTab(); // انتظار انتهاء تحديث كل البيانات
updateCurrentTab(); // بعدين تحديث التبويب الحالي // <-- تحديث كامل بعد حذف الحضور
 }
// دالة لعرض إيصال الحضور
// دالة لعرض إيصال الحضور مع السجل الكامل

// دالة لعرض إيصال الحضور مع السجل الكامل
async function showAttendanceReceipt(attendanceId) {
 try {
 // التأكد من تحميل البيانات إذا لزم
 if (!attendances || attendances.length === 0) {
 await loadAttendances();
 }
 if (!students || students.length === 0) {
 const { data: studentsData, error: studentsError } = await supabaseClient.from('students').select('id, full_name');
 if (studentsError) throw studentsError;
 students = studentsData || [];
 }
 if (!courses || courses.length === 0) {
 const { data: coursesData, error: coursesError } = await supabaseClient.from('courses').select('id, full_name');
 if (coursesError) throw coursesError;
 courses = coursesData || [];
 }

 const attendance = attendances.find(a => a.id === attendanceId);
 if (!attendance) {
 showStatus('سجل الحضور غير موجود', 'error');
 return;
 }

 const student = students.find(s => s.id === attendance.student_id);
 const course = courses.find(c => c.id === attendance.course_id);
 
 const statusText = attendance.status === 'present' ? 'حاضر' : 
 attendance.status === 'absent' ? 'غائب' : 'متأخر';
 
 // جلب السجل الكامل للحضور لهذا الطالب في هذا الدورة
 let studentAttendances = []; // تهيئة افتراضية
 let totalSessions = 0, presentCount = 0, absentCount = 0, lateCount = 0, attendanceRate = 0;

 try {
 const { data: fetchedAttendances, error: attendancesError } = await supabaseClient
 .from('attendances')
 .select('*')
 .eq('student_id', attendance.student_id)
 .eq('course_id', attendance.course_id)
 .order('date', { ascending: false });

 if (attendancesError) {
 console.error('Error fetching student attendances:', attendancesError);
 throw attendancesError;
 }

 studentAttendances = fetchedAttendances || [];
 
 // حساب الإحصائيات فقط إذا كانت البيانات موجودة
 if (studentAttendances && Array.isArray(studentAttendances)) {
 totalSessions = studentAttendances.length;
 presentCount = studentAttendances.filter(a => a.status === 'حاضر').length;
 absentCount = studentAttendances.filter(a => a.status === 'غائب').length;
 lateCount = studentAttendances.filter(a => a.status === 'متأخر').length;
 attendanceRate = totalSessions > 0 ? Math.round((presentCount / totalSessions) * 100) : 0;
 }
 } catch (fetchError) {
 console.error('Error in attendance data fetching block:', fetchError);
 studentAttendances = []; // ضمان أن تكون مصفوفة حتى لو فشل الاستعلام
 // يمكن عرض رسالة للمستخدم أو متابعة مع بيانات فارغة
 }

 const receiptContent = document.getElementById('attendanceReceiptContent');
 if (!receiptContent) {
 console.error('عنصر attendanceReceiptContent غير موجود');
 showStatus('خطأ في عرض الإيصال: العنصر غير موجود', 'error');
 return;
 }

 // بناء محتوى الإيصال
 let attendanceTableRows = '';
 if (studentAttendances && studentAttendances.length > 0) {
 attendanceTableRows = studentAttendances.map(att => {
 const attStatus = att.status === 'present' ? 'حاضر' : 
 att.status === 'absent' ? 'غائب' : 'متأخر';
 return `
 <tr>
 <td style="border: 1px solid #ddd; padding: 8px;">${formatDate(att.date)}</td>
 <td style="border: 1px solid #ddd; padding: 8px;">${attStatus}</td>
 <td style="border: 1px solid #ddd; padding: 8px;">${att.notes || '-'}</td>
 </tr>
 `;
 }).join('');
 } else {
 attendanceTableRows = `<tr><td colspan="3" style="border: 1px solid #ddd; padding: 8px; text-align: center;">لا توجد سجلات حضور سابقة</td></tr>`;
 }

 receiptContent.innerHTML = `
 <div style="text-align: center; padding: 20px; direction: rtl; font-family: 'Tajawal', sans-serif;">
 <div id="receiptLogo" style="margin-bottom: 20px;">
 <img src="logo.png" alt="شعار المركز" style="max-width: 100px;"> 
 <h2>Assiut Academy</h2>
 </div>
 <h3>إيصال حضور</h3>
 <hr>
 <div style="text-align: right; margin: 20px 0;">
 <p><strong>رقم السجل:</strong> ${attendance.id}</p>
 <p><strong>التاريخ:</strong> ${formatDate(attendance.date)}</p>
 <p><strong>اسم الطالب:</strong> ${student?.full_name || '-'}</p>
 <p><strong>الدورة:</strong> ${course?.name || '-'}</p>
 <p><strong>الحالة:</strong> ${statusText}</p>
 ${attendance.notes ? `<p><strong>ملاحظات:</strong> ${attendance.notes}</p>` : ''}
 </div>
 
 <hr>
 <h4>سجل الحضور الكامل</h4>
 <div style="text-align: right; margin: 20px 0;">
 <p><strong>إجمالي الجلسات:</strong> ${totalSessions}</p>
 <p><strong>الحضور:</strong> ${presentCount} (${attendanceRate}%)</p>
 <p><strong>الغياب:</strong> ${absentCount}</p>
 <p><strong>التأخير:</strong> ${lateCount}</p>
 </div>
 
 <div style="margin: 20px 0;">
 <table style="width: 100%; border-collapse: collapse; text-align: right;">
 <thead>
 <tr style="background-color: #f0f0f0;">
 <th style="border: 1px solid #ddd; padding: 8px;">التاريخ</th>
 <th style="border: 1px solid #ddd; padding: 8px;">الحالة</th>
 <th style="border: 1px solid #ddd; padding: 8px;">ملاحظات</th>
 </tr>
 </thead>
 <tbody>
 ${attendanceTableRows}
 </tbody>
 </table>
 </div>
 
 <hr>
 <p>شكراً لحضوركم</p>
 </div>
 `;

 const modal = document.getElementById('attendanceReceiptModal');
 if (modal) {
 modal.style.display = 'flex';
 } else {
 console.error('نافذة attendanceReceiptModal غير موجودة');
 showStatus('خطأ: نافذة الإيصال غير موجودة', 'error');
 }
 } catch (error) {
 console.error('Error showing attendance receipt:', error);
 showStatus('خطأ في عرض الإيصال: ' + (error.message || 'خطأ غير معروف'), 'error');
 }
}

// دالة لطباعة إيصال الحضور
function printAttendanceReceipt() {
 const printContent = document.getElementById('attendanceReceiptContent').innerHTML
 const originalContent = document.body.innerHTML
 
 document.body.innerHTML = printContent
 window.print()
 document.body.innerHTML = originalContent
 // إعادة فتح النافذة بعد الطباعة
 document.getElementById('attendanceReceiptModal').style.display = 'flex'
}

 // Show status message
 function showStatus(message, type = 'success') {
 const statusEl = document.getElementById('status')
 statusEl.textContent = message
 statusEl.className = ''
 statusEl.classList.add('show', type)
 
 setTimeout(() => {
 statusEl.classList.remove('show')
 }, 3000)
 }

 // Close modal
 function closeModal(modalId) {
 const modal = document.getElementById(modalId)
 if (modal) {
 modal.style.display = 'none'
 }
 }

// (Canonical formatDate and formatCurrency are defined above.)

 // Close modals when clicking outside
 window.onclick = function(event) {
 if (event.target.classList.contains('modal')) {
 event.target.style.display = 'none'
 }
 }
// تفعيل زر التوجل للسايد بار
document.getElementById('menuToggle').addEventListener('click', function() {
 const sidebar = document.querySelector('.sidebar');
 sidebar.classList.toggle('active');
});

// ===== Hide Sidebar on Mobile When Clicking a Tab =====
document.querySelectorAll('.tab-link').forEach(link => {
  link.addEventListener('click', () => {
    if (window.innerWidth <= 768) {
      document.getElementById('sidebar').classList.remove('active');
    }
  });
});

// ===== Load User Avatar from avatar_url =====
async function loadUserAvatar() {
  try {
    const user = supabaseClient.auth.user();
    if (!user) return;
    const { data, error } = await supabaseClient
      .from('users')
      .select('avatar_url')
      .eq('id', user.id)
      .single();
    if (error) throw error;

    const avatarUrl = data?.avatar_url || '/assets/img/default-avatar.png';
    const avatarImg = document.querySelector('#user-avatar');
    if (avatarImg) avatarImg.src = avatarUrl;
  } catch (err) {
    console.error('Error loading avatar:', err);
  }
}

// ===== Update User Avatar =====
async function updateAvatarUrl() {
  try {
    const user = supabaseClient.auth.user();
    const newUrl = document.getElementById('avatar-url-input').value.trim();
    if (!user || !newUrl) return;
    const { error } = await supabaseClient
      .from('users')
      .update({ avatar_url: newUrl })
      .eq('id', user.id);
    if (error) throw error;
    showStatus('تم تحديث صورة البروفايل بنجاح');
    loadUserAvatar();
  } catch (err) {
    console.error('Error updating avatar:', err);
    showStatus('خطأ في تحديث الصورة', 'error');
  }
}

// ===== Load Current User Profile =====
async function loadUserProfile() {
  try {
    const user = supabaseClient.auth.user();
    if (!user) return;
    const { data, error } = await supabaseClient
      .from('users')
      .select('full_name, email, phone, avatar_url')
      .eq('id', user.id)
      .single();
    if (error) throw error;

    document.getElementById('profile-name').textContent = data.full_name || '';
    document.getElementById('profile-email').textContent = data.email || '';
    document.getElementById('profile-phone').textContent = data.phone || '';
    document.getElementById('avatar-url-input').value = data.avatar_url || '';
  } catch (err) {
    console.error('Error loading profile:', err);
  }
}

// ===== Secretary Attendance =====
async function handleSecretaryAttendance() {
  try {
    const user = supabaseClient.auth.user();
    if (!user) return;

    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabaseClient
      .from('attendance_secretary')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', today)
      .single();

    const btn = document.getElementById('attendance-btn');

    if (error && error.code === 'PGRST116') {
      btn.textContent = 'تسجيل حضور';
      btn.onclick = async () => {
        await supabaseClient.from('attendance_secretary').insert([{
          user_id: user.id,
          date: today,
          check_in: new Date().toISOString()
        }]);
        handleSecretaryAttendance();
      };
    } else if (data && !data.check_out) {
      btn.textContent = 'تسجيل انصراف';
      btn.onclick = async () => {
        await supabaseClient.from('attendance_secretary')
          .update({ check_out: new Date().toISOString() })
          .eq('id', data.id);
        handleSecretaryAttendance();
      };
    } else {
      btn.textContent = 'تم تسجيل الحضور والانصراف';
      btn.disabled = true;
    }
  } catch (err) {
    console.error('Error handling secretary attendance:', err);
  }
}



// ====== Performance Patch: Caching + Polling + Disable Realtime ======
(function(){
  const CACHE_TTL = 60000; // 1 minute
  const __callCache = new Map();

  function wrapWithTTL(fnName){
    try {
      const orig = window[fnName];
      if (typeof orig !== 'function') return;

      let lastTime = 0;
      let pending = null;
      window[fnName] = async function(...args){
        const force = args[0] === true || args[0]?.force === true;
        const now = Date.now();
        if (!force && (now - lastTime) < CACHE_TTL) {
          // Return pending promise if exists to dedupe bursts
          if (pending) return pending;
          const cacheKey = fnName + '::result';
          if (__callCache.has(cacheKey)) return __callCache.get(cacheKey);
        }
        pending = orig.apply(this, args);
        const result = await pending;
        __callCache.set(fnName + '::result', result);
        lastTime = Date.now();
        pending = null;
        return result;
      };
    } catch(e){ console.warn('wrapWithTTL failed for', fnName, e); }
  }

  // Wrap common loaders
  [
    'loadStudents',
    'loadCourses',
    'loadSubscriptions',
    'loadPayments',
    'loadAttendances',
    'loadRecentActivity',
    'loadDashboardData',
    'loadModules',
    'loadCourseModulesAndLessons',
    'loadTeacherExamsForSecretary',
    'loadStudentsForParents',
    'loadCurrentUser',
    'loadUserProfile',
    'loadUserAvatar',
    'loadSecretaryStatus'
  ].forEach(wrapWithTTL);

  // Disable realtime by monkey-patching channel subscription (no-op)
  try {
    if (typeof supabaseClient?.channel === 'function') {
      const noopChannel = function(){ 
        const api = {
          on(){ return api; },
          subscribe(){ console.log('Realtime disabled'); return api; },
          unsubscribe(){ return api; }
        };
        return api;
      };
      supabaseClient.channel = noopChannel;
    }
  } catch(e){ console.warn('Failed to override realtime', e); }

  // Lightweight polling of the visible tab only
  if (typeof window.updateCurrentTab === 'function') {
    setInterval(() => {
      try { window.updateCurrentTab(); } catch(e){}
    }, 60000);
  }
})();
// ====== End Performance Patch ======

function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.style.display = "block";

    if (id === "subscriptionModal") {
      setTimeout(() => {   // 👈 نتأكد إن العنصر ظهر
        updateCoursePrice();
      }, 100);
    }
  }
}


// ====== Populate Course Dropdown for Unified Modal ======
function populateCourseDropdown(courses) {
  const select = document.getElementById("courseSelect");
  if (!select) return;

  select.innerHTML = '<option value="">اختر كورساً</option>';

  courses.forEach(course => {
    const option = document.createElement("option");
    option.value = course.id;
    option.textContent = course.name;
    option.setAttribute("data-price", course.price || 0); // 👈 السعر في option
    select.appendChild(option);
  });
}

// ====== Unified Subscription Form Handler ======
document.getElementById("subscriptionForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  try {
// 1️⃣ بيانات الطالب
const studentData = {
  full_name: document.getElementById("studentName").value,
  phone: document.getElementById("studentPhone").value,
  email: document.getElementById("studentEmail").value,
  parent_phone: document.getElementById("studentParentPhone").value  // 👈 جديد
};

const { data: student, error: studentError } = await supabaseClient
  .from("students")
  .insert([studentData])
  .select()
  .single();

if (studentError) throw studentError;

    // 2️⃣ الاشتراك
const subscriptionData = {
  student_id: student.id,
  course_id: document.getElementById("courseSelect").value,
  status: "active",
  subscribed_at: new Date().toISOString()   // 👈 بدل start_date
};

    const { data: subscription, error: subscriptionError } = await supabaseClient
      .from("subscriptions")
      .insert([subscriptionData])
      .select()
      .single();

    if (subscriptionError) throw subscriptionError;

    // 3️⃣ دفعة
const price = parseFloat(document.getElementById("coursePrice").value) || 0;
const paid = parseFloat(document.getElementById("paymentAmount").value) || 0;

const paymentData = {
  student_id: student.id,
  course_id: subscription.course_id,
  subscription_id: subscription.id, // ربط الدفعة بالاشتراك
  amount: paid,                     // المدفوع
  total_amount: price,               // سعر الكورس
  paid_at: new Date().toISOString(),
  status: paid >= price ? "paid" : "partial"  // لو دفع كله تبقى مدفوع، غير كده جزئي
};


    const { error: paymentError } = await supabaseClient
      .from("payments")
      .insert([paymentData]);

    if (paymentError) throw paymentError;


    // ✅ تحديث التبويبات
    await loadStudents(true);
    await loadCourses(true);
    await loadSubscriptions(true);
    await loadPayments(true);

    closeModal("subscriptionModal");
    showStatus("تم إضافة الاشتراك الشامل بنجاح ✅", "success");

  } catch (err) {
    console.error("Error adding subscription:", err.message);
    showStatus("خطأ أثناء إضافة الاشتراك", "error");
  }
});
// جلب السعر الأساسي من جدول الكورسات
async function updateCoursePrice() {
  const select = document.getElementById("courseSelect");
  const priceInput = document.getElementById("coursePrice");
  if (!select || !priceInput) return;

  const courseId = select.value;
  if (!courseId) {
    priceInput.value = ""; // فضيه لو مفيش كورس
    calculateRemaining();
    return;
  }

  try {
    const { data, error } = await supabaseClient
      .from("courses")
      .select("price")
      .eq("id", courseId)
      .single();

    if (error) throw error;

    const price = parseFloat(data?.price) || 0;

    // 👈 نخلي القيمة نص عشان نضمن إنها تظهر في الـ input
    priceInput.value = price ? price.toString() : "";

    calculateRemaining();
  } catch (err) {
    console.error("Error fetching course price:", err.message);
    priceInput.value = "";
  }
}

// حساب المتبقي
function calculateRemaining() {
  const price = parseFloat(document.getElementById("coursePrice").value) || 0;  // السعر الأساسي
  const paid = parseFloat(document.getElementById("paymentAmount").value) || 0;
  const remaining = price - paid;

  // 👈 المتبقي فقط يظهر هنا
  document.getElementById("remainingAmount").value = remaining >= 0 ? remaining : 0;
}

function calculateRemaining() {
  const price = parseFloat(document.getElementById("coursePrice").value) || 0;
  const paid = parseFloat(document.getElementById("paymentAmount").value) || 0;
  const remaining = price - paid;

  document.getElementById("remainingAmount").value = remaining >= 0 ? remaining : 0;
}



// ربط الأحداث (مرة واحدة بعد تحميل الصفحة)
document.addEventListener("DOMContentLoaded", () => {
  const courseSelect = document.getElementById("courseSelect");
  const paymentInput = document.getElementById("paymentAmount");

  if (courseSelect) {
    courseSelect.addEventListener("change", updateCoursePrice);
  }
  if (paymentInput) {
    paymentInput.addEventListener("input", calculateRemaining);
  }
});

// === Global update broadcaster (added cleanup) ===
function broadcastDashboardUpdate(detail = {}) {
  try {
    // Trigger a soft refresh for the currently visible tab
    if (typeof updateCurrentTab === 'function') {
      updateCurrentTab();
    }
    // Dispatch a DOM event so any listeners (charts/tables) can respond
    document.dispatchEvent(new CustomEvent('dashboard:update', { detail }));
    console.debug('broadcastDashboardUpdate: event dispatched', detail);
  } catch (err) {
    console.error('broadcastDashboardUpdate failed:', err);
    if (typeof showStatus === 'function') showStatus('حدث خطأ أثناء تحديث اللوحة', 'error');
  }
}
window.broadcastDashboardUpdate = broadcastDashboardUpdate;
// === end broadcaster ===


// Ensure showStatus is available globally
try { if (typeof showStatus === 'function') window.showStatus = showStatus; } catch (_) {}

// Ensure startAttendanceAutoRefresh is available globally
try { if (typeof startAttendanceAutoRefresh === 'function') window.startAttendanceAutoRefresh = startAttendanceAutoRefresh; } catch (_) {}

// Ensure stopAttendanceAutoRefresh is available globally
try { if (typeof stopAttendanceAutoRefresh === 'function') window.stopAttendanceAutoRefresh = stopAttendanceAutoRefresh; } catch (_) {}