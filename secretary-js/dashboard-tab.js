// ============================================================================
// DASHBOARD TAB - Complete dashboard with statistics, charts, and activity
// ============================================================================

// === Global State ===
let dashboardCharts = {
  revenue: null,
  students: null,
  courses: null,
  subscriptionStatus: null,
  paymentTrend: null
};

let dashboardRefreshInterval = null;

/**
 * Main function to load all dashboard data
 */
async function loadDashboardData() {
  try {
    // Normalize academy id from multiple possible sources.
    const academyId = window.currentAcademyId || window.ACADEMY_ID || localStorage.getItem('current_academy_id') || window.ACADEMYID || null;
    if (!academyId) {
      console.error('❌ Academy ID not set');
      return;
    }

    // Ensure a consistent global name for other modules
    window.currentAcademyId = academyId;

    // Load data only if not cached
    const now = Date.now();
    const needsRefresh = !window.students || window.students.length === 0 ||
                         !window.courses || window.courses.length === 0 ||
                         (window.dataCache.students && (now - window.dataCache.students.timestamp) > CACHE_DURATION);
    
    if (needsRefresh) {
      await loadAllDataForDashboard();
    }
    
    await loadDashboardStats();
    initCharts();

    // Load recent activity
    await loadRecentActivity();

    // Setup auto-refresh (every 60 seconds instead of 30)
    if (dashboardRefreshInterval) clearInterval(dashboardRefreshInterval);
    dashboardRefreshInterval = setInterval(() => {
      loadRecentActivity();
    }, 60000);
  } catch (error) {
    console.error('❌ Error loading dashboard:', error);
    showStatus('خطأ في تحميل لوحة التحكم', 'error');
  }
}

/**
 * Load all academy data for dashboard calculations
 */
