
// =============================================================================
// 1. تحميل قائمة الاختبارات
// =============================================================================
async function loadModules() {
  try {
    const { data, error } = await supabaseClient
      .from('modules')
      .select('*')
      .order('order');

    if (error) throw error;

    window.modules = data || [];
  } catch (err) {
    console.error('❌ خطأ في تحميل الوحدات:', err);
    showStatus('فشل في تحميل الوحدات', 'error');
  }
}

async function loadTeacherExamsForSecretary(searchQuery = '') {
  const container = document.getElementById('teacherExamsContainer');
  if (!container) {
    console.error("عنصر 'teacherExamsContainer' غير موجود في DOM.");
    return;
  }

  container.innerHTML = '<p>⏳ جارٍ تحميل بيانات الاختبارات...</p>';

  try {
    // ✅ التأكد من تحميل الكورسات والوحدات أولاً
    if (typeof loadCourses === 'function') await loadCourses();
    await loadModules(); // تأكد من تحميل الوحدات

    let query = supabaseClient
      .from('exams')
      .select('id, title, max_score, date, course_id, module_id')
      .order('created_at', { ascending: false });

    if (searchQuery.trim()) {
      query = query.ilike('title', `%${searchQuery.trim()}%`);
    }

    const { data, error } = await query;
    if (error) throw error;

    exams = data;

    if (!data || data.length === 0) {
      container.innerHTML = `
        <p>⚠️ لا توجد اختبارات.</p>
        <button class="btn btn-primary" onclick="showAddExamModal()">
          <i class="fas fa-plus"></i> إضافة اختبار جديد
        </button>
      `;
      return;
    }

    // ✅ استخدام window.courses و window.modules للتأكد من صحة البيانات
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
              <th>التاريخ (إذا تم التحديد)</th>
              <th>الدرجة القصوى</th>
              <th>الإجراءات</th>
            </tr>
          </thead>
          <tbody>
    `;

    data.forEach(exam => {
      // ✅ التأكد من استخدام window.courses و window.modules
      const course = window.courses?.find(c => c.id === exam.course_id);
      const module = window.modules?.find(m => m.id === exam.module_id);

      html += `
        <tr>
          <td>${escapeHtml(exam.title)}</td>
          <td>${escapeHtml(course?.name || '---')}</td>
          <td>${escapeHtml(module?.title || '---')}</td>
          <td>${exam.date ? formatDate(exam.date) : '<span style="color: #999;">لم يُحدد بعد</span>'}</td>
          <td>${exam.max_score}</td>
          <td class="action-buttons">
            <button class="action-btn edit-btn" onclick="showEditExamModal('${exam.id}')">
              <i class="fas fa-edit"></i>
            </button>
            <button class="action-btn delete-btn" onclick="deleteExam('${exam.id}')">
              <i class="fas fa-trash"></i>
            </button>
          </td>
        </tr>
      `;
    });

    html += `</tbody></table></div>`;
    container.innerHTML = html;

  } catch (err) {
    console.error('خطأ في تحميل الاختبارات:', err);
    container.innerHTML = '<p>❌ حدث خطأ أثناء التحميل.</p>';
    showStatus('فشل في تحميل الاختبارات', 'error');
  }
}

// دالة بحث
function searchTeacherExams() {
  const query = document.getElementById('teacherExamSearch')?.value || '';
  loadTeacherExamsForSecretary(query);
}

// =============================================================================
// 2. إضافة اختبار جديد (بدون حقل التاريخ)
// =============================================================================
async function showAddExamModal() {
  try {
    // ✅ تأكد من تحميل الكورسات والوحدات أولاً
    if (typeof loadCourses === 'function') await loadCourses();
    if (typeof loadModules === 'function') await loadModules();

    const courseSelect = document.getElementById('examCourse');
    const moduleSelect = document.getElementById('examModule');

    if (!courseSelect || !moduleSelect) {
      showStatus('عذرًا، واجهة الإضافة غير مكتملة.', 'error');
      return;
    }

    // ملء قائمة الكورسات
    courseSelect.innerHTML = '<option value="">اختر كورسًا</option>';
    // ✅ التأكد من استخدام window.courses
    window.courses?.forEach(course => {
      const option = document.createElement('option');
      option.value = course.id;
      option.textContent = course.name;
      courseSelect.appendChild(option);
    });

    // ✅ إزالة أي حدث قديم أولاً لتجنب التكرار
    courseSelect.onchange = null;

    // تحديث قائمة الوحدات عند تغيير الكورس
    courseSelect.onchange = function () {
      updateModuleSelect(this.value);
    };

    // ✅ تحديث الوحدات بناءً على أول كورس افتراضي (إن وجد)
    if (courseSelect.value) {
      updateModuleSelect(courseSelect.value);
    } else {
      moduleSelect.innerHTML = '<option value="">اختر وحدة</option>';
    }

    // إظهار المودال
    document.getElementById('examModal').style.display = 'flex';
    document.getElementById('examId').value = '';
    document.getElementById('examTitle').value = '';
    document.getElementById('examMaxScore').value = '';
    // ❌ تم حذف حقل التاريخ تمامًا

  } catch (error) {
    console.error('خطأ في فتح نافذة الإضافة:', error);
    showStatus('فشل في تحميل البيانات', 'error');
  }
}

// تحديث قائمة الوحدات حسب الكورس (الوظيفة المُصلحة)
function updateModuleSelect(courseId) {
  const moduleSelect = document.getElementById('examModule');
  // ✅ تأكد من وجود العنصر
  if (!moduleSelect) {
    console.error("عنصر examModule غير موجود في DOM");
    return;
  }

  moduleSelect.innerHTML = '<option value="">اختر وحدة</option>';

  // ✅ التأكد من أن courseId موجود
  if (!courseId) return;

  // ✅ استخدام window.modules للبحث
  const filteredModules = window.modules?.filter(m => m.course_id === courseId) || [];

  if (filteredModules.length > 0) {
    filteredModules.forEach(module => {
      const option = document.createElement('option');
      option.value = module.id;
      option.textContent = module.title;
      moduleSelect.appendChild(option);
    });
  } else {
    const option = document.createElement('option');
    option.value = '';
    option.textContent = 'لا توجد وحدات';
    moduleSelect.appendChild(option);
  }
}

// =============================================================================
// 3. تعديل اختبار
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

  // ملء النموذج
  document.getElementById('examId').value = data.id;
  document.getElementById('examTitle').value = data.title;
  document.getElementById('examMaxScore').value = data.max_score;

  // ✅ التأكد من وجود حقل التاريخ قبل محاولة تعيين قيمته
  const dateInput = document.getElementById('examDate');
  if (dateInput) {
    dateInput.value = data.date || '';
  }

  // ✅ ملء قائمة الكورسات
  const courseSelect = document.getElementById('examCourse');
  courseSelect.innerHTML = '<option value="">اختر كورسًا</option>';
  window.courses?.forEach(course => {
    const option = document.createElement('option');
    option.value = course.id;
    option.textContent = course.name;
    if (course.id === data.course_id) option.selected = true;
    courseSelect.appendChild(option);
  });

  // ✅ تحديث قائمة الوحدات بناءً على الكورس المحدد
  const moduleSelect = document.getElementById('examModule');
  updateModuleSelect(data.course_id);

  // ✅ بعد التحديث، حدد الوحدة الصحيحة
  setTimeout(() => {
    moduleSelect.value = data.module_id;
  }, 100);

  // إظهار المودال
  document.getElementById('examModal').style.display = 'flex';
}
// =============================================================================
// 4. حفظ (إضافة أو تعديل) اختبار
// =============================================================================
async function saveExam() {
  const examId = document.getElementById('examId').value;
  const title = document.getElementById('examTitle').value.trim();
  const maxScore = parseFloat(document.getElementById('examMaxScore').value);
  const courseId = document.getElementById('examCourse').value;
  const moduleId = document.getElementById('examModule').value;

  if (!title || !maxScore || !courseId || !moduleId) {
    showStatus('يرجى ملء جميع الحقول المطلوبة.', 'error');
    return;
  }

  try {
    const examData = {
      title,
      max_score: maxScore,
      course_id: courseId,
      module_id: moduleId
      // ❌ تم حذف الحقل: date
    };

    const { error } = examId
      ? await supabaseClient.from('exams').update(examData).eq('id', examId)
      : await supabaseClient.from('exams').insert([examData]);

    if (error) throw error;

    showStatus(`تم ${examId ? 'تحديث' : 'إضافة'} الاختبار بنجاح.`);
    closeModal('examModal');
    await loadTeacherExamsForSecretary();

  } catch (err) {
    console.error('خطأ في حفظ الاختبار:', err);
    showStatus('حدث خطأ أثناء حفظ الاختبار.', 'error');
  }
}

// =============================================================================
// 5. حذف اختبار
// =============================================================================
async function deleteExam(examId) {
  if (!confirm('هل أنت متأكد من حذف هذا الاختبار؟')) return;

  try {
    const { error } = await supabaseClient
      .from('exams')
      .delete()
      .eq('id', examId);

    if (error) throw error;

    showStatus('تم حذف الاختبار بنجاح');
    await loadTeacherExamsForSecretary();

  } catch (err) {
    console.error('خطأ في الحذف:', err);
    showStatus('خطأ في الحذف', 'error');
  }
}

// =============================================================================
// 6. دوال مساعدة
// =============================================================================

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.style.display = 'none';
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatDate(dateString) {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return isNaN(date) ? '-' : date.toLocaleDateString('ar-EG', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
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

// =============================================================================
// 7. ربط النموذج
// =============================================================================

document.addEventListener('DOMContentLoaded', function () {
  const form = document.getElementById('examForm');
  if (form) {
    form.onsubmit = async function (e) {
      e.preventDefault();
      await saveExam();
    };
  }
});