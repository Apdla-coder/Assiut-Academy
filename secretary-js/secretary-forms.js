'use strict';

// ============================================================================
// SECRETARY FORMS - Modal handling, forms, CRUD operations
// ============================================================================

// Global variables for form state
let currentStudentId = null;
let currentCourseId = null;
let currentSubscriptionId = null;
let currentPaymentId = null;
let currentAttendanceId = null;

// === STUDENTS MODALS ===
async function showAddStudentModal() {
  const modal = document.getElementById('studentModal');
  if (!modal) return;
  
  currentStudentId = null; // Reset edit mode
  modal.style.display = 'flex';
  document.getElementById('studentModalTitle').textContent = 'إضافة طالب جديد';
  document.getElementById('studentForm').reset();
}

async function editStudent(studentId) {
  const student = window.students.find(s => s.id === studentId);
  if (!student) return;
  
  currentStudentId = studentId; // Set edit mode
  const modal = document.getElementById('studentModal');
  if (!modal) return;
  
  modal.style.display = 'flex';
  document.getElementById('studentModalTitle').textContent = 'تعديل بيانات الطالب';
  document.getElementById('studentId').value = student.id;
  document.getElementById('fullName').value = student.full_name;
  document.getElementById('email').value = student.email;
  document.getElementById('phone').value = student.phone;
  document.getElementById('address').value = student.address || '';
  document.getElementById('birthdate').value = student.birthdate || '';
  document.getElementById('guardianName').value = student.guardian_name || '';
  document.getElementById('guardianPhone').value = student.guardian_phone || '';
  document.getElementById('notes').value = student.notes || '';
}

async function addStudent(e) {
  e.preventDefault();
  try {
    if (!window.currentAcademyId) {
      showStatus('خطأ: معرّف المؤسسة غير محمل', 'error');
      return;
    }

    // إذا كان في mode تعديل، استدعي updateStudent
    if (currentStudentId) {
      await updateStudent();
      return;
    }

    const fullName = document.getElementById('fullName')?.value;
    const email = document.getElementById('email')?.value;
    const phone = document.getElementById('phone')?.value;
    const address = document.getElementById('address')?.value;
    const birthdate = document.getElementById('birthdate')?.value;
    const guardianName = document.getElementById('guardianName')?.value;
    const guardianPhone = document.getElementById('guardianPhone')?.value;
    const notes = document.getElementById('notes')?.value;

    if (!fullName) {
      showStatus('الرجاء إدخال اسم الطالب', 'error');
      return;
    }

    const { data, error } = await window.supabaseClient
      .from('students')
      .insert([{
        full_name: fullName,
        email: email || null,
        phone: phone || null,
        address: address || null,
        birthdate: birthdate || null,
        guardian_name: guardianName || null,
        guardian_phone: guardianPhone || null,
        notes: notes || null,
        academy_id: window.currentAcademyId
      }]);

    if (error) {
      console.error('❌ Insert error:', error);
      if (error.code === '23505' || error.message?.includes('unique')) {
        showStatus('طالب بهذا البريد الإلكتروني موجود بالفعل', 'error');
      } else {
        throw error;
      }
      return;
    }

    showStatus('✅ تم إضافة الطالب بنجاح', 'success');
    closeModal('studentModal');
    window.realtimeSyncEnabled = false;
    clearDataCache('students');
    await loadStudents(true); // force refresh
    setTimeout(() => { 
      window.realtimeSyncEnabled = true;
    }, 500);
  } catch (error) {
    console.error('❌ Error adding student:', error);
    showStatus('خطأ في إضافة الطالب: ' + error.message, 'error');
    window.realtimeSyncEnabled = true;
  }
}

