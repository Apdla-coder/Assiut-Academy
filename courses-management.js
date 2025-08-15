// ============================================================================= 
// دوال إدارة الكورسات 
// ============================================================================= 
let courses = []; 
let modules = []; // متغير عام لتخزين الوحدات 

// دالة تحميل الكورسات 
async function loadCourses() { 
  const container = document.getElementById('coursesContainer'); 
  if (!container) return; 

  container.innerHTML = `<div class="loading"><div class="loading-spinner"></div><p>جاري تحميل الكورسات...</p></div>`; 

  try { 
    const { data, error } = await supabaseClient 
      .from('courses') 
      .select(` 
        id, name, description, price, start_date, end_date, 
        users (full_name) 
      `) 
      .order('created_at', { ascending: false }); 

    if (error) throw error; 

    courses = data || []; 
    displayCourses(courses); 
  } catch (error) { 
    console.error('Error loading courses:', error); 
    container.innerHTML = `<p class="error">حدث خطأ أثناء تحميل الكورسات: ${error.message}</p>`; 
  } 
} 

// دالة عرض الكورسات في الواجهة 
function displayCourses(coursesToDisplay) { 
  const container = document.getElementById('coursesContainer'); 
  if (!container) return; 

  if (coursesToDisplay.length === 0) { 
    container.innerHTML = `<div class="table-container"><p class="no-data">لا توجد كورسات.</p></div>`; 
    return; 
  } 

  container.innerHTML = ` 
    <div class="table-container"> 
      <button class="btn btn-primary" onclick="showAddCourseModal()" style="margin-bottom: 20px;"> 
        <i class="fas fa-plus"></i> إضافة كورس جديد 
      </button> 
      <table> 
        <thead> 
          <tr> 
            <th>اسم الكورس</th> 
            <th>الوصف</th> 
            <th>السعر</th> 
            <th>المعلم</th> 
            <th>الإجراءات</th> 
          </tr> 
        </thead> 
        <tbody> 
          ${coursesToDisplay.map(course => `<tr> 
            <td>${course.name}</td> 
            <td>${course.description || '-'}</td> 
            <td>${formatCurrency(course.price).replace('SAR', 'ج.م') || '0.00'}</td> 
            <td>${course.users?.full_name || '-'}</td> 
            <td class="action-buttons"> 
              <button class="action-btn view-btn" onclick="showCourseDetails('${course.id}')"><i class="fas fa-eye"></i></button> 
              <button class="action-btn edit-btn" onclick="openEditCourseModal('${course.id}')"><i class="fas fa-edit"></i></button> 
              <button class="action-btn delete-btn" onclick="deleteCourse('${course.id}')"><i class="fas fa-trash"></i></button> 
            </td> 
          </tr>`).join('')} 
        </tbody> 
      </table> 
    </div> 
  `; 
} 

// Show add course modal 
function showAddCourseModal() { 
  const modal = document.getElementById('courseModal'); 
  if (!modal) { 
    console.error('نافذة courseModal غير موجودة في DOM'); 
    showStatus('خطأ في فتح نافذة الكورس', 'error'); 
    return; 
  } 
  modal.style.display = 'flex'; // أو 'block' حسب تصميمك 
  document.getElementById('courseModalTitle').textContent = 'إضافة كورس جديد'; 
  document.getElementById('courseForm').reset(); 
  document.getElementById('courseId').value = ''; // تأكد من أنه فارغ للحالة "إضافة" 

  // Populate teachers dropdown 
  const teacherSelect = document.getElementById('courseTeacher'); 
  if (teacherSelect) { 
    teacherSelect.innerHTML = '<option value="">اختر معلماً</option>'; 
    // يمكنك هنا تحميل قائمة المعلمين من قاعدة البيانات إذا لزم 
  } 

  document.getElementById('courseForm').onsubmit = async function(e) { 
    e.preventDefault(); 
    await addCourse(); 
  }; 
} 

