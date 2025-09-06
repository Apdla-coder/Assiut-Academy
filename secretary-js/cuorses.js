// courseManagement.js
// This file depends on `supabaseClient` and global variables being defined in config.js
// It also depends on utility functions like `showStatus`, `formatDate`, etc.

// ====== Course Management ======

/**
 * Loads the list of courses from the database and sets up Realtime subscription.
 */
async function loadCourses() {
  const container = document.getElementById('coursesContainer');
  if (!container) return;

  try {
    container.innerHTML = `<div class="loading"><div class="loading-spinner"></div><p>جارٍ تحميل بيانات الكورسات...</p></div>`;

    // Unsubscribe from previous course list subscription
    if (window.coursesSubscription) {
      window.coursesSubscription.unsubscribe();
      console.log("Unsubscribed from previous courses list subscription");
    }

    // Fetch courses with teacher information
    const { data: coursesData, error: coursesError } = await supabaseClient
      .from('courses')
      .select(`*, users!courses_teacher_id_fkey (full_name)`) // Explicitly reference the foreign key
      .order('created_at', { ascending: false });

    if (coursesError) throw coursesError;
    window.courses = coursesData; // Update global variable

    // Fetch teachers separately
    const { data: teachersData, error: teachersError } = await supabaseClient
      .from('users')
      .select('id, full_name')
      .eq('role', 'teacher');
    
    if (teachersError) throw teachersError;
    window.teachers = teachersData; // Update global variable

    // Update dropdowns (ensure this function exists)
    if (typeof populateCourseDropdown === 'function') {
        populateCourseDropdown(window.courses);
    }

    // Populate teacher dropdown in course modal
    populateTeacherDropdown();

    // Display courses (ensure this function exists)
    if(typeof displayCourses === 'function') {
        displayCourses(window.courses);
    }

    // Setup Realtime subscription for the courses list
    window.coursesSubscription = supabaseClient
      .channel('public:courses_list')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'courses' },
        () => loadCourses() // Reload list on any course change
      )
      .subscribe();
    console.log("Subscribed to courses list changes");

  } catch (error) {
    console.error('Error loading courses:', error);
    container.innerHTML = `<div class="loading"><p>خطأ في تحميل بيانات الكورسات: ${error.message}</p></div>`;
    if (typeof showStatus === 'function') {
        showStatus('خطأ في تحميل بيانات الكورسات', 'error');
    }
  }
}

/**
 * Populates the teacher dropdown in the course modal
 */
function populateTeacherDropdown() {
  const teacherSelect = document.getElementById('teacher');
  if (!teacherSelect || !window.teachers) return;

  // Clear existing options except the first one
  while (teacherSelect.options.length > 1) {
    teacherSelect.remove(1);
  }

  // Add teachers to dropdown
  window.teachers.forEach(teacher => {
    const option = document.createElement('option');
    option.value = teacher.id;
    option.textContent = teacher.full_name;
    teacherSelect.appendChild(option);
  });
}

/**
 * Displays the list of courses in the UI.
 * @param {Array} coursesData - Array of course objects to display.
 */
