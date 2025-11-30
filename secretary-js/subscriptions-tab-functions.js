// ============================================================================
// SUBSCRIPTIONS TAB - All subscription management functions
// ============================================================================

async function loadSubscriptionsTab() {
  try {
    console.log('📋 Loading subscriptions tab...');
    
    const container = document.getElementById('subscriptionsContainer');
    if (!container) {
      console.error('❌ Container not found!');
      return;
    }
    
    container.innerHTML = `
      <div class="loading">
        <div class="loading-spinner"></div>
        <p>جاري تحميل بيانات الاشتراكات...</p>
      </div>
    `;
    
    console.log('🔄 Loading data...');
    await Promise.all([
      loadSubscriptions(true),
      loadStudents(true),
      loadCourses(true),
      loadPayments(true)
    ]);
    
    console.log('✅ Data loaded - Subscriptions:', window.subscriptions?.length);
    
    if (window.subscriptions && window.subscriptions.length > 0) {
      console.log('🎨 Rendering subscriptions...');
      renderSubscriptionsTable(window.subscriptions, container);
    } else {
      console.log('⚠️ No subscriptions found');
      container.innerHTML = `
        <div style="padding: 60px 20px; text-align: center; color: #999;">
          <i class="fas fa-inbox" style="font-size: 4rem; margin-bottom: 20px; display: block; opacity: 0.5;"></i>
          <h3 style="margin: 0 0 10px 0; color: #666;">لا توجد اشتراكات</h3>
          <p style="margin: 0 0 20px 0; color: #999; font-size: 0.9em;">ابدأ بإضافة اشتراك جديد</p>
          <button class="btn btn-primary" onclick="showAddSubscriptionModal()">
            <i class="fas fa-plus"></i> إضافة اشتراك
          </button>
        </div>
      `;
    }
    
    console.log('✅ Subscriptions tab loaded successfully');
  } catch (error) {
    console.error('❌ Error loading subscriptions tab:', error);
    const container = document.getElementById('subscriptionsContainer');
    if (container) {
      container.innerHTML = `
        <div style="padding: 40px; text-align: center; color: #ef4444;">
          <i class="fas fa-exclamation-triangle" style="font-size: 3rem; margin-bottom: 15px;"></i>
          <p>خطأ في تحميل البيانات</p>
          <p style="font-size: 0.9rem; color: #999;">${error.message}</p>
          <button class="btn btn-primary" onclick="loadSubscriptionsTab()" style="margin-top: 15px;">
            <i class="fas fa-sync-alt"></i> إعادة المحاولة
          </button>
        </div>
      `;
    }
  }
}

