 // Supabase Configuration
 const supabaseUrl = "https://zefsmckaihzfiqqbdake.supabase.co"
 const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InplZnNtY2thaWh6ZmlxcWJkYWtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQyMzUzNTgsImV4cCI6MjA2OTgxMTM1OH0.vktk2VkEPtMclb6jb_pFa1DbrqWX9SOZRsBR577o5mc"
 const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey)

 

// === Unified Live Update & Realtime Subscriptions (cleaned) ===
async function updateCurrentTab() {
  const visibleTab = document.querySelector('.tab-content[style*="display: block"]');
  if (!visibleTab) return;
  const currentTabId = visibleTab.id;

  switch (currentTabId) {
    case 'dashboardContent':
      if (typeof loadDashboardData === 'function') await loadDashboardData();
      if (typeof loadRecentActivity === 'function') await loadRecentActivity();
      break;
    case 'studentsContent':
      if (typeof loadStudents === 'function') await loadStudents();
      break;
    case 'coursesContent':
      if (typeof loadCourses === 'function') await loadCourses();
      break;
    case 'subscriptionsContent':
      if (typeof loadSubscriptions === 'function') await loadSubscriptions();
      break;
    case 'paymentsContent':
      if (typeof loadPayments === 'function') await loadPayments();
      break;
    case 'attendancesContent':
      if (typeof loadAttendances === 'function') await loadAttendances();
      break;
    case 'teacherExamsContent':
      if (typeof loadTeacherExamsForSecretary === 'function') await loadTeacherExamsForSecretary();
      break;
    case 'parentsContent':
      if (typeof loadStudentsForParents === 'function') await loadStudentsForParents();
      break;
    default:
      break;
  }
}

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
function updateCurrentTab() {
  const visibleTab = document.querySelector('.tab-content[style*="display: block"]');
  // If no visible tab, perform a full refresh of all data
  if (!visibleTab) {
    // Full refresh: run dashboard + recent activity and refresh lists in background
    (async () => {
      try {
        await loadDashboardData();
        await loadRecentActivity();
        await Promise.allSettled([
          loadStudents(),
          loadCourses(),
          loadSubscriptions(),
          loadPayments(),
          loadAttendances(),
          loadTeacherExamsForSecretary(),
          loadStudentsForParents()
        ]);
      } catch (e) {
        console.error('Error during full refresh:', e);
      }
    })();
    return;
  }

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
      default:
        console.warn('تبويب غير معروف للتحديث:', currentTabId);
    }
  } catch (err) {
    console.error('Error updating current tab:', err);
  }
  }