function displayCourses(coursesData) {
  const container = document.getElementById('coursesContainer');
  if (!container) return;

  if (!coursesData || coursesData.length === 0) {
    container.innerHTML = `
      <div class="table-container">
        <button class="btn btn-primary" onclick="showAddCourseModal()" style="margin-bottom: 20px;">
          <i class="fas fa-plus"></i> إضافة دورة جديد
        </button>
        <p class="no-data">لا توجد كورسات حالياً.</p>
      </div>
    `;
    return;
  }

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
          ${coursesData.map(course => `
            <tr>
              <td><a href="#" onclick="showCourseDetails('${course.id}'); return false;" style="color: var(--primary); text-decoration: underline;">${escapeHtml(course.name)}</a></td>
              <td>${escapeHtml(course.description || '-')}</td>
              <td>${formatCurrency(course.price).replace('SAR', 'ج.م')}</td>
              <td>${escapeHtml(course.users?.full_name || '-')}</td>
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
  `;
}

/**
 * Opens the modal for adding a new course.
 */
function showAddCourseModal() {
  const modal = document.getElementById('courseModal');
  if (!modal) {
    if (typeof showStatus === 'function') {
        showStatus('خطأ في فتح نافذة الدورة', 'error');
    }
    return;
  }
  modal.style.display = 'flex';
  document.getElementById('courseModalTitle').textContent = 'إضافة دورة جديد';
  document.getElementById('courseForm').reset();
  document.getElementById('courseId').value = '';
  // Clear dynamic fields if they exist
  const modulesContainer = document.getElementById('modulesContainer');
  const lessonsContainer = document.getElementById('lessonsContainer');
  if (modulesContainer) modulesContainer.innerHTML = '';
  if (lessonsContainer) lessonsContainer.innerHTML = '';
}

/**
 * Adds a new course, including associated modules and lessons.
 */
async function addCourse() {
  try {
    const courseName = document.getElementById('courseName').value.trim();
    const description = document.getElementById('courseDescription').value.trim();
    const price = parseFloat(document.getElementById('coursePrice').value) || 0;
    const teacherId = document.getElementById('teacher').value || null;
    const startDate = document.getElementById('startDate').value || null;
    const endDate = document.getElementById('endDate').value || null;

    if (!courseName) {
      if (typeof showStatus === 'function') {
        showStatus('يرجى إدخال اسم الدورة', 'error');
      }
      return;
    }

    const { data: courseData, error: courseError } = await supabaseClient
      .from('courses')
      .insert([{
        name: courseName,
        description: description,
        price: price,
        teacher_id: teacherId,
        start_date: startDate,
        end_date: endDate,
        created_at: new Date().toISOString()
      }])
      .select();

    if (courseError) throw courseError;
    const courseId = courseData[0].id;
    console.log('Course added with ID:', courseId);

    // Collect and add modules
    const moduleNames = document.querySelectorAll('input[name="moduleName[]"]');
    const moduleDescriptions = document.querySelectorAll('textarea[name="moduleDescription[]"]');
    const moduleOrders = document.querySelectorAll('input[name="moduleOrder[]"]');

    const modulesToAdd = [];
    moduleNames.forEach((nameInput, index) => {
      const name = nameInput.value.trim();
      if (name) {
        modulesToAdd.push({
          course_id: courseId,
          title: name,
          description: moduleDescriptions[index]?.value.trim() || '',
          order: parseInt(moduleOrders[index]?.value) || null
        });
      }
    });

    let insertedModules = [];
    if (modulesToAdd.length > 0) {
      const { data: moduleData, error: moduleError } = await supabaseClient
        .from('modules')
        .insert(modulesToAdd)
        .select();
      if (moduleError) throw moduleError;
      insertedModules = moduleData;
      console.log('Modules added:', insertedModules);
    }

    // Collect and add lessons
    const lessonTitles = document.querySelectorAll('input[name="lessonTitle[]"]');
    const lessonDescriptions = document.querySelectorAll('textarea[name="lessonDescription[]"]');
    const lessonDates = document.querySelectorAll('input[name="lessonDate[]"]');
    const lessonModuleIndexes = document.querySelectorAll('select[name="lessonModuleIndex[]"]');

    const lessonsToAdd = [];
    lessonTitles.forEach((titleInput, index) => {
      const title = titleInput.value.trim();
      const moduleIndex = parseInt(lessonModuleIndexes[index]?.value);
      if (title && !isNaN(moduleIndex) && moduleIndex >= 0 && moduleIndex < insertedModules.length) {
        const moduleId = insertedModules[moduleIndex].id;
        lessonsToAdd.push({
          course_id: courseId,
          module_id: moduleId,
          title: title,
          description: lessonDescriptions[index]?.value.trim() || '',
          date: lessonDates[index]?.value || null
        });
      } else if (title) {
        console.warn(`الدرس "${title}" غير مرتبط بوحدة صحيحة.`);
      }
    });

    if (lessonsToAdd.length > 0) {
      const { error: lessonError } = await supabaseClient.from('lessons').insert(lessonsToAdd);
      if (lessonError) throw lessonError;
      console.log('Lessons added');
    }

    if (typeof showStatus === 'function') {
        showStatus('تم إضافة الدورة والوحدات والدروس بنجاح');
    }
    if (typeof closeModal === 'function') {
        closeModal('courseModal');
    }
    document.getElementById('courseForm').reset();
    const modulesContainer = document.getElementById('modulesContainer');
    const lessonsContainer = document.getElementById('lessonsContainer');
    if (modulesContainer) modulesContainer.innerHTML = '';
    if (lessonsContainer) lessonsContainer.innerHTML = '';

    // Realtime will trigger loadCourses()

  } catch (error) {
    console.error('Error adding course with modules/lessons:', error);
    if (typeof showStatus === 'function') {
        showStatus(`خطأ في إضافة الدورة: ${error.message || 'حدث خطأ غير معروف'}`, 'error');
    }
  }
}

/**
 * Opens the modal for editing an existing course.
 * @param {string} courseId - The ID of the course to edit.
 */
function showEditCourseModal(courseId) {
  const course = window.courses.find(c => c.id === courseId);
  if (!course) {
    if (typeof showStatus === 'function') {
        showStatus('الدورة غير موجودة', 'error');
    }
    return;
  }

  const modal = document.getElementById('courseModal');
  if (!modal) return; // Add check if modal exists
  modal.style.display = 'flex';
  document.getElementById('courseModalTitle').textContent = 'تعديل الدورة';
  document.getElementById('courseId').value = course.id;
  document.getElementById('courseName').value = course.name;
  document.getElementById('courseDescription').value = course.description || '';
  document.getElementById('coursePrice').value = course.price || 0;
  document.getElementById('teacher').value = course.teacher_id || '';
  document.getElementById('startDate').value = course.start_date || '';
  document.getElementById('endDate').value = course.end_date || '';
}

/**
 * Updates an existing course.
 * @param {string} courseId - The ID of the course to update.
 */
async function updateCourse(courseId) {
  try {
    const courseName = document.getElementById('courseName').value.trim();
    const description = document.getElementById('courseDescription').value.trim();
    const price = parseFloat(document.getElementById('coursePrice').value) || 0;
    const teacherId = document.getElementById('teacher').value || null;
    const startDate = document.getElementById('startDate').value || null;
    const endDate = document.getElementById('endDate').value || null;

    const { error } = await supabaseClient
      .from('courses')
      .update({
        name: courseName,
        description: description,
        price: price,
        teacher_id: teacherId,
        start_date: startDate,
        end_date: endDate
      })
      .eq('id', courseId);

    if (error) throw error;

    if (typeof showStatus === 'function') {
        showStatus('تم تحديث بيانات الدورة بنجاح');
    }
    if (typeof closeModal === 'function') {
        closeModal('courseModal');
    }
    // Realtime will trigger loadCourses()

  } catch (error) {
    console.error('Error updating course:', error);
    if (typeof showStatus === 'function') {
        showStatus(`خطأ في تحديث بيانات الدورة: ${error.message || 'حدث خطأ غير معروف'}`, 'error');
    }
  }
}

/**
 * Deletes a course after user confirmation.
 * @param {string} courseId - The ID of the course to delete.
 */
async function deleteCourse(courseId) {
  if (!confirm('هل أنت متأكد من حذف هذه الدورة؟')) return;

  try {
    const { error } = await supabaseClient.from('courses').delete().eq('id', courseId);
    if (error) throw error;

    if (typeof showStatus === 'function') {
        showStatus('تم حذف الدورة بنجاح');
    }
    // Realtime will trigger loadCourses()

  } catch (error) {
    console.error('Error deleting course:', error);
    if (typeof showStatus === 'function') {
        showStatus('خطأ في حذف الدورة', 'error');
    }
  }
}

// ====== Course Detail Modal (Modules & Lessons) ======

/**
 * Shows the details modal for a specific course and loads its modules/lessons.
 * @param {string} courseId - The ID of the course to show details for.
 */
async function showCourseDetails(courseId) {
  // Ensure window.courses is populated, might need to fetch if not
  const course = window.courses.find(c => c.id === courseId);
  if (!course) {
    if (typeof showStatus === 'function') {
        showStatus('الدورة غير موجودة', 'error');
    }
    return;
  }

  window.currentCourseId = courseId; // Set global ID

  document.getElementById('courseDetailTitle').textContent = `تفاصيل الدورة: ${escapeHtml(course.name)}`;
  document.getElementById('detailCourseName').textContent = escapeHtml(course.name) || '-';
  document.getElementById('detailCourseDescription').textContent = escapeHtml(course.description) || '-';
  document.getElementById('detailCoursePrice').textContent = formatCurrency(course.price).replace('SAR', 'ج.م') || '0.00';
  document.getElementById('detailCourseTeacher').textContent = escapeHtml(course.users?.full_name) || '-';
  document.getElementById('detailCourseStartDate').textContent = course.start_date ? formatDate(course.start_date) : '-';
  document.getElementById('detailCourseEndDate').textContent = course.end_date ? formatDate(course.end_date) : '-';

  if (typeof switchCourseDetailTab === 'function') {
    switchCourseDetailTab('overview');
  }
  const modal = document.getElementById('courseDetailModal');
  if (modal) {
      modal.style.display = 'block';
  }

  // Load modules and lessons for this specific course with Realtime
  await loadCourseModulesAndLessons(courseId);
}

/**
 * Switches tabs within the course detail modal.
 * @param {string} tabName - The name of the tab ('overview' or 'modules').
 */
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
    const activeButton = Array.from(document.querySelectorAll('.tab-button'))
      .find(btn => btn.textContent.includes(tabName === 'overview' ? 'نظرة عامة' : 'الوحدات والدروس'));
    if (activeButton) activeButton.classList.add('active');
  }
}