// إضافة كورس جديد 
async function addCourse() { 
  try { 
    const name = document.getElementById('courseName').value.trim(); 
    const description = document.getElementById('courseDescription').value.trim(); 
    const price = parseFloat(document.getElementById('coursePrice').value) || 0; 
    const startDate = document.getElementById('startDate').value || null; 
    const endDate = document.getElementById('endDate').value || null; 
    // const teacherId = document.getElementById('courseTeacher').value || null; 

    if (!name) { 
      showStatus('يرجى إدخال اسم الكورس', 'error'); 
      return; 
    } 

    const courseData = { 
      name, 
      description, 
      price, 
      start_date: startDate, 
      end_date: endDate, 
      // teacher_id: teacherId 
    }; 

    const { data, error } = await supabaseClient 
      .from('courses') 
      .insert([courseData]); 

    if (error) throw error; 

    showStatus('تم إضافة الكورس بنجاح'); 
    closeModal('courseModal'); 
    loadCourses(); // إعادة تحميل قائمة الكورسات 
  } catch (error) { 
    console.error('Error adding course:', error); 
    // عرض رسالة خطأ أكثر تفصيلاً 
    showStatus(`خطأ في إضافة الكورس: ${error.message || 'حدث خطأ غير معروف'}`, 'error'); 
  } 
} 

// فتح نافذة تعديل الكورس 
async function openEditCourseModal(courseId) { 
  try { 
    const course = courses.find(c => c.id === courseId); 
    if (!course) { 
      showStatus('الكورس غير موجود', 'error'); 
      return; 
    } 

    const modal = document.getElementById('courseModal'); 
    modal.style.display = 'flex'; // أو 'block' حسب تصميمك 
    document.getElementById('courseModalTitle').textContent = 'تعديل بيانات الكورس'; 
    document.getElementById('courseId').value = course.id; 
    document.getElementById('courseName').value = course.name; 
    document.getElementById('courseDescription').value = course.description || ''; 
    document.getElementById('coursePrice').value = course.price || ''; 
    document.getElementById('startDate').value = course.start_date || ''; 
    document.getElementById('endDate').value = course.end_date || ''; 

    // Populate teachers dropdown and select current teacher 
    // ... (الكود الخاص بتحميل وتحديد المعلم) 

    document.getElementById('courseForm').onsubmit = async function(e) { 
      e.preventDefault(); 
      await updateCourse(courseId); 
    }; 

  } catch (error) { 
    console.error('Error fetching course for edit:', error); 
    showStatus(`خطأ في جلب بيانات الكورس: ${error.message}`, 'error'); 
  } 
} 

// تحديث كورس 
async function updateCourse(courseId) { 
  try { 
    const name = document.getElementById('courseName').value.trim(); 
    const description = document.getElementById('courseDescription').value.trim(); 
    const price = parseFloat(document.getElementById('coursePrice').value) || 0; 
    const startDate = document.getElementById('startDate').value || null; 
    const endDate = document.getElementById('endDate').value || null; 
    // const teacherId = document.getElementById('courseTeacher').value || null; 

    if (!name) { 
      showStatus('يرجى إدخال اسم الكورس', 'error'); 
      return; 
    } 

    const courseData = { 
      name, 
      description, 
      price, 
      start_date: startDate, 
      end_date: endDate, 
      // teacher_id: teacherId 
    }; 

    const { data, error } = await supabaseClient 
      .from('courses') 
      .update(courseData) 
      .eq('id', courseId); 

    if (error) throw error; 

    showStatus('تم تحديث بيانات الكورس بنجاح'); 
    closeModal('courseModal'); 
    loadCourses(); // إعادة تحميل قائمة الكورسات 
  } catch (error) { 
    console.error('Error updating course:', error); 
    showStatus(`خطأ في تحديث بيانات الكورس: ${error.message}`, 'error'); 
  } 
} 

