// ============================================================================= 
// دوال إدارة الطلاب 
// ============================================================================= 
let students = []; 

// دالة تحميل الطلاب 
async function loadStudents() { 
  const container = document.getElementById('studentsContainer'); 
  if (!container) return; 

  container.innerHTML = `<div class="loading"><div class="loading-spinner"></div><p>جاري تحميل الطلاب...</p></div>`; 

  try { 
    const { data, error } = await supabaseClient 
      .from('students') 
      .select('id, full_name, email, phone, parent_phone, created_at') // <-- إضافة parent_phone 
      .order('created_at', { ascending: false }); 

    if (error) throw error; 

    students = data || []; 
    displayStudents(students); 
  } catch (error) { 
    console.error('Error loading students:', error); 
    container.innerHTML = `<p class="error">حدث خطأ أثناء تحميل الطلاب: ${error.message}</p>`; 
  } 
} 

// دالة عرض الطلاب في الواجهة 
function displayStudents(studentsToDisplay) { 
  const container = document.getElementById('studentsContainer'); 
  if (!container) return; 

  if (studentsToDisplay.length === 0) { 
    container.innerHTML = `<div class="table-container"><p class="no-data">لا توجد طلاب.</p></div>`; 
    return; 
  } 

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
          ${studentsToDisplay.map(student => `<tr> 
            <td>${student.full_name}</td> 
            <td>${student.email || '-'}</td> 
            <td>${student.phone || '-'}</td> 
            <td>${student.parent_phone || '-'}</td> <!-- عمود جديد --> 
            <td>${formatDate(student.created_at)}</td> 
            <td class="action-buttons"> 
              <button class="action-btn view-btn" onclick="showStudentFullDetails('${student.id}')"><i class="fas fa-eye"></i></button> 
              <button class="action-btn edit-btn" onclick="showEditStudentModal('${student.id}')"><i class="fas fa-edit"></i></button> 
              <button class="action-btn delete-btn" onclick="deleteStudent('${student.id}')"><i class="fas fa-trash"></i></button> 
            </td> 
          </tr>`).join('')} 
        </tbody> 
      </table> 
    </div> 
  `; 
} 

// Show add student modal 
function showAddStudentModal() { 
  const modal = document.getElementById('studentModal'); 
  if (!modal) { 
    console.error('نافذة studentModal غير موجودة في DOM'); 
    showStatus('خطأ في فتح نافذة الطالب', 'error'); 
    return; 
  } 
  modal.style.display = 'flex'; 
  document.getElementById('studentModalTitle').textContent = 'إضافة طالب جديد'; 
  document.getElementById('studentForm').reset(); 
  document.getElementById('studentId').value = ''; // تأكد من أنه فارغ للحالة "إضافة" 

  // تعيين التاريخ الحالي تلقائيًا 
  const today = new Date().toISOString().split('T')[0]; 
  const registrationDateInput = document.getElementById('registrationDate'); 
  if (registrationDateInput) { 
    registrationDateInput.value = today; 
  } else { 
    console.warn('حقل registrationDate غير موجود في النموذج'); 
  } 
  // نهاية تعيين التاريخ 

  document.getElementById('studentForm').onsubmit = async function(e) { 
    e.preventDefault(); 
    await addStudent(); 
  }; 
} 

// إضافة طالب جديد 
async function addStudent() { 
  try { 
    const fullName = document.getElementById('fullName').value.trim(); 
    const email = document.getElementById('email').value.trim(); 
    const phone = document.getElementById('phone').value.trim(); 
    const parentPhone = document.getElementById('parentPhone').value.trim(); // <-- جديد 

    if (!fullName) { 
      showStatus('يرجى إدخال الاسم الكامل للطالب', 'error'); 
      return; 
    } 

    const studentData = { 
      full_name: fullName, 
      email: email || null, 
      phone: phone || null, 
      parent_phone: parentPhone || null // <-- جديد 
    }; 

    const { data, error } = await supabaseClient 
      .from('students') 
      .insert([studentData]); 

    if (error) throw error; 

    showStatus('تم إضافة الطالب بنجاح'); 
    closeModal('studentModal'); 
    loadStudents(); // إعادة تحميل قائمة الطلاب 
  } catch (error) { 
    console.error('Error adding student:', error); 
    showStatus(`خطأ في إضافة الطالب: ${error.message}`, 'error'); 
  } 
} 

// فتح نافذة تعديل الطالب 
async function showEditStudentModal(studentId) { 
  const student = students.find(s => s.id === studentId); 
  if (!student) return; 

  const modal = document.getElementById('studentModal'); 
  modal.style.display = 'flex'; 
  document.getElementById('studentModalTitle').textContent = 'تعديل بيانات الطالب'; 
  document.getElementById('studentId').value = student.id; 
  document.getElementById('fullName').value = student.full_name; 
  document.getElementById('email').value = student.email || ''; 
  document.getElementById('phone').value = student.phone || ''; 
  // تعبئة حقل رقم ولي الأمر 
  document.getElementById('parentPhone').value = student.parent_phone || ''; // <-- جديد 

  document.getElementById('studentForm').onsubmit = async function(e) { 
    e.preventDefault(); 
    await updateStudent(studentId); 
  }; 
} 

// تحديث بيانات الطالب 
async function updateStudent(studentId) { 
  try { 
    const fullName = document.getElementById('fullName').value.trim(); 
    const email = document.getElementById('email').value.trim(); 
    const phone = document.getElementById('phone').value.trim(); 
    const parentPhone = document.getElementById('parentPhone').value.trim(); // <-- جديد 

    if (!fullName) { 
      showStatus('يرجى إدخال الاسم الكامل للطالب', 'error'); 
      return; 
    } 

    const studentData = { 
      full_name: fullName, 
      email: email || null, 
      phone: phone || null, 
      parent_phone: parentPhone || null // <-- جديد 
    }; 

    const { data, error } = await supabaseClient 
      .from('students') 
      .update(studentData) 
      .eq('id', studentId); 

    if (error) throw error; 

    showStatus('تم تحديث بيانات الطالب بنجاح'); 
    closeModal('studentModal'); 
    loadStudents(); // إعادة تحميل قائمة الطلاب 
  } catch (error) { 
    console.error('Error updating student:', error); 
    showStatus('خطأ في تحديث بيانات الطالب', 'error'); 
  } 
} 

// حذف طالب 
async function deleteStudent(studentId) { 
  if (!confirm('هل أنت متأكد من حذف هذا الطالب؟ هذا سيؤدي إلى حذف جميع البيانات المرتبطة به (الاشتراكات، المدفوعات، الحضور).')) return; 

  try { 
    // 1. حذف الاشتراكات المرتبطة 
    const { error: subError } = await supabaseClient 
      .from('subscriptions') 
      .delete() 
      .eq('student_id', studentId); 
    if (subError) throw subError; 

    // 2. حذف المدفوعات المرتبطة 
    const { error: payError } = await supabaseClient 
      .from('payments') 
      .delete() 
      .eq('student_id', studentId); 
    if (payError) throw payError; 

    // 3. حذف سجلات الحضور المرتبطة 
    const { error: attError } = await supabaseClient 
      .from('attendances') 
      .delete() 
      .eq('student_id', studentId); 
    if (attError) throw attError; 

    // 4. حذف الطالب نفسه 
    const { data, error } = await supabaseClient 
      .from('students') 
      .delete() 
      .eq('id', studentId); 

    if (error) throw error; 

    showStatus('تم حذف الطالب وجميع بياناته بنجاح'); 
    loadStudents(); // إعادة تحميل قائمة الطلاب 
  } catch (error) { 
    console.error('Error deleting student:', error); 
    if (error.code === '23503') { // Foreign key violation 
      showStatus('لا يمكن حذف الطالب لأنه مرتبط ببيانات أخرى.', 'error'); 
    } else { 
      showStatus(`خطأ في حذف الطالب: ${error.message}`, 'error'); 
    } 
  } 
} 

// دالة لعرض التفاصيل الكاملة للطالب (تعديل لعرض parent_phone) 
async function showStudentFullDetails(studentId) { 
  try { 
    // 1. جلب بيانات الطالب 
    const { data: studentData, error: studentError } = await supabaseClient 
      .from('students') 
      .select('id, full_name, email, phone, parent_phone, created_at') // <-- إضافة parent_phone 
      .eq('id', studentId) 
      .single(); 

    if (studentError) throw studentError; 
    if (!studentData) { 
      showStatus('الطالب غير موجود', 'error'); 
      return; 
    } 

    // 2. جلب الاشتراكات 
    const { data: subscriptions, error: subError } = await supabaseClient 
      .from('subscriptions') 
      .select(` 
        id, subscribed_at, status, notes, 
        courses (name) 
      `) 
      .eq('student_id', studentId) 
      .order('subscribed_at', { ascending: false }); 

    if (subError) throw subError; 

    // 3. جلب المدفوعات 
    const { data: payments, error: payError } = await supabaseClient 
      .from('payments') 
      .select(` 
        id, amount, payment_date, payment_method, notes, 
        courses (name) 
      `) 
      .eq('student_id', studentId) 
      .order('payment_date', { ascending: false }); 

    if (payError) throw payError; 

    // 4. جلب سجلات الحضور 
    const { data: attendances, error: attError } = await supabaseClient 
      .from('attendances') 
      .select(` 
        id, date, status, notes, 
        courses (name) 
      `) 
      .eq('student_id', studentId) 
      .order('date', { ascending: false }); 

    if (attError) throw attError; 

    // 5. إنشاء محتوى النافذة (innerHTML) للـ modal 
    const content = document.getElementById('studentDetailContent'); 
    if (!content) return; 

    // ابحث عن قسم "معلومات أساسية" وقم بتعديله كما يلي: 
    // مثال على الجزء المعدل: 
    content.innerHTML = ` 
      <div class="modal-header"> 
        <h2>تفاصيل الطالب: ${studentData.full_name}</h2> 
        <button class="close" onclick="closeModal('studentDetailModal')">&times;</button> 
      </div> 
      <div class="modal-body"> 
        <div class="detail-section"> 
          <h4>معلومات أساسية</h4> 
          <p><strong>البريد الإلكتروني:</strong> ${studentData.email || '-'}</p> 
          <p><strong>رقم هاتف الطالب:</strong> ${studentData.phone || '-'}</p> 
          <p><strong>رقم هاتف ولي الأمر:</strong> ${studentData.parent_phone || '-'}</p> <!-- جديد --> 
          <p><strong>تاريخ التسجيل:</strong> ${studentData.created_at ? formatDate(studentData.created_at) : '-'}</p> 
        </div> 
        <!-- ... بقية أقسام التفاصيل ... --> 
        <div class="detail-section"> 
          <h4>سجل الاشتراكات (${subscriptions.length})</h4> 
          ${subscriptions.length > 0 ? 
            `<table> 
              <thead> 
                <tr><th>الكورس</th><th>تاريخ الاشتراك</th><th>الحالة</th><th>ملاحظات</th></tr> 
              </thead> 
              <tbody> 
                ${subscriptions.map(sub => `<tr> 
                  <td>${sub.courses?.name || '-'}</td> 
                  <td>${formatDate(sub.subscribed_at)}</td> 
                  <td>${sub.status === 'active' ? 'نشط' : 'منتهي'}</td> 
                  <td>${sub.notes || '-'}</td> 
                </tr>`).join('')} 
              </tbody> 
            </table>` : 
            '<p class="no-data">لا توجد اشتراكات.</p>'} 
        </div> 
        <div class="detail-section"> 
          <h4>سجل المدفوعات (${payments.length})</h4> 
          ${payments.length > 0 ? 
            `<table> 
              <thead> 
                <tr><th>المبلغ</th><th>التاريخ</th><th>طريقة الدفع</th><th>الكورس</th><th>ملاحظات</th></tr> 
              </thead> 
              <tbody> 
                ${payments.map(pay => `<tr> 
                  <td>${formatCurrency(pay.amount)}</td> 
                  <td>${formatDate(pay.payment_date)}</td> 
                  <td>${pay.payment_method || '-'}</td> 
                  <td>${pay.courses?.name || '-'}</td> 
                  <td>${pay.notes || '-'}</td> 
                </tr>`).join('')} 
              </tbody> 
            </table>` : 
            '<p class="no-data">لا توجد مدفوعات.</p>'} 
        </div> 
        <div class="detail-section"> 
          <h4>سجل الحضور (${attendances.length})</h4> 
          ${attendances.length > 0 ? 
            `<table> 
              <thead> 
                <tr><th>التاريخ</th><th>الحالة</th><th>الكورس</th><th>ملاحظات</th></tr> 
              </thead> 
              <tbody> 
                ${attendances.map(att => `<tr> 
                  <td>${formatDate(att.date)}</td> 
                  <td>${att.status === 'present' ? 'حاضر' : att.status === 'absent' ? 'غائب' : 'متأخر'}</td> 
                  <td>${att.courses?.name || '-'}</td> 
                  <td>${att.notes || '-'}</td> 
                </tr>`).join('')} 
              </tbody> 
            </table>` : 
            '<p class="no-data">لا توجد سجلات حضور.</p>'} 
        </div> 
      </div> 
      <div class="modal-footer"> 
        <button class="btn btn-secondary" onclick="printStudentDetails('${studentData.full_name}')">طباعة</button> 
        <button class="btn btn-secondary" onclick="closeModal('studentDetailModal')">إغلاق</button> 
      </div>`; 

    // فتح نافذة التفاصيل 
    document.getElementById('studentDetailModal').style.display = 'block'; 

  } catch (error) { 
    console.error('Error fetching student details:', error); 
    showStatus(`خطأ في جلب تفاصيل الطالب: ${error.message}`, 'error'); 
  } 
} 

// دالة طباعة التفاصيل الكاملة للطالب 
function printStudentDetails(studentName) { 
  const content = document.getElementById('studentDetailContent'); 
  if (!content) { 
    showStatus('لا يوجد محتوى للطباعة', 'error'); 
    return; 
  } 

  const printContent = content.innerHTML; 
  const originalContent = document.body.innerHTML; 

  document.body.innerHTML = printContent; 
  window.print(); 
  document.body.innerHTML = originalContent; 

  // إعادة فتح النافذة بعد الطباعة 
  const modal = document.getElementById('studentDetailModal'); 
  if (modal) { 
    modal.style.display = 'block'; 
  } 
} 

// ============================================================================= 
// دوال إدارة الاشتراكات 
// ============================================================================= 
let subscriptions = []; 

// دالة تحميل الاشتراكات 
async function loadSubscriptions() { 
  const container = document.getElementById('subscriptionsContainer'); 
  if (!container) return; 

  container.innerHTML = `<div class="loading"><div class="loading-spinner"></div><p>جاري تحميل الاشتراكات...</p></div>`; 

  try { 
    // 1. تحميل الكورسات والطلاب أولاً 
    await loadCourses(); 
    await loadStudents(); 

    // 2. تحميل الاشتراكات مع تفاصيل الكورس والطالب 
    const { data, error } = await supabaseClient 
      .from('subscriptions') 
      .select(` 
        id, subscribed_at, status, notes, student_id, course_id, 
        students (full_name), 
        courses (name) 
      `) 
      .order('subscribed_at', { ascending: false }); 

    if (error) throw error; 

    subscriptions = data || []; 
    displaySubscriptions(subscriptions); 
  } catch (error) { 
    console.error('Error loading subscriptions:', error); 
    container.innerHTML = `<p class="error">حدث خطأ أثناء تحميل الاشتراكات: ${error.message}</p>`; 
  } 
} 

// دالة عرض الاشتراكات 
function displaySubscriptions(subscriptionsToDisplay) { 
  const container = document.getElementById('subscriptionsContainer'); 
  if (!container) return; 

  // تنظيم البيانات حسب الكورس 
  const subscriptionsByCourse = {}; 
  subscriptionsToDisplay.forEach(sub => { 
    const courseId = sub.course_id; 
    if (!subscriptionsByCourse[courseId]) { 
      subscriptionsByCourse[courseId] = { 
        courseName: sub.courses?.name || 'كورس غير محدد', 
        students: [] 
      }; 
    } 
    subscriptionsByCourse[courseId].students.push(sub); 
  }); 

  if (Object.keys(subscriptionsByCourse).length === 0) { 
    container.innerHTML = `<div class="table-container"><p class="no-data">لا توجد اشتراكات.</p></div>`; 
    return; 
  } 

  let innerHTMLContent = `<div class="table-container"> 
    <button class="btn btn-primary" onclick="showAddSubscriptionModal()" style="margin-bottom: 20px;"> 
      <i class="fas fa-plus"></i> إضافة اشتراك جديد 
    </button> 
    <div class="courses-subscriptions-list">`; 

  Object.values(subscriptionsByCourse).forEach(courseData => { 
    innerHTMLContent += `<div class="course-subscriptions-section"> 
      <h3>الكورس: ${courseData.courseName}</h3> 
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
        <tbody>`; 

    courseData.students.forEach(subscription => { 
      innerHTMLContent += `<tr> 
        <td>${subscription.students?.full_name || '-'}</td> 
        <td>${formatDate(subscription.subscribed_at)}</td> 
        <td>${subscription.status === 'active' ? 'نشط' : 'منتهي'}</td> 
        <td>${subscription.notes || '-'}</td> 
        <td class="action-buttons"> 
          <button class="action-btn edit-btn" onclick="showEditSubscriptionModal('${subscription.id}')"><i class="fas fa-edit"></i></button> 
          <button class="action-btn delete-btn" onclick="deleteSubscription('${subscription.id}')"><i class="fas fa-trash"></i></button> 
        </td> 
      </tr>`; 
    }); 

    innerHTMLContent += ` 
        </tbody> 
      </table> 
    </div>`; 
  }); 

  innerHTMLContent += `</div></div>`; 
  container.innerHTML = innerHTMLContent; 
} 

// Show add subscription modal 
function showAddSubscriptionModal() { 
  const modal = document.getElementById('subscriptionModal'); 
  if (!modal) { 
    console.error('نافذة subscriptionModal غير موجودة في DOM'); 
    showStatus('خطأ في فتح نافذة الاشتراك', 'error'); 
    return; 
  } 
  modal.style.display = 'flex'; 
  document.getElementById('subscriptionModalTitle').textContent = 'إضافة اشتراك جديد'; 
  document.getElementById('subscriptionForm').reset(); 
  document.getElementById('subscriptionId').value = ''; // تأكد من أنه فارغ للحالة "إضافة" 

  // - تعيين التاريخ الحالي تلقائيًا - 
  const today = new Date().toISOString().split('T')[0]; 
  document.getElementById('subscriptionDate').value = today; 
  // - نهاية تعيين التاريخ - 

  // Populate students dropdown 
  const studentSelect = document.getElementById('student'); 
  studentSelect.innerHTML = '<option value="">اختر طالباً</option>'; 
  students.forEach(student => { 
    const option = document.createElement('option'); 
    option.value = student.id; 
    option.textContent = student.full_name; 
    studentSelect.appendChild(option); 
  }); 

  // Populate courses dropdown 
  const courseSelect = document.getElementById('course'); 
  courseSelect.innerHTML = '<option value="">اختر كورساً</option>'; 
  courses.forEach(course => { 
    const option = document.createElement('option'); 
    option.value = course.id; 
    option.textContent = course.name; 
    courseSelect.appendChild(option); 
  }); 

  document.getElementById('subscriptionForm').onsubmit = async function(e) { 
    e.preventDefault(); 
    await addSubscription(); 
  }; 
} 

// إضافة اشتراك جديد 
async function addSubscription() { 
  try { 
    const studentId = document.getElementById('student').value; 
    const courseId = document.getElementById('course').value; 
    const subscribedAt = document.getElementById('subscriptionDate').value; 
    const status = document.getElementById('subscriptionStatus').value; 
    const notes = document.getElementById('subscriptionNotes').value.trim(); 

    if (!studentId || !courseId || !subscribedAt) { 
      showStatus('يرجى ملء الحقول المطلوبة (الطالب، الكورس، التاريخ)', 'error'); 
      return; 
    } 

    const subscriptionData = { 
      student_id: studentId, 
      course_id: courseId, 
      subscribed_at: subscribedAt, 
      status: status || 'active', 
      notes: notes || null 
    }; 

    const { data, error } = await supabaseClient 
      .from('subscriptions') 
      .insert([subscriptionData]); 

    if (error) throw error; 

    showStatus('تم إضافة الاشتراك بنجاح'); 
    closeModal('subscriptionModal'); 
    loadSubscriptions(); // إعادة تحميل قائمة الاشتراكات 
  } catch (error) { 
    console.error('Error adding subscription:', error); 
    showStatus(`خطأ في إضافة الاشتراك: ${error.message}`, 'error'); 
  } 
} 

// Show edit subscription modal 
function showEditSubscriptionModal(subscriptionId) { 
  const subscription = subscriptions.find(s => s.id === subscriptionId); 
  if (!subscription) return; 

  const modal = document.getElementById('subscriptionModal'); 
  modal.style.display = 'flex'; 
  document.getElementById('subscriptionModalTitle').textContent = 'تعديل بيانات الاشتراك'; 
  document.getElementById('subscriptionId').value = subscription.id; 
  document.getElementById('subscriptionDate').value = subscription.subscribed_at.split('T')[0]; 
  document.getElementById('subscriptionStatus').value = subscription.status; 
  document.getElementById('subscriptionNotes').value = subscription.notes || ''; 

  // Populate students dropdown and select current student 
  const studentSelect = document.getElementById('student'); 
  studentSelect.innerHTML = '<option value="">اختر طالباً</option>'; 
  students.forEach(student => { 
    const option = document.createElement('option'); 
    option.value = student.id; 
    option.textContent = student.full_name; 
    if (student.id === subscription.student_id) option.selected = true; 
    studentSelect.appendChild(option); 
  }); 

  // Populate courses dropdown and select current course 
  const courseSelect = document.getElementById('course'); 
  courseSelect.innerHTML = '<option value="">اختر كورساً</option>'; 
  courses.forEach(course => { 
    const option = document.createElement('option'); 
    option.value = course.id; 
    option.textContent = course.name; 
    if (course.id === subscription.course_id) option.selected = true; 
    courseSelect.appendChild(option); 
  }); 

  document.getElementById('subscriptionForm').onsubmit = async function(e) { 
    e.preventDefault(); 
    await updateSubscription(subscriptionId); 
  }; 
} 

// تحديث اشتراك 
async function updateSubscription(subscriptionId) { 
  try { 
    const studentId = document.getElementById('student').value; 
    const courseId = document.getElementById('course').value; 
    const subscribedAt = document.getElementById('subscriptionDate').value; 
    const status = document.getElementById('subscriptionStatus').value; 
    const notes = document.getElementById('subscriptionNotes').value.trim(); 

    if (!studentId || !courseId || !subscribedAt) { 
      showStatus('يرجى ملء الحقول المطلوبة (الطالب، الكورس، التاريخ)', 'error'); 
      return; 
    } 

    const subscriptionData = { 
      student_id: studentId, 
      course_id: courseId, 
      subscribed_at: subscribedAt, 
      status: status || 'active', 
      notes: notes || null 
    }; 

    const { data, error } = await supabaseClient 
      .from('subscriptions') 
      .update(subscriptionData) 
      .eq('id', subscriptionId); 

    if (error) throw error; 

    showStatus('تم تحديث بيانات الاشتراك بنجاح'); 
    closeModal('subscriptionModal'); 
    loadSubscriptions(); // إعادة تحميل قائمة الاشتراكات 
  } catch (error) { 
    console.error('Error updating subscription:', error); 
    showStatus(`خطأ في تحديث بيانات الاشتراك: ${error.message}`, 'error'); 
  } 
} 

// حذف اشتراك 
async function deleteSubscription(subscriptionId) { 
  if (!confirm('هل أنت متأكد من حذف هذا الاشتراك؟')) return; 

  try { 
    const { data, error } = await supabaseClient 
      .from('subscriptions') 
      .delete() 
      .eq('id', subscriptionId); 

    if (error) throw error; 

    showStatus('تم حذف الاشتراك بنجاح'); 
    loadSubscriptions(); // إعادة تحميل قائمة الاشتراكات 
  } catch (error) { 
    console.error('Error deleting subscription:', error); 
    showStatus(`خطأ في حذف الاشتراك: ${error.message}`, 'error'); 
  } 
} 

// ============================================================================= 
// دوال إدارة المدفوعات 
// ============================================================================= 
let payments = []; 

// دالة تحميل المدفوعات 
async function loadPayments() { 
  const container = document.getElementById('paymentsContainer'); 
  if (!container) return; 

  container.innerHTML = `<div class="loading"><div class="loading-spinner"></div><p>جاري تحميل المدفوعات...</p></div>`; 

  try { 
    // 1. تحميل الكورسات والطلاب أولاً 
    await loadCourses(); 
    await loadStudents(); 

    // 2. تحميل المدفوعات مع تفاصيل الكورس والطالب 
    const { data, error } = await supabaseClient 
      .from('payments') 
      .select(` 
        id, amount, payment_date, payment_method, notes, student_id, course_id, 
        students (full_name), 
        courses (name) 
      `) 
      .order('payment_date', { ascending: false }); 

    if (error) throw error; 

    payments = data || []; 
    displayPayments(payments); 
  } catch (error) { 
    console.error('Error loading payments:', error); 
    container.innerHTML = `<p class="error">حدث خطأ أثناء تحميل المدفوعات: ${error.message}</p>`; 
  } 
} 

// دالة عرض المدفوعات 
function displayPayments(paymentsToDisplay) { 
  const container = document.getElementById('paymentsContainer'); 
  if (!container) return; 

  if (paymentsToDisplay.length === 0) { 
    container.innerHTML = `<div class="table-container"><p class="no-data">لا توجد مدفوعات.</p></div>`; 
    return; 
  } 

  container.innerHTML = ` 
    <div class="table-container"> 
      <button class="btn btn-primary" onclick="showAddPaymentModal()" style="margin-bottom: 20px;"> 
        <i class="fas fa-plus"></i> إضافة دفعة جديدة 
      </button> 
      <table> 
        <thead> 
          <tr> 
            <th>الطالب</th> 
            <th>المبلغ</th> 
            <th>التاريخ</th> 
            <th>طريقة الدفع</th> 
            <th>الكورس</th> 
            <th>ملاحظات</th> 
            <th>الإجراءات</th> 
          </tr> 
        </thead> 
        <tbody> 
          ${paymentsToDisplay.map(payment => `<tr> 
            <td>${payment.students?.full_name || '-'}</td> 
            <td>${formatCurrency(payment.amount)}</td> 
            <td>${formatDate(payment.payment_date)}</td> 
            <td>${payment.payment_method || '-'}</td> 
            <td>${payment.courses?.name || '-'}</td> 
            <td>${payment.notes || '-'}</td> 
            <td class="action-buttons"> 
              <button class="action-btn view-btn" onclick="showPaymentReceipt('${payment.id}')"><i class="fas fa-receipt"></i></button> 
              <button class="action-btn edit-btn" onclick="showEditPaymentModal('${payment.id}')"><i class="fas fa-edit"></i></button> 
              <button class="action-btn delete-btn" onclick="deletePayment('${payment.id}')"><i class="fas fa-trash"></i></button> 
            </td> 
          </tr>`).join('')} 
        </tbody> 
      </table> 
    </div> 
  `; 
} 

// Show add payment modal 
function showAddPaymentModal() { 
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

  // - تعيين التاريخ الحالي تلقائيًا - 
  const today = new Date().toISOString().split('T')[0]; 
  const paymentDateInput = document.getElementById('paymentDate'); 
  if (paymentDateInput) { 
    paymentDateInput.value = today; 
  } else { 
    console.warn('حقل paymentDate غير موجود في النموذج'); 
  } 
  // - نهاية تعيين التاريخ - 

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
      courseSelect.appendChild(option); 
    }); 
  } 

  // تحديث إجمالي الكورس تلقائيًا عند اختيار كورس 
  const courseSelectElement = document.getElementById('paymentCourse'); 
  if (courseSelectElement) { 
    courseSelectElement.onchange = function() { 
      const selectedCourseId = this.value; 
      const selectedCourse = courses.find(c => c.id === selectedCourseId); 
      const totalAmountInput = document.getElementById('paymentTotalAmount'); 
      if (selectedCourse && totalAmountInput) { 
        totalAmountInput.value = selectedCourse.price || 0; 
        // console.log("تم تحديث حقل إجمالي الكورس:", selectedCourse.price); 
      } else if (totalAmountInput) { 
        // إذا لم يتم اختيار كورس، اجعل الحقل فارغًا 
        totalAmountInput.value = ''; 
        // console.log("تم مسح حقل إجمالي الكورس"); 
      } 
    }; 
  } 

  document.getElementById('paymentForm').onsubmit = async function(e) { 
    e.preventDefault(); 
    await addPayment(); 
  }; 
} 

// إضافة دفعة جديدة 
async function addPayment() { 
  try { 
    const studentId = document.getElementById('paymentStudent').value; 
    const courseId = document.getElementById('paymentCourse').value; 
    const amount = parseFloat(document.getElementById('paymentAmount').value) || 0; 
    const paymentDate = document.getElementById('paymentDate').value; 
    const paymentMethod = document.getElementById('paymentMethod').value; 
    const notes = document.getElementById('paymentNotes').value.trim(); 

    if (!studentId || !amount || !paymentDate) { 
      showStatus('يرجى ملء الحقول المطلوبة (الطالب، المبلغ، التاريخ)', 'error'); 
      return; 
    } 

    const paymentData = { 
      student_id: studentId, 
      course_id: courseId || null, 
      amount: amount, 
      payment_date: paymentDate, 
      payment_method: paymentMethod || null, 
      notes: notes || null 
    }; 

    const { data, error } = await supabaseClient 
      .from('payments') 
      .insert([paymentData]); 

    if (error) throw error; 

    showStatus('تم إضافة الدفعة بنجاح'); 
    closeModal('paymentModal'); 
    loadPayments(); // إعادة تحميل قائمة المدفوعات 
  } catch (error) { 
    console.error('Error adding payment:', error); 
    showStatus(`خطأ في إضافة الدفعة: ${error.message}`, 'error'); 
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
  document.getElementById('paymentAmount').value = payment.amount; 
  document.getElementById('paymentDate').value = payment.payment_date; 
  document.getElementById('paymentMethod').value = payment.payment_method || ''; 
  document.getElementById('paymentNotes').value = payment.notes || ''; 

  // Populate students dropdown and select current student 
  const studentSelect = document.getElementById('paymentStudent'); 
  if (studentSelect) { 
    studentSelect.innerHTML = '<option value="">اختر طالباً</option>'; 
    students.forEach(student => { 
      const option = document.createElement('option'); 
      option.value = student.id; 
      option.textContent = student.full_name; 
      if (student.id === payment.student_id) option.selected = true; 
      studentSelect.appendChild(option); 
    }); 
  } 

  // Populate courses dropdown and select current course 
  const courseSelect = document.getElementById('paymentCourse'); 
  if (courseSelect) { 
    courseSelect.innerHTML = '<option value="">اختر كورساً</option>'; 
    courses.forEach(course => { 
      const option = document.createElement('option'); 
      option.value = course.id; 
      option.textContent = course.name; 
      if (course.id === payment.course_id) option.selected = true; 
      courseSelect.appendChild(option); 
    }); 
  } 

  // تحديث إجمالي الكورس تلقائيًا عند اختيار كورس (للتحرير أيضًا) 
  const courseSelectElement = document.getElementById('paymentCourse'); 
  if (courseSelectElement) { 
    courseSelectElement.onchange = function() { 
      const selectedCourseId = this.value; 
      const selectedCourse = courses.find(c => c.id === selectedCourseId); 
      const totalAmountInput = document.getElementById('paymentTotalAmount'); 
      if (selectedCourse && totalAmountInput) { 
        totalAmountInput.value = selectedCourse.price || 0; 
      } else if (totalAmountInput) { 
        totalAmountInput.value = ''; 
      } 
    }; 
    // تحديث الحقل فور فتح النافذة 
    const selectedCourse = courses.find(c => c.id === payment.course_id); 
    const totalAmountInput = document.getElementById('paymentTotalAmount'); 
    if (selectedCourse && totalAmountInput) { 
      totalAmountInput.value = selectedCourse.price || 0; 
    } 
  } 

  document.getElementById('paymentForm').onsubmit = async function(e) { 
    e.preventDefault(); 
    await updatePayment(paymentId); 
  }; 
} 

// تحديث دفعة 
async function updatePayment(paymentId) { 
  try { 
    const studentId = document.getElementById('paymentStudent').value; 
    const courseId = document.getElementById('paymentCourse').value; 
    const amount = parseFloat(document.getElementById('paymentAmount').value) || 0; 
    const paymentDate = document.getElementById('paymentDate').value; 
    const paymentMethod = document.getElementById('paymentMethod').value; 
    const notes = document.getElementById('paymentNotes').value.trim(); 

    if (!studentId || !amount || !paymentDate) { 
      showStatus('يرجى ملء الحقول المطلوبة (الطالب، المبلغ، التاريخ)', 'error'); 
      return; 
    } 

    const paymentData = { 
      student_id: studentId, 
      course_id: courseId || null, 
      amount: amount, 
      payment_date: paymentDate, 
      payment_method: paymentMethod || null, 
      notes: notes || null 
    }; 

    const { data, error } = await supabaseClient 
      .from('payments') 
      .update(paymentData) 
      .eq('id', paymentId); 

    if (error) throw error; 

    showStatus('تم تحديث بيانات الدفعة بنجاح'); 
    closeModal('paymentModal'); 
    loadPayments(); // إعادة تحميل قائمة المدفوعات 
  } catch (error) { 
    console.error('Error updating payment:', error); 
    showStatus(`خطأ في تحديث بيانات الدفعة: ${error.message}`, 'error'); 
  } 
} 

// حذف دفعة 
async function deletePayment(paymentId) { 
  if (!confirm('هل أنت متأكد من حذف هذه الدفعة؟')) return; 

  try { 
    const { data, error } = await supabaseClient 
      .from('payments') 
      .delete() 
      .eq('id', paymentId); 

    if (error) throw error; 

    showStatus('تم حذف الدفعة بنجاح'); 
    loadPayments(); // إعادة تحميل قائمة المدفوعات 
  } catch (error) { 
    console.error('Error deleting payment:', error); 
    showStatus(`خطأ في حذف الدفعة: ${error.message}`, 'error'); 
  } 
} 

// دالة لعرض إيصال الدفع 
async function showPaymentReceipt(paymentId) { 
  try { 
    const payment = payments.find(p => p.id === paymentId); 
    if (!payment) { 
      showStatus('الدفعة غير موجودة', 'error'); 
      return; 
    } 

    // جلب معلومات الطالب والكورس إذا لزم 
    const studentName = payment.students?.full_name || 'غير محدد'; 
    const courseName = payment.courses?.name || 'غير محدد'; 

    const receiptContent = document.getElementById('paymentReceiptContent'); 
    if (!receiptContent) return; 

    receiptContent.innerHTML = ` 
      <div style="text-align: center; padding: 20px; direction: rtl; font-family: 'Tajawal', sans-serif;"> 
        <div id="receiptLogo" style="margin-bottom: 20px;"> 
          <img src="logo.png" alt="شعار المركز" style="max-width: 100px;"> 
          <h2>Assiut Academy</h2> 
        </div> 
        <h3>إيصال دفع</h3> 
        <hr> 
        <div style="text-align: right; margin: 20px 0;"> 
          <p><strong>رقم السجل:</strong> ${payment.id}</p> 
          <p><strong>اسم الطالب:</strong> ${studentName}</p> 
          <p><strong>المبلغ المدفوع:</strong> ${formatCurrency(payment.amount)}</p> 
          <p><strong>تاريخ الدفع:</strong> ${formatDate(payment.payment_date)}</p> 
          <p><strong>طريقة الدفع:</strong> ${payment.payment_method || '-'}</p> 
          <p><strong>الكورس:</strong> ${courseName}</p> 
          ${payment.notes ? `<p><strong>ملاحظات:</strong> ${payment.notes}</p>` : ''} 
        </div> 
        <hr> 
        <p>شكراً لثقفكم بنا</p> 
      </div>`; 

    const modal = document.getElementById('paymentReceiptModal'); 
    if (modal) { 
      modal.style.display = 'flex'; 
    } else { 
      console.error('نافذة paymentReceiptModal غير موجودة في DOM'); 
      showStatus('خطأ في فتح نافذة الإيصال', 'error'); 
    } 
  } catch (error) { 
    console.error('Error showing payment receipt:', error); 
    showStatus(`خطأ في عرض الإيصال: ${error.message}`, 'error'); 
  } 
} 

// دالة لطباعة إيصال الدفع 
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

// ============================================================================= 
// دوال إدارة الحضور 
// ============================================================================= 
let attendances = []; 

// دالة تحميل الحضور 
async function loadAttendance() { 
  const container = document.getElementById('attendanceContainer'); 
  if (!container) return; 

  container.innerHTML = `<div class="loading"><div class="loading-spinner"></div><p>جاري تحميل سجلات الحضور...</p></div>`; 

  try { 
    // 1. تحميل الكورسات والطلاب أولاً 
    await loadCourses(); 
    await loadStudents(); 

    // 2. تحميل سجلات الحضور مع تفاصيل الكورس والطالب 
    const { data, error } = await supabaseClient 
      .from('attendances') 
      .select(` 
        id, date, status, notes, student_id, course_id, 
        students (full_name), 
        courses (name) 
      `) 
      .order('date', { ascending: false }); 

    if (error) throw error; 

    attendances = data || []; 
    displayAttendance(attendances); 
  } catch (error) { 
    console.error('Error loading attendance:', error); 
    container.innerHTML = `<p class="error">حدث خطأ أثناء تحميل سجلات الحضور: ${error.message}</p>`; 
  } 
} 

// دالة عرض الحضور 
function displayAttendance(attendancesToDisplay) { 
  const container = document.getElementById('attendanceContainer'); 
  if (!container) return; 

  if (attendancesToDisplay.length === 0) { 
    container.innerHTML = `<div class="table-container"><p class="no-data">لا توجد سجلات حضور.</p></div>`; 
    return; 
  } 

  container.innerHTML = ` 
    <div class="table-container"> 
      <button class="btn btn-primary" onclick="showAddAttendanceModal()" style="margin-bottom: 20px;"> 
        <i class="fas fa-plus"></i> إضافة حضور جديد 
      </button> 
      <table> 
        <thead> 
          <tr> 
            <th>الطالب</th> 
            <th>التاريخ</th> 
            <th>الحالة</th> 
            <th>الكورس</th> 
            <th>ملاحظات</th> 
            <th>الإجراءات</th> 
          </tr> 
        </thead> 
        <tbody> 
          ${attendancesToDisplay.map(attendance => `<tr> 
            <td>${attendance.students?.full_name || '-'}</td> 
            <td>${formatDate(attendance.date)}</td> 
            <td>${attendance.status === 'present' ? 'حاضر' : attendance.status === 'absent' ? 'غائب' : 'متأخر'}</td> 
            <td>${attendance.courses?.name || '-'}</td> 
            <td>${attendance.notes || '-'}</td> 
            <td class="action-buttons"> 
              <button class="action-btn view-btn" onclick="showAttendanceReceipt('${attendance.id}')"><i class="fas fa-receipt"></i></button> 
              <button class="action-btn delete-btn" onclick="deleteAttendance('${attendance.id}')"><i class="fas fa-trash"></i></button> 
            </td> 
          </tr>`).join('')} 
        </tbody> 
      </table> 
    </div> 
  `; 
} 

// Show add attendance modal 
function showAddAttendanceModal() { 
  const modal = document.getElementById('attendanceModal'); 
  modal.style.display = 'flex'; 
  document.getElementById('attendanceModalTitle').textContent = 'إضافة حضور جديد'; 
  document.getElementById('attendanceForm').reset(); 
  document.getElementById('attendanceId').value = ''; // تأكد من أنه فارغ للحالة "إضافة" 

  // Populate students dropdown 
  const studentSelect = document.getElementById('attendanceStudent'); 
  studentSelect.innerHTML = '<option value="">اختر طالباً</option>'; 
  students.forEach(student => { 
    const option = document.createElement('option'); 
    option.value = student.id; 
    option.textContent = student.full_name; 
    studentSelect.appendChild(option); 
  }); 

  // Populate courses dropdown 
  const courseSelect = document.getElementById('attendanceCourse'); 
  courseSelect.innerHTML = '<option value="">اختر كورساً</option>'; 
  courses.forEach(course => { 
    const option = document.createElement('option'); 
    option.value = course.id; 
    option.textContent = course.name; 
    courseSelect.appendChild(option); 
  }); 

  document.getElementById('attendanceForm').onsubmit = async function(e) { 
    e.preventDefault(); 
    await addAttendance(); 
  }; 

  const today = new Date().toISOString().split('T')[0]; 
  document.getElementById('attendanceDate').value = today; 
} 

// إضافة حضور جديد 
async function addAttendance() { 
  try { 
    const studentId = document.getElementById('attendanceStudent').value; 
    const courseId = document.getElementById('attendanceCourse').value; 
    const date = document.getElementById('attendanceDate').value; 
    const status = document.getElementById('attendanceStatus').value; 
    const notes = document.getElementById('attendanceNotes').value.trim(); 

    if (!studentId || !courseId || !date || !status) { 
      showStatus('يرجى ملء جميع الحقول المطلوبة', 'error'); 
      return; 
    } 

    const attendanceData = { 
      student_id: studentId, 
      course_id: courseId, 
      date: date, 
      status: status, 
      notes: notes || null 
    }; 

    const { data, error } = await supabaseClient 
      .from('attendances') 
      .insert([attendanceData]); 

    if (error) throw error; 

    showStatus('تم إضافة سجل الحضور بنجاح'); 
    closeModal('attendanceModal'); 
    loadAttendance(); // إعادة تحميل قائمة الحضور 
  } catch (error) { 
    console.error('Error adding attendance:', error); 
    showStatus(`خطأ في إضافة الحضور: ${error.message}`, 'error'); 
  } 
} 

// حذف حضور 
async function deleteAttendance(attendanceId) { 
  if (!confirm('هل أنت متأكد من حذف هذا السجل؟')) return; 

  try { 
    const { data, error } = await supabaseClient 
      .from('attendances') 
      .delete() 
      .eq('id', attendanceId); 

    if (error) throw error; 

    showStatus('تم حذف سجل الحضور بنجاح'); 
    loadAttendance(); // إعادة تحميل قائمة الحضور 
  } catch (error) { 
    console.error('Error deleting attendance:', error); 
    showStatus(`خطأ في حذف الحضور: ${error.message}`, 'error'); 
  } 
} 

// دالة لعرض إيصال الحضور 
async function showAttendanceReceipt(attendanceId) { 
  try { 
    const attendance = attendances.find(a => a.id === attendanceId); 
    if (!attendance) { 
      showStatus('سجل الحضور غير موجود', 'error'); 
      return; 
    } 

    // جلب معلومات الطالب والكورس إذا لزم 
    const studentName = attendance.students?.full_name || 'غير محدد'; 
    const courseName = attendance.courses?.name || 'غير محدد'; 

    // جلب سجلات الحضور السابقة للطالب في نفس الكورس 
    const { data: previousAttendances, error: attError } = await supabaseClient 
      .from('attendances') 
      .select('date, status, notes') 
      .eq('student_id', attendance.student_id) 
      .eq('course_id', attendance.course_id) 
      .order('date', { ascending: false }); 

    if (attError) throw attError; 

    // حساب الإحصائيات 
    let presentCount = 0, absentCount = 0, lateCount = 0; 
    let attendanceTableRows = ''; 

    if (previousAttendances && previousAttendances.length > 0) { 
      presentCount = previousAttendances.filter(a => a.status === 'present').length; 
      absentCount = previousAttendances.filter(a => a.status === 'absent').length; 
      lateCount = previousAttendances.filter(a => a.status === 'late').length; 

      attendanceTableRows = previousAttendances.map(att => ` 
        <tr> 
          <td style="border: 1px solid #ddd; padding: 8px;">${formatDate(att.date)}</td> 
          <td style="border: 1px solid #ddd; padding: 8px;"> 
            ${att.status === 'present' ? 'حاضر' : att.status === 'absent' ? 'غائب' : 'متأخر'} 
          </td> 
          <td style="border: 1px solid #ddd; padding: 8px;">${att.notes || '-'}</td> 
        </tr> 
      `).join(''); 
    } else { 
      attendanceTableRows = `<tr><td colspan="3" style="border: 1px solid #ddd; padding: 8px; text-align: center;">لا توجد سجلات حضور سابقة</td></tr>`; 
    } 

    const receiptContent = document.getElementById('attendanceReceiptContent'); 
    if (!receiptContent) return; 

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
          <p><strong>اسم الطالب:</strong> ${studentName}</p> 
          <p><strong>الكورس:</strong> ${courseName}</p> 
          <p><strong>التاريخ:</strong> ${formatDate(attendance.date)}</p> 
          <p><strong>الحالة:</strong> ${attendance.status === 'present' ? 'حاضر' : attendance.status === 'absent' ? 'غائب' : 'متأخر'}</p> 
          ${attendance.notes ? `<p><strong>ملاحظات:</strong> ${attendance.notes}</p>` : ''} 
          <p><strong>الحضور:</strong> ${presentCount}</p> 
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
      </div>`; 

    const modal = document.getElementById('attendanceReceiptModal'); 
    if (modal) { 
      modal.style.display = 'flex'; 
    } else { 
      console.error('نافذة attendanceReceiptModal غير موجودة في DOM'); 
      showStatus('خطأ في فتح نافذة الإيصال', 'error'); 
    } 
  } catch (error) { 
    console.error('Error showing attendance receipt:', error); 
    showStatus(`خطأ في عرض الإيصال: ${error.message}`, 'error'); 
  } 
} 

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