/**
 * Loads modules and lessons for a specific course and sets up Realtime subscriptions.
 * @param {string} courseId - The ID of the course.
 */
async function loadCourseModulesAndLessons(courseId) {
  const modulesList = document.getElementById('modulesList');
  if (!modulesList) return;

  try {
    modulesList.innerHTML = '<p class="loading">جاري تحميل الوحدات والدروس...</p>';

    // Unsubscribe from previous specific course subscriptions
    if (window.modulesSubscription) {
      window.modulesSubscription.unsubscribe();
      console.log("Unsubscribed from previous modules subscription");
    }
    if (window.lessonsSubscription) {
      window.lessonsSubscription.unsubscribe();
      console.log("Unsubscribed from previous lessons subscription");
    }

    // Fetch initial data
    const { data: modulesData, error: modulesError } = await supabaseClient
      .from('modules')
      .select('*')
      .eq('course_id', courseId)
      .order('order', { ascending: true });

    if (modulesError) throw modulesError;

    const { data: lessonsData, error: lessonsError } = await supabaseClient
      .from('lessons')
      .select('*')
      .eq('course_id', courseId)
      .order('date', { ascending: true });

    if (lessonsError) throw lessonsError;

    // Update global variables for display
    window.currentCourseModules = modulesData || [];
    window.currentCourseLessons = lessonsData || [];
    window.currentCourseId = courseId; // Ensure ID is set

    // Display fetched data (ensure this function exists)
    if (typeof displayModulesAndLessons === 'function') {
        displayModulesAndLessons();
    }

    // Setup Realtime subscriptions for this specific course's modules and lessons
    window.modulesSubscription = supabaseClient
      .channel(`public:modules:${courseId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'modules',
        filter: `course_id=eq.${courseId}`
      }, () => loadCourseModulesAndLessons(courseId)) // Reload on change
      .subscribe();
    console.log(`Subscribed to modules changes for course ${courseId}`);

    window.lessonsSubscription = supabaseClient
      .channel(`public:lessons:${courseId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'lessons',
        filter: `course_id=eq.${courseId}`
      }, () => loadCourseModulesAndLessons(courseId)) // Reload on change
      .subscribe();
    console.log(`Subscribed to lessons changes for course ${courseId}`);

  } catch (error) {
    console.error('Error loading modules and lessons:', error);
    modulesList.innerHTML = `<p class="error">خطأ في تحميل الوحدات والدروس: ${error.message}</p>`;
    if (typeof showStatus === 'function') {
        showStatus('خطأ في تحميل الوحدات والدروس', 'error');
    }
  }
}

