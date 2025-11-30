// ============================================================================
// PAYMENTS TAB - Payment management organized by courses
// ============================================================================

async function loadPaymentsTab() {
  try {
    console.log('💰 Loading payments tab...');
    // تأكد من وجود البيانات
    console.log('📊 Data status:', {
      payments: (window.payments || []).length,
      courses: (window.courses || []).length,
      students: (window.students || []).length,
      subscriptions: (window.subscriptions || []).length
    });
    
    // استدعِ renderPaymentsByCourse مباشرة
    renderPaymentsByCourse();
  } catch (error) {
    console.error('❌ Error loading payments tab:', error);
  }
}

function renderPaymentsByCourse() {
  const container = document.getElementById('paymentsContainer');
  if (!container) return;

  console.log('📊 Rendering payments by course...', {
    coursesCount: (window.courses || []).length,
    paymentsCount: (window.payments || []).length,
    subscriptionsCount: (window.subscriptions || []).length,
    studentsCount: (window.students || []).length
  });

  if (!window.courses || window.courses.length === 0) {
    container.innerHTML = '<p class="no-data">لا توجد كورسات</p>';
    return;
  }

  // Group payments by course
  const coursePayments = {};
  (window.courses || []).forEach(course => {
    const subscribed = (window.subscriptions || []).filter(s => s.course_id === course.id && s.status === 'active');
    const payments = (window.payments || []).filter(p => p.course_id === course.id);
    
    // Calculate per-student data
    const studentsData = subscribed.map(sub => {
      const student = (window.students || []).find(s => s.id === sub.student_id);
      const studentPayments = payments.filter(p => p.student_id === sub.student_id);
      const totalPaid = studentPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
      
      return {
        ...student,
        subscriptionId: sub.id,
        totalPaid,
        payments: studentPayments,
        coursePrice: course.price || 0,
        remaining: Math.max(0, (course.price || 0) - totalPaid)
      };
    });

    // Calculate comprehensive stats
    const totalExpected = subscribed.length * (course.price || 0); // المبلغ المتوقع من جميع الطلاب
    const totalPaidAmount = payments.reduce((sum, p) => sum + (p.amount || 0), 0); // الإجمالي المدفوع
    const totalRemaining = totalExpected - totalPaidAmount; // المتبقي
    
    coursePayments[course.id] = {
      course,
      students: studentsData,
      stats: {
        totalStudents: subscribed.length,
        totalExpected: totalExpected, // الإجمالي المتوقع
        totalPaidAmount: totalPaidAmount, // الإجمالي المدفوع
        totalRemaining: Math.max(0, totalRemaining), // المتبقي الإجمالي
        paidCount: payments.filter(p => p.status === 'paid').length,
        pendingCount: payments.filter(p => p.status === 'pending').length,
        paidPayments: payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + (p.amount || 0), 0),
        pendingPayments: payments.filter(p => p.status === 'pending').reduce((sum, p) => sum + (p.amount || 0), 0),
        failedPayments: payments.filter(p => p.status === 'failed').reduce((sum, p) => sum + (p.amount || 0), 0)
      }
    };
  });

  let html = `
    <div class="payments-container">
      <div style="display: flex; gap: 10px; margin-bottom: 20px; flex-wrap: wrap;">
        <button class="btn btn-primary" onclick="showAddPaymentModal()">
          <i class="fas fa-plus"></i> إضافة دفعة
        </button>
        <button class="btn btn-success" onclick="exportAllPaymentsExcel()">
          <i class="fas fa-file-excel"></i> تحميل Excel
        </button>
        <button class="btn btn-info" onclick="printAllPayments()">
          <i class="fas fa-print"></i> طباعة
        </button>
      </div>

      <div id="coursesPaymentsWrapper">
  `;

  // Render each course
  Object.values(coursePayments).forEach((courseData, idx) => {
    const { course, students, stats } = courseData;
    const courseId = course.id;
    const collapsedClass = `paymentsCourse_${courseId}`;
    
    html += `
      <div class="course-card" style="margin-bottom: 25px; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
        <!-- Course Header -->
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; cursor: pointer;" onclick="toggleCoursePayments('${courseId}')">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
              <h3 style="margin: 0; font-size: 1.3em;">📚 ${escapeHtml(course.name)}</h3>
              <p style="margin: 8px 0 0 0; opacity: 0.9; font-size: 0.9em;">سعر الكورس: ${formatCurrency(course.price || 0)}</p>
            </div>
            <div style="text-align: right;">
              <p style="margin: 0; font-size: 0.9em; opacity: 0.9;">عدد الطلاب</p>
              <p style="margin: 5px 0 0 0; font-size: 1.8em; font-weight: 700;">${stats.totalStudents}</p>
            </div>
          </div>
        </div>

        <!-- Course Stats -->
        <div style="background: #f8f9fa; padding: 15px; display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 10px;">
          <div style="text-align: center; padding: 12px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 6px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <p style="margin: 0; font-size: 0.8em; opacity: 0.9;">💵 الإجمالي المتوقع</p>
            <p style="margin: 6px 0 0 0; font-weight: 700; font-size: 1.2em;">${formatCurrency(stats.totalExpected)}</p>
          </div>
          <div style="text-align: center; padding: 12px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; border-radius: 6px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <p style="margin: 0; font-size: 0.8em; opacity: 0.9;">✓ المدفوع</p>
            <p style="margin: 6px 0 0 0; font-weight: 700; font-size: 1.2em;">${formatCurrency(stats.totalPaidAmount)}</p>
          </div>
          <div style="text-align: center; padding: 12px; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; border-radius: 6px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <p style="margin: 0; font-size: 0.8em; opacity: 0.9;">⏳ المتبقي</p>
            <p style="margin: 6px 0 0 0; font-weight: 700; font-size: 1.2em;">${formatCurrency(stats.totalRemaining)}</p>
          </div>
          <div style="text-align: center; padding: 12px; background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); color: white; border-radius: 6px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <p style="margin: 0; font-size: 0.8em; opacity: 0.9;">📊 نسبة التحصيل</p>
            <p style="margin: 6px 0 0 0; font-weight: 700; font-size: 1.2em;">${stats.totalExpected > 0 ? ((stats.totalPaidAmount / stats.totalExpected) * 100).toFixed(1) : 0}%</p>
          </div>
        </div>

        <!-- Students Payments Table -->
        <div class="${collapsedClass}" style="overflow: hidden;">
          <table style="width: 100%; border-collapse: collapse; background: white;">
            <thead style="background: #f0f0f0; border-bottom: 2px solid #ddd;">
              <tr>
                <th style="padding: 12px; text-align: right; border-right: 1px solid #ddd;">👤 الطالب</th>
                <th style="padding: 12px; text-align: right; border-right: 1px solid #ddd;">💵 سعر الكورس</th>
                <th style="padding: 12px; text-align: right; border-right: 1px solid #ddd;">✓ المدفوع</th>
                <th style="padding: 12px; text-align: right; border-right: 1px solid #ddd;">⏳ المتبقي</th>
                <th style="padding: 12px; text-align: right; border-right: 1px solid #ddd;">📊 الحالة</th>
                <th style="padding: 12px; text-align: right;">الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              ${students.length === 0 ? `
                <tr>
                  <td colspan="6" style="padding: 20px; text-align: center; color: #999;">لا يوجد طلاب مسجلين في هذا الكورس</td>
                </tr>
              ` : students.map(student => {
                const paidStatus = student.remaining <= 0 ? 'completed' : student.totalPaid > 0 ? 'partial' : 'pending';
                const statusBg = paidStatus === 'completed' ? '#d1fae5' : paidStatus === 'partial' ? '#fef3c7' : '#fee2e2';
                const statusColor = paidStatus === 'completed' ? '#059669' : paidStatus === 'partial' ? '#d97706' : '#dc2626';
                const statusText = paidStatus === 'completed' ? '✓ مكتمل' : paidStatus === 'partial' ? '⚠️ جزئي' : '❌ لم يدفع';
                
                return `
                  <tr style="border-bottom: 1px solid #eee; hover: background: #f9f9f9;">
                    <td style="padding: 12px; border-right: 1px solid #ddd;">${escapeHtml(student.full_name || '-')}</td>
                    <td style="padding: 12px; border-right: 1px solid #ddd; font-weight: 600; color: #667eea;">${formatCurrency(student.coursePrice)}</td>
                    <td style="padding: 12px; border-right: 1px solid #ddd; font-weight: 600; color: #10b981;">${formatCurrency(student.totalPaid)}</td>
                    <td style="padding: 12px; border-right: 1px solid #ddd; font-weight: 600; color: ${student.remaining > 0 ? '#ef4444' : '#10b981'};">${formatCurrency(student.remaining)}</td>
                    <td style="padding: 12px; border-right: 1px solid #ddd;">
                      <span style="background: ${statusBg}; color: ${statusColor}; padding: 6px 12px; border-radius: 20px; font-size: 0.85em; font-weight: 600;">
                        ${statusText}
                      </span>
                    </td>
                    <td style="padding: 12px;">
                      <button class="action-btn" onclick="showStudentPaymentDetails('${student.id}', '${courseId}')" style="background: #667eea; color: white; padding: 4px 8px; border: none; border-radius: 4px; cursor: pointer; font-size: 0.8em; margin-left: 5px;">👁️</button>
                      <button class="action-btn" onclick="showAddPaymentModalForStudent('${student.id}', '${courseId}')" style="background: #10b981; color: white; padding: 4px 8px; border: none; border-radius: 4px; cursor: pointer; font-size: 0.8em; margin-left: 5px;">➕</button>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  });

  html += `
      </div>
    </div>
  `;

  container.innerHTML = html;
}