// - New Functions for Parents Tab - 
// Function to load students specifically for the Parents tab (with send report button) 
async function loadStudentsForParents() { 
  const container = document.getElementById('parentsContainer'); 
  if (!container) return; 

  container.innerHTML = `<div class="loading"><div class="loading-spinner"></div><p>جاري تحميل بيانات أولياء الأمور...</p></div>`; 

  try { 
    // جلب بيانات الطلاب مع رقم هاتف ولي الأمر فقط 
    const { data, error } = await supabaseClient 
      .from('students') 
      .select('id, full_name, parent_phone') 
      .not('parent_phone', 'is', null) // فقط من لديهم رقم ولي الأمر 
      .not('parent_phone', 'eq', ''); // ورقم ولي الأمر ليس فارغًا 

    if (error) throw error; 

    if (!data || data.length === 0) { 
      container.innerHTML = `<div class="table-container"><p class="no-data">لا توجد بيانات أولياء أمور.</p></div>`; 
      return; 
    } 

    container.innerHTML = ` 
      <div class="table-container"> 
        <h3 style="margin-bottom: 20px;">بيانات أولياء الأمور</h3> 
        <table> 
          <thead> 
            <tr> 
              <th>اسم الطالب</th> 
              <th>رقم هاتف ولي الأمر</th> 
              <th>الإجراءات</th> 
            </tr> 
          </thead> 
          <tbody> 
            ${data.map(student => `<tr> 
              <td>${student.full_name}</td> 
              <td>${student.parent_phone}</td> 
              <td> 
                <button class="btn btn-primary" onclick="sendStudentReport('${student.id}', '${student.parent_phone}')">إرسال التقرير</button> 
              </td> 
            </tr>`).join('')} 
          </tbody> 
        </table> 
      </div> 
    `; 
  } catch (error) { 
    console.error('Error loading parents data:', error); 
    container.innerHTML = `<p class="error">حدث خطأ أثناء تحميل بيانات أولياء الأمور: ${error.message}</p>`; 
  } 
} 