/**
 * Displays the modules and lessons for the currently selected course in the detail modal.
 */
function displayModulesAndLessons() {
  const modulesListContainer = document.getElementById('modulesList');
  if (!modulesListContainer) return;

  if (window.currentCourseModules.length === 0) {
    modulesListContainer.innerHTML = '<p class="no-data">لا توجد وحدات لهذا الدورة بعد.</p>';
    return;
  }

  let modulesHtml = '';
  window.currentCourseModules.forEach(module => {
    const moduleLessons = window.currentCourseLessons.filter(lesson => lesson.module_id === module.id);

    modulesHtml += `
      <div class="module-card" data-module-id="${module.id}">
        <div class="module-header">
          <h4 class="module-title">${escapeHtml(module.title)}</h4>
          <div class="module-actions">
            <button class="btn btn-secondary btn-sm" onclick="openAddLessonModal('${module.id}')">إضافة درس</button>
            <button class="btn btn-outline" onclick="openEditModuleModal('${module.id}')">تعديل</button>
            <button class="btn btn-danger btn-sm" onclick="deleteModule('${module.id}')">حذف</button>
          </div>
        </div>
        <div class="module-body">
          <p class="module-description">${escapeHtml(module.description || '')}</p>
          <div class="lessons-section">
            <h5>الدروس</h5>
            ${moduleLessons.length > 0 ? `
              <ul class="lessons-list">
                ${moduleLessons.map(lesson => `
                  <li class="lesson-item">
                    <div class="lesson-info">
                      <strong>${escapeHtml(lesson.title)}</strong>
                      ${lesson.date ? `<small>(${formatDate(lesson.date)})</small>` : ''}
                      <p>${escapeHtml(lesson.description || '')}</p>
                    </div>
                    <div class="lesson-actions">
                      <button class="btn btn-outline btn-sm" onclick="openEditLessonModal('${lesson.id}')">تعديل</button>
                      <button class="btn btn-danger btn-sm" onclick="deleteLesson('${lesson.id}')">حذف</button>
                    </div>
                  </li>
                `).join('')}
              </ul>
            ` : '<p class="no-data">لا توجد دروس في هذه الوحدة.</p>'}
          </div>
        </div>
      </div>
    `;
  });

  modulesListContainer.innerHTML = modulesHtml;
}