function switchTab(tabName) {
 // إخفاء جميع التبويبات
 document.querySelectorAll('.tab-content').forEach(content => {
 content.style.display = 'none';
 });

 // إزالة الفئة النشطة من الروابط
 document.querySelectorAll('.nav-link').forEach(link => {
 link.classList.remove('active');
 });

 // إظهار التبويب المطلوب
 const activeTab = document.getElementById(`${tabName}Content`);
 if (activeTab) {
 activeTab.style.display = 'block';
 }

 // تحميل البيانات حسب التبويب
 switch (tabName) {
 case 'dashboard':
 loadDashboardData();
 loadRecentActivity();
 break;
 case 'students':
 loadStudents();
 break;
 case 'courses':
 loadCourses();
 break;
 case 'subscriptions':
 loadSubscriptions();
 break;
 case 'payments':
 loadPayments();
 break;
 case 'attendances':
 loadAttendances();
 startAttendanceAutoRefresh();
 break;
 case 'teacherExams':
 loadTeacherExamsForSecretary();
 break;
 case 'parents': // <-- إضافة حالة جديدة
 loadStudentsForParents();
 break;
 default:
 console.warn('تبويب غير معروف:', tabName);
 }

 // - إضافة جديدة: إخفاء الشريط الجانبي في شاشات الموبايل بعد اختيار التبويب -
 // (يفترض أن الكود المرتبط بهذه الميزة موجود في مكان آخر في ملفك)
 // if (window.innerWidth <= 768) { ... }
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

 // Load students
 async function loadStudents() {
 try {
 const container = document.getElementById('studentsContainer')
 container.innerHTML = `<div class="loading"><div class="loading-spinner"></div><p>جارٍ تحميل بيانات الطلبة...</p></div>`

 const { data, error } = await supabaseClient
 .from('students')
 .select('*')
 .order('created_at', { ascending: false })

 if (error) throw error
 students = data

 container.innerHTML = `
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
 <th>رقم ولي الأمر</th> <!-- عنوان جديد -->
 <th>تاريخ التسجيل</th>
 <th>الإجراءات</th>
 </tr>
 </thead>
 <tbody>
 ${data.map(student => `
 <tr>
 <td>${student.full_name}</td>
 <td>${student.email || '-'}</td>
 <td>${student.phone || '-'}</td>
 <td>${student.parent_phone || '-'}</td> <!-- عمود جديد -->
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
 `).join('')}
 </tbody>
 </table>
 </div>
 `
 console.log("✅ تم تحديث جدول الطلبة بنجاح"); // <-- رسالة جديدة
 } catch (error) {
 console.error('Error loading students:', error)
 document.getElementById('studentsContainer').innerHTML = `<div class="loading"><p>خطأ في تحميل بيانات الطلبة</p></div>`
 showStatus('خطأ في تحميل بيانات الطلبة', 'error')
 }
 }
 // Filter students
 function filterStudents() {
 const searchTerm = document.getElementById('studentSearch').value.toLowerCase()
 const filteredStudents = students.filter(student =>
 student.full_name.toLowerCase().includes(searchTerm) ||
 (student.email && student.email.toLowerCase().includes(searchTerm)) ||
 (student.phone && student.phone.includes(searchTerm)) ||
 (student.parent_phone && student.parent_phone.includes(searchTerm)) // إضافة فلترة لرقم ولي الأمر
 )

 const container = document.getElementById('studentsContainer')
 container.innerHTML = `
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
 <th>رقم ولي الأمر</th> <!-- عنوان جديد -->
 <th>تاريخ التسجيل</th>
 <th>الإجراءات</th>
 </tr>
 </thead>
 <tbody>
 ${filteredStudents.map(student => `
 <tr>
 <td>${student.full_name}</td>
 <td>${student.email || '-'}</td>
 <td>${student.phone || '-'}</td>
 <td>${student.parent_phone || '-'}</td> <!-- عمود جديد -->
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
 `).join('')}
 </tbody>
 </table>
 </div>
 `
 }

 // Show add student modal
 async function showAddStudentModal() {
 const modal = document.getElementById('studentModal')
 modal.style.display = 'flex'

 document.getElementById('studentModalTitle').textContent = 'إضافة طالب جديد'
 document.getElementById('studentForm').reset()
 document.getElementById('studentId').value = ''

 document.getElementById('studentForm').onsubmit = async function(e) {
 e.preventDefault()
 await addStudent()
 }
 await updateCurrentTab(); // انتظار انتهاء تحديث كل البيانات
updateCurrentTab(); // بعدين تحديث التبويب الحالي // تحديث كل البيانات في الخلفية
 }

 // Show edit student modal
 function showEditStudentModal(studentId) {
 const student = students.find(s => s.id === studentId)
 if (!student) return

 const modal = document.getElementById('studentModal')
 modal.style.display = 'flex'

 document.getElementById('studentModalTitle').textContent = 'تعديل بيانات الطالب'
 document.getElementById('studentId').value = student.id
 document.getElementById('fullName').value = student.full_name
 document.getElementById('email').value = student.email || ''
 document.getElementById('phone').value = student.phone || ''
 // تعبئة حقل رقم ولي الأمر
 document.getElementById('parentPhone').value = student.parent_phone || '' // <-- جديد

 document.getElementById('studentForm').onsubmit = async function(e) {
 e.preventDefault()
 await updateStudent(studentId)
 }
 }

 // Add student
 async function addStudent() {
 try {
 const fullName = document.getElementById('fullName').value
 const email = document.getElementById('email').value
 const phone = document.getElementById('phone').value
 // الحصول على رقم ولي الأمر
 const parentPhone = document.getElementById('parentPhone').value // <-- جديد

 const { data, error } = await supabaseClient
 .from('students')
 .insert([{
 full_name: fullName,
 email: email,
 phone: phone,
 parent_phone: parentPhone, // <-- جديد
 created_at: new Date().toISOString()
 }])

 if (error) throw error

 showStatus('تم إضافة الطالب بنجاح')
 closeModal('studentModal')
    loadStudents();
    loadDashboardData();
 loadStudents()
 } catch (error) {
 console.error('Error adding student:', error)
 showStatus('خطأ في إضافة الطالب', 'error')
 }
 }

 // Update student
 async function updateStudent(studentId) {
 try {
 const fullName = document.getElementById('fullName').value
 const email = document.getElementById('email').value
 const phone = document.getElementById('phone').value
 // الحصول على رقم ولي الأمر
 const parentPhone = document.getElementById('parentPhone').value // <-- جديد

 const { data, error } = await supabaseClient
 .from('students')
 .update({
 full_name: fullName,
 email: email,
 phone: phone,
 parent_phone: parentPhone // <-- جديد
 })
 .eq('id', studentId)

 if (error) throw error

 showStatus('تم تحديث بيانات الطالب بنجاح')
 closeModal('studentModal')
    loadStudents();
 loadStudents()
 } catch (error) {
 console.error('Error updating student:', error)
 showStatus('خطأ في تحديث بيانات الطالب', 'error')
 }
 await updateCurrentTab(); // انتظار انتهاء تحديث كل البيانات
updateCurrentTab(); // بعدين تحديث التبويب الحالي
 }

// --- Students details (canonical showStudentFullDetails implementation exists later) ---

// Function to load students specifically for the Parents tab (with send report button)
async function loadStudentsForParents() {
 const container = document.getElementById('parentsContainer');
 try {
 // ---> Use supabaseClient instead of supabase <---
 const { data: students, error } = await supabaseClient
 .from('students')
 .select('*') // <-- تعديل: جلب parent_phone أيضًا
 .order('full_name', { ascending: true });

 if (error) throw error;

 if (students && students.length > 0) {
 let html = '<div class="table-container"><table id="parentsStudentsTable">';
 html += '<thead><tr><th>الاسم</th><th>البريد الإلكتروني</th><th>رقم هاتف الطالب</th><th>رقم ولي الأمر</th><th>الإجراءات</th></tr></thead><tbody>'; // <-- تعديل العناوين
 students.forEach(student => {
 html += `
 <tr>
 <td>${escapeHtml(student.full_name || '')}</td>
 <td>${escapeHtml(student.email || '')}</td>
 <td>${escapeHtml(student.phone || '')}</td>
 <td>${escapeHtml(student.parent_phone || '')}</td> <!-- جديد -->
 <td>
 <button class="btn btn-primary" onclick="generateAndSendReport('${student.id}')">
 <i class="fas fa-paper-plane"></i> إرسال التقرير
 </button>
 </td>
 </tr>
 `;
 });
 html += '</tbody></table></div>';
 container.innerHTML = html;
 } else {
 container.innerHTML = '<p class="no-data">لا توجد بيانات طلاب.</p>';
 }
 } catch (error) {
 console.error('Error loading students for parents:', error);
 showStatus('حدث خطأ أثناء تحميل بيانات الطلبة.', 'error');
        await updateCurrentView();
        await updateCurrentView()
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
 container.innerHTML = '<p class="no-data">فشل تحميل البيانات.</p>';
 }
}

// ...existing code...
async function loadStudentsForParents() {
  const container = document.getElementById('parentsStudentsContainer');
  if (!container) {
    console.error("عنصر 'parentsStudentsContainer' غير موجود في DOM.");
    return;
  }
  container.innerHTML = `
    <div class="loading">
      <div class="loading-spinner"></div>
      <p>جاري تحميل بيانات الطلاب...</p>
    </div>
  `;
  try {
    // جلب بيانات الطلاب من Supabase
    const { data, error } = await supabaseClient
      .from('students')
      .select('*')
      .order('full_name', { ascending: true });
    if (error) throw error;

    if (!data || data.length === 0) {
      container.innerHTML = `<p class="no-data">لا يوجد طلاب مسجلين.</p>`;
      return;
    }

    // بناء جدول الطلاب مع زر إرسال التقرير
    let html = `<table>
      <thead>
        <tr>
          <th>الاسم</th>
          <th>رقم ولي الأمر</th>
          <th>إرسال تقرير واتساب</th>
        </tr>
      </thead>
      <tbody>
    `;
    for (const student of data) {
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
    }
    html += `</tbody></table>`;
    container.innerHTML = html;
  } catch (err) {
    container.innerHTML = `<p class="no-data">حدث خطأ أثناء تحميل بيانات الطلاب.</p>`;
    console.error("خطأ في تحميل بيانات أولياء الأمور:", err);
  }
}
// ...existing code...

// Function to filter students in the Parents tab
function filterParents() {
 const searchTerm = document.getElementById('parentSearch').value.toLowerCase();
 const table = document.getElementById('parentsStudentsTable');
 if (!table) return;
 const rows = table.getElementsByTagName('tr');

 for (let i = 1; i < rows.length; i++) { // Start from 1 to skip header
 const cells = rows[i].getElementsByTagName('td');
 let found = false;
 // تعديل: تضمين رقم ولي الأمر في البحث
 for (let j = 0; j < cells.length - 1; j++) { // Exclude the last cell (actions)
 if (cells[j].textContent.toLowerCase().includes(searchTerm)) {
 found = true;
 break;
 }
 }
 rows[i].style.display = found ? '' : 'none';
 }
}

// --- WhatsApp Report Generation and Sending ---

// Function to generate a comprehensive report for a student and send via WhatsApp
async function generateAndSendReport(studentId) {
 try {
 // Fetch student details (include parent_phone and other fields)
 const { data: student, error: studentError } = await supabaseClient
 .from('students')
 .select('*')
 .eq('id', studentId)
 .single();

 if (studentError) throw studentError;

 // التحقق من وجود بيانات الطالب
 if (!student) {
 showStatus('لم يتم العثور على بيانات الطالب.', 'error');
 console.error('Student data not found for ID:', studentId);
 return;
 }

 // تحديد رقم الهاتف لإرسال التقرير إليه (ولي الأمر أولاً)
 let rawPhoneNumber = student.parent_phone || student.phone;

 // التحقق من وجود رقم الهاتف: نستخدم رقم ولي الأمر أولاً ثم رقم الطالب، وإلا نوقف الإرسال
 if (!rawPhoneNumber) {
   showStatus('لا يوجد رقم هاتف للطالب أو ولي الأمر. لا يمكن إرسال التقرير.', 'warning');
   console.warn('No phone number found for student ID:', studentId);
   return;
 }

 // معالجة رقم الهاتف لتحويله إلى صيغة E.164 الدولية (+20xxxxxxxxx) لمصر
 let formattedPhoneNumber = '';
 // إزالة أي مسافات أو شرطات
 rawPhoneNumber = rawPhoneNumber.replace(/\s+/g, '').replace(/-/g, '');

 if (rawPhoneNumber.startsWith('+20')) {
 // بالفعل بتنسيق E.164
 formattedPhoneNumber = rawPhoneNumber;
 } else if (rawPhoneNumber.startsWith('0')) {
 // رقم محلي مصري يبدأ بـ 0، نحوله إلى دولي
 formattedPhoneNumber = '+20' + rawPhoneNumber.substring(1);
 } else if (/^[0-9]{10}$/.test(rawPhoneNumber)) {
 // رقم محلي مصري بدون رمز الدولة أو الصفر الم前置 (مفترض أنه رقم مصري)
 formattedPhoneNumber = '+20' + rawPhoneNumber;
 } else if (rawPhoneNumber.startsWith('20') && /^[0-9]{11,12}$/.test(rawPhoneNumber)) {
 // رقم ربما نسي المستخدم إضافة +
 formattedPhoneNumber = '+' + rawPhoneNumber;
 } else {
 // تنسيق غير معروف أو غير مدعوم
 showStatus(`خطأ: رقم الهاتف "${rawPhoneNumber}" غير صحيح أو بتنسيق غير مدعوم.`, 'error');
 console.error('Invalid or unsupported phone number format for student ID:', studentId, 'Number:', rawPhoneNumber);
 return;
 }

 // التحقق النهائي من صيغة E.164 باستخدام تعبير منتظم أكثر مرونة
 // يسمح بـ + متبوعًا بأرقام فقط (10-15 رقمًا إجماليًا بعد +)
 if (!/^\+[0-9]{10,15}$/.test(formattedPhoneNumber)) {
 showStatus(`خطأ: تعذر تنسيق رقم الهاتف "${rawPhoneNumber}" بشكل صحيح لإرسال التقرير.`, 'error');
 console.error('Could not format phone number correctly for student ID:', studentId, 'Raw:', rawPhoneNumber, 'Formatted:', formattedPhoneNumber);
 return;
 }

 const studentName = student.full_name || 'غير محدد';

 // Build student details block (Arabic labels)
 const studentDetails = [];
 studentDetails.push(`الاسم: ${student.full_name || '-'} `);
 if (student.email) studentDetails.push(`البريد الإلكتروني: ${student.email}`);
 if (student.phone) studentDetails.push(`هاتف الطالب: ${student.phone}`);
 if (student.parent_phone) studentDetails.push(`هاتف ولي الأمر: ${student.parent_phone}`);
 if (student.national_id) studentDetails.push(`الرقم القومي/الهوية: ${student.national_id}`);
 if (student.class || student.grade || student.level) {
   const cls = student.class || student.grade || student.level;
   studentDetails.push(`الصف/المستوى: ${cls}`);
 }
 if (student.created_at) {
   const dt = new Date(student.created_at);
   if (!isNaN(dt)) studentDetails.push(`تاريخ التسجيل: ${dt.getDate().toString().padStart(2,'0')}/${(dt.getMonth()+1).toString().padStart(2,'0')}/${dt.getFullYear()}`);
 }
 if (student.status) {
   const s = student.status === 'active' ? 'نشط' : student.status === 'inactive' ? 'غير نشط' : student.status;
   studentDetails.push(`الحالة: ${s}`);
 }

 // Fetch subscriptions
 const { data: subscriptions, error: subsError } = await supabaseClient
 .from('subscriptions')
 .select(`
 subscribed_at,
 status,
 notes,
 course:courses (name)
 `)
 .eq('student_id', studentId);

 if (subsError) throw subsError;

 // Fetch payments
 const { data: payments, error: payError } = await supabaseClient
 .from('payments')
 .select(`
 amount,
 paid_at,
 method,
 total_amount,
 status,
 notes,
 course:courses (name, price)
 `)
 .eq('student_id', studentId);

 if (payError) throw payError;

 // Fetch attendance
 const { data: attendances, error: attError } = await supabaseClient
 .from('attendances')
 .select(`
 date,
 status,
 notes,
 course:courses (name)
 `)
 .eq('student_id', studentId);

 if (attError) throw attError;

 // --- Construct the Report Message ---
 let message = `*تقرير الطالب: ${studentName}*\n\n`;

 // Student Details
 message += `*تفاصيل الطالب:*
 ${studentDetails.join('\n')}
 \n`;

 // Subscriptions Section
 message += "*الاشتراكات:*\n";
 if (subscriptions && subscriptions.length > 0) {
 subscriptions.forEach(sub => {
 const courseName = sub.course?.name || 'غير محدد';
 const statusText = sub.status === 'active' ? 'نشط' : sub.status === 'inactive' ? 'غير نشط' : sub.status || 'غير محدد';
 let dateStr = 'غير محدد';
 if (sub.subscribed_at) {
 const dateObj = new Date(sub.subscribed_at);
 if (!isNaN(dateObj)) {
 dateStr = `${dateObj.getDate().toString().padStart(2, '0')}/${(dateObj.getMonth() + 1).toString().padStart(2, '0')}/${dateObj.getFullYear()}`;
 }
 }
 message += ` - دورة: ${courseName}\n تاريخ: ${dateStr}\n حالة: ${statusText}\n`;
 if (sub.notes) message += ` ملاحظات: ${sub.notes}\n`;
 message += "\n";
 });
 } else {
 message += " لا توجد اشتراكات.\n\n";
 }

 // Payments Section (include remaining per payment and total remaining)
 message += "*المدفوعات:*\n";
 if (payments && payments.length > 0) {
   let totalRemaining = 0;
   payments.forEach(pay => {
     const courseName = pay.course?.name || 'غير محدد';
     const rawMethod = pay.method || pay.payment_method || pay.pay_method || '';
     const methodText = rawMethod === 'cash' ? 'نقداً' : rawMethod === 'card' ? 'بطاقة' : rawMethod === 'transfer' ? 'تحويل' : rawMethod || 'غير محددة';
     const statusText = pay.status === 'paid' ? 'مدفوع' : pay.status === 'pending' ? 'معلق' : pay.status === 'cancelled' ? 'ملغى' : pay.status || 'غير محددة';
     let dateStr = 'غير محدد';
     if (pay.paid_at) {
       const dateObj = new Date(pay.paid_at);
       if (!isNaN(dateObj)) {
         dateStr = `${dateObj.getDate().toString().padStart(2, '0')}/${(dateObj.getMonth() + 1).toString().padStart(2, '0')}/${dateObj.getFullYear()} ${dateObj.getHours().toString().padStart(2, '0')}:${dateObj.getMinutes().toString().padStart(2, '0')}`;
       }
     }
     // Determine amounts: amount = paid amount, total_amount = expected/total
     const paidAmount = parseFloat(pay.amount || 0) || 0;
     const totalAmount = parseFloat(pay.total_amount || pay.course?.price || 0) || 0;
     const remaining = Math.max(0, totalAmount - paidAmount);
     totalRemaining += remaining;

  message += ` - دورة: ${courseName}\n إجمالي الدورة: ${totalAmount.toFixed(2)} ج.م\n مدفوع: ${paidAmount.toFixed(2)} ج.م\n متبقي: ${remaining.toFixed(2)} ج.م\n تاريخ: ${dateStr}\n طريقة: ${methodText}\n حالة: ${statusText}\n`;
  if (pay.notes) message += ` ملاحظات: ${pay.notes}\n`;
     message += "\n";
   });

   // overall remaining summary
   message += `المتبقي الكلي: ${totalRemaining.toFixed(2)} ج.م\n\n`;
 } else {
   message += " لا توجد مدفوعات.\n\n";
 }

 // Attendance Section (detailed list + summary)
 message += "*الحضور:*\n";
 if (attendances && attendances.length > 0) {
   // list latest up to 12 records with Arabic status
   const statusMap = {
     present: 'حاضر',
     absent: 'غائب',
     late: 'متأخر',
     excused: 'معذور',
     unknown: 'غير معروف'
   };
   const recent = attendances.slice(0, 12);
   recent.forEach(a => {
     const d = a.date || (a.created_at ? new Date(a.created_at).toISOString().split('T')[0] : '-');
     const st = statusMap[a.status] || (a.status ? a.status : 'غير معروف');
     message += ` - ${d}: ${st}`;
     if (a.notes) message += ` (ملاحظة: ${a.notes})`;
     message += '\n';
   });
   // summary counts
   const presentCount = attendances.filter(a => a.status === 'حاضر').length;
   const absentCount = attendances.filter(a => a.status === 'غائب').length;
   const lateCount = attendances.filter(a => a.status === 'متأخر').length;
   message += `\n الملخص:\n - حاضر: ${presentCount} مرة\n - غائب: ${absentCount} مرة\n - متأخر: ${lateCount} مرة\n\n`;
 } else {
   message += " لا توجد بيانات حضور.\n\n";
 }

 message += "\n*تم إرسال التقرير من أكاديمية أسيوط.*";

 // Show plain-text WhatsApp preview (no PDF)
 if (typeof showWhatsAppPreview === 'function') {
   showWhatsAppPreview(formattedPhoneNumber, message, studentName);
   showStatus(`جاهز: عرض معاينة رسالة واتساب لـ ${studentName} (${formattedPhoneNumber})`, 'success');
 } else {
   const encodedMessage = encodeURIComponent(message);
   const whatsappUrl = `https://wa.me/${encodeURIComponent(formattedPhoneNumber)}?text=${encodedMessage}`;
   window.open(whatsappUrl, '_blank');
   showStatus(`جارٍ فتح الواتساب لإرسال التقرير إلى ${studentName} (${formattedPhoneNumber})...`, 'success');
 }

 } catch (error) {
 console.error('Error generating or sending report for student ID:', studentId, error);
 // Provide more specific error feedback
 if (error.message && (error.message.includes('phone') || error.message.includes('column') || error.message.includes('relation'))) {
 showStatus('خطأ: يوجد خطأ في بيانات التقرير أو رقم الهاتف.', 'error');
 } else {
 showStatus('حدث خطأ أثناء إنشاء أو إرسال التقرير. يرجى المحاولة لاحقًا.', 'error');
 }
 }
}

// Ensure setActiveLink is defined or use the existing one
// This function should remove 'active' class from all nav-links and add it to the clicked one
function setActiveLink(element) {
 // Remove active class from all links
 document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
 // Add active class to the clicked link
 element.classList.add('active');
}

// Helper function to escape HTML (prevents XSS)
function escapeHtml(text) {
 if (!text) return '';
 return text
 .replace(/&/g, "&amp;")
 .replace(/</g, "<")
 .replace(/>/g, ">")
 .replace(/"/g, "&quot;")
 .replace(/'/g, "&#039;");
}

// --- End of New Functions ---

async function showStudentFullDetails(studentId) {
  try {
    const modal = document.getElementById('studentDetailModal');
    modal.style.display = 'flex';
    const content = document.getElementById('studentDetailContent');
    content.innerHTML = '<div class="loading"><div class="loading-spinner"></div><p>جارٍ تحميل كل بيانات الطالب...</p></div>';

    const tables = [
      { name: 'students', filter: { id: studentId } },
      { name: 'subscriptions', filter: { student_id: studentId }, join: 'courses(name)' },
      { name: 'payments', filter: { student_id: studentId }, join: 'courses(name)' },
      { name: 'attendances', filter: { student_id: studentId }, join: 'courses(name), lessons(title)' }
    ];

    let allData = {};

    // جلب البيانات الأساسية
    for (const tbl of tables) {
      let query = supabaseClient.from(tbl.name).select(tbl.join ? `*, ${tbl.join}` : '*');
      Object.keys(tbl.filter).forEach(key => {
        query = query.eq(key, tbl.filter[key]);
      });
      const { data, error } = await query;
      if (error) console.warn(`خطأ في جلب بيانات ${tbl.name}:`, error);
      allData[tbl.name] = data || [];
    }

    // جلب بيانات الاختبارات مع أسماء الكورسات
    const { data: examScoresData, error: examError } = await supabaseClient
      .from('exam_scores')
      .select(`
        id,
        score,
        exam_id,
        student_id,
        exams(
          id,
          title,
          max_score,
          module_id,
          course_id,
          courses(
            id,
            name
          )
        )
      `)
      .eq('student_id', studentId);

    if (examError) {
      console.error('خطأ في جلب بيانات exam_scores:', examError);
      allData['exam_scores'] = [];
    } else {
      // جلب أسماء الوحدات بشكل منفصل (باستخدام title بدلاً من name)
      const moduleIds = [...new Set(examScoresData
        .map(e => e.exams?.module_id)
        .filter(Boolean))];

      let modulesMap = {};
      if (moduleIds.length) {
        const { data: modulesData, error: modulesError } = await supabaseClient
          .from('modules')
          .select('id, title')
          .in('id', moduleIds);

        if (!modulesError && modulesData) {
          modulesMap = Object.fromEntries(
            modulesData.map(m => [m.id, m.title || '---'])
          );
        } else {
          console.error('خطأ في جلب أسماء الوحدات:', modulesError);
        }
      }

      // معالجة بيانات الاختبارات
      allData['exam_scores'] = examScoresData.map(e => ({
        exam_title: e.exams?.title || '---',
        course_name: e.exams?.courses?.name || '---',
        unit_name: e.exams?.module_id ? (modulesMap[e.exams.module_id] || '---') : '---',
        grade: e.score ?? '-',
        full_mark: e.exams?.max_score ?? '-'
      }));
    }

    const student = allData['students'][0] || {};

    content.innerHTML = `
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
          <p><strong>تاريخ التسجيل:</strong> ${student.created_at ? formatDate(student.created_at) : '-'}</p>
        </div>
        ${generateSection('سجل الحضور', allData['attendances'], generateAttendanceTable)}
        ${generateSection('الاشتراكات', allData['subscriptions'], generateSubscriptionsList)}
        ${generateSection('المدفوعات', allData['payments'], generatePaymentsList)}
        ${generateSection('الاختبارات', allData['exam_scores'], generateExamsTable)}

        <div style="text-align:center; margin-top:20px;">
          <button class="btn btn-primary" onclick="printStudentDetails('${(student.full_name || '').replace(/'/g, "\\'")}')">طباعة جميع البيانات</button>
        </div>
      </div>`;
  } catch (err) {
    console.error('حدث خطأ أثناء جلب بيانات الطالب:', err);
    const content = document.getElementById('studentDetailContent');
    content.innerHTML = '<div class="error">حدث خطأ أثناء تحميل بيانات الطالب</div>';
  }
}

// ----- WhatsApp preview helper (used by generateAndSendReport) -----
function showWhatsAppPreview(phone, message, studentName) {
  try {
    const modal = document.getElementById('waPreviewModal');
    const phoneEl = document.getElementById('waPreviewPhone');
    const msgEl = document.getElementById('waPreviewMessage');
    const copyBtn = document.getElementById('waCopyBtn');
    const openBtn = document.getElementById('waOpenBtn');
    const closeBtn = document.getElementById('waCloseBtn');
    const xBtn = document.getElementById('waPreviewClose');
    if (!modal || !phoneEl || !msgEl) {
      // fallback: open wa.me
      const u = `https://wa.me/${encodeURIComponent(phone)}?text=${encodeURIComponent(message)}`;
      window.open(u, '_blank');
      return;
    }

    phoneEl.textContent = `الوجهة: ${phone}`;
    msgEl.value = message;
    modal.style.display = 'flex';

    function closeModal() {
      modal.style.display = 'none';
    }

    // single-use handlers
    const onCopy = () => {
      try {
        navigator.clipboard.writeText(message);
        showStatus('تم نسخ نص الرسالة للحافظة.', 'success');
      } catch (e) {
        console.warn('Clipboard copy failed', e);
        showStatus('تم نسخ النص (طريق بديل).', 'success');
        const ta = document.createElement('textarea');
        ta.value = message;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
      }
    };

    const onOpen = () => {
      const encoded = encodeURIComponent(message);
      const url = `https://wa.me/${encodeURIComponent(phone)}?text=${encoded}`;
      window.open(url, '_blank');
      showStatus(`جارٍ فتح واتساب لإرسال التقرير إلى ${studentName}...`, 'success');
      closeModal();
    };

    const onClose = () => { closeModal(); };

    copyBtn && copyBtn.addEventListener('click', onCopy, { once: true });
    openBtn && openBtn.addEventListener('click', onOpen, { once: true });
    closeBtn && closeBtn.addEventListener('click', onClose, { once: true });
    xBtn && xBtn.addEventListener('click', onClose, { once: true });

  } catch (err) {
    console.error('showWhatsAppPreview error', err);
    const url = `https://wa.me/${encodeURIComponent(phone)}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  }
}

// ...pdf helpers removed

function generateSection(title, data, renderer) {
  if (!data || !data.length) return '';
  return `<div class="detail-section">
    <h4>${title} (${data.length})</h4>
    ${renderer(data)}
  </div>`;
}

function generateAttendanceTable(data) {
  const statusMap = {
    present: 'حاضر',
    absent: 'غائب',
    late: 'متأخر',
    excused: 'معذور'
  };

  const rows = data.map(att => {
    const title = att.lesson_id && att.lessons?.title ? att.lessons.title : att.courses?.name || '---';
    const date = formatDate(att.date);
    const status = statusMap[att.status] || (att.status ? att.status : 'غير معروف');
    const notes = att.notes || '-';
    return `<tr><td>${escapeHtml(title)}</td><td>${escapeHtml(date)}</td><td>${escapeHtml(status)}</td><td>${escapeHtml(notes)}</td></tr>`;
  }).join('');

  return `<table border="1" style="width:100%; border-collapse:collapse;">
    <thead><tr><th>الدورة/الدرس</th><th>التاريخ</th><th>الحالة</th><th>ملاحظات</th></tr></thead>
    <tbody>
      ${rows}
    </tbody>
  </table>`;
}

function generateSubscriptionsList(data) {
  return `<ul>${data.map(sub => `<li>${sub.courses?.name || '---'} - ${formatDate(sub.subscribed_at)} - (${sub.status})</li>`).join('')}</ul>`;
}

function generateExamsTable(data) {
  if (!data || data.length === 0) return '<p>لا توجد اختبارات.</p>';
  return `<table style="width:100%; border-collapse:collapse;">
    <thead>
      <tr>
        <th>عنوان الاختبار</th>
        <th>الدورة</th>
        <th>الوحدة</th>
        <th>الدرجة</th>
        <th>الدرجة الكاملة</th>
      </tr>
    </thead>
    <tbody>
      ${data.map(exam => `
        <tr>
          <td>${exam.exam_title || '-'}</td>
          <td>${exam.course_name || '-'}</td>
          <td>${exam.unit_name || '-'}</td>
          <td>${exam.grade}</td>
          <td>${exam.full_mark}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>`;
}

function generatePaymentsList(data) {
  if (!data || data.length === 0) return '<p>لا توجد مدفوعات.</p>';
  return `<table style="width:100%; border-collapse:collapse;">
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
        return `<tr>
          <td>${pay.courses?.name || '-'}</td>
          <td>${formatCurrency(pay.amount).replace('SAR', 'ج.م').replace('EGP', 'ج.م')}</td>
          <td>${formatCurrency(pay.total_amount).replace('SAR', 'ج.م').replace('EGP', 'ج.م')}</td>
          <td>${formatCurrency(remaining).replace('SAR', 'ج.م').replace('EGP', 'ج.م')}</td>
          <td>${pay.method === 'cash' ? 'نقداً' : pay.method === 'card' ? 'بطاقة' : 'تحويل'}</td>
          <td>${formatDate(pay.paid_at)}</td>
        </tr>`;
      }).join('')}
    </tbody>
  </table>`;
}


function printStudentDetails(studentName) {
  const printWindow = window.open('', '_blank');
  const logoElement = document.getElementById('institutionLogo');
  const logoSrc = logoElement ? logoElement.src : './logo2.jpg';

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
          margin: 0;
          padding: 20px;
          background: #fff;
          color: #333;
        }
        .print-header {
          text-align: center;
          margin-bottom: 20px;
          padding-bottom: 15px;
          border-bottom: 2px solid #f97316;
        }
        .logo-section {
          margin-bottom: 15px;
        }
        .logo-section img {
          max-width: 120px;
          height: auto;
          display: block;
          margin: 0 auto;
        }
        .student-name {
          color: #1f2937;
          margin: 10px 0;
          font-size: 1.5rem;
        }
        .divider {
          width: 60px;
          height: 3px;
          background: #f97316;
          margin: 15px auto;
          border-radius: 3px;
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
          font-size: 1.2rem;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 15px 0;
          font-size: 0.9rem;
        }
        th, td {
          border: 1px solid #d1d5db;
          padding: 10px 8px;
          text-align: center;
        }
        th {
          background-color: #f9fafb;
          font-weight: 600;
        }
        tr:nth-child(even) {
          background-color: #f9fafb;
        }
        ul {
          padding-right: 20px;
        }
        li {
          margin-bottom: 8px;
        }
        p {
          line-height: 1.6;
        }
        strong {
          color: #1f2937;
        }
        @media print {
          body {
            padding: 10px;
            font-size: 12px;
          }
          .logo-section img {
            max-width: 100px !important;
            display: block !important;
          }
          table {
            font-size: 11px;
          }
          th, td {
            padding: 6px 4px;
          }
          .no-print {
            display: none !important;
          }
          @page {
            margin: 0.5cm;
          }
        }
        @media (max-width: 768px) {
          body {
            padding: 10px;
          }
          table {
            font-size: 0.8rem;
          }
          th, td {
            padding: 8px 4px;
          }
        }
        @media (max-width: 480px) {
          body {
            padding: 5px;
          }
          .print-header {
            margin-bottom: 10px;
          }
          .student-name {
            font-size: 1.2rem;
          }
          table {
            font-size: 0.7rem;
          }
          th, td {
            padding: 6px 3px;
          }
        }
      </style>
    </head>
    <body>
  `);

  printWindow.document.write(document.getElementById('studentDetailContent').innerHTML);
  printWindow.document.write(`
    </body>
    </html>
  `);
  printWindow.document.close();

  setTimeout(() => {
    printWindow.focus();
    printWindow.print();
  }, 500);
}

// دوال مساعدة
// formatCurrency: return amounts in Egyptian Pounds (EGP) with Arabic formatting and 'ج.م' suffix
function formatCurrency(amount) {
  // Treat null/undefined as 0
  if (amount === null || typeof amount === 'undefined') amount = 0;
  const num = Number(amount) || 0;
  // Format with Arabic (Egypt) thousands separator and two decimals
  const formatted = num.toLocaleString('ar-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${formatted} ج.م`;
}

// Canonical date formatter used across the app (Egypt Arabic format)
function formatDate(dateString) {
  if (!dateString) return '-';
  const date = new Date(dateString);
  if (isNaN(date)) return '-';
  return date.toLocaleDateString('ar-EG', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// 
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

// (canonical formatDate is defined later to use ar-EG numeric format)

// =============================================================================
// معالج البحث
// =============================================================================
// searchHandler already defined above; duplicate removed.

// =============================================================================
// تحميل وعرض قائمة الاختبارات
// =============================================================================
async function loadTeacherExamsForSecretary(searchQuery = '') {
 const container = document.getElementById('teacherExamsContainer');
 if (!container) return;

 container.innerHTML = '<p>⏳ جارٍ تحميل بيانات الاختبارات...</p>';

 try {
 // ✅ لا تستخدم join في select
 let query = supabaseClient
 .from('exams')
 .select('id, title, max_score, date, course_id, module_id')
 .order('date', { ascending: false });

 if (searchQuery.trim() !== '') {
 const q = searchQuery.trim();
 // ✅ بدون أقواس، بدون join
 query = query.or(`title.ilike.%${q}%`);
 }

 const { data, error } = await query;
 if (error) throw error;

 if (!data || data.length === 0) {
 container.innerHTML = `
 <p>⚠️ لا توجد اختبارات.</p>
 <button class="btn btn-primary" onclick="showAddExamModal()">
 <i class="fas fa-plus"></i> إضافة اختبار جديد
 </button>
 `;
 return;
 }

 // ✅ ملء أسماء الكورسات والوحدات من المتغيرات المحلية
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

 data.forEach(exam => {
 // 🔍 البحث في `courses` و `modules` المحليين
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

 html += `</tbody></table></div>`;
 container.innerHTML = html;

 // ربط شريط البحث
 const searchInput = document.getElementById('teacherExamSearch');
 if (searchInput) {
 searchInput.removeEventListener('input', searchHandler);
 searchInput.addEventListener('input', searchHandler);
 }

 } catch (err) {
 console.error('خطأ في تحميل الاختبارات:', err);
 container.innerHTML = '<p>❌ حدث خطأ أثناء تحميل الاختبارات.</p>';
 showStatus('فشل في تحميل الاختبارات', 'error');
 }
}

function searchHandler() {
 loadTeacherExamsForSecretary(this.value);
}
// =============================================================================
// عرض نموذج إضافة اختبار
// =============================================================================
async function showAddExamModal() {
    try {
        // تحميل أحدث الكورسات والوحدات
        await loadCourses();
        await loadModules();

        // تحديث قائمة الكورسات
        const courseSelect = document.getElementById('examCourse');
        if (!courseSelect) {
            console.error("عنصر examCourse غير موجود في DOM");
            showStatus('تعذر العثور على قائمة الكورسات', 'error');
            return;
        }

        courseSelect.innerHTML = '<option value="">اختر كورساً</option>';
        courses.forEach(course => {
            const option = document.createElement('option');
            option.value = course.id;
            option.textContent = course.name;
            courseSelect.appendChild(option);
        });

        // تحديث قائمة الوحدات بناءً على أول كورس (إن وجد)
        const moduleSelect = document.getElementById('examModule');
        if (!moduleSelect) {
            console.error("عنصر examModule غير موجود في DOM");
            return;
        }

        if (courseSelect.value) {
            updateModuleSelect(courseSelect.value);
        } else {
            moduleSelect.innerHTML = '<option value="">اختر وحدة</option>';
        }

        // ربط حدث تغيير الكورس لتحديث الوحدات
        courseSelect.onchange = function () {
            updateModuleSelect(this.value);
        };

        // فتح المودال يدويًا
        const modal = document.getElementById('examModal');
        if (modal) {
            modal.style.display = 'flex';
        } else {
            console.error("عنصر examModal غير موجود في DOM");
        }

    } catch (error) {
        console.error("خطأ أثناء فتح مودال إضافة الاختبار:", error);
        showStatus('حدث خطأ أثناء تحميل البيانات', 'error');
    }
}

function updateModuleSelect(courseId) {
    const moduleSelect = document.getElementById('examModule');
    moduleSelect.innerHTML = '<option value="">اختر وحدة</option>';

    // فلترة الوحدات الخاصة بالكورس المحدد
    const filteredModules = modules.filter(m => m.course_id == courseId);

    if (filteredModules.length > 0) {
        filteredModules.forEach(module => {
            const option = document.createElement('option');
            option.value = module.id;
            option.textContent = module.title; // استخدام العمود الصحيح
            moduleSelect.appendChild(option);
        });
    } else {
        moduleSelect.innerHTML = '<option value="">لا توجد وحدات</option>';
    }
}

// =============================================================================
// عرض نموذج تعديل اختبار
// =============================================================================
async function showEditExamModal(examId) {
 const { data, error } = await supabaseClient
 .from('exams')
 .select('*')
 .eq('id', examId)
 .single();

 if (error) {
 showStatus('فشل في جلب بيانات الاختبار', 'error');
 return;
 }

 document.getElementById('examId').value = data.id;
 document.getElementById('examTitle').value = data.title;
 document.getElementById('examMaxScore').value = data.max_score;
 document.getElementById('examDate').value = data.date;
 document.getElementById('examCourse').value = data.course_id;

 const moduleSelect = document.getElementById('examModule');
 moduleSelect.innerHTML = '<option value="">اختر وحدة</option>';
 const filteredModules = modules.filter(m => m.course_id == data.course_id);
 filteredModules.forEach(mod => {
 const option = document.createElement('option');
 option.value = mod.id;
 option.textContent = mod.title;
 if (mod.id === data.module_id) option.selected = true;
 moduleSelect.appendChild(option);
 });

 document.getElementById('examModal').style.display = 'block';
 await updateCurrentTab(); // انتظار انتهاء تحديث كل البيانات
updateCurrentTab(); // بعدين تحديث التبويب الحالي
}

// =============================================================================
// حفظ (إضافة أو تعديل) اختبار
// ============================================================================
async function saveExam() {
 const examId = document.getElementById('examId').value;
 const title = document.getElementById('examTitle').value.trim();
 const maxScore = parseFloat(document.getElementById('examMaxScore').value);
 const courseId = document.getElementById('examCourse').value;
 const moduleId = document.getElementById('examModule').value;

 if (!title || !maxScore || !courseId || !moduleId) {
 showStatus('يرجى ملء جميع الحقول المطلوبة.', 'error');
        await updateCurrentView()
        
        
        
        
        
        
        
        
 return;
 }

 try {
 const examData = {
 title,
 max_score: maxScore,
 course_id: courseId,
 module_id: moduleId
 };

 const { error } = examId
 ? await supabaseClient.from('exams').update(examData).eq('id', examId)
 : await supabaseClient.from('exams').insert([examData]);

 if (error) throw error;

 showStatus(`تم ${examId ? 'تحديث' : 'إضافة'} الاختبار بنجاح.`);
 closeModal('examModal');
 loadTeacherExamsForSecretary();
 } catch (err) {
 console.error('خطأ في حفظ الاختبار:', err);
 showStatus('حدث خطأ أثناء حفظ الاختبار.', 'error');
 }
}

// --- Delete student (add near other delete functions) ---
async function deleteStudent(studentId) {
 if (!confirm('هل أنت متأكد من حذف هذا الطالب؟ سيتم أيضاً حذف السجلات المرتبطة (حضور، دفعات، اشتراكات) إذا اخترت المتابعة.')) return;

 try {
 // 1) افحص وجود تبعيات
 const [{ data: attData }, { data: payData }, { data: subsData }] = await Promise.all([
 supabaseClient.from('attendances').select('id').eq('student_id', studentId).limit(1),
 supabaseClient.from('payments').select('id').eq('student_id', studentId).limit(1),
 supabaseClient.from('subscriptions').select('id').eq('student_id', studentId).limit(1)
 ]);

 const hasDeps = (attData && attData.length) || (payData && payData.length) || (subsData && subsData.length);

 if (hasDeps) {
 const proceed = confirm('يوجد سجلات مرتبطة بهذا الطالب (حضور/دفع/اشتراك). هل تريد حذف هذه السجلات أولاً ثم حذف الطالب؟ اختر "موافق" للحذف الكامل أو "إلغاء" لإيقاف العملية.');
 if (!proceed) {
 showStatus('تم إلغاء حذف الطالب', 'info');
        await updateCurrentView()
        
        
        
        
        
        
        
        
 return;
 }

 // حذف التبعيات بأمان (ترتيب منطقي)
 const delAttendances = await supabaseClient.from('attendances').delete().eq('student_id', studentId);
 if (delAttendances.error) throw delAttendances.error;

 const delPayments = await supabaseClient.from('payments').delete().eq('student_id', studentId);
 if (delPayments.error) throw delPayments.error;

 const delSubscriptions = await supabaseClient.from('subscriptions').delete().eq('student_id', studentId);
 if (delSubscriptions.error) throw delSubscriptions.error;
 }

 // أخيراً حذف الطالب
 const { error } = await supabaseClient.from('students').delete().eq('id', studentId);
 if (error) throw error;

 showStatus('تم حذف الطالب وجميع السجلات المرتبطة (إن وجدت).');
 loadStudents();
 } catch (err) {
 console.error('Error deleting student:', err);
 // إن كان خطأ FK نعرض رسالة أو نصيحة
 if (err.code === '23503') {
 showStatus('لا يمكن حذف الطالب لأن هناك علاقات مرجعية لم تُحذف. حاول حذف الحضور/المدفوعات/الاشتراكات أولاً أو اطلب من المشرف تغيير قواعد الحذف.', 'error');
 } else {
 showStatus(`خطأ في حذف الطالب: ${err.message || err}`, 'error');
 }
 }
 await updateCurrentTab(); // انتظار انتهاء تحديث كل البيانات
updateCurrentTab(); // بعدين تحديث التبويب الحالي // <-- تحديث كامل بعد الحذف
}

// =============================================================================
// حذف اختبار
// =============================================================================
async function deleteExam(examId) {
 if (!confirm('هل أنت متأكد من حذف هذا الاختبار؟')) return;

 const { error } = await supabaseClient.from('exams').delete().eq('id', examId);
 if (error) {
 showStatus('خطأ في الحذف', 'error');
        await updateCurrentView()
        
        
        
        
        
        
        
        
 } else {
 showStatus('تم حذف الاختبار بنجاح');
 loadTeacherExamsForSecretary();
 }
 await updateCurrentTab(); // انتظار انتهاء تحديث كل البيانات
updateCurrentTab(); // بعدين تحديث التبويب الحالي // <-- تحديث كامل بعد حذف الاختبار
}

// 
// Add course
async function addCourse() {
 try {
 const courseName = document.getElementById('courseName').value.trim();
 const description = document.getElementById('courseDescription').value.trim();
 const price = parseFloat(document.getElementById('coursePrice').value) || 0;
 const teacherId = document.getElementById('teacher').value; // قد يكون فارغًا
 const startDate = document.getElementById('startDate').value || null; // قد يكون فارغًا
 const endDate = document.getElementById('endDate').value || null; // قد يكون فارغًا

 // التحقق البسيط من البيانات (يمكنك تحسينه)
 if (!courseName) {
 showStatus('يرجى إدخال اسم الدورة', 'error');
        await updateCurrentView()
        
        
        
        
        
        
        
        
 return;
 }

 const { data, error } = await supabaseClient
 .from('courses')
 .insert([{
 name: courseName,
 description: description,
 price: price,
 teacher_id: teacherId || null, // تأكد من إرسال null إذا كان فارغًا
 start_date: startDate,
 end_date: endDate,
 created_at: new Date().toISOString()
 }])
 .select(); // للحصول على البيانات المُدخلة

 if (error) throw error;

 showStatus('تم إضافة الدورة بنجاح');
 closeModal('courseModal');
 loadCourses(); // إعادة تحميل قائمة الكورسات
 } catch (error) {
 console.error('Error adding course:', error);
 // عرض رسالة خطأ أكثر تفصيلاً
 showStatus(`خطأ في إضافة الدورة: ${error.message || 'حدث خطأ غير معروف'}`, 'error');
 }
 await updateCurrentTab(); // انتظار انتهاء تحديث كل البيانات
updateCurrentTab(); // بعدين تحديث التبويب الحالي
}

 // Show add course modal
function showAddCourseModal() {
 const modal = document.getElementById('courseModal');
 if (!modal) {
 console.error('نافذة courseModal غير موجودة في DOM');
 showStatus('خطأ في فتح نافذة الدورة', 'error');
 return;
 }
 modal.style.display = 'flex'; // أو 'block' حسب تصميمك

 document.getElementById('courseModalTitle').textContent = 'إضافة دورة جديد';
 document.getElementById('courseForm').reset();
 document.getElementById('courseId').value = ''; // تأكد من مسح ID

 // Populate teachers dropdown
 const teacherSelect = document.getElementById('teacher');
 if (teacherSelect) {
 teacherSelect.innerHTML = '<option value="">اختر معلماً</option>';
 teachers.forEach(teacher => {
 const option = document.createElement('option');
 option.value = teacher.id;
 option.textContent = teacher.full_name;
 teacherSelect.appendChild(option);
 });
 }

 document.getElementById('courseForm').onsubmit = async function(e) {
 e.preventDefault();
 await addCourse();
 };
}

// Show edit course modal
function showEditCourseModal(courseId) {
 // التأكد من أن بيانات الكورسات محملة
 if (!courses || courses.length === 0) {
 console.error('بيانات الكورسات غير محملة');
 showStatus('خطأ: بيانات الكورسات غير محملة', 'error');
 return;
 }

 const course = courses.find(c => c.id === courseId);
 if (!course) {
 console.error('الدورة غير موجود', courseId);
 showStatus('الدورة غير موجود', 'error');
 return;
 }

 const modal = document.getElementById('courseModal');
 if (!modal) {
 console.error('نافذة courseModal غير موجودة في DOM');
 showStatus('خطأ في فتح نافذة الدورة', 'error');
 return;
 }

 modal.style.display = 'flex'; // أو 'block' حسب تصميمك

 document.getElementById('courseModalTitle').textContent = 'تعديل بيانات الدورة';
 document.getElementById('courseId').value = course.id;
 document.getElementById('courseName').value = course.name;
 document.getElementById('courseDescription').value = course.description || '';
 document.getElementById('coursePrice').value = course.price || '';
 document.getElementById('startDate').value = course.start_date || '';
 document.getElementById('endDate').value = course.end_date || '';

 // Populate teachers dropdown and select current teacher
 const teacherSelect = document.getElementById('teacher');
 if (teacherSelect) {
 teacherSelect.innerHTML = '<option value="">اختر معلماً</option>';
 // التأكد من أن بيانات المعلمين محملة
 if (teachers && teachers.length > 0) {
 teachers.forEach(teacher => {
 const option = document.createElement('option');
 option.value = teacher.id;
 option.textContent = teacher.full_name;
 if (teacher.id === course.teacher_id) {
 option.selected = true;
 }
 teacherSelect.appendChild(option);
 });
 } else {
 console.warn('بيانات المعلمين غير محملة أو فارغة');
 }
 }

 document.getElementById('courseForm').onsubmit = async function(e) {
 e.preventDefault();
 await updateCourse(courseId);
 };
}

// Load courses
async function loadCourses() {
 try {
 const container = document.getElementById('coursesContainer')
 container.innerHTML = `<div class="loading"><div class="loading-spinner"></div><p>جارٍ تحميل بيانات الكورسات...</p></div>`

 // Get courses with teacher names
 const { data, error } = await supabaseClient
 .from('courses')
 .select(`*, users (full_name)`)
 .order('created_at', { ascending: false })

 if (error) throw error
 courses = data

 // Get teachers for dropdown
 const { data: teachersData, error: teachersError } = await supabaseClient
 .from('users')
 .select('id, full_name')
 .eq('role', 'teacher')

 if (teachersError) throw teachersError
 teachers = teachersData

 container.innerHTML = `
 <div class="table-container">
 <button class="btn btn-primary" onclick="showAddCourseModal()" style="margin-bottom: 20px;">
 <i class="fas fa-plus"></i> إضافة دورة جديد
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
 ${data.map(course => `
 <tr>
 <td><a href="#" onclick="showCourseDetails('${course.id}'); return false;" style="color: var(--primary); text-decoration: underline;">${course.name}</a></td>
 <td>${course.description || '-'}</td>
 <td>${formatCurrency(course.price).replace('SAR', 'ج.م')}</td>
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
 `).join('')}
 </tbody>
 </table>
 </div>
 `
 } catch (error) {
 console.error('Error loading courses:', error)
 document.getElementById('coursesContainer').innerHTML = `<div class="loading"><p>خطأ في تحميل بيانات الكورسات</p></div>`
 showStatus('خطأ في تحميل بيانات الكورسات', 'error')
 }
}
// حذف دورة
async function deleteCourse(courseId) {
 if (!confirm('هل أنت متأكد من حذف هذا الدورة؟ سيتم فحص السجلات المرتبطة أولاً.')) return;

 try {
 // 1) فحص التبعيات
 const [{ data: att }, { data: lessons }, { data: subs }, { data: payments }] = await Promise.all([
 supabaseClient.from('attendances').select('id').eq('course_id', courseId).limit(1),
 supabaseClient.from('lessons').select('id').eq('course_id', courseId).limit(1),
 supabaseClient.from('subscriptions').select('id').eq('course_id', courseId).limit(1),
 supabaseClient.from('payments').select('id').eq('course_id', courseId).limit(1)
 ]);

 const hasDeps = (att && att.length) || (lessons && lessons.length) || (subs && subs.length) || (payments && payments.length);

 if (hasDeps) {
 const proceed = confirm('يوجد سجلات مرتبطة بهذا الدورة (حضور/دروس/اشتراكات/دفعات). اضغط OK لحذف هذه السجلات تلقائياً ثم حذف الدورة، أو Cancel لإلغاء.');
 if (!proceed) {
 showStatus('تم إلغاء حذف الدورة.', 'info');
        await updateCurrentView()
        
        
        
        
        
        
        
        
 return;
 }

 // حذف التبعيات بالترتيب الصحيح
 const delAttendances = await supabaseClient.from('attendances').delete().eq('course_id', courseId);
 if (delAttendances.error) throw delAttendances.error;

 const delPayments = await supabaseClient.from('payments').delete().eq('course_id', courseId);
 if (delPayments.error) throw delPayments.error;

 const delSubscriptions = await supabaseClient.from('subscriptions').delete().eq('course_id', courseId);
 if (delSubscriptions.error) throw delSubscriptions.error;

 const delLessons = await supabaseClient.from('lessons').delete().eq('course_id', courseId);
 if (delLessons.error) throw delLessons.error;

 // إن كان لديك وحدات مرتبطة وترغب بحذفها أيضاً:
 const delModules = await supabaseClient.from('modules').delete().eq('course_id', courseId);
 if (delModules.error) throw delModules.error;
 }

 // الآن حذف الدورة
 const { error } = await supabaseClient.from('courses').delete().eq('id', courseId);
 if (error) throw error;

 showStatus('تم حذف الدورة وكل السجلات المرتبطة (إن وجدت).');
 loadCourses();
 } catch (error) {
 console.error('Error deleting course:', error);
 if (error.code === '23503') {
 showStatus('لا يمكن حذف الدورة بسبب قيود المفتاح الأجنبي. تأكد من حذف السجلات المرتبطة أولاً أو ضبط FK على ON DELETE CASCADE في قاعدة البيانات.', 'error');
 } else {
 showStatus(`خطأ في حذف الدورة: ${error.message || error}`, 'error');
 }
 }
 await updateCurrentTab(); // انتظار انتهاء تحديث كل البيانات
updateCurrentTab(); // بعدين تحديث التبويب الحالي // <-- تحديث كامل بعد الحذف
}
// Filter courses
function filterCourses() {
 const searchTerm = document.getElementById('courseSearch').value.toLowerCase()
 const filteredCourses = courses.filter(course => 
 course.name.toLowerCase().includes(searchTerm) ||
 (course.description && course.description.toLowerCase().includes(searchTerm))
 )
 
 const container = document.getElementById('coursesContainer')
 container.innerHTML = `
 <div class="table-container">
 <button class="btn btn-primary" onclick="showAddCourseModal()" style="margin-bottom: 20px;">
 <i class="fas fa-plus"></i> إضافة دورة جديد
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
 ${filteredCourses.map(course => `
 <tr>
 <td><a href="#" onclick="showCourseDetails('${course.id}'); return false;" style="color: var(--primary); text-decoration: underline;">${course.name}</a></td>
 <td>${course.description || '-'}</td>
 <td>${formatCurrency(course.price).replace('SAR', 'ج.م')}</td>
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
 `).join('')}
 </tbody>
 </table>
 </div>
 `
}

// متغيرات لتخزين الوحدات والدروس الحالية
let currentCourseModules = [];
let currentCourseLessons = [];
let currentCourseId = null; // لتخزين ID الدورة الحالي في نافذة التفاصيل

// دالة لعرض تفاصيل الدورة في Modal جديد
async function showCourseDetails(courseId) {
 const course = courses.find(c => c.id === courseId);
 if (!course) {
 showStatus('الدورة غير موجود', 'error');
 return;
 }

 // تخزين ID الدورة الحالي
 currentCourseId = courseId;

 // ملء بيانات نظرة عامة
 document.getElementById('detailCourseName').textContent = course.name || '-';
 document.getElementById('detailCourseDescription').textContent = course.description || '-';
 document.getElementById('detailCoursePrice').textContent = formatCurrency(course.price).replace('SAR', 'ج.م') || '0.00';
 document.getElementById('detailCourseTeacher').textContent = course.users?.full_name || '-';
 document.getElementById('detailCourseStartDate').textContent = course.start_date ? formatDate(course.start_date) : '-';
 document.getElementById('detailCourseEndDate').textContent = course.end_date ? formatDate(course.end_date) : '-';

 // تعيين عنوان Modal التفاصيل
 document.getElementById('courseDetailTitle').textContent = `تفاصيل الدورة: ${course.name}`;

 // إظهار تبويب "نظرة عامة" وإخفاء الآخرين
 switchCourseDetailTab('overview');

 // فتح Modal التفاصيل
 document.getElementById('courseDetailModal').style.display = 'block';
}

// دالة تبديل علامات التبويب لتفاصيل الدورة
function switchCourseDetailTab(tabName) {
 document.querySelectorAll('.course-detail-tab-content').forEach(content => {
 content.style.display = 'none';
 });
 document.querySelectorAll('.tab-button').forEach(button => {
 button.classList.remove('active');
 });

 const activeTab = document.getElementById(`course${tabName.charAt(0).toUpperCase() + tabName.slice(1)}Tab`);
 if (activeTab) {
 activeTab.style.display = 'block';
 // تفعيل زر التبويب
 const buttons = document.querySelectorAll('.tab-button');
 buttons.forEach(btn => {
 if(btn.textContent.trim() === (tabName === 'overview' ? 'نظرة عامة' : 'الوحدات والدروس')) {
 btn.classList.add('active');
 }
 });

 // تحميل البيانات حسب التبويب
 if(tabName === 'modules' && currentCourseId) {
 loadCourseModulesAndLessons(currentCourseId);
 }
 }
}

// دالة لتحميل الوحدات والدروس الخاصة بكورس معين
async function loadCourseModulesAndLessons(courseId) {
 const modulesListContainer = document.getElementById('modulesList');
 if (!modulesListContainer) return;

 modulesListContainer.innerHTML = '<p class="no-data">جارٍ التحميل...</p>';
 currentCourseModules = [];
 currentCourseLessons = [];

 try {
 // 1. تحميل الوحدات
 const { data: modulesData, error: modulesError } = await supabaseClient
 .from('modules')
 .select('id, title, description, "order"')
 .eq('course_id', courseId)
 .order('"order"', { ascending: true });

 if (modulesError) throw modulesError;
 currentCourseModules = modulesData || [];

 // 2. تحميل جميع الدروس لهذا الدورة
 const { data: lessonsData, error: lessonsError } = await supabaseClient
 .from('lessons')
 .select('id, title, description, date, module_id')
 .eq('course_id', courseId);

 if (lessonsError) throw lessonsError;
 currentCourseLessons = lessonsData || [];

 // 3. عرض الوحدات والدروس
 displayModulesAndLessons();

 } catch (error) {
 console.error('Error loading modules and lessons:', error);
 modulesListContainer.innerHTML = `<p class="no-data error">خطأ في تحميل الوحدات والدروس: ${error.message}</p>`;
 showStatus('خطأ في تحميل بيانات الوحدات', 'error');
 }
}

// دالة لعرض الوحدات والدروس في واجهة المستخدم
function displayModulesAndLessons() {
 const modulesListContainer = document.getElementById('modulesList');
 if (!modulesListContainer) return;

 if (currentCourseModules.length === 0) {
 modulesListContainer.innerHTML = '<p class="no-data">لا توجد وحدات لهذا الدورة بعد.</p>';
 return;
 }

 let modulesHtml = '';
 currentCourseModules.forEach(module => {
 // فلترة الدروس الخاصة بهذه الوحدة
 const moduleLessons = currentCourseLessons.filter(lesson => lesson.module_id === module.id);

 modulesHtml += `
 <div class="module-card" data-module-id="${module.id}">
 <div class="module-header">
 <h4 class="module-title">${module.title}</h4>
 <div class="module-actions">
 <button class="btn btn-secondary btn-sm" onclick="openAddLessonModal('${module.id}')">إضافة درس</button>
 <button class="btn btn-outline" onclick="openEditModuleModal('${module.id}')">تعديل</button>
 <button class="btn btn-danger btn-sm" onclick="deleteModule('${module.id}')">حذف</button>
 </div>
 </div>
 ${module.description ? `<p class="module-description">${module.description}</p>` : ''}
 <div class="lessons-section">
 <h4>الدروس (${moduleLessons.length})</h4>
 <div class="lessons-list">
 ${moduleLessons.length > 0 ?
 moduleLessons.map(lesson => `
 <div class="lesson-item" data-lesson-id="${lesson.id}">
 <div>
 <span class="lesson-title">${lesson.title}</span>
 ${lesson.date ? `<span class="lesson-date">(${formatDate(lesson.date)})</span>` : ''}
 </div>
 <div class="lesson-actions">
 <button class="btn btn-outline btn-xs" onclick="openEditLessonModal('${lesson.id}')">تعديل</button>
 <button class="btn btn-danger btn-xs" onclick="deleteLesson('${lesson.id}')">حذف</button>
 </div>
 </div>
 `).join('') :
 '<p class="no-data">لا توجد دروس في هذه الوحدة.</p>'
 }
 </div>
 </div>
 </div>
 `;
 });

 modulesListContainer.innerHTML = modulesHtml;
}

// --- دوال إدارة الوحدات ---

// فتح Modal إضافة وحدة
async function openAddModuleModal() {
 if (!currentCourseId) {
 showStatus('خطأ: لم يتم تحديد دورة', 'error');
 return;
 }
 document.getElementById('moduleModalTitle').textContent = 'إضافة وحدة جديدة';
 document.getElementById('moduleId').value = '';
 document.getElementById('moduleTitle').value = '';
 document.getElementById('moduleDescription').value = '';
 document.getElementById('moduleOrder').value = '';
 document.getElementById('moduleForm').onsubmit = function(e) {
 e.preventDefault();
 addModule(currentCourseId);
 };
 document.getElementById('moduleModal').style.display = 'block';
 await updateCurrentTab(); // انتظار انتهاء تحديث كل البيانات
updateCurrentTab(); // بعدين تحديث التبويب الحالي
}

// إضافة وحدة جديدة
async function addModule(courseId) {
 try {
 const title = document.getElementById('moduleTitle').value.trim();
 const description = document.getElementById('moduleDescription').value.trim();
 const order = parseInt(document.getElementById('moduleOrder').value) || null;

 if (!title) {
 showStatus('يرجى إدخال اسم الوحدة', 'error');
 return;
 }

 const { data, error } = await supabaseClient
 .from('modules')
 .insert([
 {
 course_id: courseId,
 title: title,
 description: description,
 "order": order
 }
 ])
 .select();

 if (error) throw error;

 showStatus('تم إضافة الوحدة بنجاح');
 closeModal('moduleModal');
 // إعادة تحميل الوحدات والدروس
 await loadCourseModulesAndLessons(courseId);

 } catch (error) {
 console.error('Error adding module:', error);
 showStatus(`خطأ في إضافة الوحدة: ${error.message}`, 'error');
 }
}

// فتح Modal تعديل وحدة
async function openEditModuleModal(moduleId) {
 try {
 // جلب بيانات الوحدة
 const { data, error } = await supabaseClient
 .from('modules')
 .select('title, description, "order"')
 .eq('id', moduleId)
 .single();

 if (error) throw error;
 if (!data) {
 showStatus('الوحدة غير موجودة', 'error');
 return;
 }

 document.getElementById('moduleModalTitle').textContent = 'تعديل الوحدة';
 document.getElementById('moduleId').value = moduleId;
 document.getElementById('moduleTitle').value = data.title;
 document.getElementById('moduleDescription').value = data.description || '';
 document.getElementById('moduleOrder').value = data.order || '';

 document.getElementById('moduleForm').onsubmit = function(e) {
 e.preventDefault();
 updateModule(moduleId);
 };

 document.getElementById('moduleModal').style.display = 'block';

 } catch (error) {
 console.error('Error fetching module for edit:', error);
 showStatus(`خطأ في جلب بيانات الوحدة: ${error.message}`, 'error');
 }
}

// تحديث وحدة
async function updateModule(moduleId) {
 try {
 const title = document.getElementById('moduleTitle').value.trim();
 const description = document.getElementById('moduleDescription').value.trim();
 const order = parseInt(document.getElementById('moduleOrder').value) || null;

 if (!title) {
 showStatus('يرجى إدخال اسم الوحدة', 'error');
 return;
 }

 const { data, error } = await supabaseClient
 .from('modules')
 .update({
 title: title,
 description: description,
 "order": order
 })
 .eq('id', moduleId);

 if (error) throw error;

 showStatus('تم تحديث الوحدة بنجاح');
 closeModal('moduleModal');
 // إعادة تحميل الوحدات والدروس
 if (currentCourseId) {
 await loadCourseModulesAndLessons(currentCourseId);
 }

 } catch (error) {
 console.error('Error updating module:', error);
 showStatus(`خطأ في تحديث الوحدة: ${error.message}`, 'error');
 }
 await updateCurrentTab(); // انتظار انتهاء تحديث كل البيانات
updateCurrentTab(); // بعدين تحديث التبويب الحالي // <-- تحديث كامل بعد التحديث
}

// حذف وحدة
async function deleteModule(moduleId) {
 if (!confirm('هل أنت متأكد من حذف هذه الوحدة وكل الدروس المرتبطة بها؟')) {
 return;
 }

 try {
 const { error } = await supabaseClient
 .from('modules')
 .delete()
 .eq('id', moduleId);

 if (error) throw error;

 showStatus('تم حذف الوحدة بنجاح');
 // إعادة تحميل الوحدات والدروس
 if (currentCourseId) {
 await loadCourseModulesAndLessons(currentCourseId);
 }

 } catch (error) {
 console.error('Error deleting module:', error);
 showStatus(`خطأ في حذف الوحدة: ${error.message}`, 'error');
 }
 await updateCurrentTab(); // انتظار انتهاء تحديث كل البيانات
updateCurrentTab(); // بعدين تحديث التبويب الحالي // <-- تحديث كامل بعد الحذف
}

// --- دوال إدارة الدروس ---

// فتح Modal إضافة درس (مرتبطة بوحدة معينة)
async function openAddLessonModal(moduleId) {
 document.getElementById('lessonModalTitle').textContent = 'إضافة درس جديد';
 document.getElementById('lessonId').value = '';
 document.getElementById('lessonModuleId').value = moduleId;
 document.getElementById('lessonTitle').value = '';
 document.getElementById('lessonDescription').value = '';
 document.getElementById('lessonDate').value = '';

 document.getElementById('lessonForm').onsubmit = function(e) {
 e.preventDefault();
 addLesson();
 };
 document.getElementById('lessonModal').style.display = 'block';
 await updateCurrentTab(); // انتظار انتهاء تحديث كل البيانات
updateCurrentTab(); // بعدين تحديث التبويب الحالي
}

// إضافة درس جديد
// إضافة درس جديد
async function addLesson() {
 try {
 // --- التحقق من المستخدم والدور ---

 const { data: { user }, error: authError } = await supabaseClient.auth.getUser();

 if (authError) {
 console.error("❌ خطأ في الحصول على بيانات المستخدم من Auth:", authError);
 showStatus('خطأ في التحقق من حالة تسجيل الدخول.', 'error');
 return;
 }

 if (!user) {
 console.error("❌ لا يوجد مستخدم مسجل دخول!");
 showStatus('يجب تسجيل الدخول لإضافة دروس.', 'error');
 return;
 }

 const { data: userData, error: userError } = await supabaseClient
 .from('users')
 .select('id, full_name, role')
 .eq('id', user.id)
 .single();

 if (userError) {
 console.error("❌ خطأ في جلب دور المستخدم:", userError);
 if (userError.code === 'PGRST116') {
 console.error("❌ تحذير: المستخدم غير موجود في جدول users!");
 showStatus('المستخدم غير مسجل في قاعدة البيانات بشكل صحيح.', 'error');
 } else {
 showStatus(`خطأ في التحقق من صلاحيات المستخدم: ${userError.message}`, 'error');
 }
 return;
 }

 if (!userData) {
 console.error("❌ لا توجد بيانات للمستخدم في جدول users");
 showStatus('خطأ: بيانات المستخدم غير مكتملة.', 'error');
 return;
 }

 // تحقق يدويًا من الأحرف

 for (let i = 0; i < userData.role.length; i++) {

 }

 // إذا لم يكن الدور secretary، أوقف العملية
 if (userData.role !== 'secretary') {
 showStatus('ليس لديك الصلاحية لإضافة دروس. يجب أن تكون سكرتير.', 'error');
 return;
 }

 // --- نهاية التحقق من المستخدم والدور ---

 // --- جمع وتحقق من بيانات النموذج ---

 const moduleId = document.getElementById('lessonModuleId').value;
 const title = document.getElementById('lessonTitle').value.trim();
 const description = document.getElementById('lessonDescription').value.trim();
 const date = document.getElementById('lessonDate').value || null;

 if (!title) {
 showStatus('يرجى إدخال عنوان الدرس', 'error');
 return;
 }

 if (!moduleId) {
 showStatus('خطأ: لم يتم تحديد الوحدة', 'error');
 console.error('❌ لم يتم توفير moduleId');
 return;
 }

 // --- نهاية جمع وتحقق من بيانات النموذج ---

 // --- التحقق من صحة module_id و course_id ---

 // جلب course_id من الوحدة - بدون .single() للتعامل بشكل أفضل مع النتائج الفارغة
 const { data: moduleDataArray, error: moduleError } = await supabaseClient
 .from('modules')
 .select('id, course_id')
 .eq('id', moduleId);
 // .single() <-- تمت إزالته

 if (moduleError) {
 console.error('❌ Error fetching module:', moduleError);
 showStatus(`خطأ في جلب بيانات الوحدة: ${moduleError.message}`, 'error');
 return; // إنهاء الدالة
 }

 // التحقق من وجود النتيجة
 if (!moduleDataArray || moduleDataArray.length === 0) {
 const errorMsg = 'الوحدة المرتبطة بالدرس غير موجودة';
 showStatus(errorMsg, 'error');
 console.error(`❌ ${errorMsg}:`, moduleId);
 return; // إنهاء الدالة
 }

 const moduleData = moduleDataArray[0]; // أخذ أول عنصر من المصفوفة

 // التحقق من وجود course_id
 if (!moduleData.course_id) {
 const errorMsg = 'الوحدة لا تحتوي على دورة مرتبط';
 showStatus(errorMsg, 'error');
 console.error(`❌ ${errorMsg}:`, moduleData);
 return;
 }

 // التحقق من أن course_id و module_id ليسا null
 if (!moduleData.course_id || !moduleId) {
 const errorMsg = 'بيانات الوحدة أو الدورة غير صحيحة';
 showStatus(errorMsg, 'error');
 console.error(`❌ ${errorMsg}`, 'course_id:', moduleData.course_id, 'module_id:', moduleId);
 return;
 }

 // التحقق الإضافي: التأكد من أن module_id موجود فعلاً
 const { data: moduleCheck, error: moduleCheckError } = await supabaseClient
 .from('modules')
 .select('id, course_id')
 .eq('id', moduleId)
 .single(); // استخدام .single() هنا لأننا نتوقع نتيجة واحدة

 if (moduleCheckError || !moduleCheck) {
 console.error("❌ module_id غير صالح أو غير موجود:", moduleId, moduleCheckError);
 showStatus('الوحدة المرتبطة غير صالحة.', 'error');
 return;
 }

 // --- نهاية التحقق من صحة module_id و course_id ---

 // --- التحقق النهائي من حالة المستخدم قبل الإدخال ---

 const { data: { user: finalUserCheck }, error: finalAuthError } = await supabaseClient.auth.getUser();

 if (!finalUserCheck?.id) {
 console.error("❌ خطأ حرج: فقدان حالة تسجيل الدخول قبل الإدخال!");
 showStatus('خطأ: تم فقدان حالة تسجيل الدخول. يرجى إعادة تسجيل الدخول.', 'error');
 return;
 }

 // --- نهاية التحقق النهائي ---

// --- التحقق النهائي والطباعة في لحظة الإرسال ---

const { data: { user: userAtInsertTime }, error: authErrorAtInsert } = await supabaseClient.auth.getUser();
if (authErrorAtInsert) {
 console.error("❌ [إرسال الطلب] خطأ في الحصول على المستخدم:", authErrorAtInsert);
} else {

 if (userAtInsertTime?.id) {
 const { data: userDataAtInsert, error: userDbErrorAtInsert } = await supabaseClient
 .from('users')
 .select('role')
 .eq('id', userAtInsertTime.id)
 .single();
 if (userDbErrorAtInsert) {
 console.error("❌ [إرسال الطلب] خطأ في جلب دور المستخدم:", userDbErrorAtInsert);
 } else {

 }
 }
}

// --- نهاية التحقق النهائي ---
 const { data, error } = await supabaseClient
 .from('lessons')
 .insert([
 {
 module_id: moduleId,
 course_id: moduleData.course_id,
 title: title,
 description: description,
 date: date
 }
 ])
 .select();

 if (error) {
 console.error('❌ Error inserting lesson:', error);
 // عرض رسالة خطأ أكثر تفصيلاً
 if (error.code === '42501') {
 showStatus('خطأ في الأذونات: لا يُسمح لك بإضافة دروس. تحقق من دورك في قاعدة البيانات.', 'error');
 } else if (error.code === '23503') { // Foreign key violation
 showStatus('خطأ: الوحدة أو الدورة المرتبط غير موجود.', 'error');
 } else {
 showStatus(`خطأ في إضافة الدرس: ${error.message}`, 'error');
 }
 return; // إنهاء الدالة في حالة الخطأ
 }

 // --- نهاية محاولة الإدخال ---

 showStatus('تم إضافة الدرس بنجاح');
 closeModal('lessonModal');
 // إعادة تحميل الوحدات والدروس
 await loadCourseModulesAndLessons(moduleData.course_id);

 }
 catch (error) {
 console.error('❌ Error adding lesson (uncaught):', error);
 // عرض رسالة خطأ أكثر وضوحاً
 if (error.code === '42501') {
 showStatus('خطأ: لم يتم العثور على الوحدة المرتبطة أو مشكلة في الأذونات. يرجى المحاولة مرة أخرى.', 'error');
 } else {
 showStatus(`خطأ غير متوقع في إضافة الدرس: ${error.message}`, 'error');
 }
 }

await updateCurrentTab(); // انتظار انتهاء تحديث كل البيانات
updateCurrentTab(); // بعدين تحديث التبويب الحالي
}

// فتح Modal تعديل درس
async function openEditLessonModal(lessonId) {
 try {
 // جلب بيانات الدرس
 const { data, error } = await supabaseClient
 .from('lessons')
 .select('title, description, date, module_id')
 .eq('id', lessonId)
 .single();

 if (error) throw error;
 if (!data) {
 showStatus('الدرس غير موجود', 'error');
 return;
 }

 document.getElementById('lessonModalTitle').textContent = 'تعديل الدرس';
 document.getElementById('lessonId').value = lessonId;
 document.getElementById('lessonModuleId').value = data.module_id;
 document.getElementById('lessonTitle').value = data.title;
 document.getElementById('lessonDescription').value = data.description || '';
 document.getElementById('lessonDate').value = data.date || '';

 document.getElementById('lessonForm').onsubmit = function(e) {
 e.preventDefault();
 updateLesson(lessonId);
 };

 document.getElementById('lessonModal').style.display = 'block';

 } catch (error) {
 console.error('Error fetching lesson for edit:', error);
 showStatus(`خطأ في جلب بيانات الدرس: ${error.message}`, 'error');
 }
}

// تحديث درس
async function updateLesson(lessonId) {
 try {
 const moduleId = document.getElementById('lessonModuleId').value;
 const title = document.getElementById('lessonTitle').value.trim();
 const description = document.getElementById('lessonDescription').value.trim();
 const date = document.getElementById('lessonDate').value || null;

 if (!title) {
 showStatus('يرجى إدخال عنوان الدرس', 'error');
 return;
 }

 // جلب course_id من الوحدة الجديدة
 const { data: moduleData, error: moduleError } = await supabaseClient
 .from('modules')
 .select('course_id')
 .eq('id', moduleId)
 .single();

 if (moduleError) throw moduleError;

 const { data, error } = await supabaseClient
 .from('lessons')
 .update({
 module_id: moduleId,
 course_id: moduleData.course_id,
 title: title,
 description: description,
 date: date
 })
 .eq('id', lessonId);

 if (error) throw error;

 showStatus('تم تحديث الدرس بنجاح');
 closeModal('lessonModal');
 // إعادة تحميل الوحدات والدروس
 await loadCourseModulesAndLessons(moduleData.course_id);

 } catch (error) {
 console.error('Error updating lesson:', error);
 showStatus(`خطأ في تحديث الدرس: ${error.message}`, 'error');
 }
 await updateCurrentTab(); // انتظار انتهاء تحديث كل البيانات
updateCurrentTab(); // بعدين تحديث التبويب الحالي
}

// حذف درس
async function deleteLesson(lessonId) {
 if (!confirm('هل أنت متأكد من حذف هذا الدرس؟')) {
 return;
 }

 try {
 // جلب معلومات الدرس أولاً لتحديد course_id
 const { data: lessonData, error: lessonError } = await supabaseClient
 .from('lessons')
 .select('course_id')
 .eq('id', lessonId)
 .single();

 if (lessonError) throw lessonError;

 const { error } = await supabaseClient
 .from('lessons')
 .delete()
 .eq('id', lessonId);

 if (error) throw error;

 showStatus('تم حذف الدرس بنجاح');
 // إعادة تحميل الوحدات والدروس
 await loadCourseModulesAndLessons(lessonData.course_id);

 } catch (error) {
 console.error('Error deleting lesson:', error);
 showStatus(`خطأ في حذف الدرس: ${error.message}`, 'error');
 }
 await updateCurrentTab(); // انتظار انتهاء تحديث كل البيانات
updateCurrentTab(); // بعدين تحديث التبويب الحالي // <-- تحديث كامل بعد حذف الدرس
}

// دالة مساعدة للحصول على currentCourseId من Modal التفاصيل (إذا احتجت)
function getCurrentCourseIdFromDetail() {
 return currentCourseId;
}

// تأكد من استدعاء switchCourseDetailTab بشكل صحيح عند النقر على أزرار التبويب
document.addEventListener('click', function(event) {
 if (event.target.classList.contains('tab-button')) {
 const tabName = event.target.textContent.trim() === 'نظرة عامة' ? 'overview' :
 event.target.textContent.trim() === 'الوحدات والدروس' ? 'modules' : 'overview';
 switchCourseDetailTab(tabName);
 // تحديث زر التبويب النشط
 document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
 event.target.classList.add('active');
 }
});

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

// Show add subscription modal
async function showAddSubscriptionModal() {
 const modal = document.getElementById('subscriptionModal')
 modal.style.display = 'flex'

 document.getElementById('subscriptionModalTitle').textContent = 'إضافة اشتراك جديد'
 document.getElementById('subscriptionForm').reset()
 document.getElementById('subscriptionId').value = ''
 
 // Populate students dropdown
 const studentSelect = document.getElementById('student')
 studentSelect.innerHTML = '<option value="">اختر طالباً</option>'
 students.forEach(student => {
 const option = document.createElement('option')
 option.value = student.id
 option.textContent = student.full_name
 studentSelect.appendChild(option)
 })
 
 // Populate courses dropdown
 const courseSelect = document.getElementById('course')
 courseSelect.innerHTML = '<option value="">اختر كورساً</option>'
 courses.forEach(course => {
 const option = document.createElement('option')
 option.value = course.id
 option.textContent = course.name
 courseSelect.appendChild(option)
 })
 
 document.getElementById('subscriptionForm').onsubmit = async function(e) {
 e.preventDefault()
 await addSubscription()
 }
 const today = new Date().toISOString().split('T')[0]
 document.getElementById('subscriptionDate').value = today
 await updateCurrentTab(); // انتظار انتهاء تحديث كل البيانات
updateCurrentTab(); // بعدين تحديث التبويب الحالي // <-- تحديث كامل بعد إضافة اشتراك جديد
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
 async function deleteSubscription(subscriptionId) {
 if (!confirm('هل أنت متأكد من حذف هذا الاشتراك؟')) {
 return
 }

 try {
 const { error } = await supabaseClient
 .from('subscriptions')
 .delete()
 .eq('id', subscriptionId)

 if (error) throw error

 showStatus('تم حذف الاشتراك بنجاح')
 loadSubscriptions()
 } catch (error) {
 console.error('Error deleting subscription:', error)
 showStatus('خطأ في حذف الاشتراك', 'error')
 }
 await updateCurrentTab(); // انتظار انتهاء تحديث كل البيانات
updateCurrentTab(); // بعدين تحديث التبويب الحالي
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
        <button class="btn btn-primary" onclick="showAddPaymentModal()" style="margin-bottom: 20px;">
          <i class="fas fa-plus"></i> إضافة دفعة جديدة
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
 <button class="btn btn-primary" onclick="showAddPaymentModal()" style="margin-bottom: 20px;">
 <i class="fas fa-plus"></i> إضافة دفعة جديدة
 </button>
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

 // Show add payment modal
 async function showAddPaymentModal() {
 const modal = document.getElementById('paymentModal');
 if (!modal) {
 console.error('نافذة paymentModal غير موجودة في DOM');
 showStatus('خطأ في فتح نافذة الدفع', 'error');
 return;
 }
 modal.style.display = 'flex';

 document.getElementById('paymentModalTitle').textContent = 'إضافة دفعة جديدة';
 document.getElementById('paymentForm').reset();
 document.getElementById('paymentId').value = ''; // تأكد من أنه فارغ للحالة "إضافة"

 // --- تعيين التاريخ الحالي تلقائيًا ---
 const today = new Date().toISOString().split('T')[0];
 const paymentDateInput = document.getElementById('paymentDate');
 if (paymentDateInput) {
 paymentDateInput.value = today;
 } else {
 console.warn('حقل paymentDate غير موجود في النموذج');
 }
 // --- نهاية تعيين التاريخ ---

 // Populate students dropdown
 const studentSelect = document.getElementById('paymentStudent');
 if (studentSelect) {
 studentSelect.innerHTML = '<option value="">اختر طالباً</option>';
 students.forEach(student => {
 const option = document.createElement('option');
 option.value = student.id;
 option.textContent = student.full_name;
 studentSelect.appendChild(option);
 });
 }

 // Populate courses dropdown
 const courseSelect = document.getElementById('paymentCourse');
 if (courseSelect) {
 courseSelect.innerHTML = '<option value="">اختر كورساً</option>';
 courses.forEach(course => {
 const option = document.createElement('option');
 option.value = course.id;
 option.textContent = course.name;
 // تخزين السعر في dataset لسهولة الوصول لاحقاً
 option.dataset.price = course.price || 0;
 courseSelect.appendChild(option);
 });

 // --- ربط مستمع الحدث onchange ---
 // إزالة أي مستمع حدث سابق أولاً لتجنب التكرار
 courseSelect.onchange = null;
 courseSelect.onchange = updateCourseTotalAmount;
 // --- نهاية ربط الحدث ---
 }

 // ربط نموذج الإرسال
 const paymentForm = document.getElementById('paymentForm');
 if (paymentForm) {
 paymentForm.onsubmit = async function(e) {
 e.preventDefault();
 await addPayment();
 };
 }
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

 await updateCurrentTab(); // انتظار انتهاء تحديث كل البيانات
updateCurrentTab(); // بعدين تحديث التبويب الحالي // <-- تحديث كامل بعد إضافة دفعة جديدة

 }

 // Add payment
 async function addPayment() {
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
 .insert([{
 student_id: studentId,
 course_id: courseId,
 amount: amount,
 total_amount: totalAmount,
 method: method,
 paid_at: paidAt,
 status: status,
 notes: notes
 }])

 if (error) throw error

 showStatus('تم إضافة الدفعة بنجاح')
 closeModal('paymentModal')
 loadPayments()
 } catch (error) {
 console.error('Error adding payment:', error)
 showStatus('خطأ في إضافة الدفعة', 'error')
 }
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
 .select('course_id, status, students(full_name), courses(name)');

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
 if (att.status === 'حاضر') statsByCourse[courseId].present++;
 if (att.status === 'غائب') statsByCourse[courseId].absent++;
 if (att.status === 'متأخر') statsByCourse[courseId].late++;
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
// Update course
async function updateCourse(courseId) {
 try {
 const courseName = document.getElementById('courseName').value.trim();
 const description = document.getElementById('courseDescription').value.trim();
 const price = parseFloat(document.getElementById('coursePrice').value) || 0;
 const teacherId = document.getElementById('teacher').value; // قد يكون فارغًا
 const startDate = document.getElementById('startDate').value || null; // قد يكون فارغًا
 const endDate = document.getElementById('endDate').value || null; // قد يكون فارغًا

 // التحقق البسيط من البيانات (يمكنك تحسينه)
 if (!courseName) {
 showStatus('يرجى إدخال اسم الدورة', 'error');
        await updateCurrentView()
        
        
        
        
        
        
        
        
 return;
 }

 const { data, error } = await supabaseClient
 .from('courses')
 .update({
 name: courseName,
 description: description,
 price: price,
 teacher_id: teacherId || null, // تأكد من إرسال null إذا كان فارغًا
 start_date: startDate,
 end_date: endDate
 })
 .eq('id', courseId); // تحديد أي دورة سيتم تحديثه

 if (error) throw error;

 showStatus('تم تحديث بيانات الدورة بنجاح');
 closeModal('courseModal');
 loadCourses(); // إعادة تحميل قائمة الكورسات
 } catch (error) {
 console.error('Error updating course:', error);
 // عرض رسالة خطأ أكثر تفصيلاً
 showStatus(`خطأ في تحديث بيانات الدورة: ${error.message || 'حدث خطأ غير معروف'}`, 'error');
 }
}
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