async function updateStudent() {
  try {
    if (!currentStudentId) return;

    const fullName = document.getElementById('fullName')?.value;
    const email = document.getElementById('email')?.value;
    const phone = document.getElementById('phone')?.value;
    const address = document.getElementById('address')?.value;
    const birthdate = document.getElementById('birthdate')?.value;
    const guardianName = document.getElementById('guardianName')?.value;
    const guardianPhone = document.getElementById('guardianPhone')?.value;
    const notes = document.getElementById('notes')?.value;

    if (!fullName) {
      showStatus('الرجاء إدخال اسم الطالب', 'error');
      return;
    }

    const { data, error } = await window.supabaseClient
      .from('students')
      .update({
        full_name: fullName,
        email: email || null,
        phone: phone || null,
        address: address || null,
        birthdate: birthdate || null,
        guardian_name: guardianName || null,
        guardian_phone: guardianPhone || null,
        notes: notes || null
      })
      .eq('id', currentStudentId);

    if (error) throw error;

    showStatus('✅ تم تحديث بيانات الطالب', 'success');
    closeModal('studentModal');
    currentStudentId = null;
    realtimeSyncEnabled = false; // Disable real-time sync
    clearDataCache('students');
    await loadStudents(true); // force refresh
    setTimeout(() => { realtimeSyncEnabled = true; }, 1500); // Re-enable after 1.5s
  } catch (error) {
    console.error('❌ Error updating student:', error);
    showStatus('خطأ في تحديث الطالب', 'error');
  }
}

async function deleteStudent(studentId) {
  if (!confirm('هل تريد حذف هذا الطالب؟')) return;

  try {
    const { error } = await window.supabaseClient
      .from('students')
      .delete()
      .eq('id', studentId);

    if (error) throw error;

    showStatus('✅ تم حذف الطالب', 'success');
    realtimeSyncEnabled = false; // Disable real-time sync
    clearDataCache('students');
    await loadStudents(true); // force refresh
    setTimeout(() => { realtimeSyncEnabled = true; }, 1500); // Re-enable after 1.5s
  } catch (error) {
    console.error('❌ Error deleting student:', error);
    showStatus('خطأ في حذف الطالب', 'error');
  }
}

// === COURSES MODALS ===
async function showAddCourseModal() {
  const modal = document.getElementById('courseModal');
  if (!modal) return;
  
  await loadTeachers();
  if (!window.teachers || window.teachers.length === 0) {
    await new Promise(resolve => setTimeout(resolve, 300));
    await loadTeachers();
  }
  
  populateTeacherDropdown();
  modal.style.display = 'flex';
  document.getElementById('courseModalTitle').textContent = 'إضافة كورس جديد';
  document.getElementById('courseForm').reset();
}

async function editCourse(courseId) {
  const course = window.courses.find(c => c.id === courseId);
  if (!course) return;
  
  const modal = document.getElementById('courseModal');
  if (!modal) return;
  
  await loadTeachers();
  if (!window.teachers || window.teachers.length === 0) {
    await new Promise(resolve => setTimeout(resolve, 300));
    await loadTeachers();
  }
  
  populateTeacherDropdown(course.teacher_id);
  modal.style.display = 'flex';
  document.getElementById('courseModalTitle').textContent = 'تعديل الكورس';
  document.getElementById('courseId').value = course.id;
  document.getElementById('courseName').value = course.name;
  document.getElementById('courseDescription').value = course.description || '';
  document.getElementById('coursePrice').value = course.price || '';
  document.getElementById('startDate').value = course.start_date || '';
  document.getElementById('endDate').value = course.end_date || '';
}

function populateTeacherDropdown(selectedTeacherId = null) {
  const dropdown = document.getElementById('teacher');
  if (!dropdown) return;
  
  dropdown.innerHTML = '<option value="">لم يتم تعيين معلم بعد</option>';
  
  if (window.teachers && window.teachers.length > 0) {
    window.teachers.forEach(teacher => {
      const option = document.createElement('option');
      option.value = teacher.id;
      option.textContent = teacher.full_name || 'معلم بدون اسم';
      if (selectedTeacherId && teacher.id === selectedTeacherId) {
        option.selected = true;
      }
      dropdown.appendChild(option);
    });
  } else {
    const noTeachersOption = document.createElement('option');
    noTeachersOption.value = '';
    noTeachersOption.textContent = 'لا يوجد معلمين متاحين';
    noTeachersOption.disabled = true;
    dropdown.appendChild(noTeachersOption);
  }
}

