'use strict';

// ============================================================================
// SECRETARY UI - UI management, navigation, modals, charts
// ============================================================================

// === UI Initialization ===
document.addEventListener('DOMContentLoaded', function() {
  // Setup event listeners
  setupEventListeners();
  initializeUI();
});

function setupEventListeners() {
  // Sidebar navigation
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
      if (e.target.closest('.nav-link')) {
        e.preventDefault();
        const tabName = e.target.closest('.nav-link').getAttribute('onclick')?.match(/switchTab\('([^']+)'\)/)?.[1];
        if (tabName) {
          setActiveLink(e.target.closest('.nav-link'));
        }
      }
    });
  });

  // Modal close buttons
  document.querySelectorAll('.close, [onclick*="closeModal"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const modalId = e.target.closest('[id$="Modal"]')?.id;
      if (modalId) closeModal(modalId);
    });
  });

  // Click outside modal to close
  document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.style.display = 'none';
      }
    });
  });
}

function initializeUI() {
  // Initialize charts
  initCharts();
  
  // Check modals (warning only - modals must exist in HTML)
  checkModalsExist();
}

// === Chart Initialization ===
function initCharts() {
  try {
    if (typeof Chart === 'undefined') {
      console.warn('Chart.js not loaded');
      return;
    }

    // Students Chart
    const studentsCtx = document.getElementById('studentsChart');
    if (studentsCtx && !window.studentsChartInstance) {
      window.studentsChartInstance = new Chart(studentsCtx, {
        type: 'doughnut',
        data: {
          labels: ['الطلاب'],
          datasets: [{
            data: [window.students?.length || 0],
            backgroundColor: ['#3b82f6']
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          plugins: {
            legend: {
              labels: {
                font: { family: "'Arial', sans-serif" },
                color: '#333'
              }
            }
          }
        }
      });
    }

    // Revenue Chart
    const revenueCtx = document.getElementById('revenueChart');
    if (revenueCtx && !window.revenueChartInstance) {
      window.revenueChartInstance = new Chart(revenueCtx, {
        type: 'bar',
        data: {
          labels: ['المدفوعات'],
          datasets: [{
            label: 'الإيرادات',
            data: [calculateTotalRevenue()],
            backgroundColor: '#10b981'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                callback: function(value) {
                  return 'ج.م ' + value;
                }
              }
            }
          },
          plugins: {
            legend: {
              labels: {
                font: { family: "'Arial', sans-serif" }
              }
            }
          }
        }
      });
    }
  } catch (error) {
    console.error('❌ Chart error:', error);
  }
}

function calculateTotalRevenue() {
  return (window.payments || []).reduce((sum, payment) => {
    return sum + (payment.status === 'paid' ? parseFloat(payment.amount) || 0 : 0);
  }, 0);
}

function updateCharts() {
  try {
    if (window.studentsChartInstance) {
      window.studentsChartInstance.data.datasets[0].data = [window.students?.length || 0];
      window.studentsChartInstance.update();
    }

    if (window.revenueChartInstance) {
      window.revenueChartInstance.data.datasets[0].data = [calculateTotalRevenue()];
      window.revenueChartInstance.update();
    }
  } catch (error) {
    console.error('❌ Update charts error:', error);
  }
}

// === Navigation ===
function setActiveLink(element) {
  document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.remove('active');
  });
  element.classList.add('active');
}

// === Modal Check (Warning Only) ===
function checkModalsExist() {
  const requiredModals = [
    'studentModal', 
    'courseModal', 
    'subscriptionModal', 
    'paymentModal', 
    'attendanceModal', 
    'editSubscriptionModal',
    'studentDetailModal',
    'courseDetailModal'
  ];

  const missingModals = [];
  
  requiredModals.forEach(modalId => {
    if (!document.getElementById(modalId)) {
      missingModals.push(modalId);
    }
  });

  if (missingModals.length > 0) {
    console.warn('⚠️ Missing modals:', missingModals.join(', '));
    console.info('💡 Add these modals to your HTML file for full functionality');
  } else {
    console.log('✅ All required modals found');
  }
}