async function loadAllDataForDashboard() {
  try {
    const academyId = window.currentAcademyId || window.ACADEMY_ID || localStorage.getItem('current_academy_id');
    
    if (!academyId) {
      console.error('❌ Academy ID not found!');
      showStatus('خطأ: لم يتم تحديد الأكاديمية', 'error');
      return;
    }

    console.log('🔄 Loading all data for academy:', academyId);
    
    // Check if data already loaded from secretary-core.js
    if (window.courses && window.courses.length > 0) {
      console.log('✅ Found existing courses data from secretary-core.js:', window.courses.length);
      console.log('📊 Existing courses:', window.courses);
    }
    
    if (window.students && window.students.length > 0) {
      console.log('✅ Found existing students data:', window.students.length);
    }
    
    // If courses already loaded, use them and skip query
    if (window.courses && window.courses.length > 0) {
      console.log('✅ Using existing courses data, skipping query');
      // Still try to reload to get latest data, but don't overwrite if query fails
    }

    // Load all data in parallel with error handling
    const [studentsRes, coursesRes, subscriptionsRes, paymentsRes, attendancesRes, teachersRes] = await Promise.all([
      window.supabaseClient
        .from('students')
        .select('*')
        .eq('academy_id', academyId),
      window.supabaseClient
        .from('courses')
        .select('*')
        .eq('academy_id', academyId),
      window.supabaseClient
        .from('subscriptions')
        .select('*')
        .eq('academy_id', academyId),
      window.supabaseClient
        .from('payments')
        .select('*')
        .eq('academy_id', academyId),
      window.supabaseClient
        .from('attendances')
        .select('*')
        .eq('academy_id', academyId)
        .gte('date', new Date(new Date().setDate(new Date().getDate() - 30)).toISOString()),
      window.supabaseClient
        .from('profiles')
        .select('*')
        .eq('academy_id', academyId)
        .eq('role', 'teacher')
    ]);

    // Store data globally with error handling
    // Use new data if available, otherwise keep existing
    if (studentsRes.data && studentsRes.data.length > 0) {
      window.students = studentsRes.data;
    } else if (!window.students || window.students.length === 0) {
      window.students = [];
    }
    
    // Handle courses data with detailed logging
    if (coursesRes.error) {
      console.error('❌ Courses query error:', coursesRes.error);
      console.error('❌ Error code:', coursesRes.error.code);
      console.error('❌ Error message:', coursesRes.error.message);
      console.error('❌ Error details:', coursesRes.error.details);
      console.error('❌ Error hint:', coursesRes.error.hint);
      
      // Try to use existing data if available
      if (window.courses && window.courses.length > 0) {
        console.log('⚠️ Using existing courses data due to error:', window.courses.length);
      } else {
        // Try to load using secretary-core.js function
        console.log('🔄 Trying loadCoursesData from secretary-core.js...');
        if (typeof loadCoursesData === 'function') {
          try {
            await loadCoursesData();
            if (window.courses && window.courses.length > 0) {
              console.log('✅ Courses loaded from secretary-core.js:', window.courses.length);
            } else {
              window.courses = [];
              console.log('❌ loadCoursesData also returned empty');
            }
          } catch (e) {
            console.error('❌ Error in loadCoursesData:', e);
            window.courses = [];
          }
        } else {
          window.courses = [];
          console.log('❌ No courses data available and loadCoursesData not found');
        }
      }
    } else if (coursesRes.data) {
      if (coursesRes.data.length > 0) {
        window.courses = coursesRes.data;
        console.log('✅ Courses loaded from query:', coursesRes.data.length);
        console.log('✅ Courses data sample:', coursesRes.data.slice(0, 2));
      } else {
        // Empty result - try to use existing data or loadCoursesData
        if (window.courses && window.courses.length > 0) {
          console.log('⚠️ Query returned empty, keeping existing courses data:', window.courses.length);
        } else {
          // Try loadCoursesData
          console.log('🔄 Query returned empty, trying loadCoursesData...');
          if (typeof loadCoursesData === 'function') {
            try {
              await loadCoursesData();
              if (window.courses && window.courses.length > 0) {
                console.log('✅ Courses loaded from secretary-core.js:', window.courses.length);
              } else {
                window.courses = [];
                console.log('⚠️ Query returned empty array and loadCoursesData also empty');
              }
            } catch (e) {
              console.error('❌ Error in loadCoursesData:', e);
              window.courses = [];
            }
          } else {
            window.courses = [];
            console.log('⚠️ Query returned empty array and no existing data');
          }
        }
      }
    } else {
      // Null/undefined result - try loadCoursesData
      if (window.courses && window.courses.length > 0) {
        console.log('⚠️ Query returned null, keeping existing courses data:', window.courses.length);
      } else {
        console.log('🔄 Query returned null, trying loadCoursesData...');
        if (typeof loadCoursesData === 'function') {
          try {
            await loadCoursesData();
            if (window.courses && window.courses.length > 0) {
              console.log('✅ Courses loaded from secretary-core.js:', window.courses.length);
            } else {
              window.courses = [];
              console.log('⚠️ Courses query returned null/undefined and loadCoursesData empty');
            }
          } catch (e) {
            console.error('❌ Error in loadCoursesData:', e);
            window.courses = [];
          }
        } else {
          window.courses = [];
          console.log('⚠️ Courses query returned null/undefined');
        }
      }
    }
    
    if (subscriptionsRes.data && subscriptionsRes.data.length > 0) {
      window.subscriptions = subscriptionsRes.data;
    } else if (!window.subscriptions || window.subscriptions.length === 0) {
      window.subscriptions = subscriptionsRes.data || [];
    }
    
    if (paymentsRes.data) {
      window.payments = paymentsRes.data;
    } else if (!window.payments) {
      window.payments = [];
    }
    
    if (attendancesRes.data) {
      window.attendances = attendancesRes.data;
    } else if (!window.attendances) {
      window.attendances = [];
    }
    
    if (teachersRes.data) {
      window.teachers = teachersRes.data;
    } else if (!window.teachers) {
      window.teachers = [];
    }

    // Log errors if any with full details
    if (studentsRes.error) {
      console.error('❌ Error loading students:', studentsRes.error);
      console.error('❌ Students error details:', JSON.stringify(studentsRes.error, null, 2));
      showStatus('خطأ في تحميل الطلاب', 'error');
    }
    if (coursesRes.error) {
      console.error('❌ Error loading courses:', coursesRes.error);
      console.error('❌ Courses error details:', JSON.stringify(coursesRes.error, null, 2));
      console.error('❌ Courses error code:', coursesRes.error?.code);
      console.error('❌ Courses error message:', coursesRes.error?.message);
      console.error('❌ Courses error hint:', coursesRes.error?.hint);
      showStatus('خطأ في تحميل الكورسات', 'error');
    } else {
      console.log('✅ Courses query successful, data:', coursesRes.data);
    }
    if (subscriptionsRes.error) {
      console.error('❌ Error loading subscriptions:', subscriptionsRes.error);
    }
    if (paymentsRes.error) {
      console.error('❌ Error loading payments:', paymentsRes.error);
    }
    if (attendancesRes.error) {
      console.error('❌ Error loading attendances:', attendancesRes.error);
    }
    if (teachersRes.error) {
      console.error('❌ Error loading teachers:', teachersRes.error);
    }

    console.log('✅ All data loaded:', {
      students: window.students.length,
      courses: window.courses.length,
      subscriptions: window.subscriptions.length,
      payments: window.payments.length,
      attendances: window.attendances.length,
      teachers: window.teachers.length
    });
    
    // Log actual data for debugging
    console.log('📊 Actual courses data:', window.courses);
    console.log('📊 Actual students data:', window.students);
    console.log('📊 Actual subscriptions data:', window.subscriptions);
  } catch (error) {
    console.error('❌ Error loading dashboard data:', error);
    showStatus('خطأ في تحميل بيانات لوحة التحكم', 'error');
  }
}

