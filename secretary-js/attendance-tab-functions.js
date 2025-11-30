// ============================================================================
// ATTENDANCE TAB - All attendance management functions
// ============================================================================

async function loadAttendancesTab() {
  try {
    console.log('📌 Loading attendance tab...');
    await loadAttendance();
    
    // Render and update stats
    const container = document.getElementById('attendancesContainer');
    if (container) {
      renderAttendanceTable(window.attendances || [], container);
      updateAttendanceStats(window.attendances || []);
    }
  } catch (error) {
    console.error('❌ Error loading attendance tab:', error);
  }
}

function filterAttendance() {
  const searchTerm = document.getElementById('attendanceSearch')?.value || '';
  const statusFilter = document.getElementById('attendanceStatusFilter')?.value || '';
  const container = document.getElementById('attendancesContainer');
  if (!container) return;

  let filtered = (window.attendances || []).filter(att => {
    const matchesSearch = att.student_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         att.course_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !statusFilter || att.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  renderAttendanceTable(filtered, container);
  updateAttendanceStats(filtered);
}

function updateAttendanceStats(data) {
  const presentCount = data.filter(a => a.status === 'present').length;
  const absentCount = data.filter(a => a.status === 'absent').length;
  const lateCount = data.filter(a => a.status === 'late').length;
  const totalCount = data.length;

  document.getElementById('presentCount').textContent = presentCount;
  document.getElementById('absentCount').textContent = absentCount;
  document.getElementById('lateCount').textContent = lateCount;
  document.getElementById('totalCount').textContent = totalCount;
}

function exportAttendanceExcel() {
  try {
    const data = (window.attendances || []).map(a => ({
      'الطالب': a.student_name,
      'الكورس': a.course_name,
      'التاريخ': formatDate(a.attendance_date),
      'الحالة': getAttendanceStatusLabel(a.status),
      'ملاحظات': a.notes || '-'
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'الحضور');
    XLSX.writeFile(wb, 'الحضور.xlsx');
    
    showStatus('✅ تم تصدير البيانات بنجاح', 'success');
  } catch (error) {
    console.error('❌ Error exporting attendance:', error);
    showStatus('خطأ في التصدير', 'error');
  }
}

function printAttendance() {
  const printWindow = window.open('', '', 'height=600,width=800');
  const table = document.querySelector('#attendancesContainer table');
  
  if (!table) {
    showStatus('لا توجد بيانات للطباعة', 'error');
    return;
  }

  printWindow.document.write('<html><head><title>الحضور</title>');
  printWindow.document.write('<meta charset="UTF-8">');
  printWindow.document.write('<style>body { font-family: Arial, sans-serif; direction: rtl; } table { border-collapse: collapse; width: 100%; } th, td { border: 1px solid #ddd; padding: 8px; text-align: right; } th { background-color: #f2f2f2; }</style>');
  printWindow.document.write('</head><body>');
  printWindow.document.write(table.outerHTML);
  printWindow.document.write('</body></html>');
  printWindow.document.close();
  printWindow.print();
}

function getAttendanceStatusLabel(status) {
  const labels = {
    'present': 'حاضر',
    'absent': 'غائب',
    'late': 'متأخر',
    'excused': 'معذور'
  };
  return labels[status] || status;
}

function getAttendanceStatusColor(status) {
  const colors = {
    'present': '#10b981',
    'absent': '#ef4444',
    'late': '#f59e0b',
    'excused': '#f59e0b'
  };
  return colors[status] || '#6b7280';
}

function generateAttendanceReport(courseId, startDate, endDate) {
  try {
    const filtered = (window.attendances || []).filter(a =>
      a.course_id === courseId &&
      a.attendance_date >= startDate &&
      a.attendance_date <= endDate
    );

    const report = {
      courseId,
      startDate,
      endDate,
      total: filtered.length,
      present: filtered.filter(a => a.status === 'present').length,
      absent: filtered.filter(a => a.status === 'absent').length,
      excused: filtered.filter(a => a.status === 'excused').length
    };

    return report;
  } catch (error) {
    console.error('❌ Error generating attendance report:', error);
    return null;
  }
}