// === Sidebar Toggle ===
function toggleSidebar() {
  const sidebar = document.getElementById('appSidebar');
  const overlay = document.getElementById('sidebarOverlay');
  
  if (sidebar) {
    sidebar.classList.toggle('collapsed');
  }
  
  if (overlay) {
    overlay.classList.toggle('active');
  }
}

// Initialize menu toggle
document.addEventListener('DOMContentLoaded', () => {
  const menuToggle = document.getElementById('menuToggle');
  const sidebarOverlay = document.getElementById('sidebarOverlay');
  
  if (menuToggle) {
    menuToggle.addEventListener('click', toggleSidebar);
  }
  
  if (sidebarOverlay) {
    sidebarOverlay.addEventListener('click', toggleSidebar);
  }
});

// === Search and Filter ===
function searchData(searchField, containerSelector, searchColumns = ['full_name', 'email']) {
  const searchTerm = document.getElementById(searchField)?.value.toLowerCase() || '';
  const rows = document.querySelectorAll(`${containerSelector} tbody tr`);

  rows.forEach(row => {
    let found = false;
    searchColumns.forEach(col => {
      const cell = row.querySelector(`td:nth-child(${searchColumns.indexOf(col) + 1})`);
      if (cell && cell.textContent.toLowerCase().includes(searchTerm)) {
        found = true;
      }
    });
    row.style.display = found ? '' : 'none';
  });
}

// === Export Functions ===
function exportToExcel(tableSelector, filename) {
  try {
    if (typeof XLSX === 'undefined') {
      showStatus('مكتبة Excel غير محملة', 'error');
      return;
    }

    const table = document.querySelector(tableSelector);
    if (!table) {
      showStatus('الجدول غير موجود', 'error');
      return;
    }

    const workbook = XLSX.utils.table_to_book(table);
    XLSX.writeFile(workbook, `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`);
    showStatus('✅ تم التصدير بنجاح', 'success');
  } catch (error) {
    console.error('❌ Export error:', error);
    showStatus('خطأ في التصدير', 'error');
  }
}

function exportStudentsExcel() {
  exportToExcel('table', 'الطلاب');
}

function exportCoursesExcel() {
  exportToExcel('table', 'الكورسات');
}

function exportSubscriptionsExcel() {
  exportToExcel('table', 'الاشتراكات');
}

function exportPaymentsExcel() {
  exportToExcel('table', 'الدفعات');
}

function exportAttendanceExcel() {
  exportToExcel('table', 'الحضور');
}

function exportExamsExcel() {
  exportToExcel('table', 'الاختبارات');
}

// === Print Functions ===
function printPaymentReceipt() {
  window.print();
}

function printAttendanceReceipt() {
  window.print();
}

function printCourses() {
  window.print();
}

function printExams() {
  window.print();
}

function printAttendance() {
  window.print();
}

// === Status Messages ===
let statusTimeout;
function displayStatusMessage(message, type = 'info') {
  const statusEl = document.getElementById('status');
  if (!statusEl) return;

  statusEl.textContent = message;
  statusEl.className = `status-message ${type}`;
  statusEl.style.display = 'block';

  if (statusTimeout) clearTimeout(statusTimeout);
  statusTimeout = setTimeout(() => {
    statusEl.style.display = 'none';
  }, 4000);
}

function showStatus(message, type = 'info') {
  displayStatusMessage(message, type);
}

// === Utility UI Functions ===
function confirmDelete(message = 'هل تريد حذف هذا البند؟') {
  return confirm(message);
}

function showConfirmDialog(message, onConfirm, onCancel) {
  const confirmed = confirm(message);
  if (confirmed) {
    onConfirm?.();
  } else {
    onCancel?.();
  }
}

// === Loading States ===
function showLoading(containerId, message = 'جاري التحميل...') {
  const container = document.getElementById(containerId);
  if (container) {
    container.innerHTML = `
      <div class="loading">
        <div class="loading-spinner"></div>
        <p>${message}</p>
      </div>
    `;
  }
}

function hideLoading(containerId) {
  const container = document.getElementById(containerId);
  if (container) {
    container.innerHTML = '';
  }
}