/**
 * Load and calculate dashboard statistics
 */
async function loadDashboardStats() {
  try {
    const academyId = window.currentAcademyId || window.ACADEMY_ID || localStorage.getItem('current_academy_id');
    if (!academyId) {
      console.error('❌ Academy ID not set for stats');
      return;
    }

    console.log('📊 Loading dashboard stats for academy:', academyId);
    console.log('📊 Current data state:', {
      students: window.students?.length || 0,
      courses: window.courses?.length || 0,
      subscriptions: window.subscriptions?.length || 0
    });

    // Check if courses already loaded from secretary-core.js
    if (window.courses && window.courses.length > 0) {
      console.log('✅ Using courses from secretary-core.js:', window.courses.length);
      console.log('📊 Courses data:', window.courses);
    } else {
      // Try to load using secretary-core.js function first
      console.log('🔄 Courses not found, trying loadCoursesData...');
      if (typeof loadCoursesData === 'function') {
        try {
          await loadCoursesData();
          if (window.courses && window.courses.length > 0) {
            console.log('✅ Courses loaded from loadCoursesData:', window.courses.length);
          }
        } catch (e) {
          console.error('❌ Error in loadCoursesData:', e);
        }
      }
    }
    
    // Only reload if data is missing or stale
    const now = Date.now();
    const needsRefresh = !window.students || window.students.length === 0 ||
                         !window.courses || window.courses.length === 0 ||
                         (window.dataCache.students && (now - window.dataCache.students.timestamp) > CACHE_DURATION);
    
    if (needsRefresh) {
      console.log('🔄 Reloading data for stats...');
      await loadAllDataForDashboard();
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Final check: if still empty, try one more time with different approaches
    if ((!window.courses || window.courses.length === 0) && academyId) {
      console.log('🔄 Courses still empty, trying alternative queries...');
      console.log('🔍 Academy ID being used:', academyId);
      console.log('🔍 Academy ID type:', typeof academyId);
      
      // Try 1: Simple query with just id and name
      console.log('🔄 Try 1: Simple query with id, name, academy_id...');
      let { data: coursesData, error: coursesError } = await window.supabaseClient
        .from('courses')
        .select('id, name, academy_id')
        .eq('academy_id', academyId);
      
      console.log('📊 Try 1 result:', { data: coursesData, error: coursesError });
      
      if (coursesError) {
        console.error('❌ Error in simple query:', coursesError);
        console.error('❌ Error code:', coursesError.code);
        console.error('❌ Error message:', coursesError.message);
        console.error('❌ Error details:', coursesError.details);
        console.error('❌ Error hint:', coursesError.hint);
        
        // Try 2: Query without academy_id filter (if RLS allows)
        console.log('🔄 Try 2: Query without academy_id filter...');
        const { data: allCourses, error: allError } = await window.supabaseClient
          .from('courses')
          .select('id, name, academy_id');
        
        console.log('📊 Try 2 result:', { data: allCourses, error: allError });
        
        if (!allError && allCourses) {
          // Filter manually
          console.log('🔍 All courses before filtering:', allCourses.length);
          console.log('🔍 All courses data:', allCourses);
          coursesData = allCourses.filter(c => {
            const match = c.academy_id === academyId || String(c.academy_id) === String(academyId);
            if (!match) {
              console.log('🔍 Course filtered out:', { course_id: c.id, course_academy: c.academy_id, target_academy: academyId });
            }
            return match;
          });
          console.log('✅ Courses loaded by manual filtering:', coursesData.length);
        } else if (allError) {
          console.error('❌ Error in fallback query:', allError);
          console.error('❌ Fallback error code:', allError.code);
          console.error('❌ Fallback error message:', allError.message);
        }
      }
      
      if (coursesData && coursesData.length > 0) {
        window.courses = coursesData;
      } else {
        if (typeof loadCoursesData === 'function') {
          try {
            await loadCoursesData();
          } catch (e) {
            console.error('❌ Error loading courses:', e);
          }
        }
      }
    }
    
    if ((!window.students || window.students.length === 0) && academyId) {
      const { data: studentsData, error: studentsError } = await window.supabaseClient
        .from('students')
        .select('*')
        .eq('academy_id', academyId);
      
      if (!studentsError) {
        window.students = studentsData || [];
      }
    }
    
    if ((!window.subscriptions || window.subscriptions.length === 0) && academyId) {
      const { data: subscriptionsData, error: subscriptionsError } = await window.supabaseClient
        .from('subscriptions')
        .select('*')
        .eq('academy_id', academyId);
      
      if (!subscriptionsError) {
        window.subscriptions = subscriptionsData || [];
      }
    }

    if ((!window.courses || window.courses.length === 0) && typeof loadCoursesData === 'function') {
      try {
        await loadCoursesData();
      } catch (e) {
        console.error('❌ Error loading courses:', e);
      }
    }
    
    // Calculate totals
    const totalStudents = Array.isArray(window.students) ? window.students.length : 0;
    const totalCourses = Array.isArray(window.courses) ? window.courses.length : 0;
    const totalSubscriptions = Array.isArray(window.subscriptions) ? window.subscriptions.length : 0;

    console.log('📊 Final data check:', {
      studentsIsArray: Array.isArray(window.students),
      coursesIsArray: Array.isArray(window.courses),
      subscriptionsIsArray: Array.isArray(window.subscriptions),
      studentsCount: totalStudents,
      coursesCount: totalCourses,
      subscriptionsCount: totalSubscriptions,
      studentsSample: window.students?.slice(0, 2),
      coursesSample: window.courses?.slice(0, 2),
      subscriptionsSample: window.subscriptions?.slice(0, 2)
    });

    // Calculate revenue
    const paidPayments = (window.payments || []).filter(p => p.status === 'paid');
    const totalRevenue = paidPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

    // Calculate today's attendance
    const today = new Date().toISOString().split('T')[0];
    const todayAttendance = (window.attendances || []).filter(a => {
      const attendanceDate = a.date || a.attendance_date;
      return attendanceDate && attendanceDate.includes(today) && a.status === 'present';
    });
    const totalTodayAttendance = todayAttendance.length;

    // Update stat cards
    const statsMapping = {
      'totalStudents': totalStudents,
      'totalCourses': totalCourses,
      'totalSubscriptions': totalSubscriptions,
      'totalRevenue': totalTodayAttendance
    };

    // Update stat cards with multiple attempts
    Object.entries(statsMapping).forEach(([id, value]) => {
      let element = document.getElementById(id);
      
      // Try multiple methods to find and update element
      if (!element) {
        element = document.querySelector(`#${id}`);
      }
      if (!element) {
        element = document.querySelector(`[id="${id}"]`);
      }
      
      if (element) {
        element.textContent = String(value);
        element.innerText = String(value);
        element.innerHTML = String(value);
        console.log(`✅ Updated ${id}: ${value}`);
      } else {
        console.error(`❌ Element ${id} not found in DOM!`);
        // Try again after a short delay
        setTimeout(() => {
          const retryElement = document.getElementById(id);
          if (retryElement) {
            retryElement.textContent = String(value);
            retryElement.innerText = String(value);
            console.log(`✅ Updated ${id} (retry): ${value}`);
          }
        }, 200);
      }
    });
    
    // Force a re-render
    window.dispatchEvent(new Event('resize'));
    
    // Also trigger a custom event
    window.dispatchEvent(new CustomEvent('statsUpdated', { 
      detail: statsMapping 
    }));

    console.log('✅ Dashboard stats updated:', {
      totalStudents,
      totalCourses,
      totalSubscriptions,
      totalRevenue,
      totalTodayAttendance
    });

    return {
      totalStudents,
      totalCourses,
      totalSubscriptions,
      totalRevenue,
      totalTodayAttendance,
      paidPayments
    };
  } catch (error) {
    console.error('❌ Error calculating dashboard stats:', error);
  }
}

/**
 * Initialize all charts with real data
 */
function initCharts() {
  try {
    // 1. Monthly Revenue Chart (Bar Chart)
    initRevenueChart();

    // 2. Students Distribution Chart (Doughnut)
    initStudentsDistributionChart();

  } catch (error) {
    console.error('❌ Error initializing charts:', error);
  }
}

/**
 * Initialize Monthly Revenue Chart
 */
function initRevenueChart() {
  const ctx = document.getElementById('revenueChart');
  if (!ctx) return;

  // Destroy existing chart if any
  if (dashboardCharts.revenue) {
    dashboardCharts.revenue.destroy();
  }

  // Calculate monthly revenue
  const monthlyData = calculateMonthlyRevenue();

  dashboardCharts.revenue = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: monthlyData.labels,
      datasets: [
        {
          label: 'الإيرادات (ج.م)',
          data: monthlyData.values,
          backgroundColor: [
            '#667eea',
            '#764ba2',
            '#f093fb',
            '#4facfe',
            '#00f2fe',
            '#43e97b',
            '#fa709a',
            '#fee140',
            '#30b0c8',
            '#ec008c',
            '#a8edea',
            '#fed6e3'
          ],
          borderColor: '#667eea',
          borderWidth: 2,
          borderRadius: 8,
          hoverBackgroundColor: '#764ba2',
          hoverBorderColor: '#000',
          hoverBorderWidth: 3
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: {
            usePointStyle: true,
            padding: 15,
            font: { size: 12, weight: 'bold' }
          }
        },
        tooltip: {
          backgroundColor: 'rgba(0,0,0,0.8)',
          padding: 12,
          titleFont: { size: 13, weight: 'bold' },
          bodyFont: { size: 12 },
          callbacks: {
            label: function(context) {
              return `${context.dataset.label}: ${formatCurrency(context.parsed.y)}`;
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function(value) {
              return formatCurrency(value);
            },
            font: { size: 11 }
          },
          grid: { color: 'rgba(0,0,0,0.05)' }
        },
        x: {
          ticks: { font: { size: 11 } },
          grid: { display: false }
        }
      }
    }
  });

  console.log('✅ Revenue chart initialized');
}