// حذف كورس 
async function deleteCourse(courseId) { 
  if (!confirm('هل أنت متأكد من حذف هذا الكورس؟ هذا سيؤدي إلى حذف جميع الوحدات والدروس المرتبطة به.')) return; 

  try { 
    // التحقق من وجود وحدات مرتبطة 
    const { data: modulesData, error: modulesError } = await supabaseClient 
      .from('modules') 
      .select('id') 
      .eq('course_id', courseId); 

    if (modulesError) throw modulesError; 

    if (modulesData && modulesData.length > 0) { 
      showStatus('لا يمكن حذف الكورس لأنه يحتوي على وحدات. يرجى حذف الوحدات أولاً.', 'error'); 
      return; 
    } 

    // إذا لم توجد وحدات، قم بحذف الكورس 
    const { data, error } = await supabaseClient 
      .from('courses') 
      .delete() 
      .eq('id', courseId); 

    if (error) throw error; 

    showStatus('تم حذف الكورس بنجاح'); 
    loadCourses(); // إعادة تحميل قائمة الكورسات 
  } catch (error) { 
    console.error('Error deleting course:', error); 
    if (error.code === '23503') { // Foreign key violation 
      showStatus('لا يمكن حذف الكورس لأنه مرتبط ببيانات أخرى (مثل الاشتراكات أو الحضور).', 'error'); 
    } else { 
      showStatus(`خطأ في حذف الكورس: ${error.message}`, 'error'); 
    } 
  } 
} 

// متغيرات لتخزين الوحدات والدروس الحالية 
let currentCourseModules = []; 
let currentCourseLessons = []; 
let currentCourseId = null; // لتخزين ID الكورس الحالي في نافذة التفاصيل 

// دالة لعرض تفاصيل الكورس في Modal جديد 
async function showCourseDetails(courseId) { 
  const course = courses.find(c => c.id === courseId); 
  if (!course) { 
    showStatus('الكورس غير موجود', 'error'); 
    return; 
  } 

  // تخزين ID الكورس الحالي 
  currentCourseId = courseId; 

  // ملء بيانات نظرة عامة 
  document.getElementById('detailCourseName').textContent = course.name || '-'; 
  document.getElementById('detailCourseDescription').textContent = course.description || '-'; 
  document.getElementById('detailCoursePrice').textContent = formatCurrency(course.price).replace('SAR', 'ج.م') || '0.00'; 
  document.getElementById('detailCourseTeacher').textContent = course.users?.full_name || '-'; 
  document.getElementById('detailCourseStartDate').textContent = course.start_date ? formatDate(course.start_date) : '-'; 
  document.getElementById('detailCourseEndDate').textContent = course.end_date ? 
    formatDate(course.end_date) : '-'; 

  // تعيين عنوان Modal التفاصيل 
  document.getElementById('courseDetailTitle').textContent = `تفاصيل الكورس: ${course.name}`; 

  // إظهار تبويب "نظرة عامة" وإخفاء الآخرين 
  switchCourseDetailTab('overview'); 

  // فتح Modal التفاصيل 
  document.getElementById('courseDetailModal').style.display = 'block'; 
} 

// دالة تبديل علامات التبويب لتفاصيل الكورس 
function switchCourseDetailTab(tabName) { 
  document.querySelectorAll('.course-detail-tab-content').forEach(content => { 
    content.style.display = 'none'; 
  }); 

  const activeTabContent = document.getElementById(`tab-${tabName}`); 
  if (activeTabContent) { 
    activeTabContent.style.display = 'block'; 
  } 

  // تحديث زر التبويب النشط 
  document.querySelectorAll('.tab-button').forEach(btn => { 
    btn.classList.remove('active'); 
  }); 
  const activeButton = Array.from(document.querySelectorAll('.tab-button')).find(btn => 
    btn.textContent.trim() === (tabName === 'overview' ? 'نظرة عامة' : 'الوحدات والدروس') 
  ); 
  if (activeButton) { 
    activeButton.classList.add('active'); 
  } 

  // إذا كان التبويب هو "الوحدات والدروس"، قم بتحميلها 
  if (tabName === 'modules' && currentCourseId) { 
    loadCourseModulesAndLessons(currentCourseId); 
  } 
} 