async function addCourse(e) {
  e.preventDefault();
  try {
    if (!window.currentAcademyId) {
      showStatus('خطأ: معرّف المؤسسة غير محمل', 'error');
      return;
    }

    // إذا كان في mode تعديل، استدعي updateCourse
    const courseId = document.getElementById('courseId')?.value;
    if (courseId) {
      await updateCourse(courseId);
      return;
    }

    const name = document.getElementById('courseName')?.value;
    const description = document.getElementById('courseDescription')?.value;
    const price = document.getElementById('coursePrice')?.value;
    const teacherId = document.getElementById('teacher')?.value || null;

    if (!name || !price) {
      showStatus('الرجاء ملء الحقول المطلوبة', 'error');
      return;
    }

    const { data, error } = await window.supabaseClient
      .from('courses')
      .insert([{
        name: name,
        description: description,
        price: parseFloat(price),
        academy_id: window.currentAcademyId,
        teacher_id: teacherId
      }]);

    if (error) throw error;

    showStatus('✅ تم إضافة الكورس بنجاح', 'success');
    closeModal('courseModal');
    window.realtimeSyncEnabled = false;
    clearDataCache('courses');
    await loadCourses(true); // force refresh
    setTimeout(() => { 
      window.realtimeSyncEnabled = true;
    }, 500);
  } catch (error) {
    console.error('❌ Error adding course:', error);
    showStatus('خطأ في إضافة الكورس', 'error');
    window.realtimeSyncEnabled = true;
  }
}

async function updateCourse(courseId) {
  try {
    const name = document.getElementById('courseName')?.value;
    const description = document.getElementById('courseDescription')?.value;
    const price = document.getElementById('coursePrice')?.value;
    const teacherId = document.getElementById('teacher')?.value || null;

    if (!name || !price) {
      showStatus('الرجاء ملء الحقول المطلوبة', 'error');
      return;
    }

    const { error } = await window.supabaseClient
      .from('courses')
      .update({
        name: name,
        description: description,
        price: parseFloat(price),
        teacher_id: teacherId
      })
      .eq('id', courseId);

    if (error) throw error;

    showStatus('✅ تم تحديث الكورس', 'success');
    closeModal('courseModal');
    clearDataCache('courses');
    await loadCourses(true); // force refresh
  } catch (error) {
    console.error('❌ Error updating course:', error);
    showStatus('خطأ في تحديث الكورس', 'error');
  }
}

async function deleteCourse(courseId) {
  if (!confirm('هل تريد حذف هذا الكورس؟')) return;

  try {
    const { error } = await window.supabaseClient
      .from('courses')
      .delete()
      .eq('id', courseId);

    if (error) throw error;

    showStatus('✅ تم حذف الكورس', 'success');
    clearDataCache('courses');
    await loadCourses(true); // force refresh
  } catch (error) {
    console.error('❌ Error deleting course:', error);
    showStatus('خطأ في حذف الكورس', 'error');
  }
}

// === SUBSCRIPTIONS MODALS ===
async function showAddSubscriptionModal() {
  const modal = document.getElementById('subscriptionModal');
  if (!modal) return;
  
  currentSubscriptionId = null; // Reset edit mode
  modal.style.display = 'flex';
  document.getElementById('subscriptionModalTitle').textContent = 'إضافة اشتراك جديد';
  document.getElementById('subscriptionForm').reset();
  
  // Set up datalist for autocomplete
  setupSubscriptionAutocomplete();
}

function setupSubscriptionAutocomplete() {
  // Populate students dropdown
  const studentSelect = document.getElementById('studentName');
  if (studentSelect && studentSelect.tagName === 'SELECT') {
    studentSelect.innerHTML = '<option value="">اختر طالباً</option>' +
      (window.students || []).map(s => 
        `<option value="${s.id}">${s.full_name}</option>`
      ).join('');
  }

  // Populate courses dropdown
  const courseSelect = document.getElementById('courseSelect');
  if (courseSelect && courseSelect.tagName === 'SELECT') {
    courseSelect.innerHTML = '<option value="">اختر كورساً</option>' +
      (window.courses || []).map(c => 
        `<option value="${c.id}">${c.name} - ${formatCurrency(c.price || 0)}</option>`
      ).join('');
  }
  
  // Reset payment fields
  const paidInput = document.getElementById('subscriptionAmountPaid');
  const priceDisplay = document.getElementById('coursePriceDisplay');
  const remainingDisplay = document.getElementById('subscriptionRemainingAmount');
  
  if (paidInput) paidInput.value = 0;
  if (priceDisplay) priceDisplay.value = '';
  if (remainingDisplay) remainingDisplay.value = '';
}

