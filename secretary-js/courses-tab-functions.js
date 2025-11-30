// ============================================================================
// COURSES TAB - All course management functions
// ============================================================================

async function loadCoursesTab() {
  try {
    console.log('📚 Loading courses tab...');
    await loadCourses();
    
    // Render courses and update stats
    const container = document.getElementById('coursesContainer');
    if (container) {
      renderCoursesTable(window.courses || [], container);
    }
  } catch (error) {
    console.error('❌ Error loading courses tab:', error);
  }
}

function filterCourses() {
  const searchTerm = document.getElementById('courseSearch')?.value || '';
  const container = document.getElementById('coursesContainer');
  if (!container) return;

  const filtered = (window.courses || []).filter(course =>
    course.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    course.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  renderCoursesTable(filtered, container);
}

function exportCoursesExcel() {
  try {
    const data = (window.courses || []).map(c => ({
      'اسم الكورس': c.name,
      'الوصف': c.description || '-',
      'السعر': c.price || 0,
      'تاريخ البداية': formatDate(c.start_date),
      'تاريخ النهاية': formatDate(c.end_date),
      'عدد الطلاب': (window.subscriptions || []).filter(s => s.course_id === c.id).length
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'الكورسات');
    XLSX.writeFile(wb, 'الكورسات.xlsx');
    
    showStatus('✅ تم تصدير البيانات بنجاح', 'success');
  } catch (error) {
    console.error('❌ Error exporting courses:', error);
    showStatus('خطأ في التصدير', 'error');
  }
}

function printCourses() {
  const printWindow = window.open('', '', 'height=600,width=800');
  const table = document.querySelector('#coursesContainer table');
  
  if (!table) {
    showStatus('لا توجد بيانات للطباعة', 'error');
    return;
  }

  printWindow.document.write('<html><head><title>الكورسات</title>');
  printWindow.document.write('<meta charset="UTF-8">');
  printWindow.document.write('<style>body { font-family: Arial, sans-serif; direction: rtl; } table { border-collapse: collapse; width: 100%; } th, td { border: 1px solid #ddd; padding: 8px; text-align: right; } th { background-color: #f2f2f2; }</style>');
  printWindow.document.write('</head><body>');
  printWindow.document.write(table.outerHTML);
  printWindow.document.write('</body></html>');
  printWindow.document.close();
  printWindow.print();
}