// دالة لتحميل الوحدات والدروس الخاصة بكورس معين 
async function loadCourseModulesAndLessons(courseId) { 
  const modulesListContainer = document.getElementById('modulesList'); 
  if (!modulesListContainer) return; 

  modulesListContainer.innerHTML = '<p class="no-data">جاري التحميل...</p>'; 
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

    // 2. تحميل الدروس 
    const { data: lessonsData, error: lessonsError } = await supabaseClient 
      .from('lessons') 
      .select('id, title, description, date, module_id') 
      .eq('course_id', courseId); 

    if (lessonsError) throw lessonsError; 

    currentCourseLessons = lessonsData || []; 

    // 3. عرض البيانات 
    displayModulesAndLessons(); 

  } catch (error) { 
    console.error('Error loading course modules and lessons:', error); 
    modulesListContainer.innerHTML = `<p class="error">حدث خطأ أثناء تحميل الوحدات والدروس: ${error.message}</p>`; 
    showStatus('خطأ في تحميل بيانات الوحدات', 'error'); 
  } 
} 

// دالة لعرض الوحدات والدروس في واجهة المستخدم 
function displayModulesAndLessons() { 
  const modulesListContainer = document.getElementById('modulesList'); 
  if (!modulesListContainer) return; 

  if (currentCourseModules.length === 0) { 
    modulesListContainer.innerHTML = '<p class="no-data">لا توجد وحدات لهذا الكورس بعد.</p>'; 
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
              moduleLessons.map(lesson => `<div class="lesson-item" data-lesson-id="${lesson.id}"> 
                <div> 
                  <span class="lesson-title">${lesson.title}</span> 
                  ${lesson.date ? `<span class="lesson-date">(${formatDate(lesson.date)})</span>` : ''} 
                </div> 
                <div class="lesson-actions"> 
                  <button class="btn btn-outline btn-xs" onclick="openEditLessonModal('${lesson.id}')">تعديل</button> 
                  <button class="btn btn-danger btn-xs" onclick="deleteLesson('${lesson.id}')">حذف</button> 
                </div> 
              </div>`).join('') : 
              '<p class="no-data">لا توجد دروس في هذه الوحدة.</p>'} 
          </div> 
        </div> 
      </div>`; 
  }); 

  modulesListContainer.innerHTML = modulesHtml; 
} 

// - دوال إدارة الوحدات - 

// فتح Modal إضافة وحدة 
function openAddModuleModal() { 
  if (!currentCourseId) { 
    showStatus('خطأ: لم يتم تحديد كورس', 'error'); 
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

    const moduleData = { 
      course_id: courseId, 
      title, 
      description, 
      order 
    }; 

    const { data, error } = await supabaseClient 
      .from('modules') 
      .insert([moduleData]); 

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
    // ============================================================================= 
    // دالة تحميل الوحدات (ضرورية) 
    // ============================================================================= 
    async function loadModules() { 
      try { 
        const { data, error } = await supabaseClient 
          .from('modules') 
          .select('id, title, description, "order", course_id'); // تأكد من تحميل course_id 
        if (error) throw error; 
        modules = data || []; // تخزين الوحدات في المتغير العام 
      } catch (error) { 
        console.error('Error loading modules:', error); 
        showStatus('خطأ في تحميل بيانات الوحدات', 'error'); 
      } 
    } 

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

    const moduleData = { 
      title, 
      description, 
      order 
    }; 

    const { data, error } = await supabaseClient 
      .from('modules') 
      .update(moduleData) 
      .eq('id', moduleId); 

    if (error) throw error; 

    showStatus('تم تحديث الوحدة بنجاح'); 
    closeModal('moduleModal'); 

    // إعادة تحميل الوحدات والدروس إذا كان الكورس مفتوح 
    if (currentCourseId) { 
      await loadCourseModulesAndLessons(currentCourseId); 
    } 

  } catch (error) { 
    console.error('Error updating module:', error); 
    showStatus(`خطأ في تحديث الوحدة: ${error.message}`, 'error'); 
  } 
} 

// حذف وحدة 
async function deleteModule(moduleId) { 
  if (!confirm('هل أنت متأكد من حذف هذه الوحدة؟ هذا سيؤدي إلى حذف جميع الدروس المرتبطة بها.')) return; 

  try { 
    // التحقق من وجود دروس مرتبطة 
    const { data: lessonsData, error: lessonsError } = await supabaseClient 
      .from('lessons') 
      .select('id') 
      .eq('module_id', moduleId); 

    if (lessonsError) throw lessonsError; 

    if (lessonsData && lessonsData.length > 0) { 
      showStatus('لا يمكن حذف الوحدة لأنها تحتوي على دروس. يرجى حذف الدروس أولاً.', 'error'); 
      return; 
    } 

    // إذا لم توجد دروس، قم بحذف الوحدة 
    const { data, error } = await supabaseClient 
      .from('modules') 
      .delete() 
      .eq('id', moduleId); 

    if (error) throw error; 

    showStatus('تم حذف الوحدة بنجاح'); 

    // إعادة تحميل الوحدات والدروس إذا كان الكورس مفتوح 
    if (currentCourseId) { 
      await loadCourseModulesAndLessons(currentCourseId); 
    } 

  } catch (error) { 
    console.error('Error deleting module:', error); 
    if (error.code === '23503') { // Foreign key violation 
      showStatus('لا يمكن حذف الوحدة لأنها مربوطة ببيانات أخرى.', 'error'); 
    } else { 
      showStatus(`خطأ في حذف الوحدة: ${error.message}`, 'error'); 
    } 
  } 
} 

// - دوال إدارة الدروس - 

// فتح Modal إضافة درس 
function openAddLessonModal(moduleId) { 
  document.getElementById('lessonModalTitle').textContent = 'إضافة درس جديد'; 
  document.getElementById('lessonId').value = ''; 
  document.getElementById('lessonModuleId').value = moduleId; // تعيين module_id 
  document.getElementById('lessonTitle').value = ''; 
  document.getElementById('lessonDescription').value = ''; 

  // تعيين التاريخ الحالي تلقائيًا 
  const today = new Date().toISOString().split('T')[0]; 
  const lessonDateInput = document.getElementById('lessonDate'); 
  if (lessonDateInput) { 
    lessonDateInput.value = today; 
  } else { 
    console.warn('حقل lessonDate غير موجود في النموذج'); 
  } 
  // نهاية تعيين التاريخ 

  document.getElementById('lessonForm').onsubmit = async function(e) { 
    e.preventDefault(); 
    await addLesson(); 
  }; 

  document.getElementById('lessonModal').style.display = 'block'; 
} 

// إضافة درس جديد 
async function addLesson() { 
  try { 
    // - جمع وتحقق من بيانات النموذج - 
    console.log("🔍 [2/5] جمع وتحقق من بيانات النموذج..."); 
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
    console.log("✅ [2/5] جمع وتحقق من بيانات النموذج: نجح"); 

    // - التحقق من صحة module_id و course_id - 
    console.log("🔍 [3/5] التحقق من صحة module_id و course_id:"); 
    console.log("🔍 module_id:", moduleId); 

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

    // التحقق من أن النتيجة ليست فارغة وأنها تحتوي على course_id 
    if (!moduleDataArray || moduleDataArray.length === 0 || !moduleDataArray[0].course_id) { 
      const errorMsg = 'بيانات الوحدة أو الكورس غير صحيحة'; 
      showStatus(errorMsg, 'error'); 
      console.error(`❌ ${errorMsg}`, 'course_id:', moduleDataArray?.[0]?.course_id, 'module_id:', moduleId); 
      return; 
    } 

    const moduleData = moduleDataArray[0]; // احصل على العنصر الأول من المصفوفة 
    console.log("🔍 course_id من الوحدة:", moduleData.course_id); 

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

    console.log("✅ [3/5] التحقق من صحة module_id: نجح"); 
    // - نهاية التحقق من صحة module_id و course_id - 

    // - التحقق النهائي من حالة المستخدم قبل الإدخال - 
    console.log("🔍 [4/5] قبل محاولة الإدخال - التحقق النهائي من حالة المستخدم:"); 
    const { data: { user: finalUserCheck }, error: finalAuthError } = await supabaseClient.auth.getUser(); 
    console.log("🔍 ID المستخدم النهائي من Auth:", finalUserCheck?.id); 

    if (!finalUserCheck?.id) { 
      const authErrorMsg = 'لم يتم العثور على معرف المستخدم في الجلسة النهائية'; 
      console.error(`❌ ${authErrorMsg}`); 
      showStatus(authErrorMsg, 'error'); 
      return; 
    } 
    console.log("✅ [4/5] التحقق النهائي من حالة المستخدم: نجح"); 
    // - نهاية التحقق النهائي من حالة المستخدم - 

    // - محاولة الإدخال - 
    console.log("🔍 [5/5] محاولة إدخال الدرس..."); 
    const lessonData = { 
      module_id: moduleId, 
      course_id: moduleData.course_id, // استخدام course_id من moduleData 
      title, 
      description, 
      date 
    }; 

    const { data, error } = await supabaseClient 
      .from('lessons') 
      .insert([lessonData]); 

    if (error) { 
      console.error('❌ Error inserting lesson:', error); 
      // التحقق من نوع الخطأ 
      if (error.code === '42501') { 
        showStatus('خطأ: لم يتم العثور على الوحدة المرتبطة أو مشكلة في الأذونات. يرجى المحاولة مرة أخرى.', 'error'); 
      } else if (error.code === '23503') { // Foreign key violation 
        showStatus('خطأ: الوحدة أو الكورس المرتبط غير موجود.', 'error'); 
      } else { 
        showStatus(`خطأ في إضافة الدرس: ${error.message}`, 'error'); 
      } 
      return; // إنهاء الدالة في حالة الخطأ 
    } 
    console.log("✅ [5/5] تم إدخال الدرس بنجاح:", data); 
    // - نهاية محاولة الإدخال - 

    showStatus('تم إضافة الدرس بنجاح'); 
    closeModal('lessonModal'); 

    // إعادة تحميل الوحدات والدروس 
    await loadCourseModulesAndLessons(moduleData.course_id); 

  } catch (error) { 
    console.error('Error adding lesson:', error); 
    if (error.code === '42501') { 
      showStatus('خطأ: لم يتم العثور على الوحدة المرتبطة أو مشكلة في الأذونات. يرجى المحاولة مرة أخرى.', 'error'); 
    } else { 
      showStatus(`خطأ غير متوقع في إضافة الدرس: ${error.message}`, 'error'); 
    } 
  } 
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

    document.getElementById('lessonForm').onsubmit = async function(e) { 
      e.preventDefault(); 
      await updateLesson(lessonId); 
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

    if (!moduleId) { 
      showStatus('خطأ: لم يتم تحديد الوحدة', 'error'); 
      return; 
    } 

    // جلب course_id من الوحدة 
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
} 

// حذف درس 
async function deleteLesson(lessonId) { 
  if (!confirm('هل أنت متأكد من حذف هذا الدرس؟')) return; 

  try { 
    // جلب module_id أولاً لتحديد الكورس 
    const { data: lessonData, error: lessonError } = await supabaseClient 
      .from('lessons') 
      .select('module_id') 
      .eq('id', lessonId) 
      .single(); 

    if (lessonError) throw lessonError; 

    const { data, error } = await supabaseClient 
      .from('lessons') 
      .delete() 
      .eq('id', lessonId); 

    if (error) throw error; 

    showStatus('تم حذف الدرس بنجاح'); 

    // إعادة تحميل الوحدات والدروس 
    await loadCourseModulesAndLessons(lessonData.module_id); 

  } catch (error) { 
    console.error('Error deleting lesson:', error); 
    showStatus(`خطأ في حذف الدرس: ${error.message}`, 'error'); 
  } 
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
  } 
}); 

// دوال مساعدة 
function formatDate(dateString) { 
  if (!dateString) return '-'; 
  const date = new Date(dateString); 
  return date.toLocaleDateString('ar-SA'); 
} 

function formatCurrency(amount) { 
  if (!amount) return '0 ريال'; 
  return new Intl.NumberFormat('ar-SA', { style: 'currency', currency: 'SAR' }).format(amount); 
} 

// ============================================================================= 
// دوال إدارة الاختبارات (Teacher Exams) 
// ============================================================================= 
let exams = []; 

// دالة تحميل الاختبارات 
async function loadTeacherExamsForSecretary() { 
  const container = document.getElementById('teacherExamsContainer'); 
  if (!container) return; 

  container.innerHTML = `<div class="loading"><div class="loading-spinner"></div><p>جاري تحميل الاختبارات...</p></div>`; 

  try { 
    // 1. تحميل الكورسات والوحدات أولاً لربطها بالاختبارات 
    await loadCourses(); // تأكد من أن `courses` محدث 
    await loadModules(); // تأكد من أن `modules` محدث 

    // 2. تحميل الاختبارات مع تفاصيل الكورس والوحدة 
    const { data, error } = await supabaseClient 
      .from('exams') 
      .select(` 
        id, title, max_score, date, course_id, module_id 
      `) 
      .order('date', { ascending: false }); 

    if (error) throw error; 

    exams = data || []; 
    displayTeacherExams(exams); 
  } catch (error) { 
    console.error('Error loading teacher exams:', error); 
    container.innerHTML = `<p class="error">حدث خطأ أثناء تحميل الاختبارات: ${error.message}</p>`; 
  } 
} 

// دالة عرض الاختبارات 
function displayTeacherExams(examsToDisplay) { 
  const container = document.getElementById('teacherExamsContainer'); 
  if (!container) return; 

  if (examsToDisplay.length === 0) { 
    container.innerHTML = `<div class="table-container"><p class="no-data">لا توجد اختبارات.</p></div>`; 
    return; 
  } 

  let html = ` 
    <div class="table-container"> 
      <button class="btn btn-primary" onclick="showAddExamModal()" style="margin-bottom: 20px;"> 
        <i class="fas fa-plus"></i> إضافة اختبار جديد 
      </button> 
      <table> 
        <thead> 
          <tr> 
            <th>عنوان الاختبار</th> 
            <th>الكورس</th> 
            <th>الوحدة</th> 
            <th>التاريخ</th> 
            <th>الدرجة الكاملة</th> 
            <th>الإجراءات</th> 
          </tr> 
        </thead> 
        <tbody> 
  `; 

  data.forEach(exam => { 
    // 🔍 البحث في `courses` و `modules` المحليين 
    const course = courses.find(c => c.id === exam.course_id); 
    const module = modules.find(m => m.id === exam.module_id); 

    html += `<tr> 
      <td>${exam.title}</td> 
      <td>${course?.name || '-'}</td> 
      <td>${module?.title || '-'}</td> 
      <td>${formatDate(exam.date)}</td> 
      <td><strong>${exam.max_score}</strong></td> 
      <td class="action-buttons"> 
        <button class="btn btn-sm btn-warning" onclick="showEditExamModal(${exam.id})">تعديل</button> 
        <button class="btn btn-sm btn-danger" onclick="deleteExam(${exam.id})">حذف</button> 
      </td> 
    </tr>`; 
  }); 

  html += ` 
        </tbody> 
      </table> 
    </div> 
  `; 

  container.innerHTML = html; 
} 

// Show add exam modal 
function showAddExamModal() { 
  const modal = document.getElementById('examModal'); 
  if (!modal) { 
    console.error('نافذة examModal غير موجودة في DOM'); 
    showStatus('خطأ في فتح نافذة الاختبار', 'error'); 
    return; 
  } 
  modal.style.display = 'flex'; 
  document.getElementById('examModalTitle').textContent = 'إضافة اختبار جديد'; 
  document.getElementById('examForm').reset(); 
  document.getElementById('examId').value = ''; // تأكد من أنه فارغ للحالة "إضافة" 

  // Populate courses dropdown 
  const courseSelect = document.getElementById('examCourse'); 
  courseSelect.innerHTML = '<option value="">اختر كورساً</option>'; 
  courses.forEach(course => { 
    const option = document.createElement('option'); 
    option.value = course.id; 
    option.textContent = course.name; 
    courseSelect.appendChild(option); 
  }); 

  // Clear modules dropdown initially 
  const moduleSelect = document.getElementById('examModule'); 
  moduleSelect.innerHTML = '<option value="">اختر وحدة</option>'; 

  // Add event listener to course dropdown to populate modules 
  courseSelect.onchange = function() { 
    const selectedCourseId = this.value; 
    moduleSelect.innerHTML = '<option value="">اختر وحدة</option>'; 
    if (selectedCourseId) { 
      const filteredModules = modules.filter(m => m.course_id == selectedCourseId); 
      filteredModules.forEach(mod => { 
        const option = document.createElement('option'); 
        option.value = mod.id; 
        option.textContent = mod.title; 
        moduleSelect.appendChild(option); 
      }); 
    } 
  }; 

  document.getElementById('examForm').onsubmit = async function(e) { 
    e.preventDefault(); 
    await saveExam(); 
  }; 
} 

// Show edit exam modal 
async function showEditExamModal(examId) { 
  try { 
    const { data, error } = await supabaseClient 
      .from('exams') 
      .select('id, title, max_score, date, course_id, module_id') 
      .eq('id', examId) 
      .single(); 

    if (error) throw error; 
    if (!data) { 
      showStatus('الاختبار غير موجود', 'error'); 
      return; 
    } 

    const modal = document.getElementById('examModal'); 
    modal.style.display = 'flex'; 
    document.getElementById('examModalTitle').textContent = 'تعديل بيانات الاختبار'; 
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
  } catch (error) { 
    console.error('Error fetching exam for edit:', error); 
    showStatus(`خطأ في جلب بيانات الاختبار: ${error.message}`, 'error'); 
  } 
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
    return; 
  } 

  try { 
    const examData = { 
      title, 
      max_score: maxScore, 
      course_id: courseId, 
      module_id: moduleId 
    }; 

    const { error } = examId ? 
      await supabaseClient.from('exams').update(examData).eq('id', examId) : 
      await supabaseClient.from('exams').insert([examData]); 

    if (error) throw error; 

    showStatus(`تم ${examId ? 'تحديث' : 'إضافة'} الاختبار بنجاح.`); 
    closeModal('examModal'); 
    loadTeacherExamsForSecretary(); // إعادة تحميل قائمة الاختبارات 
  } catch (error) { 
    console.error('Error saving exam:', error); 
    showStatus(`خطأ في ${examId ? 'تحديث' : 'إضافة'} الاختبار: ${error.message}`, 'error'); 
  } 
} 

// حذف اختبار 
async function deleteExam(examId) { 
  if (!confirm('هل أنت متأكد من حذف هذا الاختبار؟')) return; 

  try { 
    const { error } = await supabaseClient 
      .from('exams') 
      .delete() 
      .eq('id', examId); 

    if (error) throw error; 

    showStatus('تم حذف الاختبار بنجاح.'); 
    loadTeacherExamsForSecretary(); // إعادة تحميل قائمة الاختبارات 
  } catch (error) { 
    console.error('Error deleting exam:', error); 
    showStatus(`خطأ في حذف الاختبار: ${error.message}`, 'error'); 
  } 
}