function updateSubscriptionAmount() {
  const courseSelect = document.getElementById('courseSelect');
  const courseId = courseSelect?.value;
  const course = window.courses?.find(c => c.id === courseId);
  
  const priceDisplay = document.getElementById('coursePriceDisplay');
  const paidInput = document.getElementById('subscriptionAmountPaid');
  const remainingDisplay = document.getElementById('subscriptionRemainingAmount');
  
  if (!course) {
    if (priceDisplay) priceDisplay.value = '';
    if (paidInput) paidInput.value = 0;
    if (remainingDisplay) remainingDisplay.value = '';
    return;
  }
  
  const coursePrice = course.price || 0;
  const paidAmount = parseFloat(paidInput?.value || 0);
  const remaining = Math.max(0, coursePrice - paidAmount);
  
  if (priceDisplay) priceDisplay.value = formatCurrency(coursePrice);
  if (remainingDisplay) remainingDisplay.value = formatCurrency(remaining);
}

// Listen to paid amount changes
document.addEventListener('DOMContentLoaded', function() {
  const paidInput = document.getElementById('subscriptionAmountPaid');
  if (paidInput) {
    paidInput.addEventListener('input', updateSubscriptionAmount);
  }
});

async function addSubscription(e) {
  e.preventDefault();
  try {
    if (!window.currentAcademyId) {
      showStatus('خطأ: معرّف المؤسسة غير محمل', 'error');
      return;
    }

    // Get student ID from dropdown
    const studentId = document.getElementById('studentName')?.value;
    if (!studentId) {
      showStatus('الرجاء اختيار الطالب', 'error');
      return;
    }
    
    const student = window.students?.find(s => s.id === studentId);
    if (!student) {
      showStatus('لم يتم العثور على الطالب', 'error');
      return;
    }

    // Get course
    const courseId = document.getElementById('courseSelect')?.value;
    if (!courseId) {
      showStatus('الرجاء اختيار الكورس', 'error');
      return;
    }
    
    const course = window.courses?.find(c => c.id === courseId);
    if (!course) {
      showStatus('لم يتم العثور على الكورس', 'error');
      return;
    }

    const startDate = document.getElementById('subscriptionDate')?.value || new Date().toISOString().split('T')[0];
    const status = document.getElementById('subscriptionStatus')?.value || 'active';
    const amountPaid = parseFloat(document.getElementById('subscriptionAmountPaid')?.value || 0);

    // Check if already editing
    if (currentSubscriptionId) {
      await updateSubscription();
      return;
    }

    const { data, error } = await window.supabaseClient
      .from('subscriptions')
      .insert([{
        student_id: student.id,
        course_id: courseId,
        subscribed_at: startDate,
        status: status,
        academy_id: window.currentAcademyId
      }]);

    if (error) throw error;

    // 📝 Only create payment record if amount is provided and greater than 0
    if (amountPaid && amountPaid > 0) {
      const { error: paymentError } = await window.supabaseClient
        .from('payments')
        .insert([{
          student_id: student.id,
          course_id: courseId,
          amount: amountPaid,
          payment_method: 'cash',
          payment_date: startDate,
          status: 'paid',
          academy_id: window.currentAcademyId
        }]);

      if (paymentError) {
        console.warn('⚠️ Warning: Could not create payment record:', paymentError);
      } else {
        console.log(`✅ Payment record created: ${formatCurrency(amountPaid)}`);
      }
    } else {
      console.log('ℹ️ No payment amount provided - subscription created without payment record');
    }

    showStatus('✅ تم إضافة الاشتراك بنجاح', 'success');
    closeModal('subscriptionModal');
    clearDataCache('subscriptions');
    await loadSubscriptions(true); // force refresh
    clearDataCache('payments');
    await loadPayments(true); // force refresh
  } catch (error) {
    console.error('❌ Error adding subscription:', error);
    showStatus('خطأ في إضافة الاشتراك: ' + error.message, 'error');
  }
}

async function editSubscription(subscriptionId) {
  const sub = window.subscriptions.find(s => s.id === subscriptionId);
  if (!sub) return;

  const student = window.students?.find(s => s.id === sub.student_id);
  const course = window.courses?.find(c => c.id === sub.course_id);
  
  if (!student || !course) {
    showStatus('خطأ: لم يتم العثور على بيانات الطالب أو الكورس', 'error');
    return;
  }

  currentSubscriptionId = subscriptionId;
  const modal = document.getElementById('subscriptionModal');
  if (!modal) return;

  modal.style.display = 'flex';
  document.getElementById('subscriptionModalTitle').textContent = 'تعديل الاشتراك';
  
  // Populate form with dropdowns
  setupSubscriptionAutocomplete();
  document.getElementById('studentName').value = sub.student_id;
  document.getElementById('courseSelect').value = sub.course_id;
  document.getElementById('subscriptionDate').value = sub.subscribed_at?.split('T')[0] || '';
  document.getElementById('subscriptionStatus').value = sub.status || 'active';
  
  // Calculate amount paid from payments related to this subscription
  const relatedPayments = (window.payments || []).filter(p => 
    p.student_id === sub.student_id && p.course_id === sub.course_id
  );
  const totalPaid = relatedPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
  
  document.getElementById('subscriptionAmountPaid').value = totalPaid;
  updateSubscriptionAmount();
}