/**
 * Closes a modal and handles cleanup for specific modals like course details.
 * @param {string} modalId - The ID of the modal to close.
 */
function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.style.display = 'none';

  if (modalId === 'courseDetailModal') {
    // Unsubscribe when closing the detail modal to stop specific updates
    if (window.modulesSubscription) {
      window.modulesSubscription.unsubscribe();
      window.modulesSubscription = null;
      console.log("Unsubscribed from modules on modal close");
    }
    if (window.lessonsSubscription) {
      window.lessonsSubscription.unsubscribe();
      window.lessonsSubscription = null;
      console.log("Unsubscribed from lessons on modal close");
    }
    window.currentCourseId = null;
    window.currentCourseModules = [];
    window.currentCourseLessons = [];
  }
}

// ====== Module Management (within Course Detail) ======

/**
 * Opens the modal for adding a new module within the current course detail view.
 */
function openAddModuleModal() {
  if (!window.currentCourseId) {
    if (typeof showStatus === 'function') {
        showStatus('خطأ: لم يتم تحديد الدورة', 'error');
    }
    return;
  }
  const modal = document.getElementById('moduleModal');
  if (!modal) return; // Add check
  modal.style.display = 'flex';
  document.getElementById('moduleModalTitle').textContent = 'إضافة وحدة جديدة';
  document.getElementById('moduleForm').reset();
  document.getElementById('moduleId').value = '';
}

/**
 * Adds a new module to the current course.
 */
async function addModule() {
  try {
    if (!window.currentCourseId) {
      if (typeof showStatus === 'function') {
        showStatus('خطأ: لم يتم تحديد الدورة', 'error');
      }
      return;
    }

    const title = document.getElementById('moduleTitle').value.trim();
    const description = document.getElementById('moduleDescription').value.trim();
    const order = parseInt(document.getElementById('moduleOrder').value) || null;

    if (!title) {
      if (typeof showStatus === 'function') {
        showStatus('يرجى إدخال اسم الوحدة', 'error');
      }
      return;
    }

    const { error } = await supabaseClient
      .from('modules')
      .insert([{ course_id: window.currentCourseId, title, description, order }]);

    if (error) throw error;

    if (typeof showStatus === 'function') {
        showStatus('تم إضافة الوحدة بنجاح');
    }
    if (typeof closeModal === 'function') {
        closeModal('moduleModal');
    }
    // Realtime for `window.currentCourseId` will trigger loadCourseModulesAndLessons()

  } catch (error) {
    console.error('Error adding module:', error);
    if (typeof showStatus === 'function') {
        showStatus(`خطأ في إضافة الوحدة: ${error.message}`, 'error');
    }
  }
}

/**
 * Opens the modal for editing an existing module.
 * @param {string} moduleId - The ID of the module to edit.
 */