// Function to send student report via WhatsApp 
async function sendStudentReport(studentId, parentPhone) { 
  try { 
    // 1. جلب بيانات الطالب 
    const { data: studentData, error: studentError } = await supabaseClient 
      .from('students') 
      .select('id, full_name') 
      .eq('id', studentId) 
      .single(); 

    if (studentError) throw studentError; 
    if (!studentData) { 
      showStatus('الطالب غير موجود', 'error'); 
      return; 
    } 

    // 2. جلب الاشتراكات 
    const { data: subscriptions, error: subError } = await supabaseClient 
      .from('subscriptions') 
      .select(` 
        subscribed_at, status, notes, 
        courses (name) 
      `) 
      .eq('student_id', studentId); 

    if (subError) throw subError; 

    // 3. جلب المدفوعات 
    const { data: payments, error: payError } = await supabaseClient 
      .from('payments') 
      .select('amount, payment_date') 
      .eq('student_id', studentId); 

    if (payError) throw payError; 

    // 4. جلب سجلات الحضور 
    const { data: attendances, error: attError } = await supabaseClient 
      .from('attendances') 
      .select('status') 
      .eq('student_id', studentId); 

    if (attError) throw attError; 

    // 5. إنشاء الرسالة 
    let message = `*تقرير الطالب: ${studentData.full_name}*\n\n`; 

    // الاشتراكات 
    if (subscriptions && subscriptions.length > 0) { 
      message += "*الاشتراكات:*\n"; 
      subscriptions.forEach(sub => { 
        message += `- ${sub.courses?.name || 'كورس غير محدد'} (${sub.status === 'active' ? 'نشط' : 'منتهي'})\n`; 
      }); 
    } else { 
      message += "*الاشتراكات:* لا توجد اشتراكات.\n"; 
    } 

    // المدفوعات 
    if (payments && payments.length > 0) { 
      const totalPaid = payments.reduce((sum, p) => sum + (p.amount || 0), 0); 
      message += `\n*إجمالي المدفوعات:* ${formatCurrency(totalPaid)}\n`; 
    } else { 
      message += "\n*إجمالي المدفوعات:* 0.00 جنيه\n"; 
    } 

    // الحضور 
    if (attendances && attendances.length > 0) { 
      const presentCount = attendances.filter(a => a.status === 'present').length; 
      const absentCount = attendances.filter(a => a.status === 'absent').length; 
      const lateCount = attendances.filter(a => a.status === 'late').length; 
      message += ` - حاضر: ${presentCount} مرة\n- غائب: ${absentCount} مرة\n- متأخر: ${lateCount} مرة`; 
    } else { 
      message += " لا توجد بيانات حضور."; 
    } 
    message += "\n*تم إرسال التقرير من أكاديمية أسيوط.*"; 

    // Encode the message for URL 
    const encodedMessage = encodeURIComponent(message); 
    // Create WhatsApp URL (assuming Egyptian numbers start with +20) 
    let formattedPhone = parentPhone.replace(/\D/g, ''); // Remove non-digits 
    if (formattedPhone.startsWith('0')) { 
      formattedPhone = '+20' + formattedPhone.substring(1); 
    } else if (!formattedPhone.startsWith('+')) { 
      formattedPhone = '+20' + formattedPhone; // Default to Egypt if no country code 
    } 
    const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodedMessage}`; 

    // Open WhatsApp in a new tab 
    window.open(whatsappUrl, '_blank'); 

    showStatus(`تم إرسال التقرير إلى ${parentPhone}`); 
  } catch (error) { 
    console.error('Error sending student report:', error); 
    showStatus(`خطأ في إرسال التقرير: ${error.message}`, 'error'); 
  } 
}