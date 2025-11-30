'use strict';

// ============================================================================
// SECRETARY DATA - Data loading and management functions
// ============================================================================

// === Students Data ===
let studentsLoading = false;
let realtimeSyncEnabled = true; // Flag to disable real-time sync temporarily

async function loadStudents(forceRefresh = false) {
  try {
    if (studentsLoading) return; // Prevent duplic
    // ate requests
    
    // Check cache
    const cache = window.dataCache.students;
    const now = Date.now();
    if (!forceRefresh && cache.data && (now - cache.timestamp) < CACHE_DURATION) {
      window.students = cache.data;
      const container = document.getElementById('studentsContainer');
      if (container && typeof renderStudentsTable === 'function') {
        renderStudentsTable(cache.data, container);
      }
      return;
    }
    
    if (studentsLoading) return;
    studentsLoading = true;
    
    if (!window.currentAcademyId) {
      console.error('❌ Academy ID not set');
      studentsLoading = false;
      return;
    }
    
    const container = document.getElementById('studentsContainer');
    if (container) {
      container.innerHTML = `
        <div class="loading">
          <div class="loading-spinner"></div>
          <p>جارٍ تحميل بيانات الطلاب...</p>
        </div>
      `;
    }

    const { data, error } = await window.supabaseClient
      .from('students')
      .select('id, full_name, email, phone, address, birthdate, guardian_name, guardian_phone, notes')
      .eq('academy_id', window.currentAcademyId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    console.log('📊 Raw data from DB:', data?.length, 'records');
    data?.forEach((s, i) => console.log(`  [${i}] ID: ${s.id}, Name: ${s.full_name}, Email: ${s.email}`));
    
    // Remove duplicates by ID
    const uniqueData = [];
    const seenIds = new Set();
    (data || []).forEach(student => {
      if (!seenIds.has(student.id)) {
        seenIds.add(student.id);
        uniqueData.push(student);
      } else {
        console.warn('⚠️ Duplicate ID found:', student.id);
      }
    });
    
    if (uniqueData.length !== data.length) {
      console.warn('⚠️ Duplicates removed:', data.length - uniqueData.length);
    }
    
    window.students = uniqueData || [];
    
    // Update cache
    window.dataCache.students = {
      data: uniqueData,
      timestamp: Date.now(),
      loading: false
    };
    
    if (container) {
      renderStudentsTable(uniqueData, container);
    }
    console.log('✅ Students loaded:', uniqueData.length);
  } catch (error) {
    console.error('❌ Error loading students:', error);
    showStatus('خطأ في تحميل الطلاب', 'error');
  } finally {
    studentsLoading = false;
  }
}

function renderStudentsTable(data, container) {
  console.log('🔄 renderStudentsTable called with', data.length, 'students');
  
  let html = `
    <div style="padding: 20px;">
      <div style="display: flex; gap: 10px; margin-bottom: 25px; flex-wrap: wrap;">
        <button class="btn btn-primary" onclick="showAddStudentModal()" style="display: flex; align-items: center; gap: 8px;">
          <i class="fas fa-plus"></i> إضافة طالب
        </button>
        <button class="btn btn-success" onclick="exportStudentsExcel()" style="display: flex; align-items: center; gap: 8px;">
          <i class="fas fa-file-excel"></i> تحميل البيانات
        </button>
        <button class="btn btn-info" onclick="printStudents()" style="display: flex; align-items: center; gap: 8px;">
          <i class="fas fa-print"></i> طباعة
        </button>
      </div>`;

  if (!data || data.length === 0) {
    html += '<div style="text-align: center; padding: 60px 20px;"><p style="color: #999; font-size: 1.1em;">📚 لا توجد بيانات طلاب</p></div>';
  } else {
    html += `<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(380px, 1fr)); gap: 20px;">`;
    
    data.forEach(student => {
      const subscriptions = (window.subscriptions || []).filter(s => s.student_id === student.id);
      const payments = (window.payments || []).filter(p => p.student_id === student.id);
      const totalPayments = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
      
      const coursesList = subscriptions
        .map(sub => {
          const course = (window.courses || []).find(c => c.id === sub.course_id);
          return course ? course.name : 'غير معروف';
        })
        .filter((v, i, a) => a.indexOf(v) === i)
        .join(', ');
      
      const totalSubscriptionCost = subscriptions.reduce((sum, sub) => {
        const course = (window.courses || []).find(c => c.id === sub.course_id);
        return sum + (course ? course.price || 0 : 0);
      }, 0);
      
      const remaining = totalSubscriptionCost - totalPayments;
      const paymentPercentage = totalSubscriptionCost > 0 ? (totalPayments / totalSubscriptionCost) * 100 : 0;
      
      html += `
        <div style="
          background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
          border-radius: 12px;
          padding: 20px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          transition: all 0.3s ease;
          border-right: 5px solid #667eea;
          cursor: pointer;
        " class="student-card" onmouseover="this.style.boxShadow='0 8px 20px rgba(102,126,234,0.2)'; this.style.transform='translateY(-5px)';" onmouseout="this.style.boxShadow='0 2px 8px rgba(0,0,0,0.1)'; this.style.transform='translateY(0)';">
          
          <!-- Header with student name -->
          <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 15px; border-bottom: 2px solid #e8eef7; padding-bottom: 12px;">
            <div>
              <h3 style="margin: 0; color: #333; font-size: 1.2em; font-weight: 700;">${escapeHtml(student.full_name)}</h3>
              <p style="margin: 5px 0 0 0; color: #999; font-size: 0.9em;">🆔 ${student.id.substring(0, 8)}...</p>
            </div>
            <span style="background: #667eea; color: white; padding: 6px 12px; border-radius: 20px; font-size: 0.85em; font-weight: 600;">
              ${subscriptions.length} اشتراك
            </span>
          </div>

          <!-- Contact Information -->
          <div style="background: #f5f7fa; padding: 12px; border-radius: 8px; margin-bottom: 15px;">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 0.9em;">
              <div>
                <p style="margin: 0 0 3px 0; color: #666;"><strong>📧 البريد:</strong></p>
                <p style="margin: 0; color: #333; word-break: break-all;">${escapeHtml(student.email || '-')}</p>
              </div>
              <div>
                <p style="margin: 0 0 3px 0; color: #666;"><strong>📱 الهاتف:</strong></p>
                <p style="margin: 0; color: #333;">${escapeHtml(student.phone || '-')}</p>
              </div>
            </div>
            ${student.guardian_name ? `
              <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #ddd;">
                <p style="margin: 0 0 3px 0; color: #666;"><strong> ولي الأمر:</strong></p>
                <p style="margin: 0; color: #333;">${escapeHtml(student.guardian_name)} ${student.guardian_phone ? `(${student.guardian_phone})` : ''}</p>
              </div>
            ` : ''}
          </div>

          <!-- Courses -->
          ${coursesList ? `
            <div style="margin-bottom: 15px;">
              <p style="margin: 0 0 8px 0; color: #666; font-weight: 600;">📚 الكورسات:</p>
              <div style="background: #e8eef7; padding: 10px; border-radius: 6px; font-size: 0.9em; color: #333; max-height: 60px; overflow-y: auto;">
                ${coursesList}
              </div>
            </div>
          ` : ''}

          <!-- Financial Stats -->
          <div style="background: linear-gradient(135deg, #f5f7fa 0%, #e8eef7 100%); padding: 12px; border-radius: 8px; margin-bottom: 15px;">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 0.9em;">
              <div>
                <p style="margin: 0 0 3px 0; color: #666;">💰 الإجمالي</p>
                <p style="margin: 0; color: #667eea; font-weight: 700; font-size: 1.1em;">${formatCurrency(totalSubscriptionCost)}</p>
              </div>
              <div>
                <p style="margin: 0 0 3px 0; color: #666;">✅ المدفوع</p>
                <p style="margin: 0; color: #4caf50; font-weight: 700; font-size: 1.1em;">${formatCurrency(totalPayments)}</p>
              </div>
            </div>
            
            <!-- Progress Bar -->
            <div style="margin-top: 10px;">
              <div style="background: #e0e0e0; height: 8px; border-radius: 4px; overflow: hidden;">
                <div style="background: linear-gradient(90deg, #4caf50 0%, #45a049 100%); height: 100%; width: ${Math.min(paymentPercentage, 100)}%; transition: width 0.3s ease;"></div>
              </div>
              <p style="margin: 5px 0 0 0; font-size: 0.85em; color: #999;">
                ${remaining > 0 ? `المتبقي: ${formatCurrency(remaining)}` : '✅ مدفوع بالكامل'}
              </p>
            </div>
          </div>

          <!-- Stats Row -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 15px; font-size: 0.9em;">
            <div style="text-align: center; padding: 10px; background: #f0f0f0; border-radius: 6px;">
              <p style="margin: 0; color: #666;">🧾 الدفعات</p>
              <p style="margin: 5px 0 0 0; font-weight: 700; color: #333; font-size: 1.3em;">${payments.length}</p>
            </div>
            <div style="text-align: center; padding: 10px; background: #f0f0f0; border-radius: 6px;">
              <p style="margin: 0; color: #666;">📊 نسبة الدفع</p>
              <p style="margin: 5px 0 0 0; font-weight: 700; color: #667eea; font-size: 1.3em;">${Math.round(paymentPercentage)}%</p>
            </div>
          </div>

          <!-- Action Buttons -->
          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px;">
            <button class="action-btn" onclick="editStudent('${student.id}')" style="background: #667eea; color: white; padding: 10px; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; transition: 0.3s;" onmouseover="this.style.background='#5568d3'" onmouseout="this.style.background='#667eea'">✏️ تعديل</button>
            <button class="action-btn" onclick="showStudentDetails('${student.id}')" style="background: #2196F3; color: white; padding: 10px; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; transition: 0.3s;" onmouseover="this.style.background='#1976D2'" onmouseout="this.style.background='#2196F3'">👁️ تفاصيل</button>
            <button class="action-btn" onclick="showStudentQR('${student.id}')" style="background: #9c27b0; color: white; padding: 10px; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; transition: 0.3s;" onmouseover="this.style.background='#7b1fa2'" onmouseout="this.style.background='#9c27b0'">📱 QR Code</button>
            <button class="action-btn" onclick="sendStudentReport('${student.id}')" style="background: #4caf50; color: white; padding: 10px; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; transition: 0.3s;" onmouseover="this.style.background='#45a049'" onmouseout="this.style.background='#4caf50'">📊 تقرير</button>
            <button class="action-btn" onclick="deleteStudent('${student.id}')" style="background: #f44336; color: white; padding: 10px; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; transition: 0.3s;" onmouseover="this.style.background='#da190b'" onmouseout="this.style.background='#f44336'">🗑️ حذف</button>
          </div>
        </div>
      `;
    });
    
    html += `</div>`;
  }
  
  html += `</div>`;
  container.innerHTML = html;
}

// === Courses Data ===
let coursesLoading = false;

async function loadCourses(forceRefresh = false) {
  try {
    if (coursesLoading) return;
    
    // Check cache
    const cache = window.dataCache.courses;
    const now = Date.now();
    if (!forceRefresh && cache.data && (now - cache.timestamp) < CACHE_DURATION) {
      window.courses = cache.data;
      const container = document.getElementById('coursesContainer');
      if (container && typeof renderCoursesTable === 'function') {
        renderCoursesTable(cache.data, container);
      }
      return;
    }
    
    if (coursesLoading) return;
    coursesLoading = true;
    
    if (!window.currentAcademyId) {
      console.error('❌ Academy ID not set');
      coursesLoading = false;
      return;
    }
    
    const container = document.getElementById('coursesContainer');
    if (container) {
      container.innerHTML = `
        <div class="loading">
          <div class="loading-spinner"></div>
          <p>جارٍ تحميل بيانات الكورسات...</p>
        </div>
      `;
    }

    const { data, error } = await window.supabaseClient
      .from('courses')
      .select('*')
      .eq('academy_id', window.currentAcademyId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    window.courses = data || [];
    
    // Update cache
    window.dataCache.courses = {
      data: data || [],
      timestamp: Date.now(),
      loading: false
    };
    
    if (container) {
      renderCoursesTable(data, container);
    }
    console.log('✅ Courses loaded:', data.length);
  } catch (error) {
    console.error('❌ Error loading courses:', error);
    showStatus('خطأ في تحميل الكورسات', 'error');
  } finally {
    coursesLoading = false;
  }
}

// === Teachers Data ===
async function loadTeachers() {
  try {
    const academyId = window.currentAcademyId || window.ACADEMY_ID || localStorage.getItem('current_academy_id');
    if (!academyId) {
      console.error('❌ Academy ID not set');
      window.teachers = [];
      return;
    }
    
    // Direct query - simplified
    const { data, error } = await window.supabaseClient
      .from('profiles')
      .select('id, full_name, role, academy_id')
      .eq('academy_id', academyId)
      .eq('role', 'teacher')
      .order('full_name', { ascending: true });

    if (error) {
      console.error('❌ Error loading teachers:', error.message);
      window.teachers = [];
      return;
    }
    
    window.teachers = data || [];
  } catch (error) {
    console.error('❌ Error loading teachers:', error);
    window.teachers = [];
  }
}

function renderCoursesTable(data, container) {
  if (!data || data.length === 0) {
    container.innerHTML = `
      <div style="padding: 40px; text-align: center; color: #999; grid-column: 1/-1;">
        <i class="fas fa-inbox" style="font-size: 3rem; margin-bottom: 15px; display: block;"></i>
        <p style="font-size: 1.1rem;">لا توجد كورسات</p>
        <button class="btn btn-primary" onclick="showAddCourseModal()" style="margin-top: 15px;">
          <i class="fas fa-plus"></i> إضافة كورس جديد
        </button>
      </div>
    `;
    return;
  }

  const html = data.map(course => {
    const studentCount = (window.subscriptions || []).filter(s => s.course_id === course.id).length;
    const totalRevenue = (window.payments || []).filter(p => p.course_id === course.id)
      .reduce((sum, p) => sum + (p.amount || 0), 0);
    const teacher = window.teachers?.find(t => t.id === course.teacher_id);
    const teacherName = teacher?.full_name || 'لم يتم تعيين';
    
    return `
      <div style="background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); transition: all 0.3s; cursor: pointer; hover: transform 0.3s ease-in-out;" onmouseover="this.style.boxShadow='0 8px 16px rgba(0,0,0,0.15)'; this.style.transform='translateY(-4px)'" onmouseout="this.style.boxShadow='0 2px 8px rgba(0,0,0,0.1)'; this.style.transform='translateY(0)'">
        <!-- Header with gradient -->
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px; border-bottom: 3px solid #667eea;">
          <h3 style="margin: 0; font-size: 1.1rem; font-weight: 600;">${escapeHtml(course.name)}</h3>
          <p style="margin: 5px 0 0 0; opacity: 0.9; font-size: 0.8rem;"> ${escapeHtml(teacherName)}</p>
        </div>

        <!-- Content -->
        <div style="padding: 15px;">
          <p style="margin: 0 0 12px 0; color: #666; font-size: 0.9rem; line-height: 1.4;">
            ${escapeHtml(course.description || 'بدون وصف')}
          </p>

          <!-- Stats Grid -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 15px;">
            <div style="background: #f0f7ff; padding: 10px; border-radius: 6px; text-align: center;">
              <div style="font-size: 0.75rem; color: #666; margin-bottom: 4px;">السعر</div>
              <div style="font-size: 1.2rem; font-weight: bold; color: #2196f3;">${formatCurrency(course.price || 0)}</div>
            </div>
            <div style="background: #f0fdf4; padding: 10px; border-radius: 6px; text-align: center;">
              <div style="font-size: 0.75rem; color: #666; margin-bottom: 4px;">الطلاب</div>
              <div style="font-size: 1.2rem; font-weight: bold; color: #4caf50;">${studentCount}</div>
            </div>
          </div>

          <!-- Revenue Info -->
          <div style="background: #fffbf0; padding: 10px; border-radius: 6px; border-right: 3px solid #ff9800; margin-bottom: 12px;">
            <div style="font-size: 0.75rem; color: #666; margin-bottom: 2px;">الإيرادات</div>
            <div style="font-size: 1.1rem; font-weight: bold; color: #ff9800;">${formatCurrency(totalRevenue)}</div>
          </div>
        </div>

        <!-- Actions -->
        <div style="padding: 12px 15px; background: #f9f9f9; border-top: 1px solid #eee; display: flex; gap: 8px;">
          <button class="action-btn" onclick="editCourse('${course.id}')" style="flex: 1; background: #2196f3; color: white; border: none; padding: 8px; border-radius: 4px; cursor: pointer; font-size: 0.85rem; font-weight: 500;">
            ✏️ تعديل
          </button>
          <button class="action-btn" onclick="deleteCourse('${course.id}')" style="flex: 1; background: #f44336; color: white; border: none; padding: 8px; border-radius: 4px; cursor: pointer; font-size: 0.85rem; font-weight: 500;">
            🗑️ حذف
          </button>
        </div>
      </div>
    `;
  }).join('');

  container.innerHTML = html;
  updateCoursesStats(data);
}

function updateCoursesStats(data) {
  const totalCourses = data.length;
  const totalStudents = (window.subscriptions || []).length;
  const totalRevenue = (window.payments || []).reduce((sum, p) => sum + (p.amount || 0), 0);
  const avgPrice = totalCourses > 0 ? data.reduce((sum, c) => sum + (c.price || 0), 0) / totalCourses : 0;

  document.getElementById('totalCoursesCount').textContent = totalCourses;
  document.getElementById('totalCoursesStudents').textContent = totalStudents;
  document.getElementById('totalCoursesRevenue').textContent = formatCurrency(totalRevenue);
  document.getElementById('averageCoursePrice').textContent = formatCurrency(avgPrice);
}

// === Subscriptions Data ===
let subscriptionsLoading = false;

async function loadSubscriptions(forceRefresh = false) {
  try {
    if (subscriptionsLoading) return;
    
    // Check cache
    const cache = window.dataCache.subscriptions;
    const now = Date.now();
    if (!forceRefresh && cache.data && (now - cache.timestamp) < CACHE_DURATION) {
      window.subscriptions = cache.data;
      const container = document.getElementById('subscriptionsContainer');
      if (container && typeof renderSubscriptionsTable === 'function') {
        renderSubscriptionsTable(cache.data, container);
      }
      return;
    }
    
    if (subscriptionsLoading) return;
    subscriptionsLoading = true;
    
    if (!window.currentAcademyId) {
      console.error('❌ Academy ID not set');
      subscriptionsLoading = false;
      return;
    }
    
    const container = document.getElementById('subscriptionsContainer');
    if (container) {
      container.innerHTML = `
        <div class="loading">
          <div class="loading-spinner"></div>
          <p>جارٍ تحميل بيانات الاشتراكات...</p>
        </div>
      `;
    }

    const { data: subscriptionsData, error } = await window.supabaseClient
      .from('subscriptions')
      .select('*')
      .eq('academy_id', window.currentAcademyId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Get related data from students and courses
    const { data: studentsData } = await window.supabaseClient
      .from('students')
      .select('id, full_name')
      .eq('academy_id', window.currentAcademyId);

    const { data: coursesData } = await window.supabaseClient
      .from('courses')
      .select('id, name, price')
      .eq('academy_id', window.currentAcademyId);

    // Manual join - استخدام بيانات الطلاب والكورسات الصحيحة
    const data = subscriptionsData.map(sub => {
      const student = studentsData?.find(s => s.id === sub.student_id);
      const course = coursesData?.find(c => c.id === sub.course_id);
      return {
        ...sub,
        student_name: student?.full_name || '-',
        course_name: course?.name || '-',
        course_price: course?.price || 0,
        start_date: sub.subscribed_at,
        end_date: sub.subscribed_at
      };
    });

    window.subscriptions = data || [];
    
    // Update cache
    window.dataCache.subscriptions = {
      data: data || [],
      timestamp: Date.now(),
      loading: false
    };
    
    if (container) {
      renderSubscriptionsTable(data, container);
    }
    console.log('✅ Subscriptions loaded:', data.length);
  } catch (error) {
    console.error('❌ Error loading subscriptions:', error);
    showStatus('خطأ في تحميل الاشتراكات', 'error');
  } finally {
    subscriptionsLoading = false;
  }
}

function renderSubscriptionsTable(data, container) {
  let html = `
    <div class="table-container">
      <div style="display: flex; gap: 10px; margin-bottom: 20px; flex-wrap: wrap;">
        <button class="btn btn-primary" onclick="showAddSubscriptionModal()" style="flex: 1; min-width: 150px;">
          <i class="fas fa-plus"></i> إضافة اشتراك جديد
        </button>
        <button class="btn btn-success" onclick="exportSubscriptionsExcel()" style="flex: 1; min-width: 150px;">
          <i class="fas fa-file-excel"></i> تحميل البيانات
        </button>
        <button class="btn btn-info" onclick="printSubscriptions()" style="flex: 1; min-width: 150px;">
          <i class="fas fa-print"></i> طباعة
        </button>
      </div>

      <div class="search-filter" style="display: flex; gap: 10px; margin-bottom: 20px;">
        <div class="search-box" style="flex: 1;">
          <input type="text" id="subscriptionSearch" placeholder="ابحث عن طالب أو كورس..." onkeyup="filterSubscriptions()" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px;">
        </div>
        <select id="subscriptionStatusFilter" onchange="filterSubscriptions()" style="padding: 10px; border: 1px solid #ddd; border-radius: 4px; min-width: 150px;">
          <option value="all">جميع الحالات</option>
          <option value="active">نشط فقط</option>
          <option value="inactive">منتهي فقط</option>
        </select>
      </div>`;

  if (!data || data.length === 0) {
    html += '<p class="no-data">لا توجد اشتراكات</p>';
  } else {
    const activeCount = data.filter(s => s.status === 'active').length;
    const inactiveCount = data.length - activeCount;

    html += `
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 20px;">
        <div style="background: #e3f2fd; padding: 12px; border-radius: 6px; text-align: center;">
          <p style="margin: 0; color: #1976d2; font-size: 0.85em;">إجمالي الاشتراكات</p>
          <p style="margin: 5px 0 0 0; font-size: 1.5em; font-weight: 700; color: #1565c0;">${data.length}</p>
        </div>
        <div style="background: #e8f5e9; padding: 12px; border-radius: 6px; text-align: center;">
          <p style="margin: 0; color: #388e3c; font-size: 0.85em;">✓ الاشتراكات النشطة</p>
          <p style="margin: 5px 0 0 0; font-size: 1.5em; font-weight: 700; color: #2e7d32;">${activeCount}</p>
        </div>
        <div style="background: #ffebee; padding: 12px; border-radius: 6px; text-align: center;">
          <p style="margin: 0; color: #c62828; font-size: 0.85em;">✗ المنتهية</p>
          <p style="margin: 5px 0 0 0; font-size: 1.5em; font-weight: 700; color: #b71c1c;">${inactiveCount}</p>
        </div>
      </div>

      <table style="width: 100%; border-collapse: collapse; background: white; border-radius: 6px; overflow: hidden;">
        <thead>
          <tr style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">
            <th style="padding: 12px; text-align: right; font-weight: 600;">👤 الطالب</th>
            <th style="padding: 12px; text-align: right; font-weight: 600;">📖 الكورس</th>
            <th style="padding: 12px; text-align: right; font-weight: 600;">💰 السعر</th>
            <th style="padding: 12px; text-align: right; font-weight: 600;">📅 البداية</th>
            <th style="padding: 12px; text-align: right; font-weight: 600;">📅 النهاية</th>
            <th style="padding: 12px; text-align: right; font-weight: 600;">الحالة</th>
            <th style="padding: 12px; text-align: right; font-weight: 600;">الإجراءات</th>
          </tr>
        </thead>
        <tbody>
          ${data.map((sub, idx) => `
            <tr style="border-bottom: 1px solid #eee; ${idx % 2 === 0 ? 'background: #f9f9f9;' : 'background: white;'} transition: background 0.2s;">
              <td style="padding: 12px; text-align: right; font-weight: 500;">${escapeHtml(sub.student_name || '-')}</td>
              <td style="padding: 12px; text-align: right;">${escapeHtml(sub.course_name || '-')}</td>
              <td style="padding: 12px; text-align: right; font-weight: 600; color: #2e7d32;">${formatCurrency(sub.course_price || 0)}</td>
              <td style="padding: 12px; text-align: right; font-size: 0.9em;">${formatDate(sub.start_date)}</td>
              <td style="padding: 12px; text-align: right; font-size: 0.9em;">${formatDate(sub.end_date)}</td>
              <td style="padding: 12px; text-align: right;">
                <span style="display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 0.85em; font-weight: 600; ${
                  sub.status === 'active' 
                    ? 'background: #c8e6c9; color: #1b5e20;' 
                    : 'background: #ffcdd2; color: #b71c1c;'
                }">
                  ${sub.status === 'active' ? '✓ نشط' : '✗ منتهي'}
                </span>
              </td>
              <td style="padding: 12px; text-align: right;">
                <button class="action-btn" onclick="showSubscriptionDetails('${sub.id}')" style="padding: 5px 10px; margin: 0 2px; background: #667eea; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.85em;">📋</button>
                <button class="action-btn" onclick="editSubscription('${sub.id}')" style="padding: 5px 10px; margin: 0 2px; background: #4caf50; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.85em;">✏️</button>
                <button class="action-btn" onclick="deleteSubscription('${sub.id}')" style="padding: 5px 10px; margin: 0 2px; background: #f44336; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.85em;">🗑️</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>`;
  }
  
  html += '</div>';
  container.innerHTML = html;
}

// === Payments Data ===
let paymentsLoading = false;

async function loadPayments(forceRefresh = false) {
  try {
    if (paymentsLoading) return;
    
    // Check cache
    const cache = window.dataCache.payments;
    const now = Date.now();
    if (!forceRefresh && cache.data && (now - cache.timestamp) < CACHE_DURATION) {
      window.payments = cache.data;
      return;
    }
    
    if (paymentsLoading) return;
    paymentsLoading = true;
    
    if (!window.currentAcademyId) {
      console.error('❌ Academy ID not set');
      paymentsLoading = false;
      return;
    }

    const { data: paymentsData, error } = await window.supabaseClient
      .from('payments')
      .select('*')
      .eq('academy_id', window.currentAcademyId)
      .order('payment_date', { ascending: false });

    if (error) throw error;

    // Get related data
    const { data: studentsData } = await window.supabaseClient
      .from('students')
      .select('id, full_name');

    const { data: coursesData } = await window.supabaseClient
      .from('courses')
      .select('id, name, price')
      .eq('academy_id', window.currentAcademyId);

    // Manual join
    const data = paymentsData.map(payment => ({
      ...payment,
      student_name: studentsData?.find(s => s.id === payment.student_id)?.full_name || '-',
      course_name: coursesData?.find(c => c.id === payment.course_id)?.name || '-'
    }));

    // Store raw payment data - rendering will be done by loadPaymentsTab()
    window.payments = data || [];
    
    // Update cache
    window.dataCache.payments = {
      data: data || [],
      timestamp: Date.now(),
      loading: false
    };
    
    console.log('✅ Payments data loaded:', window.payments.length);
  } catch (error) {
    console.error('❌ Error loading payments:', error);
    showStatus('خطأ في تحميل الدفعات', 'error');
  } finally {
    paymentsLoading = false;
  }
}

function renderPaymentsTable(data, container) {
  if (!data || data.length === 0) {
    container.innerHTML = `
      <div class="table-container">
        <button class="btn btn-primary" onclick="showAddPaymentModal()" style="margin-bottom: 20px;">
          <i class="fas fa-plus"></i> إضافة دفعة
        </button>
        <p class="no-data">لا توجد دفعات</p>
      </div>
    `;
    return;
  }

  // Calculate statistics
  const totalPayments = data.reduce((sum, p) => sum + (p.amount || 0), 0);
  const paidPayments = data.filter(p => p.status === 'paid').length;
  const pendingPayments = data.filter(p => p.status === 'pending').length;
  const failedPayments = data.filter(p => p.status === 'failed').length;

  const html = `
    <div class="table-container">
      <!-- إزرار التحكم العلوية -->
      <div style="display: flex; gap: 10px; margin-bottom: 20px; flex-wrap: wrap;">
        <button class="btn btn-primary" onclick="showAddPaymentModal()">
          <i class="fas fa-plus"></i> إضافة دفعة
        </button>
        <button class="btn btn-success" onclick="exportPaymentsExcel()">
          <i class="fas fa-file-excel"></i> تحميل Excel
        </button>
        <button class="btn btn-info" onclick="printPayments()">
          <i class="fas fa-print"></i> طباعة
        </button>
      </div>

      <!-- إحصائيات الدفعات -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px; border-radius: 8px; text-align: center;">
          <p style="margin: 0; font-size: 0.9em; opacity: 0.9;">💰 إجمالي المبالغ</p>
          <p style="margin: 8px 0 0 0; font-size: 1.5em; font-weight: 700;">${formatCurrency(totalPayments)}</p>
        </div>
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 15px; border-radius: 8px; text-align: center;">
          <p style="margin: 0; font-size: 0.9em; opacity: 0.9;">✓ مدفوع (${paidPayments})</p>
          <p style="margin: 8px 0 0 0; font-size: 1.5em; font-weight: 700;">${formatCurrency(data.filter(p => p.status === 'paid').reduce((sum, p) => sum + (p.amount || 0), 0))}</p>
        </div>
        <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 15px; border-radius: 8px; text-align: center;">
          <p style="margin: 0; font-size: 0.9em; opacity: 0.9;">⏳ قيد الانتظار (${pendingPayments})</p>
          <p style="margin: 8px 0 0 0; font-size: 1.5em; font-weight: 700;">${formatCurrency(data.filter(p => p.status === 'pending').reduce((sum, p) => sum + (p.amount || 0), 0))}</p>
        </div>
        <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 15px; border-radius: 8px; text-align: center;">
          <p style="margin: 0; font-size: 0.9em; opacity: 0.9;">✗ فشل (${failedPayments})</p>
          <p style="margin: 8px 0 0 0; font-size: 1.5em; font-weight: 700;">${formatCurrency(data.filter(p => p.status === 'failed').reduce((sum, p) => sum + (p.amount || 0), 0))}</p>
        </div>
      </div>

      <!-- خانات البحث والتصفية -->
      <div style="display: flex; gap: 10px; margin-bottom: 20px; flex-wrap: wrap;">
        <input 
          type="text" 
          id="paymentSearch" 
          placeholder="ابحث عن طالب أو كورس..." 
          class="search-input"
          onkeyup="filterPayments()"
          style="flex: 1; min-width: 200px; padding: 8px 12px; border: 1px solid #ddd; border-radius: 4px;"
        >
        <select 
          id="paymentStatusFilter" 
          onchange="filterPayments()"
          style="padding: 8px 12px; border: 1px solid #ddd; border-radius: 4px; background: white;"
        >
          <option value="all">كل الحالات</option>
          <option value="paid">✓ مدفوع</option>
          <option value="pending">⏳ قيد الانتظار</option>
          <option value="failed">✗ فشل</option>
        </select>
      </div>

      <!-- جدول الدفعات -->
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>👤 اسم الطالب</th>
            <th>📖 اسم الكورس</th>
            <th>💵 المبلغ</th>
            <th>🔄 طريقة الدفع</th>
            <th>📅 تاريخ الدفع</th>
            <th>⚙️ الحالة</th>
            <th>الإجراءات</th>
          </tr>
        </thead>
        <tbody>
          ${data.map((payment, idx) => `
            <tr>
              <td>${idx + 1}</td>
              <td>${escapeHtml(payment.student_name)}</td>
              <td>${escapeHtml(payment.course_name)}</td>
              <td style="font-weight: 600; color: #667eea;">${formatCurrency(payment.amount)}</td>
              <td>${getPaymentMethodLabel(payment.payment_method)}</td>
              <td>${formatDate(payment.payment_date)}</td>
              <td>
                <span class="status-badge" style="background-color: ${getPaymentStatusColor(payment.status)}33; color: ${getPaymentStatusColor(payment.status)}; border: 2px solid ${getPaymentStatusColor(payment.status)}; padding: 4px 8px; border-radius: 20px; font-weight: 600; font-size: 0.85em;">
                  ${payment.status === 'paid' ? '✓ مدفوع' : payment.status === 'pending' ? '⏳ قيد الانتظار' : '✗ فشل'}
                </span>
              </td>
              <td>
                <button class="action-btn" onclick="showPaymentDetails('${payment.id}')" style="background: #667eea; color: white; padding: 4px 8px; border: none; border-radius: 4px; cursor: pointer; font-size: 0.85em;">👁️ عرض</button>
                <button class="action-btn" onclick="editPayment('${payment.id}')" style="background: #f59e0b; color: white; padding: 4px 8px; border: none; border-radius: 4px; cursor: pointer; margin-right: 5px; font-size: 0.85em;">✏️ تعديل</button>
                <button class="action-btn" onclick="deletePayment('${payment.id}')" style="background: #ef4444; color: white; padding: 4px 8px; border: none; border-radius: 4px; cursor: pointer; margin-right: 5px; font-size: 0.85em;">🗑️ حذف</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
  
  container.innerHTML = html;
}

// === Attendance Data ===
let attendanceLoading = false;

async function loadAttendance(forceRefresh = false) {
  try {
    if (attendanceLoading) return;
    
    // Check cache (attendance cache shorter - 2 minutes)
    const cache = window.dataCache.attendances;
    const now = Date.now();
    const ATTENDANCE_CACHE = 2 * 60 * 1000; // 2 minutes
    if (!forceRefresh && cache.data && (now - cache.timestamp) < ATTENDANCE_CACHE) {
      window.attendances = cache.data;
      const container = document.getElementById('attendancesContainer');
      if (container && typeof renderAttendanceTable === 'function') {
        renderAttendanceTable(cache.data, container);
        updateAttendanceStats(cache.data);
      }
      return;
    }
    
    if (attendanceLoading) return;
    attendanceLoading = true;
    
    if (!window.currentAcademyId) {
      console.error('❌ Academy ID not set');
      attendanceLoading = false;
      return;
    }
    
    const container = document.getElementById('attendancesContainer');
    if (!container) {
      console.warn('⚠️ attendancesContainer not found');
      attendanceLoading = false;
      return;
    }
    
    container.innerHTML = `
      <div class="loading">
        <div class="loading-spinner"></div>
        <p>جارٍ تحميل بيانات الحضور...</p>
      </div>
    `;

    // محاولة الجلب من جدول attendances أولاً، وإذا لم يوجد فمن attendance
    let attendanceData = null;
    let error = null;
    
    // محاولة 1: من جدول attendances
    const { data: data1, error: error1 } = await window.supabaseClient
      .from('attendances')
      .select('*')
      .eq('academy_id', window.currentAcademyId)
      .order('date', { ascending: false });
    
    if (!error1 && data1) {
      attendanceData = data1;
    } else {
      // محاولة 2: من جدول attendance
      const { data: data2, error: error2 } = await window.supabaseClient
        .from('attendance')
        .select('*')
        .eq('academy_id', window.currentAcademyId)
        .order('date', { ascending: false });
      
      if (!error2 && data2) {
        attendanceData = data2;
      } else {
        error = error2 || error1;
      }
    }

    if (error) {
      console.error('❌ Error loading attendance:', error);
      container.innerHTML = `
        <div style="padding: 40px; text-align: center; color: #ef4444;">
          <i class="fas fa-exclamation-triangle" style="font-size: 3rem; margin-bottom: 15px; display: block;"></i>
          <p style="font-size: 1.1rem;">خطأ في تحميل بيانات الحضور</p>
          <p style="font-size: 0.9rem; color: #999;">${error.message}</p>
        </div>
      `;
      return;
    }

    if (!attendanceData || attendanceData.length === 0) {
      window.attendances = [];
      renderAttendanceTable([], container);
      updateAttendanceStats([]);
      return;
    }

    // Get related data - using students instead of profiles
    const { data: studentsData } = await window.supabaseClient
      .from('students')
      .select('id, full_name')
      .eq('academy_id', window.currentAcademyId);

    const { data: coursesData } = await window.supabaseClient
      .from('courses')
      .select('id, name')
      .eq('academy_id', window.currentAcademyId);

    // Manual join - معالجة أسماء الحقول المختلفة
    const data = attendanceData.map(att => {
      // التعامل مع أسماء الحقول المختلفة (date أو attendance_date)
      const attendanceDate = att.date || att.attendance_date || att.att_date;
      
      return {
        ...att,
        date: attendanceDate,
        attendance_date: attendanceDate,
        student_name: studentsData?.find(s => s.id === att.student_id)?.full_name || '-',
        course_name: coursesData?.find(c => c.id === att.course_id)?.name || '-'
      };
    });

    window.attendances = data || [];
    
    // Update cache
    window.dataCache.attendances = {
      data: data || [],
      timestamp: Date.now(),
      loading: false
    };
    
    renderAttendanceTable(data, container);
    updateAttendanceStats(data);
    console.log('✅ Attendance loaded:', data.length);
  } catch (error) {
    console.error('❌ Error loading attendance:', error);
    const container = document.getElementById('attendancesContainer');
    if (container) {
      container.innerHTML = `
        <div style="padding: 40px; text-align: center; color: #ef4444;">
          <i class="fas fa-exclamation-triangle" style="font-size: 3rem; margin-bottom: 15px; display: block;"></i>
          <p style="font-size: 1.1rem;">خطأ في تحميل بيانات الحضور</p>
          <p style="font-size: 0.9rem; color: #999;">${error.message}</p>
        </div>
      `;
    }
    showStatus('خطأ في تحميل الحضور', 'error');
  } finally {
    attendanceLoading = false;
  }
}

function renderAttendanceTable(data, container) {
  if (!container) {
    console.error('❌ Container not found for renderAttendanceTable');
    return;
  }

  if (!data || data.length === 0) {
    container.innerHTML = `
      <div style="padding: 40px; text-align: center; color: #999;">
        <i class="fas fa-inbox" style="font-size: 3rem; margin-bottom: 15px; display: block;"></i>
        <p style="font-size: 1.1rem;">لا توجد بيانات حضور</p>
        <p style="font-size: 0.9rem; color: #bbb;">سيتم عرض بيانات الحضور المسجلة من قبل المعلمين هنا</p>
      </div>
    `;
    return;
  }

  const html = `
    <div style="overflow-x: auto;">
      <table style="width: 100%; border-collapse: collapse; min-width: 600px;">
        <thead style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">
          <tr>
            <th style="padding: 15px; text-align: right; border: none; font-weight: 600;">👤 الطالب</th>
            <th style="padding: 15px; text-align: right; border: none; font-weight: 600;">📚 الكورس</th>
            <th style="padding: 15px; text-align: right; border: none; font-weight: 600;">📅 التاريخ</th>
            <th style="padding: 15px; text-align: center; border: none; font-weight: 600;">📊 الحالة</th>
            <th style="padding: 15px; text-align: right; border: none; font-weight: 600;">📝 ملاحظات</th>
          </tr>
        </thead>
        <tbody>
          ${data.map((att, index) => {
            const statusConfig = {
              'present': { label: '✓ حاضر', color: '#10b981', bg: '#e8f5e9' },
              'absent': { label: '✗ غائب', color: '#ef4444', bg: '#fee2e2' },
              'late': { label: '⏰ متأخر', color: '#f59e0b', bg: '#fff3cd' }
            };
            const config = statusConfig[att.status] || { label: att.status || 'غير محدد', color: '#6b7280', bg: '#f3f4f6' };
            
            // التعامل مع أسماء الحقول المختلفة
            const attendanceDate = att.date || att.attendance_date || att.att_date || '-';
            
            return `
              <tr style="border-bottom: 1px solid #eee; background: ${index % 2 === 0 ? '#ffffff' : '#f9f9f9'}; transition: background 0.2s;">
                <td style="padding: 12px 15px; text-align: right; color: #333; font-weight: 500;">${escapeHtml(att.student_name || '-')}</td>
                <td style="padding: 12px 15px; text-align: right; color: #555;">${escapeHtml(att.course_name || '-')}</td>
                <td style="padding: 12px 15px; text-align: right; color: #666; font-weight: 500;">${formatDate(attendanceDate)}</td>
                <td style="padding: 12px 15px; text-align: center;">
                  <span style="background: ${config.bg}; color: ${config.color}; padding: 6px 12px; border-radius: 20px; font-size: 0.85em; font-weight: 600; display: inline-block;">
                    ${config.label}
                  </span>
                </td>
                <td style="padding: 12px 15px; text-align: right; color: #777; font-size: 0.9em;">${att.notes ? escapeHtml(att.notes) : '-'}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;
  
  container.innerHTML = html;
}