async function openEditModuleModal(moduleId) {
  try {
    const { data, error } = await supabaseClient
      .from('modules')
      .select('title, description, "order"')
      .eq('id', moduleId)
      .single();

    if (error) throw error;
    if (!data) {
      if (typeof showStatus === 'function') {
        showStatus('الوحدة غير موجودة', 'error');
      }
      return;
    }

    const modal = document.getElementById('moduleModal');
    if (!modal) return; // Add check
    modal.style.display = 'flex';
    document.getElementById('moduleModalTitle').textContent = 'تعديل الوحدة';
    document.getElementById('moduleId').value = moduleId;
    document.getElementById('moduleTitle').value = data.title;
    document.getElementById('moduleDescription').value = data.description || '';
    document.getElementById('moduleOrder').value = data.order || '';

  } catch (error) {
    console.error('Error opening edit module modal:', error);
    if (typeof showStatus === 'function') {
        showStatus('خطأ في فتح نافذة تعديل الوحدة', 'error');
    }
  }
}

/**
 * Updates an existing module.
 * @param {string} moduleId - The ID of the module to update.
 */
async function updateModule(moduleId) {
  try {
    const title = document.getElementById('moduleTitle').value.trim();
    const description = document.getElementById('moduleDescription').value.trim();
    const order = parseInt(document.getElementById('moduleOrder').value) || null;

    if (!title) {
      if (typeof showStatus === 'function') {
        showStatus('يرجى إدخال اسم الوحدة', 'error');
      }
      return;
    }

    const { error } = await supabaseClient
      .from('modules')
      .update({ title, description, order })
      .eq('id', moduleId);

    if (error) throw error;

    if (typeof showStatus === 'function') {
        showStatus('تم تحديث الوحدة بنجاح');
    }
    if (typeof closeModal === 'function') {
        closeModal('moduleModal');
    }
    // Realtime will update

  } catch (error) {
    console.error('Error updating module:', error);
    if (typeof showStatus === 'function') {
        showStatus(`خطأ في تحديث الوحدة: ${error.message}`, 'error');
    }
  }
}

/**
 * Deletes a module after user confirmation.
 * @param {string} moduleId - The ID of the module to delete.
 */
async function deleteModule(moduleId) {
  if (!confirm('هل أنت متأكد من حذف هذه الوحدة؟')) return;

  try {
    const { error } = await supabaseClient.from('modules').delete().eq('id', moduleId);
    if (error) throw error;

    if (typeof showStatus === 'function') {
        showStatus('تم حذف الوحدة بنجاح');
    }
    // Realtime will update

  } catch (error) {
    console.error('Error deleting module:', error);
    if (typeof showStatus === 'function') {
        showStatus(`خطأ في حذف الوحدة: ${error.message}`, 'error');
    }
  }
}

// ====== Lesson Management (within Course Detail) ======

/**
 * Opens the modal for adding a new lesson, pre-filling the module ID.
 * @param {string} moduleId - The ID of the module the lesson belongs to.
 */
function openAddLessonModal(moduleId) {
  const modal = document.getElementById('lessonModal');
  if (!modal) return; // Add check
  modal.style.display = 'flex';
  document.getElementById('lessonModalTitle').textContent = 'إضافة درس جديد';
  document.getElementById('lessonForm').reset();
  document.getElementById('lessonId').value = '';
  document.getElementById('lessonModuleId').value = moduleId; // Pre-fill module ID
}

/**
 * Adds a new lesson.
 */
async function addLesson() {
  try {
    const moduleId = document.getElementById('lessonModuleId').value;
    const title = document.getElementById('lessonTitle').value.trim();
    const description = document.getElementById('lessonDescription').value.trim();
    const date = document.getElementById('lessonDate').value || null;

    if (!title) {
      if (typeof showStatus === 'function') {
        showStatus('يرجى إدخال عنوان الدرس', 'error');
      }
      return;
    }
    if (!moduleId) {
      if (typeof showStatus === 'function') {
        showStatus('خطأ: لم يتم تحديد الوحدة', 'error');
      }
      return;
    }

    // Get course_id from the module
    const { data: moduleData, error: moduleError } = await supabaseClient
      .from('modules')
      .select('course_id')
      .eq('id', moduleId)
      .single();

    if (moduleError) throw moduleError;

    const { error } = await supabaseClient
      .from('lessons')
      .insert([{
        module_id: moduleId,
        course_id: moduleData.course_id,
        title,
        description,
        date
      }]);

    if (error) throw error;

    if (typeof showStatus === 'function') {
        showStatus('تم إضافة الدرس بنجاح');
    }
    if (typeof closeModal === 'function') {
        closeModal('lessonModal');
    }
    // Realtime will update

  } catch (error) {
    console.error('Error adding lesson:', error);
    if (typeof showStatus === 'function') {
        showStatus(`خطأ في إضافة الدرس: ${error.message}`, 'error');
    }
  }
}