async function updateSubscription() {
  try {
    if (!currentSubscriptionId) return;

    const startDate = document.getElementById('subscriptionDate')?.value;
    const status = document.getElementById('subscriptionStatus')?.value;

    const { error } = await window.supabaseClient
      .from('subscriptions')
      .update({
        subscribed_at: startDate,
        status: status
      })
      .eq('id', currentSubscriptionId);

    if (error) throw error;

    showStatus('✅ تم تحديث الاشتراك', 'success');
    closeModal('subscriptionModal');
    currentSubscriptionId = null;
    clearDataCache('subscriptions');
    await loadSubscriptions(true); // force refresh
  } catch (error) {
    console.error('❌ Error updating subscription:', error);
    showStatus('خطأ في تحديث الاشتراك', 'error');
  }
}

async function deleteSubscription(subscriptionId) {
  if (!confirm('هل تريد حذف هذا الاشتراك؟')) return;

  try {
    const { error } = await window.supabaseClient
      .from('subscriptions')
      .delete()
      .eq('id', subscriptionId);

    if (error) throw error;

    showStatus('✅ تم حذف الاشتراك', 'success');
    clearDataCache('subscriptions');
    await loadSubscriptions(true); // force refresh
  } catch (error) {
    console.error('❌ Error deleting subscription:', error);
    showStatus('خطأ في حذف الاشتراك', 'error');
  }
}

// === PAYMENTS MODALS ===
async function showAddPaymentModal() {
  const modal = document.getElementById('paymentModal');
  if (!modal) return;
  
  currentPaymentId = null;
  modal.style.display = 'flex';
  document.getElementById('paymentModalTitle').textContent = 'إضافة دفعة جديدة';
  document.getElementById('paymentForm').reset();
  
  // Set today's date
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('paymentDate').value = today;
  
  populatePaymentDropdowns();
}

function populatePaymentDropdowns() {
  const studentSelect = document.getElementById('paymentStudent');
  if (studentSelect) {
    studentSelect.innerHTML = '<option value="">اختر طالباً</option>';
    (window.students || []).forEach(student => {
      const option = document.createElement('option');
      option.value = student.id;
      option.textContent = student.full_name;
      studentSelect.appendChild(option);
    });
  }
}

function updatePaymentCourses() {
  const studentId = document.getElementById('paymentStudent')?.value;
  const courseSelect = document.getElementById('paymentCourse');
  
  if (!studentId || !courseSelect) {
    courseSelect.innerHTML = '<option value="">اختر كورساً</option>';
    return;
  }

  // Get courses that this student is subscribed to
  const studentSubscriptions = (window.subscriptions || []).filter(s => s.student_id === studentId && s.status === 'active');
  const courseIds = studentSubscriptions.map(s => s.course_id);
  const studentCourses = (window.courses || []).filter(c => courseIds.includes(c.id));

  courseSelect.innerHTML = '<option value="">اختر كورساً</option>';
  studentCourses.forEach(course => {
    const option = document.createElement('option');
    option.value = course.id;
    option.textContent = `${course.name} - ${formatCurrency(course.price || 0)}`;
    courseSelect.appendChild(option);
  });

  updatePaymentAmount();
}

function updatePaymentAmount() {
  const studentId = document.getElementById('paymentStudent')?.value;
  const courseId = document.getElementById('paymentCourse')?.value;
  
  const courseSelect = (window.courses || []).find(c => c.id === courseId);
  const coursePrice = courseSelect?.price || 0;

  // Calculate already paid amount
  const existingPayments = (window.payments || []).filter(p => 
    p.student_id === studentId && 
    p.course_id === courseId
  );
  const alreadyPaid = existingPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

  // Update display fields
  const priceDisplay = document.getElementById('paymentCoursePrice');
  const alreadyPaidDisplay = document.getElementById('paymentAlreadyPaid');
  
  if (priceDisplay) priceDisplay.value = formatCurrency(coursePrice);
  if (alreadyPaidDisplay) alreadyPaidDisplay.value = formatCurrency(alreadyPaid);

  // Reset current payment amount
  const amountInput = document.getElementById('amount');
  if (amountInput) amountInput.value = 0;

  updateRemainingAmount();
}

