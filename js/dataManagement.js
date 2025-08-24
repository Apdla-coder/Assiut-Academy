/***** إعدادات التبويب *****/
const DATA_WARN_SIZE_BYTES = 250 * 1024 * 1024; // 250MB حد التحذير
const DATA_WARN_ROWS = 25000; // 25k صف حد التحذير

const DATA_TABLES = [
  { key: 'attendances', label: 'الحضور', dateCol: 'date' },
  { key: 'payments', label: 'المدفوعات', dateCol: 'paid_at' },
  { key: 'exam_scores', label: 'نتائج الاختبارات', dateCol: 'exam_date' },
  { key: 'subscriptions', label: 'الاشتراكات', dateCol: 'subscribed_at' },
  { key: 'students', label: 'الطلاب', dateCol: 'created_at' }
];

function showSection(id) {
  document.querySelectorAll('section').forEach(s => s.style.display = 'none');
  const el = document.getElementById(id);
  if (el) el.style.display = 'block';
}

function renderProgressBar(percent, danger = false) {
  const p = Math.max(0, Math.min(100, Math.round(percent)));
  const color = danger ? '#c0392b' : '#1abc9c';
  return `
    <div style="background:#ecf0f1; border-radius:10px; height:10px; overflow:hidden;">
      <div style="width:${p}%; background:${color}; height:100%;"></div>
    </div>
    <div style="font-size:12px; color:#555; margin-top:4px;">${p}%</div>
  `;
}

/***** واجهة التبويب الرئيسية *****/
async function loadDataManagement() {
  const container = document.getElementById("dataManagementContent");
  if (!container) return console.error("❌ لم يتم العثور على عنصر dataManagementContent");

  container.innerHTML = `
    <div class="section-header">
      <h2>إدارة البيانات</h2>
      <p>📊 متابعة استهلاك البيانات مقارنة بالحد الأقصى: 250MB و 25,000 صف</p>
    </div>
    <div id="summaryStats" class="summary-grid"></div>
    <div id="statsContainer" class="stats-grid"></div>
  `;

  try {
    const { data, error } = await supabaseClient.rpc("get_table_stats");
    if (error) throw error;

    const summaryContainer = document.getElementById("summaryStats");
    const statsContainer = document.getElementById("statsContainer");

    const limitMB = 250, limitRows = 25000;
    let totalSize = 0, totalRows = 0;

    data.forEach(row => {
      totalSize += row.total_bytes / 1024 / 1024;
      totalRows += row.row_estimate;
    });

    const totalSizePercent = Math.min((totalSize / limitMB) * 100, 100);
    const totalRowsPercent = Math.min((totalRows / limitRows) * 100, 100);

    summaryContainer.innerHTML = `
      <div class="summary-card">
        <h3>📦 الحجم الكلي</h3>
        <p><b>${totalSize.toFixed(2)} MB</b> من ${limitMB} MB</p>
        <div class="progress-bar"><div class="progress" style="width:${totalSizePercent}%"></div></div>
      </div>
      <div class="summary-card">
        <h3>📑 عدد الصفوف الكلي</h3>
        <p><b>${totalRows}</b> من ${limitRows} صف</p>
        <div class="progress-bar"><div class="progress" style="width:${totalRowsPercent}%"></div></div>
      </div>
    `;

    statsContainer.innerHTML = data.map(row => `
      <div class="stat-card">
        <h3>📂 ${row.table_name}</h3>
        <p><b>الحجم:</b> ${(row.total_bytes / 1024 / 1024).toFixed(2)} MB</p>
        <p><b>عدد الصفوف:</b> ${row.row_estimate}</p>
        <div class="actions">
          <button onclick="exportTable('${row.table_name}')">⬇️ تصدير</button>
          <button onclick="deleteTableData('${row.table_name}')">🗑 مسح</button>
        </div>
      </div>
    `).join('');
  } catch (err) {
    console.error("⚠️ خطأ أثناء تحميل إحصائيات الجداول:", err);
    container.innerHTML += `<p class="error">تعذر تحميل البيانات.</p>`;
  }
}

async function exportTable(tableName) {
  try {
    const { data, error } = await supabaseClient.from(tableName).select("*");
    if (error) throw error;
    if (!data || !data.length) return alert("⚠️ لا توجد بيانات.");

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, tableName);
    XLSX.writeFile(workbook, `${tableName}.xlsx`);
  } catch (err) {
    console.error("خطأ في التصدير:", err);
    alert("⚠️ حدث خطأ أثناء التصدير.");
  }
}

async function deleteTableData(tableName) {
  if (!confirm(`مسح كل البيانات من جدول ${tableName}؟`)) return;
  try {
    const { error } = await supabaseClient.from(tableName).delete().neq("id", 0);
    if (error) throw error;
    alert(`✅ تم مسح بيانات جدول ${tableName}`);
    loadDataManagement();
  } catch (err) {
    console.error("خطأ في المسح:", err);
    alert("⚠️ حدث خطأ أثناء المسح.");
  }
}
