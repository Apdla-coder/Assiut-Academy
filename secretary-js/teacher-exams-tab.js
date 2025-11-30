// ============================================================================
// TEACHER EXAMS TAB - اختبارات المعلمين - Professional Management System
// ============================================================================

// === Global State ===
window.teacherExams = [];
let examsLoading = false;

/**
 * Load all teacher exams
 */
async function loadTeacherExams() {
  try {
    if (examsLoading) return;
    examsLoading = true;

    const container = document.getElementById('teacherExamsContainer');
    if (!container) {
      examsLoading = false;
      return;
    }

    container.innerHTML = `
      <div class="loading">
        <div class="loading-spinner"></div>
        <p>جاري تحميل الاختبارات...</p>
      </div>
    `;

    if (!window.currentAcademyId) {
      throw new Error('Academy ID not set');
    }

    // Robust fetch: try to select desired columns, but if the schema
    // differs (Postgres 42703 undefined_column), discover available columns
    // and re-run a safe select using only existing fields.
    const desiredCols = [
      'id','title','course_id','module_id','max_score','created_at','date',
      'created_by','description','difficulty_level','exam_type',
      'total_questions','pass_score','time_limit','academy_id'
    ];

    let examsData = [];
    try {
      // Try optimistic select first
      const tryRes = await window.supabaseClient
        .from('exams')
        .select(desiredCols.join(','))
        .eq('academy_id', window.currentAcademyId)
        .order('created_at', { ascending: false });

      if (!tryRes.error) {
        examsData = tryRes.data || [];
      } else if (tryRes.error && tryRes.error.code === '42703') {
        // Some requested columns don't exist. Discover available columns.
        console.warn('Some requested exam columns missing, discovering available columns...');
        const info = await window.supabaseClient.from('exams').select('*').limit(1);
        if (info.error) throw info.error;
        const available = info.data && info.data[0] ? Object.keys(info.data[0]) : [];
        const colsToUse = desiredCols.filter(c => available.includes(c));
        const finalCols = colsToUse.length ? colsToUse : ['id','title','created_at'];

        const finalRes = await window.supabaseClient
          .from('exams')
          .select(finalCols.join(','))
          .eq('academy_id', window.currentAcademyId)
          .order('created_at', { ascending: false });

        if (finalRes.error) throw finalRes.error;
        examsData = finalRes.data || [];
      } else {
        throw tryRes.error;
      }
    } catch (err) {
      throw err;
    }

    // Get course and module info for joins
    const { data: coursesData } = await window.supabaseClient
      .from('courses')
      .select('id, name')
      .eq('academy_id', window.currentAcademyId);

    // جلب الوحدات من modules
    const { data: modulesData } = await window.supabaseClient
      .from('modules')
      .select('id, title')
      .eq('academy_id', window.currentAcademyId);

    const { data: teachersData } = await window.supabaseClient
      .from('profiles')
      .select('id, full_name, avatar_url')
      .eq('role', 'teacher')
      .eq('academy_id', window.currentAcademyId);

    // Determine which field (if any) in exams points to teacher id
    const possibleTeacherKeys = ['created_by', 'teacher_id', 'creator_id', 'created_by_id', 'teacher'];
    let teacherKey = null;
    if (examsData && examsData.length > 0) {
      teacherKey = possibleTeacherKeys.find(k => Object.prototype.hasOwnProperty.call(examsData[0], k));
    }

    // Manual joins
    const examsWithDetails = (examsData || []).map(exam => {
      const teacherId = teacherKey ? exam[teacherKey] : null;
      return {
        ...exam,
        course_name: coursesData?.find(c => c.id === exam.course_id)?.name || 'كورس غير معروف',
        module_name: modulesData?.find(m => m.id === exam.module_id)?.title || 'وحدة غير معروفة',
        teacher_name: teachersData?.find(t => t.id === teacherId)?.full_name || 'معلم غير معروف',
        teacher_avatar: teachersData?.find(t => t.id === teacherId)?.avatar_url
      };
    });

    window.teacherExams = examsWithDetails || [];
    
    // جلب درجات الطلاب لكل اختبار
    await loadExamScoresForAllExams(examsWithDetails);
    
    // تحديث الإحصائيات
    updateExamStatistics();
    
    // تحديث قوائم الفلترة
    updateFilterDropdowns();
    
    renderTeacherExams(window.teacherExams, container);
    console.log('✅ Teacher exams loaded:', window.teacherExams.length);
  } catch (error) {
    console.error('❌ Error loading exams:', error);
    showStatus('خطأ في تحميل الاختبارات', 'error');
  } finally {
    examsLoading = false;
  }
}

/**
 * Load exam scores for all exams
 */