function toggleCoursePayments(courseId) {
  const elem = document.querySelector(`.paymentsCourse_${courseId}`);
  if (elem) {
    elem.style.display = elem.style.display === 'none' ? 'block' : 'none';
  }
}

function filterPayments() {
  // This function will be replaced by course-based view
  renderPaymentsByCourse();
}

// ============================================================================
// STUDENT PAYMENT DETAILS - عرض تفاصيل دفعات الطالب في كورس معين
// ============================================================================

function showStudentPaymentDetails(studentId, courseId) {
  const student = (window.students || []).find(s => s.id === studentId);
  const course = (window.courses || []).find(c => c.id === courseId);
  const payments = (window.payments || []).filter(p => p.student_id === studentId && p.course_id === courseId);
  const totalPaid = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const remaining = (course?.price || 0) - totalPaid;

  const detailsHTML = `
    <div class="payment-details-modal">
      <div class="details-header" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; margin-bottom: 20px;">
        <h2 style="margin: 0; font-size: 1.5em;">👤 ${escapeHtml(student?.full_name || '-')}</h2>
        <p style="margin: 8px 0 0 0; opacity: 0.9; font-size: 0.9em;">📚 ${escapeHtml(course?.name || '-')}</p>
      </div>

      <div style="padding: 20px;">
        <!-- ملخص الدفع -->
        <div class="details-section">
          <h3 style="color: #667eea; border-bottom: 2px solid #667eea; padding-bottom: 10px; margin-bottom: 15px;">💰 ملخص الدفع</h3>
          <div class="details-grid" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px;">
            <div style="background: #e3f2fd; padding: 15px; border-radius: 6px; text-align: center;">
              <p style="margin: 0; color: #1976d2; font-size: 0.85em;">سعر الكورس</p>
              <p style="margin: 8px 0 0 0; font-weight: 700; color: #1565c0; font-size: 1.2em;">${formatCurrency(course?.price || 0)}</p>
            </div>
            <div style="background: #e8f5e9; padding: 15px; border-radius: 6px; text-align: center;">
              <p style="margin: 0; color: #388e3c; font-size: 0.85em;">المبلغ المدفوع</p>
              <p style="margin: 8px 0 0 0; font-weight: 700; color: #2e7d32; font-size: 1.2em;">${formatCurrency(totalPaid)}</p>
            </div>
            <div style="background: ${remaining > 0 ? '#fee2e2' : '#e8f5e9'}; padding: 15px; border-radius: 6px; text-align: center;">
              <p style="margin: 0; color: ${remaining > 0 ? '#dc2626' : '#388e3c'}; font-size: 0.85em;">المتبقي</p>
              <p style="margin: 8px 0 0 0; font-weight: 700; color: ${remaining > 0 ? '#b91c1c' : '#2e7d32'}; font-size: 1.2em;">${formatCurrency(remaining)}</p>
            </div>
          </div>
        </div>

        <!-- سجل الدفعات -->
        <div class="details-section" style="margin-top: 20px;">
          <h3 style="color: #667eea; border-bottom: 2px solid #667eea; padding-bottom: 10px; margin-bottom: 15px;">📋 سجل الدفعات</h3>
          ${payments.length === 0 ? `
            <p style="color: #999; text-align: center; padding: 20px;">لا توجد دفعات مسجلة</p>
          ` : `
            <table style="width: 100%; border-collapse: collapse;">
              <thead style="background: #f0f0f0;">
                <tr>
                  <th style="padding: 10px; text-align: right; border-bottom: 1px solid #ddd;">التاريخ</th>
                  <th style="padding: 10px; text-align: right; border-bottom: 1px solid #ddd;">المبلغ</th>
                  <th style="padding: 10px; text-align: right; border-bottom: 1px solid #ddd;">الطريقة</th>
                  <th style="padding: 10px; text-align: right; border-bottom: 1px solid #ddd;">الحالة</th>
                </tr>
              </thead>
              <tbody>
                ${payments.map(p => `
                  <tr style="border-bottom: 1px solid #eee;">
                    <td style="padding: 10px; text-align: right;">${formatDate(p.payment_date)}</td>
                    <td style="padding: 10px; text-align: right; font-weight: 600; color: #10b981;">${formatCurrency(p.amount)}</td>
                    <td style="padding: 10px; text-align: right;">${getPaymentMethodLabel(p.payment_method)}</td>
                    <td style="padding: 10px; text-align: right;">
                      <span style="background: ${getPaymentStatusColor(p.status) === '#10b981' ? '#d1fae5' : '#fef3c7'}; color: ${getPaymentStatusColor(p.status) === '#10b981' ? '#059669' : '#d97706'}; padding: 4px 8px; border-radius: 4px; font-size: 0.85em; font-weight: 600;">
                        ${p.status === 'paid' ? '✓ مدفوع' : '⏳ قيد الانتظار'}
                      </span>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          `}
        </div>
      </div>

      <div style="padding: 20px; background: #f5f7fa; border-radius: 0 0 8px 8px; display: flex; gap: 10px; justify-content: flex-end;">
        <button onclick="closeStudentPaymentDetails()" class="btn btn-secondary" style="padding: 8px 16px;">إغلاق</button>
        <button onclick="showAddPaymentModalForStudent('${studentId}', '${courseId}')" class="btn btn-primary" style="padding: 8px 16px;">➕ إضافة دفعة</button>
      </div>
    </div>
  `;

  let detailsModal = document.getElementById('studentPaymentDetailsModal');
  if (!detailsModal) {
    detailsModal = document.createElement('div');
    detailsModal.id = 'studentPaymentDetailsModal';
    detailsModal.className = 'modal';
    detailsModal.style.cssText = 'display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.5);';
    document.body.appendChild(detailsModal);
  }

  detailsModal.innerHTML = `
    <div class="modal-content" style="width: 90%; max-width: 700px; max-height: 80vh; overflow-y: auto; background: white; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.2);">
      ${detailsHTML}
    </div>
  `;
  detailsModal.style.display = 'flex';

  detailsModal.onclick = (e) => {
    if (e.target === detailsModal) closeStudentPaymentDetails();
  };
}

function closeStudentPaymentDetails() {
  const modal = document.getElementById('studentPaymentDetailsModal');
  if (modal) {
    modal.style.display = 'none';
  }
}

function showAddPaymentModalForStudent(studentId, courseId) {
  closeStudentPaymentDetails();
  
  const student = (window.students || []).find(s => s.id === studentId);
  const course = (window.courses || []).find(c => c.id === courseId);
  
  showAddPaymentModal();
  
  // Safely set pre-filled values (modal or elements may be missing)
  const paymentStudentEl = document.getElementById('paymentStudent');
  const paymentCourseEl = document.getElementById('paymentCourse');
  // the form uses `paymentCoursePrice` to display course price; fall back to `totalAmount` if present
  const paymentCoursePriceEl = document.getElementById('paymentCoursePrice') || document.getElementById('totalAmount');
  const paymentDateEl = document.getElementById('paymentDate');

  if (paymentStudentEl) {
    paymentStudentEl.value = studentId;
    // update courses dropdown based on the selected student
    if (typeof updatePaymentCourses === 'function') updatePaymentCourses();
  }

  if (paymentCourseEl) {
    paymentCourseEl.value = courseId;
  }

  if (paymentCoursePriceEl) {
    paymentCoursePriceEl.value = course?.price || 0;
  }

  if (paymentDateEl) {
    paymentDateEl.valueAsDate = new Date();
  }

  // Ensure calculated fields update (already-paid, remaining, etc.)
  if (typeof updatePaymentAmount === 'function') updatePaymentAmount();
}

function exportAllPaymentsExcel() {
  try {
    const data = (window.payments || []).map((p, idx) => {
      const student = (window.students || []).find(s => s.id === p.student_id);
      const course = (window.courses || []).find(c => c.id === p.course_id);
      return {
        '#': idx + 1,
        'اسم الطالب': student?.full_name || '-',
        'اسم الكورس': course?.name || '-',
        'المبلغ': formatCurrency(p.amount || 0),
        'طريقة الدفع': getPaymentMethodLabel(p.payment_method),
        'تاريخ الدفع': formatDate(p.payment_date),
        'الحالة': p.status === 'paid' ? '✓ مدفوع' : '⏳ قيد الانتظار'
      };
    });

    const ws = XLSX.utils.json_to_sheet(data);
    ws.A1.s = { font: { bold: true }, fill: { fgColor: { rgb: "FFD700" } } };
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'الدفعات');
    XLSX.writeFile(wb, `الدفعات_${new Date().toLocaleDateString('ar-EG')}.xlsx`);
    
    showStatus('✅ تم تصدير البيانات بنجاح', 'success');
  } catch (error) {
    console.error('❌ Error exporting payments:', error);
    showStatus('خطأ في التصدير', 'error');
  }
}

function printAllPayments() {
  try {
    const printContent = document.querySelector('#coursesPaymentsWrapper');
    
    if (!printContent) {
      showStatus('لا توجد بيانات للطباعة', 'error');
      return;
    }

    const printWindow = window.open('', '', 'height=600,width=1000');
    printWindow.document.write(`
      <html>
        <head>
          <title>تقرير الدفعات</title>
          <meta charset="UTF-8">
          <style>
            body { 
              font-family: 'Arial', sans-serif; 
              direction: rtl; 
              padding: 20px;
              background: #f5f5f5;
            }
            .header {
              text-align: center;
              margin-bottom: 20px;
              border-bottom: 3px solid #333;
              padding-bottom: 10px;
            }
            .header h2 {
              margin: 0;
              color: #333;
            }
            .header p {
              margin: 5px 0 0 0;
              color: #666;
              font-size: 0.9em;
            }
            table { 
              border-collapse: collapse; 
              width: 100%; 
              margin-top: 20px;
              background: white;
            }
            th, td { 
              border: 1px solid #ddd; 
              padding: 12px; 
              text-align: right; 
            }
            th { 
              background-color: #667eea; 
              color: white;
              font-weight: bold;
            }
            tr:nth-child(even) {
              background-color: #f9f9f9;
            }
            tr:hover {
              background-color: #f0f0f0;
            }
            .footer {
              margin-top: 20px;
              text-align: center;
              color: #666;
              font-size: 0.85em;
            }
            .course-header {
              background: #667eea;
              color: white;
              padding: 10px;
              font-weight: bold;
              margin-top: 15px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>تقرير الدفعات</h2>
            <p>تاريخ الطباعة: ${new Date().toLocaleDateString('ar-EG')}</p>
          </div>
          ${printContent.innerHTML}
          <div class="footer">
            <p>تم إنشاء هذا التقرير من نظام إدارة الأكاديمية</p>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  } catch (error) {
    console.error('❌ Error printing payments:', error);
    showStatus('خطأ في الطباعة', 'error');
  }
}

function getPaymentStatusColor(status) {
  const colors = {
    'paid': '#10b981',
    'pending': '#f59e0b',
    'failed': '#ef4444'
  };
  return colors[status] || '#6b7280';
}

function getPaymentMethodLabel(method) {
  const labels = {
    'cash': 'نقداً',
    'card': 'بطاقة',
    'transfer': 'تحويل',
    'online': 'أونلاين',
    'bank_transfer': 'تحويل بنكي'
  };
  return labels[method] || method;
}


// ====================================================================
// SHOW PAYMENT RECEIPT AFTER SAVE - عرض فاتورة بعد الحفظ
// ====================================================================
function showPaymentReceiptAfterSave(paymentData) {
  try {
    const student = (window.students || []).find(s => s.id === paymentData.student_id);
    const course = (window.courses || []).find(c => c.id === paymentData.course_id);
    
    if (!student || !course) {
      console.error('❌ Student or course not found');
      return;
    }

    const modal = document.getElementById('paymentReceiptModal');
    if (!modal) {
      console.error('❌ Payment receipt modal not found');
      return;
    }

    const receiptContent = document.getElementById('paymentReceiptContent');
    if (!receiptContent) return;

    // حساب المتبقي
    const allPayments = (window.payments || []).filter(p => 
      p.student_id === paymentData.student_id && 
      p.course_id === paymentData.course_id &&
      p.status === 'paid'
    );
    const totalPaid = allPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const remaining = Math.max(0, (course.price || 0) - totalPaid);

    receiptContent.innerHTML = `
      <div style="text-align: center; padding: 30px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 8px 8px 0 0;">
        <h2 style="margin: 0; font-size: 2em;">🧾 إيصال دفع</h2>
        <p style="margin: 10px 0 0 0; opacity: 0.9;">رقم الإيصال: ${paymentData.id.substring(0, 8).toUpperCase()}</p>
      </div>

      <div style="padding: 30px; background: white;">
        <!-- معلومات الطالب -->
        <div style="background: #f0f7ff; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-right: 4px solid #2196f3;">
          <h3 style="margin: 0 0 15px 0; color: #2196f3; font-size: 1.2em;">👤 بيانات الطالب</h3>
          <div style="display: grid; gap: 10px;">
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #666;">الاسم:</span>
              <strong style="color: #333;">${escapeHtml(student.full_name)}</strong>
            </div>
            ${student.phone ? `
              <div style="display: flex; justify-content: space-between;">
                <span style="color: #666;">الهاتف:</span>
                <strong style="color: #333;">${escapeHtml(student.phone)}</strong>
              </div>
            ` : ''}
            ${student.email ? `
              <div style="display: flex; justify-content: space-between;">
                <span style="color: #666;">البريد:</span>
                <strong style="color: #333;">${escapeHtml(student.email)}</strong>
              </div>
            ` : ''}
          </div>
        </div>

        <!-- معلومات الكورس -->
        <div style="background: #f3e5f5; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-right: 4px solid #9c27b0;">
          <h3 style="margin: 0 0 15px 0; color: #9c27b0; font-size: 1.2em;">📚 بيانات الكورس</h3>
          <div style="display: grid; gap: 10px;">
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #666;">اسم الكورس:</span>
              <strong style="color: #333;">${escapeHtml(course.name)}</strong>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #666;">سعر الكورس:</span>
              <strong style="color: #9c27b0; font-size: 1.1em;">${formatCurrency(course.price || 0)}</strong>
            </div>
          </div>
        </div>

        <!-- تفاصيل الدفعة -->
        <div style="background: #e8f5e9; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-right: 4px solid #4caf50;">
          <h3 style="margin: 0 0 15px 0; color: #4caf50; font-size: 1.2em;">💰 تفاصيل الدفعة</h3>
          <div style="display: grid; gap: 10px;">
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #666;">المبلغ المدفوع:</span>
              <strong style="color: #4caf50; font-size: 1.3em;">${formatCurrency(paymentData.amount)}</strong>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #666;">طريقة الدفع:</span>
              <strong style="color: #333;">${getPaymentMethodLabel(paymentData.payment_method)}</strong>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #666;">تاريخ الدفع:</span>
              <strong style="color: #333;">${formatDate(paymentData.payment_date)}</strong>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #666;">الحالة:</span>
              <span style="background: ${paymentData.status === 'paid' ? '#d1fae5' : '#fef3c7'}; color: ${paymentData.status === 'paid' ? '#059669' : '#d97706'}; padding: 4px 12px; border-radius: 20px; font-weight: 600; font-size: 0.9em;">
                ${paymentData.status === 'paid' ? '✓ مدفوع' : '⏳ معلق'}
              </span>
            </div>
          </div>
        </div>

        <!-- ملخص مالي -->
        <div style="background: linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%); padding: 20px; border-radius: 8px; border-right: 4px solid #ff9800;">
          <h3 style="margin: 0 0 15px 0; color: #ff9800; font-size: 1.2em;">📊 الملخص المالي</h3>
          <div style="display: grid; gap: 10px;">
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #666;">إجمالي المدفوع حتى الآن:</span>
              <strong style="color: #4caf50; font-size: 1.1em;">${formatCurrency(totalPaid)}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; padding-top: 10px; border-top: 2px dashed #ff9800;">
              <span style="color: #666; font-weight: 600;">المتبقي:</span>
              <strong style="color: ${remaining > 0 ? '#ef4444' : '#4caf50'}; font-size: 1.3em;">
                ${formatCurrency(remaining)}
              </strong>
            </div>
            ${remaining <= 0 ? `
              <div style="text-align: center; margin-top: 10px; padding: 10px; background: #d1fae5; border-radius: 6px;">
                <span style="color: #059669; font-weight: 700; font-size: 1.1em;">
                  ✅ تم سداد كامل المبلغ - بارك الله فيكم
                </span>
              </div>
            ` : ''}
          </div>
        </div>

        <!-- ملاحظات إضافية -->
        <div style="margin-top: 20px; padding: 15px; background: #f9f9f9; border-radius: 8px; text-align: center;">
          <p style="margin: 0; color: #666; font-size: 0.9em;">
            نشكركم على ثقتكم بنا 🌟
          </p>
          <p style="margin: 5px 0 0 0; color: #999; font-size: 0.85em;">
            تاريخ الإصدار: ${new Date().toLocaleString('ar-EG', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </p>
        </div>
      </div>
    `;

    modal.style.display = 'flex';
    
    // تخزين ID الدفعة الحالية للطباعة
    window.currentReceiptPaymentId = paymentData.id;
    
  } catch (error) {
    console.error('❌ Error showing payment receipt:', error);
  }
}

// ====================================================================
// PRINT PAYMENT RECEIPT - طباعة فاتورة الدفع
// ====================================================================
function printPaymentReceipt(paymentId = null) {
  try {
    // استخدام الـ ID المخزن أو المُمرر
    const targetPaymentId = paymentId || window.currentReceiptPaymentId;
    
    if (!targetPaymentId) {
      showStatus('خطأ: لم يتم العثور على الدفعة', 'error');
      return;
    }

    const payment = (window.payments || []).find(p => p.id === targetPaymentId);
    if (!payment) {
      showStatus('خطأ: لم يتم العثور على بيانات الدفعة', 'error');
      return;
    }

    const student = (window.students || []).find(s => s.id === payment.student_id);
    const course = (window.courses || []).find(c => c.id === payment.course_id);

    if (!student || !course) {
      showStatus('خطأ: بيانات غير مكتملة', 'error');
      return;
    }

    // حساب المتبقي
    const allPayments = (window.payments || []).filter(p => 
      p.student_id === payment.student_id && 
      p.course_id === payment.course_id &&
      p.status === 'paid'
    );
    const totalPaid = allPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const remaining = Math.max(0, (course.price || 0) - totalPaid);

    // إنشاء نافذة الطباعة
    const printWindow = window.open('', '', 'height=700,width=600');
    
    printWindow.document.write(`
      <html dir="rtl">
        <head>
          <title>إيصال دفع - ${student.full_name}</title>
          <meta charset="UTF-8">
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            
            body {
              font-family: 'Tajawal', 'Arial', sans-serif;
              direction: rtl;
              padding: 20px;
              background: white;
            }
            
            .receipt {
              max-width: 600px;
              margin: 0 auto;
              border: 2px solid #667eea;
              border-radius: 12px;
              overflow: hidden;
            }
            
            .header {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 30px;
              text-align: center;
            }
            
            .header h1 {
              margin: 0;
              font-size: 2em;
            }
            
            .header p {
              margin: 10px 0 0 0;
              opacity: 0.9;
            }
            
            .content {
              padding: 30px;
            }
            
            .section {
              margin-bottom: 25px;
              padding: 20px;
              border-radius: 8px;
            }
            
            .section h3 {
              margin: 0 0 15px 0;
              font-size: 1.2em;
            }
            
            .info-row {
              display: flex;
              justify-content: space-between;
              padding: 8px 0;
              border-bottom: 1px dashed #ddd;
            }
            
            .info-row:last-child {
              border-bottom: none;
            }
            
            .label {
              color: #666;
            }
            
            .value {
              font-weight: bold;
              color: #333;
            }
            
            .highlight {
              font-size: 1.3em;
              color: #4caf50;
            }
            
            .remaining {
              font-size: 1.3em;
              color: #ef4444;
            }
            
            .completed {
              color: #4caf50 !important;
            }
            
            .footer {
              text-align: center;
              padding: 20px;
              background: #f9f9f9;
              color: #666;
              font-size: 0.9em;
            }
            
            @media print {
              body {
                padding: 0;
              }
              .receipt {
                border: none;
              }
            }
          </style>
        </head>
        <body>
          <div class="receipt">
            <div class="header">
              <h1>🧾 إيصال دفع</h1>
              <p>رقم الإيصال: ${payment.id.substring(0, 8).toUpperCase()}</p>
            </div>
            
            <div class="content">
              <!-- بيانات الطالب -->
              <div class="section" style="background: #f0f7ff; border-right: 4px solid #2196f3;">
                <h3 style="color: #2196f3;">👤 بيانات الطالب</h3>
                <div class="info-row">
                  <span class="label">الاسم:</span>
                  <span class="value">${escapeHtml(student.full_name)}</span>
                </div>
                ${student.phone ? `
                  <div class="info-row">
                    <span class="label">الهاتف:</span>
                    <span class="value">${escapeHtml(student.phone)}</span>
                  </div>
                ` : ''}
              </div>
              
              <!-- بيانات الكورس -->
              <div class="section" style="background: #f3e5f5; border-right: 4px solid #9c27b0;">
                <h3 style="color: #9c27b0;">📚 بيانات الكورس</h3>
                <div class="info-row">
                  <span class="label">اسم الكورس:</span>
                  <span class="value">${escapeHtml(course.name)}</span>
                </div>
                <div class="info-row">
                  <span class="label">سعر الكورس:</span>
                  <span class="value" style="color: #9c27b0;">${formatCurrency(course.price || 0)}</span>
                </div>
              </div>
              
              <!-- تفاصيل الدفعة -->
              <div class="section" style="background: #e8f5e9; border-right: 4px solid #4caf50;">
                <h3 style="color: #4caf50;">💰 تفاصيل الدفعة</h3>
                <div class="info-row">
                  <span class="label">المبلغ المدفوع:</span>
                  <span class="value highlight">${formatCurrency(payment.amount)}</span>
                </div>
                <div class="info-row">
                  <span class="label">طريقة الدفع:</span>
                  <span class="value">${getPaymentMethodLabel(payment.payment_method)}</span>
                </div>
                <div class="info-row">
                  <span class="label">تاريخ الدفع:</span>
                  <span class="value">${formatDate(payment.payment_date)}</span>
                </div>
              </div>
              
              <!-- الملخص المالي -->
              <div class="section" style="background: #fff3e0; border-right: 4px solid #ff9800;">
                <h3 style="color: #ff9800;">📊 الملخص المالي</h3>
                <div class="info-row">
                  <span class="label">إجمالي المدفوع:</span>
                  <span class="value" style="color: #4caf50;">${formatCurrency(totalPaid)}</span>
                </div>
                <div class="info-row">
                  <span class="label">المتبقي:</span>
                  <span class="value ${remaining <= 0 ? 'completed' : 'remaining'}">
                    ${formatCurrency(remaining)}
                  </span>
                </div>
                ${remaining <= 0 ? `
                  <div style="text-align: center; margin-top: 15px; padding: 10px; background: #d1fae5; border-radius: 6px;">
                    <strong style="color: #059669;">✅ تم سداد كامل المبلغ</strong>
                  </div>
                ` : ''}
              </div>
            </div>
            
            <div class="footer">
              <p>نشكركم على ثقتكم بنا 🌟</p>
              <p style="margin-top: 10px;">
                تاريخ الإصدار: ${new Date().toLocaleString('ar-EG', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
          </div>
        </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
    
    setTimeout(() => {
      printWindow.print();
    }, 250);
    
  } catch (error) {
    console.error('❌ Error printing receipt:', error);
    showStatus('خطأ في طباعة الفاتورة', 'error');
  }
}