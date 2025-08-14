// ============================================================================= 
// دوال التحكم في واجهة المستخدم العامة 
// ============================================================================= 

// دالة تبديل التبويبات الرئيسية 
function switchTab(tabName) { 
  // إخفاء جميع أقسام المحتوى 
  document.querySelectorAll('.tab-content').forEach(content => { 
    content.style.display = 'none'; 
  }); 

  // إظهار القسم المطلوب 
  const activeTabContent = document.getElementById(tabName + 'Tab'); 
  if (activeTabContent) { 
    activeTabContent.style.display = 'block'; 
  } 

  // تحديث زر التبويب النشط 
  document.querySelectorAll('.nav-link').forEach(link => { 
    link.classList.remove('active'); 
  }); 
  const activeLink = document.querySelector(`.nav-link[onclick="switchTab('${tabName}')"]`); 
  if (activeLink) { 
    activeLink.classList.add('active'); 
  } 

  // تحميل البيانات الخاصة بالتبويب إذا لزم 
  switch (tabName) { 
    case 'courses': 
      loadCourses(); 
      break; 
    case 'students': 
      loadStudents(); 
      break; 
    case 'payments': 
      loadPayments(); 
      break; 
    case 'subscriptions': 
      loadSubscriptions(); 
      break; 
    case 'attendance': 
      loadAttendance(); 
      break; 
    case 'teacherExams': 
      loadTeacherExamsForSecretary(); 
      break; 
    case 'parents': 
      loadStudentsForParents(); 
      break; 
    case 'dashboard': 
    default: 
      loadDashboardData(); 
      break; 
  } 
} 

// دالة تحميل البيانات الأولية (مثل القوائم المنسدلة) 
async function loadInitialData() { 
  try { 
    await loadCourses(); 
    await loadStudents(); 
    // يمكن تحميل بيانات أخرى مشتركة هنا إذا لزم 
  } catch (error) { 
    console.error('Error loading initial data:', error); 
    showStatus('خطأ في تحميل البيانات الأولية', 'error'); 
  } 
} 

// دالة تحميل بيانات لوحة المعلومات 
async function loadDashboardData() { 
  const container = document.getElementById('dashboardContent'); 
  if (!container) return; 

  container.innerHTML = `<div class="loading"><div class="loading-spinner"></div><p>جاري تحميل لوحة المعلومات...</p></div>`; 

  try { 
    // 1. عدد الطلاب 
    const { count: studentsCount, error: studentsError } = await supabaseClient 
      .from('students') 
      .select('*', { count: 'exact', head: true }); 

    if (studentsError) throw studentsError; 

    // 2. عدد الكورسات 
    const { count: coursesCount, error: coursesError } = await supabaseClient 
      .from('courses') 
      .select('*', { count: 'exact', head: true }); 

    if (coursesError) throw coursesError; 

    // 3. إجمالي المدفوعات 
    const { data: paymentsData, error: paymentsError } = await supabaseClient 
      .from('payments') 
      .select('amount'); 

    if (paymentsError) throw paymentsError; 

    const totalPayments = paymentsData?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0; 

    // 4. أحدث الأنشطة (مثلاً آخر 5 طلاب مسجلين) 
    const { data: recentStudents, error: recentStudentsError } = await supabaseClient 
      .from('students') 
      .select('full_name, created_at') 
      .order('created_at', { ascending: false }) 
      .limit(5); 

    if (recentStudentsError) throw recentStudentsError; 

    // 5. عرض البيانات 
    container.innerHTML = ` 
      <div class="dashboard-stats"> 
        <div class="stat-card"> 
          <h3>${studentsCount || 0}</h3> 
          <p>عدد الطلاب</p> 
        </div> 
        <div class="stat-card"> 
          <h3>${coursesCount || 0}</h3> 
          <p>عدد الكورسات</p> 
        </div> 
        <div class="stat-card"> 
          <h3>${formatCurrency(totalPayments)}</h3> 
          <p>إجمالي المدفوعات</p> 
        </div> 
      </div> 

      <div class="recent-activity"> 
        <h3>أحدث الأنشطة</h3> 
        <ul> 
          ${recentStudents.map(student => `<li>${student.full_name} - ${formatDate(student.created_at)}</li>`).join('')} 
        </ul> 
      </div> 
    `; 

  } catch (error) { 
    console.error('Error loading dashboard data:', error); 
    container.innerHTML = `<p class="error">حدث خطأ أثناء تحميل لوحة المعلومات: ${error.message}</p>`; 
  } 
} 

// Show status message 
function showStatus(message, type = 'success') { 
  const statusEl = document.getElementById('status'); 
  if (!statusEl) { 
    // إنشاء العنصر إذا لم يكن موجودًا 
    const newStatusEl = document.createElement('div'); 
    newStatusEl.id = 'status'; 
    document.body.appendChild(newStatusEl); 
  } 
  statusEl.textContent = message; 
  statusEl.className = ''; 
  statusEl.classList.add('show', type); 
  setTimeout(() => { 
    statusEl.classList.remove('show'); 
  }, 3000); 
} 

// Close modal 
function closeModal(modalId) { 
  const modal = document.getElementById(modalId); 
  if (modal) { 
    modal.style.display = 'none'; 
  } 
} 

// دالة تنسيق التاريخ الميلادي بالأرقام العربية 
function formatDate(dateString) { 
  if (!dateString) return ''; 
  const date = new Date(dateString); 
  // تنسيق: يوم/شهر/سنة بالأرقام العربية 
  return date.toLocaleDateString('ar-EG', { 
    day: '2-digit', 
    month: '2-digit', 
    year: 'numeric' 
  }); 
} 

// Format currency in Egyptian Pounds 
function formatCurrency(amount) { 
  return new Intl.NumberFormat('ar-EG', { 
    style: 'currency', 
    currency: 'EGP' 
  }).format(amount); 
} 

// Close modals when clicking outside 
window.onclick = function(event) { 
  if (event.target.classList.contains('modal')) { 
    event.target.style.display = 'none'; 
  } 
} 

// تفعيل زر التوجل للسايد بار 
document.addEventListener('DOMContentLoaded', function() { 
  const toggleButton = document.querySelector('.sidebar-toggle'); 
  const sidebar = document.querySelector('.sidebar'); 

  if (toggleButton && sidebar) { 
    toggleButton.addEventListener('click', function() { 
      sidebar.classList.toggle('active'); 
    }); 
  } 

  // تحميل البيانات الأولية وفتح تبويب Dashboard افتراضيًا 
  loadInitialData().then(() => { 
    switchTab('dashboard'); 
  }); 
});