/**
 * Initialize Students Distribution Chart (by Courses)
 */
function initStudentsDistributionChart() {
  const ctx = document.getElementById('studentsChart');
  if (!ctx) {
    console.warn('⚠️ studentsChart canvas not found');
    return;
  }

  // Destroy existing chart if any
  if (dashboardCharts.students) {
    dashboardCharts.students.destroy();
  }

  // Calculate students per course
  const courseDistribution = calculateStudentsPerCourse();
  
  console.log('📊 Course distribution data:', courseDistribution);
  console.log('📊 Courses data:', window.courses);
  console.log('📊 Subscriptions data:', window.subscriptions);

  // Ensure we have valid data
  const labels = courseDistribution.labels || ['لا توجد بيانات'];
  const values = courseDistribution.values || [0];
  
  // Generate enough colors for all courses
  const colors = [
    '#667eea', '#764ba2', '#f093fb', '#4facfe', '#00f2fe',
    '#43e97b', '#fa709a', '#fee140', '#30b0c8', '#ec008c',
    '#a8edea', '#fed6e3', '#ff6b6b', '#4ecdc4', '#45b7d1',
    '#f9ca24', '#f0932b', '#eb4d4b', '#6c5ce7', '#a29bfe'
  ];
  const backgroundColor = labels.map((_, i) => colors[i % colors.length]);

  dashboardCharts.students = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [
        {
          data: values,
          backgroundColor: backgroundColor,
          borderColor: '#fff',
          borderWidth: 3,
          hoverBorderColor: '#333',
          hoverBorderWidth: 2
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          display: true,
          position: 'bottom',
          labels: {
            usePointStyle: true,
            padding: 15,
            font: { size: 11 },
            generateLabels: function(chart) {
              const data = chart.data;
              return data.labels.map((label, i) => ({
                text: `${label} (${data.datasets[0].data[i]})`,
                fillStyle: data.datasets[0].backgroundColor[i],
                hidden: false,
                index: i
              }));
            }
          }
        },
        tooltip: {
          backgroundColor: 'rgba(0,0,0,0.8)',
          padding: 12,
          callbacks: {
            label: function(context) {
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const percentage = ((context.parsed / total) * 100).toFixed(1);
              return `${context.label}: ${context.parsed} طالب (${percentage}%)`;
            }
          }
        }
      }
    }
  });

  console.log('✅ Students chart initialized');
}