// === Toast/Notification System ===
function showNotification(type, message, duration = 3000) {
  // Support both (type, message) and (message, type) parameter orders
  if (typeof type === 'string' && ['success', 'error', 'warning', 'info'].includes(message)) {
    [type, message] = [message, type];
  }

  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 80px;
    right: 20px;
    background: ${
      type === 'success' ? '#10b981' : 
      type === 'error' ? '#ef4444' : 
      type === 'warning' ? '#f59e0b' :
      '#3b82f6'
    };
    color: white;
    padding: 15px 20px;
    border-radius: 8px;
    z-index: 9999;
    font-family: 'Tajawal', Arial, sans-serif;
    direction: rtl;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    animation: slideIn 0.3s ease-out;
  `;

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.animation = 'fadeOut 0.3s ease-out';
    setTimeout(() => notification.remove(), 300);
  }, duration);
}

// === Form Validation ===
function validateFormFields(formId, requiredFields) {
  const form = document.getElementById(formId);
  if (!form) return false;

  for (let fieldId of requiredFields) {
    const field = document.getElementById(fieldId);
    if (!field || !field.value) {
      showNotification('error', `الرجاء ملء الحقل: ${fieldId}`);
      return false;
    }
  }

  return true;
}

// === Dropdown Utilities ===
function populateSelectFromArray(selectId, array, valueKey = 'id', labelKey = 'name') {
  const select = document.getElementById(selectId);
  if (!select || !array) return;

  select.innerHTML = '<option value="">اختر...</option>';
  array.forEach(item => {
    const option = document.createElement('option');
    option.value = item[valueKey];
    option.textContent = item[labelKey];
    select.appendChild(option);
  });
}

// === Tab Content Management ===
function clearTabContent(tabName) {
  const tab = document.getElementById(`${tabName}Content`);
  if (tab) {
    tab.innerHTML = '<div class="loading"><div class="loading-spinner"></div></div>';
  }
}

function updateTabContent(tabName, htmlContent) {
  const tab = document.getElementById(`${tabName}Content`);
  if (tab) {
    tab.innerHTML = htmlContent;
  }
}

// === Real-time Updates ===
function subscribeToTabUpdates(tableName, callback) {
  if (!window.supabase) return;

  try {
    window.supabase
      .channel(`public:${tableName}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: tableName }, callback)
      .subscribe();
  } catch (error) {
    console.error('❌ Subscription error:', error);
  }
}