async function loadExamScoresForAllExams(exams) {
  if (!exams || exams.length === 0) return;
  
  const examIds = exams.map(e => e.id).filter(Boolean);
  if (examIds.length === 0) return;
  
  try {
    const { data: scoresData } = await window.supabaseClient
      .from('exam_scores')
      .select('exam_id, student_id, score, exam_date')
      .in('exam_id', examIds)
      .eq('academy_id', window.currentAcademyId);
    
    // جلب بيانات الطلاب
    const studentIds = [...new Set((scoresData || []).map(s => s.student_id))];
    let studentsMap = new Map();
    
    if (studentIds.length > 0) {
      const { data: students } = await window.supabaseClient
        .from('students')
        .select('id, full_name')
        .in('id', studentIds)
        .eq('academy_id', window.currentAcademyId);
      
      students?.forEach(s => studentsMap.set(s.id, s.full_name));
    }
    
    // ربط الدرجات بالاختبارات
    exams.forEach(exam => {
      // مقارنة مرنة لـ exam_id (قد يكون integer أو string)
      const examScores = (scoresData || []).filter(s => 
        s.exam_id == exam.id || 
        String(s.exam_id) === String(exam.id) ||
        parseInt(s.exam_id) === parseInt(exam.id)
      );
      exam.scores = examScores.map(score => ({
        ...score,
        student_name: studentsMap.get(score.student_id) || 'غير محدد'
      }));
      exam.students_count = examScores.length;
      exam.average_score = examScores.length > 0
        ? (examScores.reduce((sum, s) => sum + (parseFloat(s.score) || 0), 0) / examScores.length).toFixed(2)
        : 0;
      exam.passed_count = examScores.filter(s => parseFloat(s.score) >= (exam.pass_score || 0)).length;
      exam.failed_count = examScores.length - exam.passed_count;
    });
  } catch (error) {
    console.warn('Error loading exam scores:', error);
  }
}

/**
 * Update exam statistics
 */
function updateExamStatistics() {
  const exams = window.teacherExams || [];
  
  // إجمالي الاختبارات
  document.getElementById('totalExamsCount').textContent = exams.length;
  
  // إجمالي الطلاب المختبرين
  const totalStudents = new Set();
  exams.forEach(exam => {
    if (exam.scores) {
      exam.scores.forEach(score => totalStudents.add(score.student_id));
    }
  });
  document.getElementById('totalStudentsTested').textContent = totalStudents.size;
  
  // متوسط الدرجات
  let totalScore = 0;
  let totalCount = 0;
  exams.forEach(exam => {
    if (exam.scores && exam.scores.length > 0) {
      exam.scores.forEach(score => {
        const scoreValue = parseFloat(score.score) || 0;
        const maxScore = exam.max_score || 100;
        totalScore += (scoreValue / maxScore) * 100;
        totalCount++;
      });
    }
  });
  const avgScore = totalCount > 0 ? (totalScore / totalCount).toFixed(1) : 0;
  document.getElementById('averageScore').textContent = avgScore + '%';
  
  // نسبة النجاح
  let totalPassed = 0;
  let totalTested = 0;
  exams.forEach(exam => {
    if (exam.scores) {
      totalTested += exam.scores.length;
      totalPassed += exam.passed_count || 0;
    }
  });
  const passRate = totalTested > 0 ? ((totalPassed / totalTested) * 100).toFixed(1) : 0;
  document.getElementById('passRate').textContent = passRate + '%';
}

/**
 * Update filter dropdowns
 */
function updateFilterDropdowns() {
  const exams = window.teacherExams || [];
  
  // تحديث قائمة الكورسات
  const coursesSet = new Set();
  const teachersSet = new Set();
  
  exams.forEach(exam => {
    if (exam.course_name) coursesSet.add(exam.course_name);
    if (exam.teacher_name) teachersSet.add(exam.teacher_name);
  });
  
  const courseFilter = document.getElementById('examCourseFilter');
  if (courseFilter) {
    const currentValue = courseFilter.value;
    courseFilter.innerHTML = '<option value="">كل الكورسات</option>';
    [...coursesSet].sort().forEach(course => {
      courseFilter.innerHTML += `<option value="${escapeHtml(course)}">${escapeHtml(course)}</option>`;
    });
    if (currentValue) courseFilter.value = currentValue;
  }
  
  const teacherFilter = document.getElementById('examTeacherFilter');
  if (teacherFilter) {
    const currentValue = teacherFilter.value;
    teacherFilter.innerHTML = '<option value="">كل المعلمين</option>';
    [...teachersSet].sort().forEach(teacher => {
      teacherFilter.innerHTML += `<option value="${escapeHtml(teacher)}">${escapeHtml(teacher)}</option>`;
    });
    if (currentValue) teacherFilter.value = currentValue;
  }
}

/**
 * Render teacher exams with professional cards
 */