/**
 * Calculate monthly revenue data
 */
function calculateMonthlyRevenue() {
  const currentDate = new Date();
  const monthlyData = {};

  // Initialize last 12 months
  for (let i = 11; i >= 0; i--) {
    const date = new Date(currentDate);
    date.setMonth(date.getMonth() - i);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    monthlyData[monthKey] = 0;
  }

  // Sum payments by month
  (window.payments || [])
    .filter(p => p.status === 'paid')
    .forEach(p => {
      const paymentDate = new Date(p.created_at);
      const monthKey = `${paymentDate.getFullYear()}-${String(paymentDate.getMonth() + 1).padStart(2, '0')}`;
      if (monthlyData[monthKey] !== undefined) {
        monthlyData[monthKey] += p.amount || 0;
      }
    });

  const labels = Object.keys(monthlyData).map(key => {
    const [year, month] = key.split('-');
    const date = new Date(year, parseInt(month) - 1);
    return date.toLocaleString('ar-EG', { month: 'short', year: 'numeric' });
  });

  const values = Object.values(monthlyData);

  return { labels, values };
}

/**
 * Calculate students per course
 */
function calculateStudentsPerCourse() {
  const courseDistribution = {};

  // If no courses, show all courses with 0 students
  if (!window.courses || window.courses.length === 0) {
    return {
      labels: ['لا توجد كورسات'],
      values: [0]
    };
  }

  // Count students per course from subscriptions
  (window.subscriptions || []).forEach(sub => {
    const course = (window.courses || []).find(c => c.id === sub.course_id);
    if (course) {
      courseDistribution[course.name] = (courseDistribution[course.name] || 0) + 1;
    }
  });

  // Add courses with 0 students
  (window.courses || []).forEach(course => {
    if (!courseDistribution[course.name]) {
      courseDistribution[course.name] = 0;
    }
  });

  const labels = Object.keys(courseDistribution);
  const values = Object.values(courseDistribution);

  // If no data, return default
  if (labels.length === 0) {
    return {
      labels: ['لا توجد بيانات'],
      values: [0]
    };
  }

  return { labels, values };
}