// === Currency and Date Formatters ===
function formatCurrencyForDisplay(amount) {
  const num = Number(amount) || 0;
  return num.toLocaleString('ar-EG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }) + ' ج.م';
}

function formatCurrency(amount) {
  return formatCurrencyForDisplay(amount);
}

function formatDateForDisplay(dateString) {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return isNaN(date) ? '-' : date.toLocaleDateString('ar-EG', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

// === Responsive Table Functions ===
function makeTableResponsive(tableSelector) {
  const tables = document.querySelectorAll(tableSelector);
  tables.forEach(table => {
    if (table.classList.contains('responsive-table')) return;
    
    table.classList.add('responsive-table');
    const headerCells = table.querySelectorAll('thead th');
    
    table.querySelectorAll('tbody tr').forEach(row => {
      row.querySelectorAll('td').forEach((cell, index) => {
        if (headerCells[index]) {
          cell.setAttribute('data-label', headerCells[index].textContent);
        }
      });
    });
  });
}

// === Auto-refresh Management ===
let autoRefreshInterval = null;

function startAutoRefresh(callback, interval = 30000) {
  if (autoRefreshInterval) clearInterval(autoRefreshInterval);
  autoRefreshInterval = setInterval(callback, interval);
}

function stopAutoRefresh() {
  if (autoRefreshInterval) {
    clearInterval(autoRefreshInterval);
    autoRefreshInterval = null;
  }
}

// === Keyboard Shortcuts ===
document.addEventListener('keydown', function(event) {
  // Ctrl/Cmd + S = Save
  if ((event.ctrlKey || event.metaKey) && event.key === 's') {
    event.preventDefault();
    const activeForm = document.querySelector('form:focus-within');
    if (activeForm) activeForm.dispatchEvent(new Event('submit'));
  }

  // Esc = Close modals
  if (event.key === 'Escape') {
    document.querySelectorAll('.modal').forEach(modal => {
      if (modal.style.display === 'flex' || modal.classList.contains('active')) {
        closeModal(modal.id);
      }
    });
  }
});

// === Helper Functions for Forms ===
function addModuleField() {
  const container = document.getElementById('modulesContainer');
  if (!container) return;

  const fieldId = 'module_' + Date.now();
  const html = `
    <div class="form-group" id="${fieldId}" style="border: 1px solid #ddd; padding: 10px; margin-bottom: 10px; border-radius: 5px;">
      <input type="text" placeholder="اسم الوحدة" class="module-name" required style="margin-bottom: 5px;">
      <button type="button" class="btn btn-danger btn-sm" onclick="removeField('${fieldId}')">حذف</button>
    </div>
  `;
  container.insertAdjacentHTML('beforeend', html);
}

function addLessonField() {
  const container = document.getElementById('lessonsContainer');
  if (!container) return;

  const fieldId = 'lesson_' + Date.now();
  const html = `
    <div class="form-group" id="${fieldId}" style="border: 1px solid #ddd; padding: 10px; margin-bottom: 10px; border-radius: 5px;">
      <input type="text" placeholder="عنوان الدرس" class="lesson-title" required style="margin-bottom: 5px;">
      <textarea placeholder="محتوى الدرس" class="lesson-content" rows="2" style="margin-bottom: 5px;"></textarea>
      <button type="button" class="btn btn-danger btn-sm" onclick="removeField('${fieldId}')">حذف</button>
    </div>
  `;
  container.insertAdjacentHTML('beforeend', html);
}

function removeField(fieldId) {
  const field = document.getElementById(fieldId);
  if (field) field.remove();
}

function updateCoursePrice() {
  const courseSelect = document.getElementById('courseSelect') || document.getElementById('course');
  const paymentAmount = document.getElementById('paymentAmount');
  
  if (!courseSelect || !paymentAmount) return;
  
  const courseId = courseSelect.value;
  const course = (window.courses || []).find(c => c.id === courseId);
  
  if (course) {
    paymentAmount.placeholder = `السعر: ${formatCurrency(course.price)}`;
  }
}

function calculateRemaining() {
  const courseSelect = document.getElementById('courseSelect') || document.getElementById('course');
  const paymentAmount = document.getElementById('paymentAmount');
  const remainingAmount = document.getElementById('remainingAmount');
  
  if (!courseSelect || !paymentAmount || !remainingAmount) return;
  
  const courseId = courseSelect.value;
  const course = (window.courses || []).find(c => c.id === courseId);
  const paid = parseFloat(paymentAmount.value) || 0;
  
  if (course) {
    const remaining = course.price - paid;
    remainingAmount.value = remaining > 0 ? formatCurrency(remaining) : '0 ج.م';
  }
}

// === Real-time Data Sync ===
function setupRealtimeSync() {
  try {
    if (!window.supabase) {
      console.warn('⚠️ Supabase not initialized for realtime sync');
      return;
    }

    // Subscribe to subscriptions changes
    window.supabase
      .channel('public:subscriptions')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'subscriptions' },
        (payload) => {
          console.log('📡 Subscription data changed:', payload);
          if (typeof loadSubscriptions === 'function') loadSubscriptions();
        }
      )
      .subscribe();

    // Subscribe to payments changes
    window.supabase
      .channel('public:payments')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'payments' },
        (payload) => {
          console.log('📡 Payment data changed:', payload);
          if (typeof loadPayments === 'function') loadPayments();
        }
      )
      .subscribe();

    console.log('✅ Real-time sync initialized');
  } catch (error) {
    console.error('❌ Realtime sync error:', error);
  }
}

// === Global Error Handler ===
window.addEventListener('error', function(event) {
  console.error('💥 Global error:', event.error);
});

window.addEventListener('unhandledrejection', function(event) {
  console.error('💥 Unhandled promise rejection:', event.reason);
});

console.log('✅ Secretary UI loaded successfully');