/**
 * Opens the modal for editing an existing lesson.
 * @param {string} lessonId - The ID of the lesson to edit.
 */
async function openEditLessonModal(lessonId) {
  try {
    const { data, error } = await supabaseClient
      .from('lessons')
      .select('module_id, title, description, date')
      .eq('id', lessonId)
      .single();

    if (error) throw error;
    if (!data) {
      if (typeof showStatus === 'function') {
        showStatus('الدرس غير موجود', 'error');
      }
      return;
    }

    const modal = document.getElementById('lessonModal');
    if (!modal) return; // Add check
    modal.style.display = 'flex';
    document.getElementById('lessonModalTitle').textContent = 'تعديل الدرس';
    document.getElementById('lessonId').value = lessonId;
    document.getElementById('lessonModuleId').value = data.module_id;
    document.getElementById('lessonTitle').value = data.title;
    document.getElementById('lessonDescription').value = data.description || '';
    document.getElementById('lessonDate').value = data.date || '';

  } catch (error) {
    console.error('Error opening edit lesson modal:', error);
    if (typeof showStatus === 'function') {
        showStatus('خطأ في فتح نافذة تعديل الدرس', 'error');
    }
  }
}

/**
 * Updates an existing lesson.
 * @param {string} lessonId - The ID of the lesson to update.
 */
async function updateLesson(lessonId) {
  try {
    const moduleId = document.getElementById('lessonModuleId').value;
    const title = document.getElementById('lessonTitle').value.trim();
    const description = document.getElementById('lessonDescription').value.trim();
    const date = document.getElementById('lessonDate').value || null;

    if (!title) {
      if (typeof showStatus === 'function') {
        showStatus('يرجى إدخال عنوان الدرس', 'error');
      }
      return;
    }
    if (!moduleId) {
      if (typeof showStatus === 'function') {
        showStatus('خطأ: لم يتم تحديد الوحدة', 'error');
      }
      return;
    }

    // Get course_id from the module
    const { data: moduleData, error: moduleError } = await supabaseClient
      .from('modules')
      .select('course_id')
      .eq('id', moduleId)
      .single();

    if (moduleError) throw moduleError;

    const { error } = await supabaseClient
      .from('lessons')
      .update({
        module_id: moduleId,
        course_id: moduleData.course_id,
        title,
        description,
        date
      })
      .eq('id', lessonId);

    if (error) throw error;

    if (typeof showStatus === 'function') {
        showStatus('تم تحديث الدرس بنجاح');
    }
    if (typeof closeModal === 'function') {
        closeModal('lessonModal');
    }
    // Realtime will update

  } catch (error) {
    console.error('Error updating lesson:', error);
    if (typeof showStatus === 'function') {
        showStatus(`خطأ في تحديث الدرس: ${error.message}`, 'error');
    }
  }
}

/**
 * Deletes a lesson after user confirmation.
 * @param {string} lessonId - The ID of the lesson to delete.
 */
async function deleteLesson(lessonId) {
  if (!confirm('هل أنت متأكد من حذف هذا الدرس؟')) return;

  try {
    const { error } = await supabaseClient.from('lessons').delete().eq('id', lessonId);
    if (error) throw error;

    if (typeof showStatus === 'function') {
        showStatus('تم حذف الدرس بنجاح');
    }
    // Realtime will update

  } catch (error) {
    console.error('Error deleting lesson:', error);
    if (typeof showStatus === 'function') {
        showStatus(`خطأ في حذف الدرس: ${error.message}`, 'error');
    }
  }
}

// ====== Dynamic Fields for Add Course Modal ======

/**
 * Adds a new dynamic field group for a module in the add course form.
 */