function renderTeacherExams(exams, container) {
  if (!exams || exams.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 60px 20px;">
        <i class="fas fa-file-alt" style="font-size: 3rem; color: #ccc; margin-bottom: 15px; display: block;"></i>
        <p style="color: #999; font-size: 1.1em;">لا توجد اختبارات</p>
        <p style="color: #bbb; font-size: 0.9em;">سيتم عرض اختبارات المعلمين هنا</p>
      </div>
    `;
    return;
  }

    let html = `
    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 20px; padding: 20px 0;">
  `;

  exams.forEach((exam, index) => {
    const difficultyConfig = {
      'easy': { label: 'سهل', color: '#10b981', bg: '#e8f5e9' },
      'medium': { label: 'متوسط', color: '#f59e0b', bg: '#fff3cd' },
      'hard': { label: 'صعب', color: '#ef4444', bg: '#fee2e2' }
    };
    const difficulty = difficultyConfig[exam.difficulty_level] || { label: 'عادي', color: '#6b7280', bg: '#f3f4f6' };

    const examTypeConfig = {
      'multiple_choice': { label: 'اختيار من متعدد', icon: '✓' },
      'essay': { label: 'مقالي', icon: '✏️' },
      'mixed': { label: 'مختلط', icon: '📋' }
    };
    const examType = examTypeConfig[exam.exam_type] || { label: 'اختبار', icon: '📝' };

    const createdDate = exam.created_at ? new Date(exam.created_at).toLocaleDateString('ar-EG', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    }) : 'غير محدد';
    
    const examDate = exam.date ? new Date(exam.date).toLocaleDateString('ar-EG') : createdDate;

    html += `
      <div style="
        background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
        border-radius: 12px;
        padding: 20px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        transition: all 0.3s ease;
        border-right: 5px solid #667eea;
        cursor: pointer;
        position: relative;
        overflow: hidden;
      " class="exam-card" onmouseover="this.style.boxShadow='0 8px 20px rgba(102,126,234,0.2)'; this.style.transform='translateY(-5px)';" onmouseout="this.style.boxShadow='0 2px 8px rgba(0,0,0,0.1)'; this.style.transform='translateY(0)';">
        
        <!-- Header -->
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px; border-bottom: 2px solid #e8eef7; padding-bottom: 12px;">
          <div style="flex: 1;">
            <h3 style="margin: 0; color: #333; font-size: 1.1em; font-weight: 700; line-height: 1.3;">
              ${escapeHtml(exam.title || 'بدون عنوان')}
            </h3>
            <p style="margin: 5px 0 0 0; color: #999; font-size: 0.85em;">
              📅 ${examDate}
            </p>
            ${exam.date ? `<p style="margin: 3px 0 0 0; color: #667eea; font-size: 0.8em; font-weight: 600;">📆 تاريخ الاختبار: ${new Date(exam.date).toLocaleDateString('ar-EG')}</p>` : ''}
          </div>
          <span style="background: ${difficulty.bg}; color: ${difficulty.color}; padding: 6px 12px; border-radius: 20px; font-size: 0.8em; font-weight: 600; white-space: nowrap; margin-left: 10px;">
            ${difficulty.label}
          </span>
        </div>

        <!-- Course & Module -->
        <div style="background: #f5f7fa; padding: 12px; border-radius: 8px; margin-bottom: 15px;">
          <p style="margin: 0 0 8px 0; color: #666; font-weight: 600; font-size: 0.9em;">
            📚 ${escapeHtml(exam.course_name)}
          </p>
          <p style="margin: 0; color: #888; font-size: 0.85em;">
            📖 ${escapeHtml(exam.module_name)}
          </p>
        </div>

        <!-- Exam Details Grid -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 15px;">
          <!-- Exam Type -->
          <div style="text-align: center; padding: 10px; background: #f0f0f0; border-radius: 8px;">
            <div style="font-size: 1.5em; margin-bottom: 5px;">${examType.icon}</div>
            <p style="margin: 0; color: #666; font-size: 0.85em;">${examType.label}</p>
          </div>

          <!-- Max Score -->
          <div style="text-align: center; padding: 10px; background: #f0f0f0; border-radius: 8px;">
            <div style="font-size: 1.5em; margin-bottom: 5px;">📊</div>
            <p style="margin: 0; color: #667eea; font-weight: 700; font-size: 0.9em;">${exam.max_score || 0} نقطة</p>
          </div>

          <!-- Pass Score -->
          ${exam.pass_score ? `
            <div style="text-align: center; padding: 10px; background: #f0f0f0; border-radius: 8px;">
              <div style="font-size: 1.5em; margin-bottom: 5px;">✅</div>
              <p style="margin: 0; color: #10b981; font-weight: 700; font-size: 0.9em;">${exam.pass_score || 0} للنجاح</p>
            </div>
          ` : ''}

          <!-- Time Limit -->
          ${exam.time_limit ? `
            <div style="text-align: center; padding: 10px; background: #f0f0f0; border-radius: 8px;">
              <div style="font-size: 1.5em; margin-bottom: 5px;">⏱️</div>
              <p style="margin: 0; color: #f59e0b; font-weight: 700; font-size: 0.9em;">${exam.time_limit} دقيقة</p>
            </div>
          ` : ''}

          <!-- Questions Count -->
          ${exam.total_questions ? `
            <div style="text-align: center; padding: 10px; background: #f0f0f0; border-radius: 8px;">
              <div style="font-size: 1.5em; margin-bottom: 5px;">❓</div>
              <p style="margin: 0; color: #764ba2; font-weight: 700; font-size: 0.9em;">${exam.total_questions} أسئلة</p>
            </div>
          ` : ''}
        </div>

        <!-- Description -->
        ${exam.description ? `
          <div style="background: #f9f9f9; padding: 10px; border-radius: 8px; margin-bottom: 15px; border-right: 3px solid #667eea;">
            <p style="margin: 0; color: #555; font-size: 0.9em; line-height: 1.4;">
              ${escapeHtml(exam.description.substring(0, 100))}${exam.description.length > 100 ? '...' : ''}
            </p>
          </div>
        ` : ''}

        <!-- Teacher Info -->
        <div style="display: flex; align-items: center; gap: 10px; padding: 12px; background: linear-gradient(135deg, #e8eef7 0%, #f5f7fa 100%); border-radius: 8px; margin-bottom: 15px;">
          ${exam.teacher_avatar ? `
            <img src="${escapeHtml(exam.teacher_avatar)}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover; border: 2px solid #667eea;">
          ` : `
            <div style="width: 40px; height: 40px; border-radius: 50%; background: #667eea; color: white; display: flex; align-items: center; justify-content: center; font-weight: bold;">
              ${escapeHtml(exam.teacher_name).charAt(0)}
            </div>
          `}
          <div style="flex: 1;">
            <p style="margin: 0; color: #333; font-weight: 600; font-size: 0.9em;">
              👨‍🏫 ${escapeHtml(exam.teacher_name)}
            </p>
          </div>
        </div>

        <!-- Statistics -->
        ${exam.scores && exam.scores.length > 0 ? `
          <div style="background: linear-gradient(135deg, #e8f5e9 0%, #f1f8e9 100%); padding: 12px; border-radius: 8px; margin-bottom: 15px; border-right: 3px solid #4caf50;">
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; text-align: center;">
              <div>
                <div style="font-size: 1.2em; font-weight: 700; color: #4caf50;">${exam.students_count || 0}</div>
                <div style="font-size: 0.75em; color: #666;">طالب</div>
              </div>
              <div>
                <div style="font-size: 1.2em; font-weight: 700; color: #2196f3;">${exam.average_score || 0}</div>
                <div style="font-size: 0.75em; color: #666;">متوسط</div>
              </div>
              <div>
                <div style="font-size: 1.2em; font-weight: 700; color: ${exam.passed_count > 0 ? '#4caf50' : '#f44336'};">
                  ${exam.passed_count || 0}/${exam.students_count || 0}
                </div>
                <div style="font-size: 0.75em; color: #666;">ناجح</div>
              </div>
            </div>
          </div>
        ` : `
          <div style="background: #fff3cd; padding: 12px; border-radius: 8px; margin-bottom: 15px; text-align: center; border-right: 3px solid #ff9800;">
            <p style="margin: 0; color: #856404; font-size: 0.9em;">⚠️ لا توجد درجات مسجلة بعد</p>
          </div>
        `}

        <!-- Action Buttons -->
        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          <button class="btn btn-primary" data-exam-id="${exam.id}" onclick="window.viewExamDetails(this.getAttribute('data-exam-id'))" style="flex: 1; min-width: 120px; padding: 10px; background: #667eea; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 0.9em; transition: background 0.2s;">
            👁️ التفاصيل
          </button>
          <button class="btn btn-success" data-exam-id="${exam.id}" onclick="window.viewExamScores(this.getAttribute('data-exam-id'))" style="flex: 1; min-width: 120px; padding: 10px; background: #4caf50; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 0.9em; transition: background 0.2s;">
            📊 الدرجات
          </button>
          <button class="btn btn-danger" data-exam-id="${exam.id}" onclick="window.deleteExam(this.getAttribute('data-exam-id'))" style="flex: 1; min-width: 100px; padding: 10px; background: #ef4444; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 0.9em; transition: background 0.2s;">
            🗑️ حذف
          </button>
        </div>
      </div>
    `;
  });

  html += '</div>';
  container.innerHTML = html;
}

/**
 * Filter exams by search and filters
 */
function filterTeacherExams() {
  const searchInput = document.getElementById('teacherExamSearch');
  const courseFilter = document.getElementById('examCourseFilter');
  const teacherFilter = document.getElementById('examTeacherFilter');
  
  if (!searchInput) return;

  const searchTerm = (searchInput.value || '').toLowerCase();
  const courseValue = courseFilter ? courseFilter.value : '';
  const teacherValue = teacherFilter ? teacherFilter.value : '';

  let filtered = window.teacherExams.filter(exam => {
    // البحث النصي
    const matchesSearch = !searchTerm || 
      exam.title.toLowerCase().includes(searchTerm) ||
      exam.course_name.toLowerCase().includes(searchTerm) ||
      exam.teacher_name.toLowerCase().includes(searchTerm) ||
      (exam.module_name && exam.module_name.toLowerCase().includes(searchTerm));
    
    // فلترة الكورس
    const matchesCourse = !courseValue || exam.course_name === courseValue;
    
    // فلترة المعلم
    const matchesTeacher = !teacherValue || exam.teacher_name === teacherValue;
    
    return matchesSearch && matchesCourse && matchesTeacher;
  });

  const container = document.getElementById('teacherExamsContainer');
  if (container) {
    renderTeacherExams(filtered, container);
  }
}

/**
 * View exam scores
 */
window.viewExamScores = async function(examId) {
  // تحويل examId إلى النوع الصحيح (integer أو string)
  const examIdNum = typeof examId === 'string' && !isNaN(examId) ? parseInt(examId) : examId;
  let exam = window.teacherExams.find(e => 
    e.id == examIdNum || 
    e.id === examIdNum || 
    String(e.id) === String(examId) ||
    parseInt(e.id) === parseInt(examIdNum)
  );
  
  if (!exam) {
    showStatus('الاختبار غير موجود', 'error');
    return;
  }
  
  // إعادة تحميل الدرجات إذا لم تكن موجودة
  if (!exam.scores || exam.scores.length === 0) {
    await loadExamScoresForAllExams([exam]);
    // إعادة البحث بعد التحديث
    exam = window.teacherExams.find(e => 
      e.id == examIdNum || 
      e.id === examIdNum || 
      String(e.id) === String(examId) ||
      parseInt(e.id) === parseInt(examIdNum)
    );
  }
  
  const scores = exam?.scores || [];
  
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.style.display = 'block';
  modal.innerHTML = `
    <div class="modal-content" style="max-width: 800px; max-height: 90vh; overflow-y: auto;">
      <div class="modal-header" style="background: linear-gradient(135deg, #4caf50 0%, #45a049 100%); color: white;">
        <h2 style="margin: 0; color: white;">📊 درجات الطلاب - ${escapeHtml(exam.title)}</h2>
        <button class="close" onclick="this.closest('.modal').remove()" style="color: white; font-size: 28px;">&times;</button>
      </div>
      <div class="modal-body" style="padding: 25px;">
        <div style="background: #f5f7fa; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; text-align: center;">
            <div>
              <div style="font-size: 1.5em; font-weight: 700; color: #2196f3;">${scores.length}</div>
              <div style="font-size: 0.85em; color: #666;">عدد الطلاب</div>
            </div>
            <div>
              <div style="font-size: 1.5em; font-weight: 700; color: #4caf50;">${exam.average_score || 0}</div>
              <div style="font-size: 0.85em; color: #666;">المتوسط</div>
            </div>
            <div>
              <div style="font-size: 1.5em; font-weight: 700; color: #4caf50;">${exam.passed_count || 0}</div>
              <div style="font-size: 0.85em; color: #666;">ناجح</div>
            </div>
            <div>
              <div style="font-size: 1.5em; font-weight: 700; color: #f44336;">${exam.failed_count || 0}</div>
              <div style="font-size: 0.85em; color: #666;">راسب</div>
            </div>
          </div>
        </div>
        
        ${scores.length > 0 ? `
          <div style="overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr style="background: #667eea; color: white;">
                  <th style="padding: 12px; text-align: right; border: 1px solid #ddd;">اسم الطالب</th>
                  <th style="padding: 12px; text-align: center; border: 1px solid #ddd;">الدرجة</th>
                  <th style="padding: 12px; text-align: center; border: 1px solid #ddd;">النسبة</th>
                  <th style="padding: 12px; text-align: center; border: 1px solid #ddd;">الحالة</th>
                  <th style="padding: 12px; text-align: center; border: 1px solid #ddd;">التاريخ</th>
                </tr>
              </thead>
              <tbody>
                ${scores.map((score, idx) => {
                  const percentage = ((parseFloat(score.score) || 0) / (exam.max_score || 100) * 100).toFixed(1);
                  const passed = parseFloat(score.score) >= (exam.pass_score || 0);
                  return `
                    <tr style="background: ${idx % 2 === 0 ? '#fff' : '#f9f9f9'};">
                      <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">${escapeHtml(score.student_name)}</td>
                      <td style="padding: 10px; border: 1px solid #ddd; text-align: center; font-weight: 600;">${score.score} / ${exam.max_score}</td>
                      <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">${percentage}%</td>
                      <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">
                        <span style="padding: 4px 12px; border-radius: 12px; font-size: 0.85em; font-weight: 600; background: ${passed ? '#e8f5e9' : '#fee2e2'}; color: ${passed ? '#2e7d32' : '#c62828'};">
                          ${passed ? '✓ ناجح' : '✗ راسب'}
                        </span>
                      </td>
                      <td style="padding: 10px; border: 1px solid #ddd; text-align: center; font-size: 0.9em; color: #666;">
                        ${score.exam_date ? new Date(score.exam_date).toLocaleDateString('ar-EG') : '-'}
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        ` : `
          <div style="text-align: center; padding: 40px; color: #999;">
            <i class="fas fa-inbox" style="font-size: 3rem; margin-bottom: 15px; display: block;"></i>
            <p>لا توجد درجات مسجلة لهذا الاختبار</p>
          </div>
        `}
      </div>
      <div class="modal-footer" style="padding: 15px; border-top: 1px solid #eee; display: flex; gap: 10px; justify-content: flex-end;">
        <button onclick="window.exportExamScoresExcel('${exam.id}')" class="btn btn-success" style="padding: 10px 20px;">
          <i class="fas fa-file-excel"></i> تصدير Excel
        </button>
        <button onclick="this.closest('.modal').remove()" class="btn btn-secondary" style="padding: 10px 20px;">إغلاق</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

/**
 * View exam details
 */
window.viewExamDetails = function(examId) {
  // تحويل examId إلى النوع الصحيح
  const examIdNum = typeof examId === 'string' && !isNaN(examId) ? parseInt(examId) : examId;
  const exam = window.teacherExams.find(e => e.id == examIdNum || e.id === examIdNum || String(e.id) === String(examId));
  if (!exam) {
    showStatus('الاختبار غير موجود', 'error');
    return;
  }

  // Create and show modal with full details
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.style.display = 'block';
  modal.innerHTML = `
    <div class="modal-content" style="max-width: 600px;">
      <div class="modal-header" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">
        <h2 style="margin: 0; color: white;">📋 تفاصيل الاختبار</h2>
        <button class="close" onclick="this.closest('.modal').remove()" style="color: white; font-size: 28px;">&times;</button>
      </div>
      <div class="modal-body" style="padding: 25px;">
        <div style="display: grid; gap: 15px;">
          <!-- Title -->
          <div>
            <label style="font-weight: 600; color: #667eea; display: block; margin-bottom: 5px;">📝 اسم الاختبار</label>
            <p style="margin: 0; color: #333; padding: 10px; background: #f5f7fa; border-radius: 6px; font-size: 1.05em;">${escapeHtml(exam.title)}</p>
          </div>

          <!-- Course & Module -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
            <div>
              <label style="font-weight: 600; color: #667eea; display: block; margin-bottom: 5px;">📚 الكورس</label>
              <p style="margin: 0; color: #333; padding: 10px; background: #f5f7fa; border-radius: 6px;">${escapeHtml(exam.course_name)}</p>
            </div>
            <div>
              <label style="font-weight: 600; color: #667eea; display: block; margin-bottom: 5px;">📖 الوحدة</label>
              <p style="margin: 0; color: #333; padding: 10px; background: #f5f7fa; border-radius: 6px;">${escapeHtml(exam.module_name)}</p>
            </div>
          </div>

          <!-- Exam Details Grid -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
            <div>
              <label style="font-weight: 600; color: #667eea; display: block; margin-bottom: 5px;">📊 الدرجة العظمى</label>
              <p style="margin: 0; color: #333; padding: 10px; background: #f5f7fa; border-radius: 6px; font-weight: 700;">${exam.max_score} نقطة</p>
            </div>
            ${exam.pass_score ? `
              <div>
                <label style="font-weight: 600; color: #667eea; display: block; margin-bottom: 5px;">✅ درجة النجاح</label>
                <p style="margin: 0; color: #333; padding: 10px; background: #f5f7fa; border-radius: 6px; font-weight: 700;">${exam.pass_score} نقطة</p>
              </div>
            ` : ''}
          </div>

          <!-- Time & Questions -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
            ${exam.time_limit ? `
              <div>
                <label style="font-weight: 600; color: #667eea; display: block; margin-bottom: 5px;">⏱️ الوقت المحدد</label>
                <p style="margin: 0; color: #333; padding: 10px; background: #f5f7fa; border-radius: 6px; font-weight: 700;">${exam.time_limit} دقيقة</p>
              </div>
            ` : ''}
            ${exam.total_questions ? `
              <div>
                <label style="font-weight: 600; color: #667eea; display: block; margin-bottom: 5px;">❓ عدد الأسئلة</label>
                <p style="margin: 0; color: #333; padding: 10px; background: #f5f7fa; border-radius: 6px; font-weight: 700;">${exam.total_questions} أسئلة</p>
              </div>
            ` : ''}
          </div>

          <!-- Type & Difficulty -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
            <div>
              <label style="font-weight: 600; color: #667eea; display: block; margin-bottom: 5px;">📋 نوع الاختبار</label>
              <p style="margin: 0; color: #333; padding: 10px; background: #f5f7fa; border-radius: 6px;">${getExamTypeLabel(exam.exam_type)}</p>
            </div>
            <div>
              <label style="font-weight: 600; color: #667eea; display: block; margin-bottom: 5px;">🎯 مستوى الصعوبة</label>
              <p style="margin: 0; color: #333; padding: 10px; background: #f5f7fa; border-radius: 6px;">${getDifficultyLabel(exam.difficulty_level)}</p>
            </div>
          </div>

          <!-- Description -->
          ${exam.description ? `
            <div>
              <label style="font-weight: 600; color: #667eea; display: block; margin-bottom: 5px;">📝 الوصف</label>
              <p style="margin: 0; color: #333; padding: 10px; background: #f5f7fa; border-radius: 6px; line-height: 1.5;">${escapeHtml(exam.description)}</p>
            </div>
          ` : ''}

          <!-- Teacher -->
          <div>
            <label style="font-weight: 600; color: #667eea; display: block; margin-bottom: 5px;">👨‍🏫 المعلم</label>
            <div style="display: flex; align-items: center; gap: 10px; padding: 10px; background: #f5f7fa; border-radius: 6px;">
              ${exam.teacher_avatar ? `
                <img src="${escapeHtml(exam.teacher_avatar)}" style="width: 35px; height: 35px; border-radius: 50%; object-fit: cover;">
              ` : `
                <div style="width: 35px; height: 35px; border-radius: 50%; background: #667eea; color: white; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 0.9em;">
                  ${escapeHtml(exam.teacher_name).charAt(0)}
                </div>
              `}
              <p style="margin: 0; color: #333; font-weight: 600;">${escapeHtml(exam.teacher_name)}</p>
            </div>
          </div>

          <!-- Created Date -->
          <div>
            <label style="font-weight: 600; color: #667eea; display: block; margin-bottom: 5px;">📅 تاريخ الإنشاء</label>
            <p style="margin: 0; color: #999; padding: 10px; background: #f5f7fa; border-radius: 6px; font-size: 0.9em;">
              ${new Date(exam.created_at).toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
          
          <!-- Statistics -->
          ${exam.scores && exam.scores.length > 0 ? `
            <div style="background: linear-gradient(135deg, #e8f5e9 0%, #f1f8e9 100%); padding: 15px; border-radius: 8px; border-right: 4px solid #4caf50;">
              <label style="font-weight: 600; color: #667eea; display: block; margin-bottom: 10px;">📊 إحصائيات الدرجات</label>
              <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
                <div>
                  <div style="font-size: 1.2em; font-weight: 700; color: #2196f3;">${exam.students_count || 0}</div>
                  <div style="font-size: 0.85em; color: #666;">عدد الطلاب</div>
                </div>
                <div>
                  <div style="font-size: 1.2em; font-weight: 700; color: #4caf50;">${exam.average_score || 0}</div>
                  <div style="font-size: 0.85em; color: #666;">المتوسط</div>
                </div>
                <div>
                  <div style="font-size: 1.2em; font-weight: 700; color: #4caf50;">${exam.passed_count || 0}</div>
                  <div style="font-size: 0.85em; color: #666;">ناجح</div>
                </div>
                <div>
                  <div style="font-size: 1.2em; font-weight: 700; color: #f44336;">${exam.failed_count || 0}</div>
                  <div style="font-size: 0.85em; color: #666;">راسب</div>
                </div>
              </div>
            </div>
          ` : ''}
        </div>
      </div>
      <div class="modal-footer" style="padding: 15px; border-top: 1px solid #eee; display: flex; gap: 10px; justify-content: flex-end;">
        ${exam.scores && exam.scores.length > 0 ? `
          <button onclick="window.viewExamScores('${exam.id}'); this.closest('.modal').remove();" class="btn btn-success" style="padding: 10px 20px;">
            <i class="fas fa-chart-bar"></i> عرض الدرجات
          </button>
        ` : ''}
        <button onclick="this.closest('.modal').remove()" class="btn btn-secondary" style="padding: 10px 20px;">إغلاق</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

/**
 * Edit exam
 */
function editExam(examId) {
  const exam = window.teacherExams.find(e => e.id === examId);
  if (!exam) return;

  alert('سيتم تطوير ميزة التعديل قريباً');
  console.log('Edit exam:', exam);
}

/**
 * Delete exam
 */
window.deleteExam = async function(examId) {
  // تحويل examId إلى النوع الصحيح
  const examIdNum = typeof examId === 'string' && !isNaN(examId) ? parseInt(examId) : examId;
  const exam = window.teacherExams.find(e => e.id == examIdNum || e.id === examIdNum || String(e.id) === String(examId));
  if (!exam) {
    showStatus('الاختبار غير موجود', 'error');
    return;
  }

  if (!confirm(`هل تريد حذف الاختبار "${exam.title}"؟\n\nسيتم حذف جميع الدرجات المرتبطة بهذا الاختبار أيضاً.`)) return;

  try {
    // حذف الدرجات أولاً
    const { error: scoresError } = await window.supabaseClient
      .from('exam_scores')
      .delete()
      .eq('exam_id', examIdNum)
      .eq('academy_id', window.currentAcademyId);
    
    if (scoresError) {
      console.warn('Error deleting exam scores:', scoresError);
    }
    
    // حذف الاختبار
    const { error } = await window.supabaseClient
      .from('exams')
      .delete()
      .eq('id', examIdNum)
      .eq('academy_id', window.currentAcademyId);

    if (error) throw error;

    window.teacherExams = window.teacherExams.filter(e => e.id != examIdNum && String(e.id) !== String(examId));
    const container = document.getElementById('teacherExamsContainer');
    if (container) {
      renderTeacherExams(window.teacherExams, container);
      updateExamStatistics();
    }

    showStatus('تم حذف الاختبار بنجاح', 'success');
  } catch (error) {
    console.error('Error deleting exam:', error);
    showStatus('خطأ في حذف الاختبار', 'error');
  }
}

/**
 * Helper: Get exam type label
 */
function getExamTypeLabel(type) {
  const typeMap = {
    'multiple_choice': 'اختيار من متعدد',
    'essay': 'مقالي',
    'mixed': 'مختلط'
  };
  return typeMap[type] || 'اختبار';
}

/**
 * Helper: Get difficulty label
 */
function getDifficultyLabel(difficulty) {
  const diffMap = {
    'easy': '🟢 سهل',
    'medium': '🟡 متوسط',
    'hard': '🔴 صعب'
  };
  return diffMap[difficulty] || 'عادي';
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

// Load exams when tab is switched
const _teacherExams_originalSwitchTab = window.switchTab;
window.switchTab = function(tabName) {
  if (tabName === 'teacherExams') {
    loadTeacherExams();
  }
  if (typeof _teacherExams_originalSwitchTab === 'function') {
    _teacherExams_originalSwitchTab(tabName);
  }
};

/**
 * Export exams to Excel
 */
window.exportExamsExcel = function() {
  const exams = window.teacherExams || [];
  if (exams.length === 0) {
    showStatus('لا توجد بيانات للتصدير', 'warning');
    return;
  }
  
  const data = exams.map(exam => ({
    'اسم الاختبار': exam.title,
    'الكورس': exam.course_name,
    'الوحدة': exam.module_name,
    'المعلم': exam.teacher_name,
    'الدرجة العظمى': exam.max_score,
    'درجة النجاح': exam.pass_score || '-',
    'عدد الأسئلة': exam.total_questions || '-',
    'الوقت المحدد': exam.time_limit ? exam.time_limit + ' دقيقة' : '-',
    'نوع الاختبار': getExamTypeLabel(exam.exam_type),
    'مستوى الصعوبة': getDifficultyLabel(exam.difficulty_level),
    'عدد الطلاب': exam.students_count || 0,
    'المتوسط': exam.average_score || 0,
    'ناجح': exam.passed_count || 0,
    'راسب': exam.failed_count || 0,
    'تاريخ الإنشاء': new Date(exam.created_at).toLocaleDateString('ar-EG')
  }));
  
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'الاختبارات');
  XLSX.writeFile(wb, `اختبارات_المعلمين_${new Date().toISOString().split('T')[0]}.xlsx`);
  showStatus('تم تصدير البيانات بنجاح', 'success');
}

/**
 * Export exam scores to Excel
 */
window.exportExamScoresExcel = function(examId) {
  const exam = window.teacherExams.find(e => e.id === examId);
  if (!exam || !exam.scores || exam.scores.length === 0) {
    showStatus('لا توجد درجات للتصدير', 'warning');
    return;
  }
  
  const data = exam.scores.map(score => {
    const percentage = ((parseFloat(score.score) || 0) / (exam.max_score || 100) * 100).toFixed(1);
    const passed = parseFloat(score.score) >= (exam.pass_score || 0);
    return {
      'اسم الطالب': score.student_name,
      'الدرجة': score.score,
      'الدرجة العظمى': exam.max_score,
      'النسبة المئوية': percentage + '%',
      'الحالة': passed ? 'ناجح' : 'راسب',
      'تاريخ الاختبار': score.exam_date ? new Date(score.exam_date).toLocaleDateString('ar-EG') : '-'
    };
  });
  
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'الدرجات');
  XLSX.writeFile(wb, `درجات_${escapeHtml(exam.title)}_${new Date().toISOString().split('T')[0]}.xlsx`);
  showStatus('تم تصدير الدرجات بنجاح', 'success');
}

/**
 * Print exams
 */
window.printExams = function() {
  const exams = window.teacherExams || [];
  if (exams.length === 0) {
    showStatus('لا توجد بيانات للطباعة', 'warning');
    return;
  }
  
  const printWindow = window.open('', '_blank');
  printWindow.document.write(`
    <html dir="rtl" lang="ar">
      <head>
        <title>طباعة الاختبارات</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 10px; text-align: right; }
          th { background: #667eea; color: white; }
          tr:nth-child(even) { background: #f9f9f9; }
          h1 { text-align: center; color: #667eea; }
        </style>
      </head>
      <body>
        <h1>قائمة اختبارات المعلمين</h1>
        <table>
          <thead>
            <tr>
              <th>اسم الاختبار</th>
              <th>الكورس</th>
              <th>المعلم</th>
              <th>الدرجة العظمى</th>
              <th>عدد الطلاب</th>
              <th>المتوسط</th>
              <th>نسبة النجاح</th>
            </tr>
          </thead>
          <tbody>
            ${exams.map(exam => `
              <tr>
                <td>${escapeHtml(exam.title)}</td>
                <td>${escapeHtml(exam.course_name)}</td>
                <td>${escapeHtml(exam.teacher_name)}</td>
                <td>${exam.max_score}</td>
                <td>${exam.students_count || 0}</td>
                <td>${exam.average_score || 0}</td>
                <td>${exam.students_count > 0 ? ((exam.passed_count / exam.students_count) * 100).toFixed(1) : 0}%</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.print();
}

// Setup search listener
document.addEventListener('DOMContentLoaded', function() {
  const searchInput = document.getElementById('teacherExamSearch');
  if (searchInput) {
    searchInput.addEventListener('keyup', filterTeacherExams);
  }
});