/**
 * Load recent activity
 */
async function loadRecentActivity() {
  try {
    const academyId = window.currentAcademyId;
    const activityList = document.getElementById('activityList');

    if (!activityList) return;

    // Get recent activities
    const [recentStudents, recentSubscriptions, recentPayments, recentAttendance] = await Promise.all([
      window.supabaseClient
        .from('students')
        .select('id, full_name, created_at')
        .eq('academy_id', academyId)
        .order('created_at', { ascending: false })
        .limit(5),
      window.supabaseClient
        .from('subscriptions')
        .select('id, student_id, course_id, created_at')
        .eq('academy_id', academyId)
        .order('created_at', { ascending: false })
        .limit(5),
      window.supabaseClient
        .from('payments')
        .select('id, student_id, amount, created_at, status')
        .eq('academy_id', academyId)
        .order('created_at', { ascending: false })
        .limit(5),
      window.supabaseClient
        .from('attendances')
        .select('id, student_id, status, date')
        .eq('academy_id', academyId)
        .order('date', { ascending: false })
        .limit(5)
    ]);

    // Combine and sort all activities
    const activities = [];

    // Add recent students
    (recentStudents.data || []).forEach(student => {
      activities.push({
        type: 'student',
        title: '📚 طالب جديد',
        description: `تم تسجيل ${student.full_name}`,
        time: new Date(student.created_at),
        icon: '👤',
        color: '#667eea'
      });
    });

    // Add recent subscriptions
    (recentSubscriptions.data || []).forEach(sub => {
      const student = window.students?.find(s => s.id === sub.student_id);
      const course = window.courses?.find(c => c.id === sub.course_id);
      activities.push({
        type: 'subscription',
        title: '📖 اشتراك جديد',
        description: `${student?.full_name || 'طالب'} اشترك في ${course?.name || 'كورس'}`,
        time: new Date(sub.created_at),
        icon: '📝',
        color: '#764ba2'
      });
    });

    // Add recent payments
    (recentPayments.data || []).forEach(payment => {
      const student = window.students?.find(s => s.id === payment.student_id);
      const statusText = payment.status === 'paid' ? '✅ مدفوع' : '⏳ معلق';
      activities.push({
        type: 'payment',
        title: `💰 دفعة ${statusText}`,
        description: `${student?.full_name || 'طالب'} دفع ${formatCurrency(payment.amount)}`,
        time: new Date(payment.created_at),
        icon: '💵',
        color: '#10b981'
      });
    });

    // Add recent attendance
    (recentAttendance.data || []).forEach(att => {
      const student = window.students?.find(s => s.id === att.student_id);
      const statusConfig = {
        'present': { label: '✓ حاضر', icon: '✅', color: '#10b981' },
        'absent': { label: '✗ غائب', icon: '❌', color: '#ef4444' },
        'late': { label: '⏰ متأخر', icon: '⏰', color: '#f59e0b' }
      };
      const config = statusConfig[att.status] || { label: att.status, icon: '📋', color: '#6b7280' };
      const attendanceDate = att.date || att.attendance_date;

      activities.push({
        type: 'attendance',
        title: `📊 حضور: ${config.label}`,
        description: `${student?.full_name || 'طالب'} - ${formatDate(attendanceDate)}`,
        time: new Date(attendanceDate),
        icon: config.icon,
        color: config.color
      });
    });

    // Sort by time (newest first)
    activities.sort((a, b) => b.time - a.time);

    // Render activities
    if (activities.length === 0) {
      activityList.innerHTML = `
        <div style="text-align: center; padding: 40px; color: #999;">
          <i class="fas fa-inbox" style="font-size: 3rem; margin-bottom: 15px; display: block;"></i>
          <p>لا توجد أنشطة حديثة</p>
        </div>
      `;
      return;
    }

    activityList.innerHTML = activities
      .slice(0, 15) // Limit to 15 most recent
      .map((activity, index) => `
        <li style="
          display: flex;
          align-items: center;
          padding: 15px;
          border-bottom: 1px solid #eee;
          transition: background 0.2s;
          background: ${index % 2 === 0 ? '#ffffff' : '#f9f9f9'};
        " class="activity-item" onmouseover="this.style.background='#f0f0f0';" onmouseout="this.style.background='${index % 2 === 0 ? '#ffffff' : '#f9f9f9'}';">
          <div style="
            width: 50px;
            height: 50px;
            background: ${activity.color}22;
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-left: 15px;
            font-size: 1.5em;
            border: 2px solid ${activity.color}44;
          ">
            ${activity.icon}
          </div>
          <div style="flex: 1;">
            <div style="font-weight: 600; color: ${activity.color}; margin-bottom: 3px; font-size: 0.95em;">
              ${activity.title}
            </div>
            <div style="color: #666; font-size: 0.9em;">
              ${activity.description}
            </div>
            <div style="color: #999; font-size: 0.85em; margin-top: 3px;">
              ${getRelativeTime(activity.time)}
            </div>
          </div>
        </li>
      `)
      .join('');

    console.log('✅ Recent activity loaded:', activities.length);
  } catch (error) {
    console.error('❌ Error loading recent activity:', error);
  }
}

