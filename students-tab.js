// =============================================================================
// 📁 students-tab.js
// تبويب إدارة الطلاب: عرض، تعديل، حذف، بحث، تصدير، تقارير، تفاصيل
// =============================================================================

// =============================================================================
// 1. تحميل بيانات الطلاب
// =============================================================================
async function loadStudents() {
  try {
    const container = document.getElementById('studentsContainer');
    container.innerHTML = `
      <div class="loading">
        <div class="loading-spinner"></div>
        <p>جارٍ تحميل بيانات الطلبة...</p>
      </div>
    `;

    const { data, error } = await supabaseClient
      .from('students')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    students = data;

    container.innerHTML = renderStudentsTable(data);
    console.log("✅ تم تحميل بيانات الطلاب بنجاح");
  } catch (error) {
    console.error('Error loading students:', error);
    document.getElementById('studentsContainer').innerHTML = `
      <div class="loading"><p>خطأ في تحميل بيانات الطلبة</p></div>
    `;
    showStatus('خطأ في تحميل بيانات الطلبة', 'error');
  }
}

function renderStudentsTable(data) {
  return `
    <div class="table-container">
      <button class="btn btn-success" onclick="exportStudentsExcel()" style="margin-bottom: 20px;">
        <i class="fas fa-file-excel"></i> تحميل بيانات الطلاب Excel
      </button>
      <table>
        <thead>
          <tr>
            <th>الاسم</th>
            <th>البريد الإلكتروني</th>
            <th>رقم هاتف الطالب</th>
            <th>رقم ولي الأمر</th>
            <th>تاريخ التسجيل</th>
            <th>الإجراءات</th>
          </tr>
        </thead>
        <tbody>
          ${data.map(student => `
            <tr>
              <td>${student.full_name}</td>
              <td>${student.email || '-'}</td>
              <td>${student.phone || '-'}</td>
              <td>${student.parent_phone || '-'}</td>
              <td>${formatDate(student.created_at)}</td>
              <td class="action-buttons">
                <button class="action-btn view-btn" onclick="showStudentFullDetails('${student.id}')">
                  <i class="fas fa-eye"></i>
                </button>
                <button class="action-btn edit-btn" onclick="showEditStudentModal('${student.id}')">
                  <i class="fas fa-edit"></i>
                </button>
                <button class="action-btn delete-btn" onclick="deleteStudent('${student.id}')">
                  <i class="fas fa-trash"></i>
                </button>
                <!-- ✅ زر استخراج QR -->
                <button class="action-btn qr-btn" onclick="generateStudentQR('${student.id}', '${student.full_name}')">
                  <i class="fas fa-qrcode"></i>
                </button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

// =============================================================================
// 2. بحث عن الطلاب
// =============================================================================
function filterStudents() {
  const searchTerm = document.getElementById('studentSearch').value.toLowerCase();
  const filtered = students.filter(student =>
    student.full_name.toLowerCase().includes(searchTerm) ||
    (student.email && student.email.toLowerCase().includes(searchTerm)) ||
    (student.phone && student.phone.includes(searchTerm)) ||
    (student.parent_phone && student.parent_phone.includes(searchTerm))
  );
  document.getElementById('studentsContainer').innerHTML = renderStudentsTable(filtered);
}

// =============================================================================
// 3. تعديل بيانات الطالب
// =============================================================================
function showEditStudentModal(studentId) {
  const student = students.find(s => s.id === studentId);
  if (!student) return;

  const modal = document.getElementById('studentModal');
  modal.style.display = 'flex';

  document.getElementById('studentModalTitle').textContent = 'تعديل بيانات الطالب';
  document.getElementById('studentId').value = student.id;
  document.getElementById('fullName').value = student.full_name;
  document.getElementById('email').value = student.email || '';
  document.getElementById('phone').value = student.phone || '';
  document.getElementById('parentPhone').value = student.parent_phone || '';

  document.getElementById('studentForm').onsubmit = async function (e) {
    e.preventDefault();
    await updateStudent(studentId);
  };
}

async function updateStudent(studentId) {
  try {
    const fullName = document.getElementById('fullName').value;
    const email = document.getElementById('email').value;
    const phone = document.getElementById('phone').value;
    const parentPhone = document.getElementById('parentPhone').value;

    const { data, error } = await supabaseClient
      .from('students')
      .update({ full_name: fullName, email, phone, parent_phone: parentPhone })
      .eq('id', studentId);

    if (error) throw error;

    showStatus('تم تحديث بيانات الطالب بنجاح');
    closeModal('studentModal');
    loadStudents();
    await updateCurrentTab();
  } catch (error) {
    console.error('Error updating student:', error);
    showStatus('خطأ في تحديث بيانات الطالب', 'error');
  }
}

// =============================================================================
// 4. حذف الطالب
// =============================================================================
async function deleteStudent(studentId) {
  if (!confirm('هل أنت متأكد من حذف هذا الطالب؟ لن يمكن التراجع.')) return;

  try {
    const { error } = await supabaseClient
      .from('students')
      .delete()
      .eq('id', studentId);

    if (error) throw error;

    showStatus('تم حذف الطالب بنجاح');
    loadStudents();
  } catch (error) {
    console.error('Error deleting student:', error);
    showStatus('خطأ في حذف الطالب', 'error');
  }
}

// =============================================================================
// 5. تصدير بيانات الطلاب إلى Excel
// =============================================================================
async function exportStudentsExcel() {
  try {
    const { data, error } = await supabaseClient
      .from('students')
      .select(`
        full_name,
        phone,
        email,
        created_at,
        notes,
        exam_scores(
          score,
          exam_date,
          exams(title, max_score)
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const workbook = new ExcelJS.Workbook();

    // شيت: الطلاب
    const wsStudents = workbook.addWorksheet("الطلاب");
    wsStudents.columns = [
      { header: "اسم الطالب", key: "name", width: 25 },
      { header: "الهاتف", key: "phone", width: 18 },
      { header: "البريد الإلكتروني", key: "email", width: 25 },
      { header: "تاريخ التسجيل", key: "created", width: 20 },
      { header: "ملاحظات", key: "notes", width: 30 }
    ];
    styleHeader(wsStudents.getRow(1));

    data.forEach(st => {
      const row = wsStudents.addRow({
        name: st.full_name,
        phone: st.phone || "-",
        email: st.email || "-",
        created: st.created_at ? new Date(st.created_at).toLocaleDateString("ar-EG") : "-",
        notes: st.notes || "-"
      });
      styleRow(row);
    });

    // شيت: نتائج الاختبارات
    const wsExams = workbook.addWorksheet("نتائج الاختبارات");
    wsExams.columns = [
      { header: "اسم الطالب", key: "student", width: 25 },
      { header: "اسم الامتحان", key: "exam", width: 30 },
      { header: "الدرجة", key: "score", width: 12 },
      { header: "الدرجة الكلية", key: "max", width: 15 },
      { header: "تاريخ الامتحان", key: "date", width: 20 }
    ];
    styleHeader(wsExams.getRow(1));

    data.forEach(st => {
      if (st.exam_scores && st.exam_scores.length > 0) {
        st.exam_scores.forEach(es => {
          wsExams.addRow({
            student: st.full_name,
            exam: es.exams?.title || "امتحان",
            score: es.score || 0,
            max: es.exams?.max_score || 0,
            date: es.exam_date ? new Date(es.exam_date).toLocaleDateString("ar-EG") : "-"
          });
        });
      }
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const filename = `students_${new Date().toISOString().split('T')[0]}.xlsx`;
    saveAs(new Blob([buffer]), filename);
    showStatus("✅ تم تصدير بيانات الطلاب بنجاح", "success");

  } catch (err) {
    console.error(err);
    showStatus("❌ خطأ في تصدير بيانات الطلاب", "error");
  }
}

// =============================================================================
// 6. عرض التفاصيل الكاملة للطالب
// =============================================================================
async function showStudentFullDetails(studentId) {
  try {
    const modal = document.getElementById('studentDetailModal');
    modal.style.display = 'flex';
    const content = document.getElementById('studentDetailContent');
    content.innerHTML = '<div class="loading">...جاري تحميل البيانات</div>';

    const { data: student, error } = await supabaseClient
      .from('students')
      .select('*')
      .eq('id', studentId)
      .single();

    if (error || !student) throw new Error('Student not found');

    const [subscriptions, payments, attendances, exams] = await Promise.all([
      fetchSubscriptions(studentId),
      fetchPayments(studentId),
      fetchAttendances(studentId),
      fetchStudentExams(studentId)
    ]);

    content.innerHTML = `
      <div class="student-detail">
        <div class="header-section" style="text-align:center;margin-bottom:20px;">
          <img src="logo.png" alt="شعار" style="max-width:150px;height:auto;" onerror="this.style.display='none'">
          <h3>${student.full_name}</h3>
        </div>
        <div class="detail-section">
          <h4>معلومات أساسية</h4>
          <p><strong>البريد الإلكتروني:</strong> ${student.email || '-'}</p>
          <p><strong>رقم الهاتف:</strong> ${student.phone || '-'}</p>
          <p><strong>رقم ولي الأمر:</strong> ${student.parent_phone || '-'}</p>
          <p><strong>تاريخ التسجيل:</strong> ${formatDate(student.created_at)}</p>
        </div>
        ${generateSection('الاشتراكات', subscriptions, generateSubscriptionsList)}
        ${generateSection('المدفوعات', payments, generatePaymentsList)}
        ${generateSection('سجل الحضور', attendances, generateAttendanceTable)}
        ${generateSection('الاختبارات', exams, generateExamsTable)}
        <div style="text-align:center; margin-top:20px;">
          <button class="btn btn-primary" onclick="printStudentDetails('${escapeHtml(student.full_name)}')">طباعة التقرير</button>
        </div>
      </div>
    `;
  } catch (err) {
    content.innerHTML = '<div class="error">حدث خطأ أثناء تحميل بيانات الطالب.</div>';
    console.error('Error in showStudentFullDetails:', err);
  }
}

// =============================================================================
// 7. دوال مساعدة للعرض
// =============================================================================
function generateSection(title, data, renderer) {
  return data && data.length ? `
    <div class="detail-section">
      <h4>${title} (${data.length})</h4>
      ${renderer(data)}
    </div>
  ` : '';
}

function generateSubscriptionsList(data) {
  return `<ul>${data.map(s => `
    <li>
      ${s.course?.name || '---'} 
      - ${formatDate(s.subscribed_at)} 
      - (${s.status === 'active' ? 'نشط' : s.status === 'inactive' ? 'غير نشط' : s.status})
    </li>
  `).join('')}</ul>`;
}

function generatePaymentsList(data) {
  return `
    <table style="width: 100%; border-collapse: collapse;">
      <thead>
        <tr style="background-color: #f2f2f2; text-align: center;">
          <th style="border: 1px solid #ccc; padding: 8px;">اسم الكورس</th>
          <th style="border: 1px solid #ccc; padding: 8px;">سعر الكورس (ج.م)</th>
          <th style="border: 1px solid #ccc; padding: 8px;">المدفوع (ج.م)</th>
          <th style="border: 1px solid #ccc; padding: 8px;">المتبقي (ج.م)</th>
          <th style="border: 1px solid #ccc; padding: 8px;">طريقة الدفع</th>
          <th style="border: 1px solid #ccc; padding: 8px;">التاريخ</th>
        </tr>
      </thead>
      <tbody>
        ${data.map(p => {
          const paid = parseFloat(p.amount) || 0;
          const total = parseFloat(p.total_amount) || 0;
          const remaining = Math.max(0, total - paid).toFixed(2);
          const courseName = p.course?.name || '---';
          const coursePrice = p.course?.price ? parseFloat(p.course.price).toFixed(2) : '---';

          return `
            <tr style="text-align: center;">
              <td style="border: 1px solid #ccc; padding: 8px;">${escapeHtml(courseName)}</td>
              <td style="border: 1px solid #ccc; padding: 8px; font-weight: bold; color: #1a73e8;">${coursePrice} ج.م</td>
              <td style="border: 1px solid #ccc; padding: 8px; color: #0a7e8c;">${paid.toFixed(2)} ج.م</td>
              <td style="border: 1px solid #ccc; padding: 8px; color: #d9534f;">${remaining} ج.م</td>
              <td style="border: 1px solid #ccc; padding: 8px;">${p.method === 'cash' ? 'نقداً' : p.method === 'card' ? 'بطاقة' : 'تحويل'}</td>
              <td style="border: 1px solid #ccc; padding: 8px;">${formatDate(p.paid_at)}</td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  `;
}

function generateAttendanceTable(data) {
  const statusMap = { present: 'حاضر', absent: 'غائب', late: 'متأخر' };
  const rows = data.map(a => `
    <tr>
      <td>${a.course?.name || '---'}</td>
      <td>${formatDate(a.date)}</td>
      <td>${statusMap[a.status] || a.status}</td>
      <td>${a.lesson?.title || '---'}</td>
      <td>${a.notes || '-'}</td>
    </tr>
  `).join('');
  return `<table style="width:100%; border-collapse:collapse;">
    <thead><tr><th>الدورة</th><th>التاريخ</th><th>الحالة</th><th>الدرس</th><th>ملاحظات</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

function generateExamsTable(data) {
  const rows = data.map(exam => {
    // ✅ الوصول الصحيح للبيانات المتداخلة
    const examTitle = exam.exams?.title || '---';
    const maxScore = exam.exams?.max_score || 0;
    const courseName = exam.exams?.courses?.name || '---';

    // ✅ عرض اسم الكورس في الملاحظات أو كعمود منفصل (اختياري)
    return `
      <tr>
        <td>${examTitle}</td>
        <td>${exam.score || '0'}</td>
        <td>${maxScore}</td>
        <td>${formatDate(exam.exam_date)}</td>
        <td>: ${courseName}</td>
      </tr>
    `;
  }).join('');
  return `
    <table style="width:100%; border-collapse:collapse;">
      <thead>
        <tr>
          <th>عنوان الامتحان</th>
          <th>الدرجة</th>
          <th>الدرجة الكلية</th>
          <th>التاريخ</th>
          <th>اسم الدورة</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

// =============================================================================
// 8. دوال مساعدة عامة
// =============================================================================
function escapeHtml(text) {
  const map = { '&': '&amp;', '<': '<', '>': '>', '"': '&quot;', "'": '&#039;' };
  return text ? String(text).replace(/[&<>"']/g, m => map[m]) : '';
}

function formatDate(dateString) {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return isNaN(date) ? '-' : date.toLocaleDateString('ar-EG', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// =============================================================================
// 9. إرسال تقرير عبر واتساب
// =============================================================================
async function generateAndSendReport(studentId) {
  try {
    const { data: student, error } = await supabaseClient
      .from('students')
      .select('*')
      .eq('id', studentId)
      .single();

    if (error || !student) {
      showStatus('لم يتم العثور على الطالب.', 'error');
      return;
    }

    let phone = student.parent_phone || student.phone;
    if (!phone) {
      showStatus('لا يوجد رقم هاتف.', 'warning');
      return;
    }

    // تنسيق رقم الهاتف (مثال: 01012345678 → +201012345678)
    phone = phone.replace(/\s+/g, '').replace(/-/g, '');
    if (phone.startsWith('0')) phone = '+2' + phone;
    else if (phone.startsWith('20')) phone = '+' + phone;
    else if (!phone.startsWith('+')) phone = '+20' + phone;

    if (!/^\+[0-9]{10,15}$/.test(phone)) {
      showStatus('رقم الهاتف غير صحيح.', 'error');
      return;
    }

    const message = `*تقرير الطالب: ${student.full_name}*\n\n`;
    // يمكنك توسعة الرسالة كما في النسخ السابقة

    showWhatsAppPreview(phone, message, student.full_name);
  } catch (err) {
    console.error('Error generating report:', err);
    showStatus('فشل في إنشاء التقرير.', 'error');
  }
}

function showWhatsAppPreview(phone, message, studentName) {
  const modal = document.getElementById('waPreviewModal');
  if (!modal) return window.open(`https://wa.me/  ${encodeURIComponent(phone)}?text=${encodeURIComponent(message)}`, '_blank');

  document.getElementById('waPreviewPhone').textContent = `الرقم: ${phone}`;
  document.getElementById('waPreviewMessage').value = message;
  modal.style.display = 'flex';

  document.getElementById('waCopyBtn').onclick = () => {
    navigator.clipboard.writeText(message).catch(() => {
      const ta = document.createElement('textarea');
      ta.value = message;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    });
    showStatus('تم نسخ الرسالة.', 'success');
  };

  document.getElementById('waOpenBtn').onclick = () => {
    const url = `https://wa.me/  ${encodeURIComponent(phone)}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
    showStatus(`جاري فتح واتساب لـ ${studentName}...`, 'success');
    modal.style.display = 'none';
  };

  document.getElementById('waCloseBtn').onclick = () => modal.style.display = 'none';
}

// =============================================================================
// 10. طباعة تقرير الطالب
// =============================================================================
function printStudentDetails(studentName) {
  const printWindow = window.open('', '_blank');
  const logoSrc = document.getElementById('institutionLogo')?.src || './logo2.jpg';

  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="UTF-8">
      <title>تقرير الطالب - ${studentName}</title>
      <style>
        body { font-family: 'Tajawal', sans-serif; margin: 20px; }
        table { width: 100%; border-collapse: collapse; margin: 15px 0; }
        th, td { border: 1px solid #000; padding: 8px; text-align: center; }
        th { background: #f0f0f0; font-weight: bold; }
        @media print { body { font-size: 12px; } }
      </style>
    </head>
    <body>

      ${document.getElementById('studentDetailContent').innerHTML}
    </body>
    </html>
  `);
  printWindow.document.close();

  setTimeout(() => {
    printWindow.focus();
    printWindow.print();
  }, 500);
}

// =============================================================================
// 11. دوال جلب البيانات
// =============================================================================

async function fetchSubscriptions(studentId) {
  const { data, error } = await supabaseClient
    .from('subscriptions')
    .select('subscribed_at, status, notes, course:courses(name)')
    .eq('student_id', studentId);
  return error ? [] : data;
}

async function fetchPayments(studentId) {
  const { data, error } = await supabaseClient
    .from('payments')
    .select('amount, paid_at, method, total_amount, course:courses(name, price)')
    .eq('student_id', studentId);
  return error ? [] : data;
}

async function fetchAttendances(studentId) {
  const { data, error } = await supabaseClient
    .from('attendances')
    .select(`
      date, 
      status, 
      notes, 
      course:courses(name), 
      lesson:lessons(title)
    `)
    .eq('student_id', studentId);
  return error ? [] : data;
}
// ✅ دالة جديدة: جلب اختبارات الطالب من جدول exam_scores
async function fetchStudentExams(studentId) {
  const { data, error } = await supabaseClient
    .from('exam_scores')
    .select(`
      score,
      exam_date,
      exams:exams (
        title,
        max_score,
        courses:courses (name)
      )
    `)
    .eq('student_id', studentId)
    .order('exam_date', { ascending: false });

  if (error) {
    console.error('Error fetching student exams:', error);
    return [];
  }

  // ✅ تنظيف البيانات وطباعة تجريبية للتحقق
  console.log("Fetched exams data:", data);

  return data;
}

// ✅ توليد QR وعرضه في المودال الثابت
function generateStudentQR(studentId, studentName) {
  // فتح المودال
  const modal = document.getElementById("studentQrModal");
  modal.style.display = "flex";

  // تحديث البيانات
  document.getElementById("qrStudentName").textContent = studentName;

  // مسح أي QR قديم
  document.getElementById("qrCanvas").innerHTML = "";

  // توليد QR جديد
  QRCode.toCanvas(
    document.createElement("canvas"),
    JSON.stringify({ student_id: studentId }),
    { width: 200 },
    (error, canvas) => {
      if (error) {
        console.error(error);
        showStatus("❌ فشل في توليد QR", "error");
      } else {
        document.getElementById("qrCanvas").appendChild(canvas);
      }
    }
  );
}



// =============================================================================
// 📁 parents-tab.js
// تبويب إدارة أولياء الأمور: عرض الطلاب، إرسال التقارير عبر واتساب
// =============================================================================

// --- دالة تحميل بيانات الطلاب لولي الأمر ---
async function loadStudentsForParents() {
  const container = document.getElementById('parentsStudentsContainer');
  if (!container) {
    console.error("عنصر 'parentsStudentsContainer' غير موجود في DOM.");
    return;
  }

  container.innerHTML = `
    <div class="loading">
      <div class="loading-spinner"></div>
      <p>جاري تحميل بيانات الطلاب...</p>
    </div>
  `;

  try {
    const { data, error } = await supabaseClient
      .from('students')
      .select('*')
      .order('full_name', { ascending: true });

    if (error) throw error;

    if (!data || data.length === 0) {
      container.innerHTML = '<p class="no-data">لا يوجد طلاب مسجلين.</p>';
      return;
    }

    // بناء جدول الطلاب مع زر إرسال التقرير
    let html = `
      <table id="parentsStudentsTable">
        <thead>
          <tr>
            <th>الاسم</th>
            <th>رقم ولي الأمر</th>
            <th>إرسال تقرير واتساب</th>
          </tr>
        </thead>
        <tbody>
    `;

    for (const student of data) {
      html += `
        <tr>
          <td>${escapeHtml(student.full_name || '')}</td>
          <td>${escapeHtml(student.parent_phone || '')}</td>
          <td>
            <button class="btn btn-primary" onclick="generateAndSendReport('${student.id}')">
              <i class="fas fa-paper-plane"></i> إرسال التقرير
            </button>
          </td>
        </tr>
      `;
    }

    html += `</tbody></table>`;
    container.innerHTML = html;
  } catch (err) {
    console.error("خطأ في تحميل بيانات أولياء الأمور:", err);
    container.innerHTML = '<p class="no-data">حدث خطأ أثناء تحميل بيانات الطلاب.</p>';
    showStatus('فشل في تحميل بيانات الطلاب.', 'error');
  }
}

// --- فلترة الطلاب في تبويب أولياء الأمور ---
function filterParents() {
  const searchTerm = document.getElementById('parentSearch').value.toLowerCase();
  const table = document.getElementById('parentsStudentsTable');
  if (!table) return;

  const rows = table.getElementsByTagName('tr');
  for (let i = 1; i < rows.length; i++) {
    const cells = rows[i].getElementsByTagName('td');
    let found = false;
    for (let j = 0; j < cells.length - 1; j++) { // استبعاد زر الإجراءات
      if (cells[j].textContent.toLowerCase().includes(searchTerm)) {
        found = true;
        break;
      }
    }
    rows[i].style.display = found ? '' : 'none';
  }
}

// =============================================================================
// 2. إرسال تقرير الطالب عبر واتساب
// =============================================================================

// --- دالة توليد التقرير وإرساله ---
async function generateAndSendReport(studentId) {
  try {
    const { data: student, error: studentError } = await supabaseClient
      .from('students')
      .select('*')
      .eq('id', studentId)
      .single();

    if (studentError || !student) {
      showStatus('لم يتم العثور على بيانات الطالب.', 'error');
      console.error('Student data not found for ID:', studentId);
      return;
    }

    // تحديد رقم الهاتف (أولًا ولي الأمر، ثم الطالب)
    let rawPhoneNumber = student.parent_phone || student.phone;
    if (!rawPhoneNumber) {
      showStatus('لا يوجد رقم هاتف للطالب أو ولي الأمر. لا يمكن إرسال التقرير.', 'warning');
      console.warn('No phone number found for student ID:', studentId);
      return;
    }

    // تنسيق الرقم إلى الصيغة الدولية (+20XXXXXXXXXX)
    const formattedPhoneNumber = formatPhoneNumber(rawPhoneNumber);
    if (!/^\+[0-9]{10,15}$/.test(formattedPhoneNumber)) {
      showStatus(`خطأ: تعذر تنسيق رقم الهاتف "${rawPhoneNumber}" بشكل صحيح.`, 'error');
      console.error('Invalid phone format:', rawPhoneNumber);
      return;
    }

    // جلب بيانات إضافية
    const [subscriptions, payments, attendances, exams] = await Promise.all([
      fetchSubscriptions(studentId),
      fetchPayments(studentId),
      fetchAttendances(studentId),
      fetchStudentExams(studentId) // ✅ جلب الاختبارات
    ]);

    // بناء نص التقرير
    const message = buildReportMessage(student, subscriptions, payments, attendances, exams);
    const studentName = student.full_name || 'طالب';

    // عرض المعاينة أو فتح واتساب مباشرة
    if (typeof showWhatsAppPreview === 'function') {
      showWhatsAppPreview(formattedPhoneNumber, message, studentName);
      showStatus(`جاهز: معاينة تقرير لـ ${studentName}`, 'success');
    } else {
      const url = `https://wa.me/${encodeURIComponent(formattedPhoneNumber)}?text=${encodeURIComponent(message)}`;
      window.open(url, '_blank');
      showStatus(`جارٍ فتح واتساب لـ ${studentName}...`, 'success');
    }

  } catch (error) {
    console.error('Error generating report for student ID:', studentId, error);
    showStatus('حدث خطأ أثناء إنشاء التقرير.', 'error');
  }
}

// --- تنسيق رقم الهاتف ---
function formatPhoneNumber(phone) {
  return phone
    .replace(/\s+/g, '')
    .replace(/-/g, '')
    .replace(/^0/, '+20')
    .replace(/^20/, '+20')
    .replace(/^\+?20/, '+20');
}

// --- جلب الاشتراكات ---
async function fetchSubscriptions(studentId) {
  const { data, error } = await supabaseClient
    .from('subscriptions')
    .select('subscribed_at, status, notes, course:courses(name)')
    .eq('student_id', studentId);
  return error ? [] : data;
}

// --- جلب المدفوعات ---
async function fetchPayments(studentId) {
  const { data, error } = await supabaseClient
    .from('payments')
    .select('amount, paid_at, method, total_amount, status, notes, course:courses(name, price)')
    .eq('student_id', studentId);
  return error ? [] : data;
}

// --- جلب الحضور ---
async function fetchAttendances(studentId) {
  const { data, error } = await supabaseClient
    .from('attendances')
    .select(`
      date,
      status,
      notes,
      course:courses(name),
      lesson:lessons(title)
    `)
    .eq('student_id', studentId);

  if (error) {
    console.error('Error fetching attendances:', error);
    return [];
  }

  return data;
}

async function fetchStudentExams(studentId) {
  const { data, error } = await supabaseClient
    .from('exam_scores')
    .select(`
      score,
      exam_date,
      exams:exams (
        title,
        max_score,
        courses:courses (name)
      )
    `)
    .eq('student_id', studentId)
    .order('exam_date', { ascending: false });

  if (error) {
    console.error('Error fetching student exams:', error);
    return [];
  }

  // ✅ طباعة للتحقق من هيكل البيانات
  console.log("Fetched exams data:", data);
  return data;
}
// --- بناء رسالة التقرير ---
function buildReportMessage(student, subscriptions, payments, attendances, exams) {
  const studentName = student.full_name || 'غير محدد';
  let message = `*تقرير الطالب: ${studentName}*\n\n`;

  // 1. تفاصيل الطالب
  const details = [];
  if (student.full_name) details.push(`الاسم: ${student.full_name}`);
  if (student.email) details.push(`البريد الإلكتروني: ${student.email}`);
  if (student.phone) details.push(`هاتف الطالب: ${student.phone}`);
  if (student.parent_phone) details.push(`هاتف ولي الأمر: ${student.parent_phone}`);
  if (student.created_at) details.push(`تاريخ التسجيل: ${formatDate(student.created_at)}`);
  message += `*👤 معلومات الطالب:*\n${details.join('\n')}\n\n`;

  // 2. الاشتراكات
  message += "*📚 الاشتراكات:*\n";
  if (subscriptions && subscriptions.length > 0) {
    subscriptions.forEach(sub => {
      const status = sub.status === 'active' ? '✅ نشط' : '❌ غير نشط';
      const courseName = sub.course?.name || '---';
      const subscribedAt = formatDate(sub.subscribed_at);
      const notes = sub.notes ? ` - ملاحظات: ${sub.notes}` : '';
      message += `• دورة: *${courseName}*\n  تاريخ: ${subscribedAt}\n  الحالة: ${status}${notes}\n\n`;
    });
  } else {
    message += "لا توجد اشتراكات.\n\n";
  }

  // 3. المدفوعات
  message += "*💰 المدفوعات:*\n";
  if (payments && payments.length > 0) {
    let totalPaid = 0;
    let totalAmount = 0;
    payments.forEach(pay => {
      const paid = parseFloat(pay.amount) || 0;
      const total = parseFloat(pay.total_amount) || 0;
      const remaining = Math.max(0, total - paid);
      totalPaid += paid;
      totalAmount += total;
      const courseName = pay.course?.name || '---';
      const paidAt = formatDate(pay.paid_at);
      const method = pay.method === 'cash' ? 'نقداً' : pay.method === 'card' ? 'بطاقة' : 'تحويل';
      message += `• دورة: *${courseName}*\n  مدفوع: ${paid.toFixed(2)} ج.م\n  إجمالي: ${total.toFixed(2)} ج.م\n  متبقي: ${remaining.toFixed(2)} ج.م\n  طريقة الدفع: ${method}\n  التاريخ: ${paidAt}\n\n`;
    });
    message += `*الإجماليات:*\n  المدفوع: ${totalPaid.toFixed(2)} ج.م\n  المتبقي: ${(totalAmount - totalPaid).toFixed(2)} ج.م\n\n`;
  } else {
    message += "لا توجد مدفوعات.\n\n";
  }

  // 4. الحضور
  message += "*📅 الحضور:*\n";
  if (attendances && attendances.length > 0) {
    const present = attendances.filter(a => a.status === 'present').length;
    const absent = attendances.filter(a => a.status === 'absent').length;
    const late = attendances.filter(a => a.status === 'late').length;
    message += `• الحضور: ${present} مرة\n• الغياب: ${absent} مرة\n• التأخير: ${late} مرة\n\n`;

    // تفاصيل الحضور مع اسم الدرس
    message += "*تفاصيل الحضور:*\n";
    attendances.forEach(att => {
      const date = formatDate(att.date);
      const courseName = att.course?.name || '---';
      const lessonTitle = att.lesson?.title || '---';
      const status = att.status === 'present' ? 'حاضر' : att.status === 'absent' ? 'غائب' : 'متأخر';
      const notes = att.notes ? ` - ${att.notes}` : '';
      message += `• ${date} - *${courseName}*\n  الدرس: ${lessonTitle}\n  الحالة: ${status}${notes}\n\n`;
    });
  } else {
    message += "لا توجد بيانات حضور.\n\n";
  }

  // 5. الاختبارات
  message += "*📝 نتائج الاختبارات:*\n";
  if (exams && exams.length > 0) {
    exams.forEach(exam => {
      const examTitle = exam.exam?.title || '---';
      const score = exam.score || 0;
      const maxScore = exam.exam?.max_score || 1; // تجنب القسمة على صفر
      const percentage = ((score / maxScore) * 100).toFixed(1);
      const examDate = formatDate(exam.exam_date);
      const courseName = exam.exam?.courses?.name || '---';
      message += `• *${examTitle}*\n  الدرجة: ${score}/${maxScore} (${percentage}%)\n  الكورس: ${courseName}\n  التاريخ: ${examDate}\n\n`;
    });
  } else {
    message += "لا توجد نتائج اختبارات.\n\n";
  }

  // 6. خاتمة التقرير
  message += "\n*تم إرسال التقرير من أكاديمية أسيوط.*";
  message += "\n*شكراً لثقتكم بنا!*";

  return message;
}
// =============================================================================
// 3. معاينة واتساب
// =============================================================================

// --- عرض معاينة الرسالة قبل الإرسال ---
function showWhatsAppPreview(phone, message, studentName) {
  const modal = document.getElementById('waPreviewModal');
  const phoneEl = document.getElementById('waPreviewPhone');
  const msgEl = document.getElementById('waPreviewMessage');
  const copyBtn = document.getElementById('waCopyBtn');
  const openBtn = document.getElementById('waOpenBtn');
  const closeBtn = document.getElementById('waCloseBtn');

  if (!modal || !phoneEl || !msgEl) {
    // fallback
    window.open(`https://wa.me/${encodeURIComponent(phone)}?text=${encodeURIComponent(message)}`, '_blank');
    return;
  }

  phoneEl.textContent = `الوجهة: ${phone}`;
  msgEl.value = message;
  modal.style.display = 'flex';

  const closeModal = () => (modal.style.display = 'none');

  copyBtn.onclick = () => {
    navigator.clipboard.writeText(message).catch(() => {
      const ta = document.createElement('textarea');
      ta.value = message;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    });
    showStatus('تم نسخ الرسالة.', 'success');
  };

  openBtn.onclick = () => {
    const url = `https://wa.me/${encodeURIComponent(phone)}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
    showStatus(`جارٍ فتح واتساب لـ ${studentName}...`, 'success');
    closeModal();
  };

  [closeBtn, document.getElementById('waPreviewClose')].forEach(btn => {
    if (btn) btn.onclick = closeModal;
  });
}

// =============================================================================
// 3. معاينة واتساب
// =============================================================================

// --- عرض معاينة الرسالة قبل الإرسال ---
function showWhatsAppPreview(phone, message, studentName) {
  const modal = document.getElementById('waPreviewModal');
  const phoneEl = document.getElementById('waPreviewPhone');
  const msgEl = document.getElementById('waPreviewMessage');
  const copyBtn = document.getElementById('waCopyBtn');
  const openBtn = document.getElementById('waOpenBtn');
  const closeBtn = document.getElementById('waCloseBtn');

  if (!modal || !phoneEl || !msgEl) {
    // fallback
    window.open(`https://wa.me/${encodeURIComponent(phone)}?text=${encodeURIComponent(message)}`, '_blank');
    return;
  }

  phoneEl.textContent = `الوجهة: ${phone}`;
  msgEl.value = message;
  modal.style.display = 'flex';

  const closeModal = () => (modal.style.display = 'none');

  copyBtn.onclick = () => {
    navigator.clipboard.writeText(message).catch(() => {
      const ta = document.createElement('textarea');
      ta.value = message;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    });
    showStatus('تم نسخ الرسالة.', 'success');
  };

  openBtn.onclick = () => {
    const url = `https://wa.me/${encodeURIComponent(phone)}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
    showStatus(`جارٍ فتح واتساب لـ ${studentName}...`, 'success');
    closeModal();
  };

  [closeBtn, document.getElementById('waPreviewClose')].forEach(btn => {
    if (btn) btn.onclick = closeModal;
  });
}

// =============================================================================
// 4. دوال مساعدة
// =============================================================================

// --- تنسيق التاريخ ---
function formatDate(dateString) {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return isNaN(date) ? '-' : date.toLocaleDateString('ar-EG', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// --- منع حقن HTML ---
function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "<")
    .replace(/>/g, ">")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// --- تفعيل الرابط النشط في القائمة ---
function setActiveLink(element) {
  document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
  element.classList.add('active');
}