function updateRemainingAmount() {
  const courseId = document.getElementById('paymentCourse')?.value;
  const currentAmount = parseFloat(document.getElementById('amount')?.value || 0);
  const studentId = document.getElementById('paymentStudent')?.value;

  const courseSelect = (window.courses || []).find(c => c.id === courseId);
  const coursePrice = courseSelect?.price || 0;

  // Calculate already paid amount
  const existingPayments = (window.payments || []).filter(p => 
    p.student_id === studentId && 
    p.course_id === courseId
  );
  const alreadyPaid = existingPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

  // Remaining = course price - already paid - current amount
  const remainingAmount = Math.max(0, coursePrice - alreadyPaid - currentAmount);
  const remainingDisplay = document.getElementById('remainingAmount');
  
  if (remainingDisplay) remainingDisplay.value = formatCurrency(remainingAmount);
}

async function addPayment(e) {
  e.preventDefault();
  try {
    if (!window.currentAcademyId) {
      showStatus('خطأ: معرّف المؤسسة غير محمل', 'error');
      return;
    }

    const studentId = document.getElementById('paymentStudent')?.value;
    const courseId = document.getElementById('paymentCourse')?.value;
    const amount = document.getElementById('amount')?.value;
    const method = document.getElementById('paymentMethod')?.value;
    const paidAt = document.getElementById('paymentDate')?.value;
    const status = document.getElementById('paymentStatus')?.value;

    if (!studentId || !courseId || !amount) {
      showStatus('الرجاء ملء جميع الحقول المطلوبة', 'error');
      return;
    }

    // Check if we're editing or adding
    if (currentPaymentId) {
      // Update existing payment
      const { error } = await window.supabaseClient
        .from('payments')
        .update({
          student_id: studentId,
          course_id: courseId,
          amount: parseFloat(amount),
          payment_method: method,
          payment_date: paidAt,
          status: status
        })
        .eq('id', currentPaymentId);

      if (error) throw error;
      showStatus('✅ تم تحديث الدفعة بنجاح', 'success');
      
      // Print receipt after update
      if (typeof printPaymentReceipt === 'function') {
        const confirmPrint = confirm('هل تريد طباعة الفاتورة المحدثة؟');
        if (confirmPrint) {
          printPaymentReceipt(currentPaymentId);
        }
      }
    } else {
      // Insert new payment
      const { data, error } = await window.supabaseClient
        .from('payments')
        .insert([{
          student_id: studentId,
          course_id: courseId,
          amount: parseFloat(amount),
          payment_method: method,
          payment_date: paidAt,
          status: status,
          academy_id: window.currentAcademyId
        }])
        .select();

      if (error) throw error;
      showStatus('✅ تم إضافة الدفعة بنجاح', 'success');
      
      // Print receipt after successful save
      if (data && data[0] && typeof printPaymentReceipt === 'function') {
        const paymentData = {
          ...data[0],
          student_id: studentId,
          course_id: courseId,
          amount: parseFloat(amount)
        };
        
        if (typeof showPaymentReceiptAfterSave === 'function') {
          showPaymentReceiptAfterSave(paymentData);
        } else {
          // Fallback to direct print
          const confirmPrint = confirm('هل تريد طباعة فاتورة الدفعة؟');
          if (confirmPrint) {
            printPaymentReceipt(data[0].id);
          }
        }
      }
    }

    closeModal('paymentModal');
    
    // Disable realtime sync temporarily to avoid duplicate data loads
    const prevRealtimeSyncEnabled = window.realtimeSyncEnabled;
    window.realtimeSyncEnabled = false;
    
    clearDataCache('payments');
    await loadPayments(true); // force refresh
    
    // Re-enable realtime sync after a short delay
    setTimeout(() => {
      window.realtimeSyncEnabled = prevRealtimeSyncEnabled;
    }, 500);
  } catch (error) {
    console.error('❌ Error adding payment:', error);
    showStatus('خطأ في الدفعة: ' + error.message, 'error');
    window.realtimeSyncEnabled = true; // Ensure realtime is re-enabled on error
  }
}

