// ============================================================================
// STUDENTS TAB - All student management functions
// ============================================================================

async function loadStudentsTab() {
  try {
    console.log('📚 Loading students tab...');
    await loadStudents();
  } catch (error) {
    console.error('❌ Error loading students tab:', error);
  }
}

function filterStudents() {
  const searchTerm = document.getElementById('studentSearch')?.value || '';
  const container = document.getElementById('studentsContainer');
  if (!container) return;

  const filtered = (window.students || []).filter(student =>
    student.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.phone?.includes(searchTerm)
  );

  renderStudentsTable(filtered, container);
}

function exportStudentsExcel() {
  try {
    const data = (window.students || []).map(s => ({
      'الاسم الكامل': s.full_name,
      'البريد الإلكتروني': s.email || '-',
      'الهاتف': s.phone || '-',
      'عدد الاشتراكات': (window.subscriptions || []).filter(sub => sub.student_id === s.id).length,
      'إجمالي الدفعات': (window.payments || []).filter(p => p.student_id === s.id)
        .reduce((sum, p) => sum + (p.amount || 0), 0)
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'الطلاب');
    XLSX.writeFile(wb, 'الطلاب.xlsx');
    
    showStatus('✅ تم تصدير البيانات بنجاح', 'success');
  } catch (error) {
    console.error('❌ Error exporting students:', error);
    showStatus('خطأ في التصدير', 'error');
  }
}

function printStudents() {
  const printWindow = window.open('', '', 'height=600,width=800');
  const table = document.querySelector('#studentsContainer table');
  
  if (!table) {
    showStatus('لا توجد بيانات للطباعة', 'error');
    return;
  }

  printWindow.document.write('<html><head><title>الطلاب</title>');
  printWindow.document.write('<meta charset="UTF-8">');
  printWindow.document.write('<style>body { font-family: Arial, sans-serif; direction: rtl; } table { border-collapse: collapse; width: 100%; } th, td { border: 1px solid #ddd; padding: 8px; text-align: right; } th { background-color: #f2f2f2; }</style>');
  printWindow.document.write('</head><body>');
  printWindow.document.write(table.outerHTML);
  printWindow.document.write('</body></html>');
  printWindow.document.close();
  printWindow.print();
}

// ============================================================================
// STUDENT DETAILS - عرض التفاصيل الكاملة للطالب
// ============================================================================

async function showStudentDetails(studentId) {
  try {
    const student = (window.students || []).find(s => s.id === studentId);
    if (!student) {
      showStatus('لم يتم العثور على الطالب', 'error');
      return;
    }

    const subscriptions = (window.subscriptions || []).filter(s => s.student_id === studentId);
    const payments = (window.payments || []).filter(p => p.student_id === studentId);
    const attendance = (window.attendances || []).filter(a => a.student_id === studentId);
    
    // جلب الاختبارات والدرجات للطالب
    let examScores = [];
    try {
      const { data: scoresData, error: scoresError } = await window.supabaseClient
        .from('exam_scores')
        .select('*, exams(title, max_score, pass_score, date, course_id)')
        .eq('student_id', studentId)
        .eq('academy_id', window.currentAcademyId)
        .order('exam_date', { ascending: false });
      
      if (!scoresError && scoresData && scoresData.length > 0) {
        // جلب بيانات الكورسات
        const courseIds = [...new Set(scoresData.map(s => s.exams?.course_id).filter(Boolean))];
        const { data: coursesData } = courseIds.length > 0 
          ? await window.supabaseClient
              .from('courses')
              .select('id, name')
              .in('id', courseIds)
          : { data: [] };
        
        const coursesMap = new Map((coursesData || []).map(c => [c.id, c.name]));
        
        // معالجة البيانات
        for (const score of scoresData) {
          if (score.exams) {
            const exam = score.exams;
            const courseName = coursesMap.get(exam.course_id) || '-';
            const scoreValue = parseFloat(score.score) || 0;
            const maxScore = parseFloat(exam.max_score) || 100;
            const passScore = parseFloat(exam.pass_score) || 50;
            
            examScores.push({
              exam_title: exam.title || '-',
              course_name: courseName,
              score: scoreValue,
              max_score: maxScore,
              pass_score: passScore,
              exam_date: score.exam_date || exam.date,
              percentage: maxScore > 0 ? ((scoreValue / maxScore) * 100).toFixed(1) : 0,
              passed: scoreValue >= passScore
            });
          }
        }
      }
    } catch (error) {
      console.error('Error loading exam scores:', error);
    }

    // حساب التفاصيل المالية
    let totalCost = 0;
    let subscribedCourses = [];
    
    subscriptions.forEach(sub => {
      const course = (window.courses || []).find(c => c.id === sub.course_id);
      if (course) {
        totalCost += course.price || 0;
        subscribedCourses.push({
          name: course.name,
          price: course.price,
          startDate: sub.start_date,
          endDate: sub.end_date
        });
      }
    });

    const totalPaid = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const remaining = totalCost - totalPaid;

    // عرض المعلومات في modal
    const detailsHTML = `
      <div class="student-details-modal">
        <div class="details-header" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; margin-bottom: 20px;">
          <h2 style="margin: 0; font-size: 1.5em;">${escapeHtml(student.full_name)}</h2>
          <p style="margin: 5px 0 0 0; opacity: 0.9;">تفاصيل شاملة</p>
        </div>

        <div style="padding: 20px;">
          <!-- المعلومات الأساسية -->
          <div class="details-section">
            <h3 style="color: #667eea; border-bottom: 2px solid #667eea; padding-bottom: 10px;">📋 المعلومات الأساسية</h3>
            <div class="details-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 15px;">
              <div>
                <label style="color: #666; font-size: 0.9em;">البريد الإلكتروني:</label>
                <p style="margin: 5px 0; font-weight: 500;">${escapeHtml(student.email || '-')}</p>
              </div>
              <div>
                <label style="color: #666; font-size: 0.9em;">رقم الهاتف:</label>
                <p style="margin: 5px 0; font-weight: 500;">${escapeHtml(student.phone || '-')}</p>
              </div>
              <div>
                <label style="color: #666; font-size: 0.9em;">تاريخ الميلاد:</label>
                <p style="margin: 5px 0; font-weight: 500;">${formatDate(student.birthdate || '')}</p>
              </div>
              <div>
                <label style="color: #666; font-size: 0.9em;">العنوان:</label>
                <p style="margin: 5px 0; font-weight: 500;">${escapeHtml(student.address || '-')}</p>
              </div>
              <div>
                <label style="color: #666; font-size: 0.9em;">اسم ولي الأمر:</label>
                <p style="margin: 5px 0; font-weight: 500;">${escapeHtml(student.guardian_name || '-')}</p>
              </div>
              <div>
                <label style="color: #666; font-size: 0.9em;">هاتف ولي الأمر:</label>
                <p style="margin: 5px 0; font-weight: 500;">${escapeHtml(student.guardian_phone || '-')}</p>
              </div>
            </div>
            ${student.notes ? `
              <div style="margin-top: 15px;">
                <label style="color: #666; font-size: 0.9em;">ملاحظات:</label>
                <p style="margin: 5px 0; font-weight: 500; background: #f5f7fa; padding: 10px; border-radius: 6px;">${escapeHtml(student.notes)}</p>
              </div>
            ` : ''}
          </div>

          <!-- الكورسات المشترك فيها -->
          <div class="details-section" style="margin-top: 20px;">
            <h3 style="color: #667eea; border-bottom: 2px solid #667eea; padding-bottom: 10px;">📚 الكورسات المشترك فيها (${subscribedCourses.length})</h3>
            ${subscribedCourses.length > 0 ? `
              <div style="margin-top: 15px;">
                ${subscribedCourses.map((course, idx) => `
                  <div style="background: #f5f7fa; padding: 12px; margin-bottom: 10px; border-radius: 6px; border-right: 4px solid #667eea;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                      <div>
                        <p style="margin: 0; font-weight: 600; color: #333;">${idx + 1}. ${escapeHtml(course.name)}</p>
                        <p style="margin: 5px 0 0 0; font-size: 0.85em; color: #666;">
                          من: ${formatDate(course.startDate)} إلى: ${formatDate(course.endDate)}
                        </p>
                      </div>
                      <span style="background: #667eea; color: white; padding: 5px 12px; border-radius: 20px; font-weight: 600;">${formatCurrency(course.price)}</span>
                    </div>
                  </div>
                `).join('')}
              </div>
            ` : '<p style="margin-top: 10px; color: #999;">لا توجد اشتراكات</p>'}
          </div>

          <!-- الحالة المالية -->
          <div class="details-section" style="margin-top: 20px;">
            <h3 style="color: #667eea; border-bottom: 2px solid #667eea; padding-bottom: 10px;">💰 الحالة المالية</h3>
            <div class="financial-summary" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-top: 15px;">
              <div style="background: #e3f2fd; padding: 15px; border-radius: 6px; text-align: center;">
                <p style="margin: 0; color: #1976d2; font-size: 0.9em;">إجمالي المستحق</p>
                <p style="margin: 8px 0 0 0; font-size: 1.5em; font-weight: 700; color: #1565c0;">${formatCurrency(totalCost)}</p>
              </div>
              <div style="background: #e8f5e9; padding: 15px; border-radius: 6px; text-align: center;">
                <p style="margin: 0; color: #388e3c; font-size: 0.9em;">المدفوع</p>
                <p style="margin: 8px 0 0 0; font-size: 1.5em; font-weight: 700; color: #2e7d32;">${formatCurrency(totalPaid)}</p>
              </div>
              <div style="background: ${remaining > 0 ? '#fff3e0' : '#e8f5e9'}; padding: 15px; border-radius: 6px; text-align: center;">
                <p style="margin: 0; color: ${remaining > 0 ? '#f57c00' : '#388e3c'}; font-size: 0.9em;">المتبقي</p>
                <p style="margin: 8px 0 0 0; font-size: 1.5em; font-weight: 700; color: ${remaining > 0 ? '#e65100' : '#2e7d32'};">${formatCurrency(Math.max(0, remaining))}</p>
              </div>
            </div>
          </div>

          <!-- سجل الدفعات -->
          <div class="details-section" style="margin-top: 20px;">
            <h3 style="color: #667eea; border-bottom: 2px solid #667eea; padding-bottom: 10px;">📊 سجل الدفعات (${payments.length})</h3>
            ${payments.length > 0 ? `
              <div style="margin-top: 15px; max-height: 250px; overflow-y: auto;">
                ${payments.map((payment, idx) => `
                  <div style="background: #f5f7fa; padding: 12px; margin-bottom: 8px; border-radius: 6px; display: flex; justify-content: space-between; align-items: center;">
                    <div>
                      <p style="margin: 0; font-weight: 600; color: #333;">الدفعة #${idx + 1}</p>
                      <p style="margin: 3px 0 0 0; font-size: 0.85em; color: #666;">
                        ${formatDate(payment.payment_date)} - ${payment.method || 'غير محدد'}
                      </p>
                    </div>
                    <span style="background: #4caf50; color: white; padding: 5px 12px; border-radius: 20px; font-weight: 600;">${formatCurrency(payment.amount)}</span>
                  </div>
                `).join('')}
              </div>
            ` : '<p style="margin-top: 10px; color: #999;">لا توجد دفعات</p>'}
          </div>

          <!-- حضور وغياب -->
          <div class="details-section" style="margin-top: 20px;">
            <h3 style="color: #667eea; border-bottom: 2px solid #667eea; padding-bottom: 10px;">📅 ملخص الحضور (${attendance.length})</h3>
            ${attendance.length > 0 ? `
              <div style="margin-top: 15px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;">
                <div style="background: #e8f5e9; padding: 12px; border-radius: 6px; text-align: center;">
                  <p style="margin: 0; color: #388e3c; font-size: 0.9em;">حاضر</p>
                  <p style="margin: 8px 0 0 0; font-size: 1.3em; font-weight: 700; color: #2e7d32;">
                    ${attendance.filter(a => a.status === 'present').length}
                  </p>
                </div>
                <div style="background: #fff3e0; padding: 12px; border-radius: 6px; text-align: center;">
                  <p style="margin: 0; color: #f57c00; font-size: 0.9em;">غائب</p>
                  <p style="margin: 8px 0 0 0; font-size: 1.3em; font-weight: 700; color: #e65100;">
                    ${attendance.filter(a => a.status === 'absent').length}
                  </p>
                </div>
                <div style="background: #f3e5f5; padding: 12px; border-radius: 6px; text-align: center;">
                  <p style="margin: 0; color: #7b1fa2; font-size: 0.9em;">متأخر</p>
                  <p style="margin: 8px 0 0 0; font-size: 1.3em; font-weight: 700; color: #6a1b9a;">
                    ${attendance.filter(a => a.status === 'late').length}
                  </p>
                </div>
              </div>
            ` : '<p style="margin-top: 10px; color: #999;">لا توجد سجلات حضور</p>'}
          </div>

          <!-- الاختبارات والدرجات -->
          <div class="details-section" style="margin-top: 20px;">
            <h3 style="color: #667eea; border-bottom: 2px solid #667eea; padding-bottom: 10px;">📝 الاختبارات والدرجات (${examScores.length})</h3>
            ${examScores.length > 0 ? `
              <div style="margin-top: 15px; max-height: 300px; overflow-y: auto;">
                ${examScores.map((exam, idx) => `
                  <div style="background: ${exam.passed ? '#e8f5e9' : '#ffebee'}; padding: 15px; margin-bottom: 12px; border-radius: 8px; border-right: 4px solid ${exam.passed ? '#4caf50' : '#f44336'};">
                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 10px;">
                      <div style="flex: 1;">
                        <p style="margin: 0; font-weight: 600; color: #333; font-size: 1.05em;">${escapeHtml(exam.exam_title)}</p>
                        <p style="margin: 5px 0 0 0; font-size: 0.9em; color: #666;">📚 ${escapeHtml(exam.course_name)}</p>
                        <p style="margin: 5px 0 0 0; font-size: 0.85em; color: #999;">📅 ${formatDate(exam.exam_date)}</p>
                      </div>
                      <div style="text-align: left; margin-left: 15px;">
                        <span style="background: ${exam.passed ? '#4caf50' : '#f44336'}; color: white; padding: 6px 12px; border-radius: 20px; font-size: 0.85em; font-weight: 600;">
                          ${exam.passed ? '✓ ناجح' : '✗ راسب'}
                        </span>
                      </div>
                    </div>
                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 10px;">
                      <div style="background: white; padding: 10px; border-radius: 6px; text-align: center;">
                        <p style="margin: 0; font-size: 0.8em; color: #666;">الدرجة</p>
                        <p style="margin: 5px 0 0 0; font-size: 1.2em; font-weight: 700; color: #667eea;">${exam.score} / ${exam.max_score}</p>
                      </div>
                      <div style="background: white; padding: 10px; border-radius: 6px; text-align: center;">
                        <p style="margin: 0; font-size: 0.8em; color: #666;">النسبة</p>
                        <p style="margin: 5px 0 0 0; font-size: 1.2em; font-weight: 700; color: #667eea;">${exam.percentage}%</p>
                      </div>
                      <div style="background: white; padding: 10px; border-radius: 6px; text-align: center;">
                        <p style="margin: 0; font-size: 0.8em; color: #666;">درجة النجاح</p>
                        <p style="margin: 5px 0 0 0; font-size: 1.2em; font-weight: 700; color: #667eea;">${exam.pass_score}</p>
                      </div>
                    </div>
                  </div>
                `).join('')}
              </div>
            ` : '<p style="margin-top: 10px; color: #999;">لا توجد اختبارات مسجلة</p>'}
          </div>
        </div>

        <div style="padding: 20px; background: #f5f7fa; border-radius: 0 0 8px 8px; display: flex; gap: 10px; justify-content: flex-end;">
          <button onclick="closeStudentDetails()" class="btn btn-secondary" style="padding: 8px 16px;">إغلاق</button>
          <button onclick="showStudentQR('${student.id}')" class="btn" style="background: #9c27b0; color: white; padding: 8px 16px; border: none; border-radius: 6px; cursor: pointer;">📱 QR Code</button>
          <button onclick="editStudent('${student.id}')" class="btn btn-primary" style="padding: 8px 16px;">تعديل البيانات</button>
        </div>
      </div>
    `;

    // إنشاء modal خاص بالتفاصيل
    let detailsModal = document.getElementById('studentDetailsModal');
    if (!detailsModal) {
      detailsModal = document.createElement('div');
      detailsModal.id = 'studentDetailsModal';
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

    // إغلاق عند الضغط خارج الـ modal
    detailsModal.onclick = (e) => {
      if (e.target === detailsModal) closeStudentDetails();
    };

  } catch (error) {
    console.error('❌ Error showing student details:', error);
    showStatus('خطأ في عرض التفاصيل', 'error');
  }
}

function closeStudentDetails() {
  const modal = document.getElementById('studentDetailsModal');
  if (modal) {
    modal.style.display = 'none';
  }
}

// ============================================================================
// SEND STUDENT REPORT - إرسال التقرير للطالب عبر الواتساب
// ============================================================================

let reportData = { studentId: null, message: '', phone: '' };

async function sendStudentReport(studentId) {
  try {
    const student = (window.students || []).find(s => s.id === studentId);
    if (!student) {
      showStatus('لم يتم العثور على الطالب', 'error');
      return;
    }

    // Get student subscriptions and payments
    const subscriptions = (window.subscriptions || []).filter(s => s.student_id === student.id);
    const payments = (window.payments || []).filter(p => p.student_id === student.id);
    const totalPaid = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
    
    // Calculate total subscription cost
    let totalCost = 0;
    let coursesList = '';
    subscriptions.forEach(sub => {
      const course = (window.courses || []).find(c => c.id === sub.course_id);
      if (course) {
        totalCost += course.price || 0;
        coursesList += `\n• ${course.name} - ${course.price} ج.م`;
      }
    });

    const remaining = totalCost - totalPaid;

    // Build WhatsApp message
    let message = `📚 *تقرير الطالب* 📚\n\n`;
    message += `👤 *الاسم:* ${escapeHtml(student.full_name)}\n`;
    message += `📧 *البريد:* ${student.email || '-'}\n`;
    message += `📱 *الهاتف:* ${student.phone || '-'}\n`;
    if (student.guardian_name) {
      message += ` *ولي الأمر:* ${escapeHtml(student.guardian_name)}\n`;
    }
    if (student.guardian_phone) {
      message += `☎️ *هاتف ولي الأمر:* ${student.guardian_phone}\n`;
    }
    message += `\n📖 *الكورسات المشترك فيها:*${coursesList || ' لا توجد'}\n`;
    message += `\n💰 *الإحصائيات المالية:*\n`;
    message += `• إجمالي التكلفة: ${totalCost} ج.م\n`;
    message += `• المبلغ المدفوع: ${totalPaid} ج.م\n`;
    message += `• المبلغ المتبقي: ${Math.max(0, remaining)} ج.م\n`;
    message += `\n🎓 عدد الاشتراكات: ${subscriptions.length}\n`;
    message += `📊 عدد الدفعات: ${payments.length}\n`;
    message += `\n---\n`;
    message += `تم إرسال هذا التقرير من نظام إدارة الأكاديمية`;

    // Store data for sending
    reportData = {
      studentId: student.id,
      message: message,
      phone: student.guardian_phone || student.phone
    };

    // Show modal with message
    const modal = document.getElementById('reportModal');
    if (modal) {
      document.getElementById('reportModalTitle').textContent = `إرسال التقرير - ${student.full_name}`;
      document.getElementById('reportMessage').value = message;
      modal.style.display = 'flex';
    }
  } catch (error) {
    console.error('❌ Error preparing student report:', error);
    showStatus('خطأ في تحضير التقرير', 'error');
  }
}

function confirmSendReport() {
  try {
    if (!reportData.phone) {
      showStatus('لا يوجد رقم هاتف للإرسال', 'error');
      return;
    }

    const message = document.getElementById('reportMessage')?.value || reportData.message;
    const phone = reportData.phone.replace(/\D/g, ''); // Remove non-digits
    
    if (!phone) {
      showStatus('رقم هاتف غير صحيح', 'error');
      return;
    }

    const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
    
    showStatus('✅ تم فتح الواتساب - الرسالة جاهزة للإرسال', 'success');
    closeModal('reportModal');
  } catch (error) {
    console.error('❌ Error confirming report send:', error);
    showStatus('خطأ في إرسال التقرير', 'error');
  }
}

// ============================================================================
// STUDENT QR CODE - إنشاء وعرض QR code للطالب
// ============================================================================

async function showStudentQR(studentId) {
  try {
    const student = (window.students || []).find(s => s.id === studentId);
    if (!student) {
      showStatus('لم يتم العثور على الطالب', 'error');
      return;
    }

    // إنشاء بيانات QR code (JSON يحتوي على student_id)
    const qrData = JSON.stringify({ student_id: student.id });
    
    // عرض Modal
    const modal = document.getElementById('studentQrModal');
    if (!modal) {
      showStatus('Modal QR غير موجود', 'error');
      return;
    }

    document.getElementById('qrModalTitle').textContent = `كود QR للطالب - ${student.full_name}`;
    document.getElementById('qrStudentName').textContent = student.full_name;
    
    // مسح الـ canvas السابق
    const qrCanvas = document.getElementById('qrCanvas');
    qrCanvas.innerHTML = '';

    // إنشاء QR code
    if (typeof QRCode !== 'undefined') {
      // إنشاء canvas جديد
      const canvas = document.createElement('canvas');
      qrCanvas.appendChild(canvas);
      
      QRCode.toCanvas(canvas, qrData, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      }, function (error) {
        if (error) {
          console.error('Error generating QR code:', error);
          qrCanvas.innerHTML = '<p style="color: red; padding: 20px;">خطأ في إنشاء QR code</p>';
          showStatus('خطأ في إنشاء QR code', 'error');
        } else {
          showStatus('✅ تم إنشاء QR code بنجاح', 'success');
        }
      });
    } else {
      qrCanvas.innerHTML = '<p style="color: red; padding: 20px;">مكتبة QRCode غير محملة</p>';
      showStatus('مكتبة QRCode غير محملة', 'error');
    }

    modal.style.display = 'flex';
  } catch (error) {
    console.error('❌ Error showing student QR:', error);
    showStatus('خطأ في عرض QR code', 'error');
  }
}