function renderSubscriptionsTable(data, container) {
  console.log('🎨 renderSubscriptionsTable called with', data?.length, 'records');
  
  if (!container) {
    console.error('❌ Container not found in renderSubscriptionsTable');
    return;
  }

  let html = `
    <div class="table-container">
      <div style="display: flex; gap: 10px; margin-bottom: 20px; flex-wrap: wrap;">
        <button class="btn btn-primary" onclick="showAddSubscriptionModal()" style="flex: 1; min-width: 150px;">
          <i class="fas fa-plus"></i> إضافة اشتراك جديد
        </button>
        <button class="btn btn-success" onclick="exportSubscriptionsExcel()" style="flex: 1; min-width: 150px;">
          <i class="fas fa-file-excel"></i> تحميل البيانات
        </button>
        <button class="btn btn-info" onclick="printSubscriptions()" style="flex: 1; min-width: 150px;">
          <i class="fas fa-print"></i> طباعة
        </button>
      </div>

      <div class="search-filter" style="display: flex; gap: 10px; margin-bottom: 20px;">
        <div class="search-box" style="flex: 1;">
          <input type="text" id="subscriptionSearch" placeholder="ابحث عن طالب أو كورس..." onkeyup="filterSubscriptions()" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px;">
        </div>
        <select id="subscriptionStatusFilter" onchange="filterSubscriptions()" style="padding: 10px; border: 1px solid #ddd; border-radius: 4px; min-width: 150px;">
          <option value="all">جميع الحالات</option>
          <option value="active">نشط فقط</option>
          <option value="inactive">منتهي فقط</option>
        </select>
      </div>`;

  if (!data || data.length === 0) {
    html += `
      <div style="padding: 60px 20px; text-align: center; color: #999;">
        <i class="fas fa-inbox" style="font-size: 4rem; margin-bottom: 20px; display: block; opacity: 0.5;"></i>
        <h3 style="margin: 0 0 10px 0; color: #666;">لا توجد اشتراكات</h3>
        <p style="margin: 0 0 20px 0; color: #999; font-size: 0.9em;">ابدأ بإضافة اشتراك جديد</p>
        <button class="btn btn-primary" onclick="showAddSubscriptionModal()">
          <i class="fas fa-plus"></i> إضافة اشتراك
        </button>
      </div>
    `;
  } else {
    const activeCount = data.filter(s => s.status === 'active').length;
    const inactiveCount = data.length - activeCount;

    html += `
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 20px;">
        <div style="background: #e3f2fd; padding: 12px; border-radius: 6px; text-align: center;">
          <p style="margin: 0; color: #1976d2; font-size: 0.85em;">إجمالي الاشتراكات</p>
          <p style="margin: 5px 0 0 0; font-size: 1.5em; font-weight: 700; color: #1565c0;">${data.length}</p>
        </div>
        <div style="background: #e8f5e9; padding: 12px; border-radius: 6px; text-align: center;">
          <p style="margin: 0; color: #388e3c; font-size: 0.85em;">✓ الاشتراكات النشطة</p>
          <p style="margin: 5px 0 0 0; font-size: 1.5em; font-weight: 700; color: #2e7d32;">${activeCount}</p>
        </div>
        <div style="background: #ffebee; padding: 12px; border-radius: 6px; text-align: center;">
          <p style="margin: 0; color: #c62828; font-size: 0.85em;">✗ المنتهية</p>
          <p style="margin: 5px 0 0 0; font-size: 1.5em; font-weight: 700; color: #b71c1c;">${inactiveCount}</p>
        </div>
      </div>

      <table style="width: 100%; border-collapse: collapse; background: white; border-radius: 6px; overflow: hidden;">
        <thead>
          <tr style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">
            <th style="padding: 12px; text-align: right; font-weight: 600;">👤 الطالب</th>
            <th style="padding: 12px; text-align: right; font-weight: 600;">📖 الكورس</th>
            <th style="padding: 12px; text-align: right; font-weight: 600;">💰 السعر</th>
            <th style="padding: 12px; text-align: right; font-weight: 600;">📅 التاريخ</th>
            <th style="padding: 12px; text-align: right; font-weight: 600;">الحالة</th>
            <th style="padding: 12px; text-align: right; font-weight: 600;">الإجراءات</th>
          </tr>
        </thead>
        <tbody>
          ${data.map((sub, idx) => `
            <tr style="border-bottom: 1px solid #eee; ${idx % 2 === 0 ? 'background: #f9f9f9;' : 'background: white;'} transition: background 0.2s;">
              <td style="padding: 12px; text-align: right; font-weight: 500;">${escapeHtml(sub.student_name || '-')}</td>
              <td style="padding: 12px; text-align: right;">${escapeHtml(sub.course_name || '-')}</td>
              <td style="padding: 12px; text-align: right; font-weight: 600; color: #2e7d32;">${formatCurrency(sub.course_price || 0)}</td>
              <td style="padding: 12px; text-align: right; font-size: 0.9em;">${formatDate(sub.subscribed_at)}</td>
              <td style="padding: 12px; text-align: right;">
                <span style="display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 0.85em; font-weight: 600; ${
                  sub.status === 'active' 
                    ? 'background: #c8e6c9; color: #1b5e20;' 
                    : 'background: #ffcdd2; color: #b71c1c;'
                }">
                  ${sub.status === 'active' ? '✓ نشط' : '✗ منتهي'}
                </span>
              </td>
              <td style="padding: 12px; text-align: right;">
                <button class="action-btn" onclick="showSubscriptionDetails('${sub.id}')" style="padding: 5px 10px; margin: 0 2px; background: #667eea; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.85em;">📋</button>
                <button class="action-btn" onclick="editSubscription('${sub.id}')" style="padding: 5px 10px; margin: 0 2px; background: #4caf50; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.85em;">✏️</button>
                <button class="action-btn" onclick="deleteSubscription('${sub.id}')" style="padding: 5px 10px; margin: 0 2px; background: #f44336; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.85em;">🗑️</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>`;
  }
  
  html += '</div>';
  container.innerHTML = html;
  console.log('✅ Subscriptions table rendered successfully');
}

function filterSubscriptions() {
  const searchTerm = document.getElementById('subscriptionSearch')?.value || '';
  const statusFilter = document.getElementById('subscriptionStatusFilter')?.value || 'all';
  const container = document.getElementById('subscriptionsContainer');
  if (!container) return;

  let filtered = (window.subscriptions || []).filter(sub => {
    const matchSearch = !searchTerm || 
      sub.student_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.course_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchStatus = statusFilter === 'all' || sub.status === statusFilter;
    return matchSearch && matchStatus;
  });

  renderSubscriptionsTable(filtered, container);
}

function showSubscriptionDetails(subscriptionId) {
  try {
    console.log('📋 Showing subscription details for:', subscriptionId);
    const subscription = (window.subscriptions || []).find(s => s.id === subscriptionId);
    if (!subscription) {
      showStatus('لم يتم العثور على الاشتراك', 'error');
      return;
    }

    const detailsHTML = `
      <div class="subscription-details-modal">
        <div class="details-header" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; margin-bottom: 20px;">
          <h2 style="margin: 0; font-size: 1.5em;">تفاصيل الاشتراك</h2>
          <p style="margin: 8px 0 0 0; opacity: 0.9; font-size: 0.9em;">معلومات الاشتراك الكاملة</p>
        </div>

        <div style="padding: 20px;">
          <div class="details-section">
            <h3 style="color: #667eea; border-bottom: 2px solid #667eea; padding-bottom: 10px;">📚 معلومات الاشتراك</h3>
            <div class="details-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 15px;">
              <div>
                <label style="color: #666; font-size: 0.9em; display: block; margin-bottom: 5px;">👤 اسم الطالب:</label>
                <p style="margin: 0; font-weight: 600; font-size: 1.1em; color: #333;">${escapeHtml(subscription.student_name || '-')}</p>
              </div>
              <div>
                <label style="color: #666; font-size: 0.9em; display: block; margin-bottom: 5px;">📖 اسم الكورس:</label>
                <p style="margin: 0; font-weight: 600; font-size: 1.1em; color: #333;">${escapeHtml(subscription.course_name || '-')}</p>
              </div>
            </div>
          </div>

          <div class="details-section" style="margin-top: 20px;">
            <h3 style="color: #667eea; border-bottom: 2px solid #667eea; padding-bottom: 10px;">📅 تاريخ والسعر</h3>
            <div class="details-grid" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-top: 15px;">
              <div style="background: #e3f2fd; padding: 15px; border-radius: 6px; text-align: center;">
                <p style="margin: 0; color: #1976d2; font-size: 0.85em;">📆 تاريخ الاشتراك</p>
                <p style="margin: 8px 0 0 0; font-weight: 700; color: #1565c0; font-size: 1.05em;">${formatDate(subscription.subscribed_at)}</p>
              </div>
              <div style="background: #e8f5e9; padding: 15px; border-radius: 6px; text-align: center;">
                <p style="margin: 0; color: #388e3c; font-size: 0.85em;">💰 سعر الكورس</p>
                <p style="margin: 8px 0 0 0; font-weight: 700; color: #2e7d32; font-size: 1.05em;">${formatCurrency(subscription.course_price || 0)}</p>
              </div>
            </div>
          </div>

          <div class="details-section" style="margin-top: 20px;">
            <h3 style="color: #667eea; border-bottom: 2px solid #667eea; padding-bottom: 10px;">⚙️ حالة الاشتراك</h3>
            <div style="margin-top: 15px;">
              <span style="display: inline-block; padding: 10px 16px; border-radius: 20px; font-weight: 600; font-size: 1.05em; ${
                subscription.status === 'active' 
                  ? 'background: #e8f5e9; color: #2e7d32;' 
                  : 'background: #ffebee; color: #c62828;'
              }">
                ${subscription.status === 'active' ? '✓ نشط' : '✗ منتهي'}
              </span>
            </div>
          </div>

          <div class="details-section" style="margin-top: 20px; padding: 12px; background: #f5f7fa; border-radius: 6px;">
            <p style="margin: 0; color: #666; font-size: 0.85em;">
              <strong>معرف الاشتراك:</strong> ${subscription.id}
            </p>
            <p style="margin: 8px 0 0 0; color: #666; font-size: 0.85em;">
              <strong>تاريخ الإنشاء:</strong> ${formatDate(subscription.created_at)}
            </p>
          </div>
        </div>

        <div style="padding: 20px; background: #f5f7fa; border-radius: 0 0 8px 8px; display: flex; gap: 10px; justify-content: flex-end;">
          <button onclick="closeSubscriptionDetails()" class="btn btn-secondary" style="padding: 8px 16px;">إغلاق</button>
          <button onclick="closeSubscriptionDetails(); editSubscription('${subscription.id}')" class="btn btn-primary" style="padding: 8px 16px;">تعديل</button>
        </div>
      </div>
    `;

    let detailsModal = document.getElementById('subscriptionDetailsModal');
    if (!detailsModal) {
      detailsModal = document.createElement('div');
      detailsModal.id = 'subscriptionDetailsModal';
      detailsModal.className = 'modal';
      detailsModal.style.cssText = 'display: flex; position: fixed; top: 0; left: 0; right: 0; bottom: 0; align-items: center; justify-content: center; background: rgba(0,0,0,0.5); z-index: 1000;';
      document.body.appendChild(detailsModal);
    }

    detailsModal.innerHTML = `
      <div class="modal-content" style="width: 90%; max-width: 700px; max-height: 80vh; overflow-y: auto; background: white; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.2);">
        ${detailsHTML}
      </div>
    `;
    detailsModal.style.display = 'flex';

    detailsModal.onclick = (e) => {
      if (e.target === detailsModal) closeSubscriptionDetails();
    };

  } catch (error) {
    console.error('❌ Error showing subscription details:', error);
    showStatus('خطأ في عرض التفاصيل', 'error');
  }
}

function closeSubscriptionDetails() {
  const modal = document.getElementById('subscriptionDetailsModal');
  if (modal) {
    modal.style.display = 'none';
  }
}

function exportSubscriptionsExcel() {
  try {
    const data = (window.subscriptions || []).map((s, idx) => ({
      '#': idx + 1,
      'اسم الطالب': s.student_name || '-',
      'اسم الكورس': s.course_name || '-',
      'سعر الكورس': formatCurrency(s.course_price || 0),
      'تاريخ الاشتراك': formatDate(s.subscribed_at),
      'الحالة': s.status === 'active' ? '✓ نشط' : '✗ منتهي'
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    ws.A1.s = { font: { bold: true }, fill: { fgColor: { rgb: "FFD700" } } };
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'الاشتراكات');
    XLSX.writeFile(wb, `الاشتراكات_${new Date().toLocaleDateString('ar-EG')}.xlsx`);
    
    showStatus('✅ تم تصدير البيانات بنجاح', 'success');
  } catch (error) {
    console.error('❌ Error exporting subscriptions:', error);
    showStatus('خطأ في التصدير', 'error');
  }
}

function printSubscriptions() {
  try {
    const table = document.querySelector('#subscriptionsContainer table');
    
    if (!table) {
      showStatus('لا توجد بيانات للطباعة', 'error');
      return;
    }

    const printWindow = window.open('', '', 'height=600,width=1000');
    printWindow.document.write(`
      <html>
        <head>
          <title>تقرير الاشتراكات</title>
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
          </style>
        </head>
        <body>
          <div class="header">
            <h2>تقرير الاشتراكات</h2>
            <p>تاريخ الطباعة: ${new Date().toLocaleDateString('ar-EG')}</p>
          </div>
          ${table.outerHTML}
          <div class="footer">
            <p>تم إنشاء هذا التقرير من نظام إدارة الأكاديمية</p>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  } catch (error) {
    console.error('❌ Error printing subscriptions:', error);
    showStatus('خطأ في الطباعة', 'error');
  }
}