async function editPayment(paymentId) {
  const payment = window.payments.find(p => p.id === paymentId);
  if (!payment) return;

  const modal = document.getElementById('paymentModal');
  if (!modal) return;

  currentPaymentId = paymentId;
  modal.style.display = 'flex';
  document.getElementById('paymentModalTitle').textContent = 'تعديل الدفعة';
  document.getElementById('paymentId').value = payment.id;
  
  // Populate dropdowns
  populatePaymentDropdowns();
  
  // Set student value
  document.getElementById('paymentStudent').value = payment.student_id;
  
  // Update courses dropdown based on student
  updatePaymentCourses();
  
  // Set course value
  document.getElementById('paymentCourse').value = payment.course_id;
  
  // Set payment values
  document.getElementById('amount').value = payment.amount;
  document.getElementById('paymentMethod').value = payment.payment_method;
  document.getElementById('paymentDate').value = payment.payment_date?.split('T')[0];
  document.getElementById('paymentStatus').value = payment.status;
  
  // Update payment amount display
  updatePaymentAmount();
}



async function deletePayment(paymentId) {
  if (!confirm('هل تريد حذف هذه الدفعة؟')) return;

  try {
    const { error } = await window.supabaseClient
      .from('payments')
      .delete()
      .eq('id', paymentId);

    if (error) throw error;

    showStatus('✅ تم حذف الدفعة', 'success');
    
    // Disable realtime sync temporarily to avoid duplicate data loads
    const prevRealtimeSyncEnabled = window.realtimeSyncEnabled;
    window.realtimeSyncEnabled = false;
    
    clearDataCache('payments');
    await loadPayments(true); // force refresh
    
    // Re-enable realtime sync after a short delay
    setTimeout(() => {
      window.realtimeSyncEnabled = prevRealtimeSyncEnabled;
    }, 500);
  } catch (error) {
    console.error('❌ Error deleting payment:', error);
    showStatus('خطأ في حذف الدفعة', 'error');
    window.realtimeSyncEnabled = true; // Ensure realtime is re-enabled on error
  }
}

// === ATTENDANCE MODALS ===
// === ATTENDANCE MANAGEMENT REMOVED ===
// Note: Attendance is now managed exclusively from the teacher dashboard
// Teachers can add, edit, and delete attendance records from there
// Secretaries can only view attendance data in read-only mode

// === ADDITIONAL HELPER FUNCTIONS ===

// Load initial data for modals
async function loadStudentsList() {
  if (!window.students || window.students.length === 0) {
    clearDataCache('students');
    await loadStudents(true); // force refresh
  }
  return window.students || [];
}

async function loadCoursesList() {
  if (!window.courses || window.courses.length === 0) {
    clearDataCache('courses');
    await loadCourses(true); // force refresh
  }
  return window.courses || [];
}

// Populate all dropdowns
async function initializeAllDropdowns() {
  await loadStudentsList();
  await loadCoursesList();
  
  populateSubscriptionDropdowns();
  populatePaymentDropdowns();
  populateAttendanceDropdowns();
}

// Modal opening functions
function showAddStudentModal() {
  const modal = document.getElementById('studentModal');
  if (!modal) return;
  
  modal.style.display = 'flex';
  document.getElementById('studentModalTitle').textContent = 'إضافة طالب جديد';
  document.getElementById('studentForm').reset();
  document.getElementById('studentForm').onsubmit = addStudent;
}

function showAddCourseModal() {
  const modal = document.getElementById('courseModal');
  if (!modal) return;
  
  modal.style.display = 'flex';
  document.getElementById('courseModalTitle').textContent = 'إضافة كورس جديد';
  document.getElementById('courseForm').reset();
  document.getElementById('courseForm').onsubmit = addCourse;
}

// Ensure all event listeners are attached (only once per form)
function setupFormEventListeners() {
  const studentForm = document.getElementById('studentForm');
  if (studentForm) {
    studentForm.onsubmit = addStudent;
  }

  const courseForm = document.getElementById('courseForm');
  if (courseForm) {
    courseForm.onsubmit = addCourse;
  }

  const subscriptionForm = document.getElementById('subscriptionForm');
  if (subscriptionForm) {
    subscriptionForm.onsubmit = addSubscription;
  }

  const paymentForm = document.getElementById('paymentForm');
  if (paymentForm) {
    paymentForm.onsubmit = addPayment;
  }

  // Attendance form removed - attendance is managed from teacher dashboard
}