/**
 * Helper: Format currency
 */
function formatCurrency(value) {
  if (!value) return '0 ج.م';
  return new Intl.NumberFormat('ar-EG', {
    style: 'currency',
    currency: 'EGP',
    minimumFractionDigits: 0
  }).format(value);
}

/**
 * Helper: Format date
 */
function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

/**
 * Helper: Get relative time
 */
function getRelativeTime(date) {
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'للتو';
  if (diffMins < 60) return `قبل ${diffMins} دقيقة`;
  if (diffHours < 24) return `قبل ${diffHours} ساعة`;
  if (diffDays < 7) return `قبل ${diffDays} يوم`;

  return formatDate(date.toISOString());
}

/**
 * Helper: Escape HTML
 */
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Refresh dashboard data manually
 */
window.refreshDashboard = function() {
  console.log('🔄 Manual refresh triggered...');
  
  // Clear existing data to force reload
  window.students = [];
  window.courses = [];
  window.subscriptions = [];
  window.payments = [];
  window.attendances = [];
  
  // Reload everything
  loadDashboardData();
  
  // Show status
  if (typeof showStatus === 'function') {
    showStatus('جاري تحديث البيانات...', 'info');
  }
};

/**
 * Calculate total revenue (backward compatibility)
 */
function calculateTotalRevenue() {
  return (window.payments || [])
    .filter(p => p.status === 'paid')
    .reduce((sum, p) => sum + (p.amount || 0), 0);
}

/**
 * Update charts (backward compatibility)
 */
function updateCharts() {
  initCharts();
}

// Auto-load dashboard when page is ready
document.addEventListener('DOMContentLoaded', function() {
  console.log('📄 DOM Content Loaded');
  
  // Wait a bit for academy ID to be set
  setTimeout(() => {
    const academyId = window.currentAcademyId || window.ACADEMY_ID || localStorage.getItem('current_academy_id');
    console.log('🔍 Academy ID on load:', academyId);
    
    // Check if we're on dashboard tab when content loads
    const dashboardContent = document.getElementById('dashboardContent');
    if (dashboardContent && dashboardContent.style.display !== 'none') {
      console.log('📊 Dashboard tab is active, loading data...');
      loadDashboardData();
    } else {
      console.log('📊 Dashboard tab not active, will load when switched');
    }
  }, 500);
});

// Listen for tab switches
const originalSwitchTab = window.switchTab;
window.switchTab = function(tabName) {
  console.log('🔄 Tab switched to:', tabName);
  if (tabName === 'dashboard') {
    console.log('📊 Loading dashboard data...');
    loadDashboardData();
  }
  if (originalSwitchTab) {
    originalSwitchTab(tabName);
  }
};