function addModuleField() {
    const container = document.getElementById('modulesContainer');
    if (!container) return;
    const moduleIndex = container.children.length;
    const moduleDiv = document.createElement('div');
    moduleDiv.className = 'module-field-group';
    moduleDiv.innerHTML = `
        <hr>
        <h4>وحدة جديدة ${moduleIndex + 1}</h4>
        <div class="form-group">
            <label>اسم الوحدة:</label>
            <input type="text" name="moduleName[]" required>
        </div>
        <div class="form-group">
            <label>الوصف:</label>
            <textarea name="moduleDescription[]" rows="2"></textarea>
        </div>
        <div class="form-group">
            <label>الترتيب:</label>
            <input type="number" name="moduleOrder[]" min="1">
        </div>
        <button type="button" class="btn btn-danger btn-sm" onclick="removeField(this)">حذف الوحدة</button>
    `;
    container.appendChild(moduleDiv);
}

/**
 * Adds a new dynamic field group for a lesson in the add course form.
 */
function addLessonField() {
    const container = document.getElementById('lessonsContainer');
    if (!container) return;
    const lessonIndex = container.children.length;
    const lessonDiv = document.createElement('div');
    lessonDiv.className = 'lesson-field-group';
    lessonDiv.innerHTML = `
        <hr>
        <h4>درس جديد ${lessonIndex + 1}</h4>
        <div class="form-group">
            <label>عنوان الدرس:</label>
            <input type="text" name="lessonTitle[]" required>
        </div>
        <div class="form-group">
            <label>الوصف:</label>
            <textarea name="lessonDescription[]" rows="2"></textarea>
        </div>
        <div class="form-group">
            <label>تاريخ الدرس:</label>
            <input type="date" name="lessonDate[]">
        </div>
        <div class="form-group">
            <label>الوحدة المرتبطة:</label>
            <select name="lessonModuleIndex[]" required>
                <option value="">اختر وحدة</option>
            </select>
        </div>
        <button type="button" class="btn btn-danger btn-sm" onclick="removeField(this)">حذف الدرس</button>
    `;
    container.appendChild(lessonDiv);
    updateLessonModuleSelects();
}

/**
 * Updates the options in the lesson's module selection dropdowns
 * based on the currently added modules.
 */
function updateLessonModuleSelects() {
    const moduleSelects = document.querySelectorAll('select[name="lessonModuleIndex[]"]');
    const moduleFields = document.querySelectorAll('.module-field-group input[name="moduleName[]"]');
    const optionsHTML = Array.from(moduleFields).map((input, index) =>
        `<option value="${index}">الوحدة ${index + 1}: ${escapeHtml(input.value) || 'بدون اسم'}</option>`
    ).join('');

    moduleSelects.forEach(select => {
        const currentValue = select.value;
        select.innerHTML = '<option value="">اختر وحدة</option>' + optionsHTML;
        select.value = currentValue;
    });
}

// Update lesson module selects when module name changes
document.getElementById('modulesContainer')?.addEventListener('input', function(e) {
    if (e.target.name === 'moduleName[]') {
        updateLessonModuleSelects();
    }
});

/**
 * Removes a dynamic field group (module or lesson).
 * @param {HTMLElement} button - The remove button that was clicked.
 */
function removeField(button) {
    button.parentElement.remove();
    updateLessonModuleSelects(); // Update selects after removal
}

// ====== Event Listeners ======
document.addEventListener('DOMContentLoaded', function () {
  const courseForm = document.getElementById('courseForm');
  if (courseForm) {
    courseForm.onsubmit = async function (e) {
      e.preventDefault();
      const courseId = document.getElementById('courseId').value;
      if (courseId) {
        await updateCourse(courseId);
      } else {
        await addCourse();
      }
    };
  }

  const moduleForm = document.getElementById('moduleForm');
  if (moduleForm) {
    moduleForm.onsubmit = async function (e) {
      e.preventDefault();
      const moduleId = document.getElementById('moduleId').value;
      if (moduleId) {
        await updateModule(moduleId);
      } else {
        await addModule(); // Ensure addModule uses window.currentCourseId
      }
    };
  }

  const lessonForm = document.getElementById('lessonForm');
  if (lessonForm) {
    lessonForm.onsubmit = async function (e) {
      e.preventDefault();
      const lessonId = document.getElementById('lessonId').value;
      if (lessonId) {
        await updateLesson(lessonId);
      } else {
        await addLesson();
      }
    };
  }
});