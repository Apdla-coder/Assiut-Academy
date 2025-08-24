(function(){
  async function renderSecretaryLog(){
    const logEl = document.getElementById('secretaryLog');
    const statusEl = document.getElementById('secretaryStatus');
    if (!logEl || typeof supabaseClient === 'undefined') return;

    statusEl.textContent = 'جارٍ تحميل سجل السكرتير...';
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabaseClient
        .from('secretary_attendance')
        .select('*')
        .order('date', { ascending: false })
        .limit(50);

      if (error) throw error;
      if (!data || !data.length) {
        logEl.innerHTML = '<p class="no-data">لا يوجد سجلات.</p>';
        statusEl.textContent = 'لم يتم تسجيل حضور اليوم.';
        return;
      }

      logEl.innerHTML = data.map(r => `
        <div class="secretary-log-card">
          <div><strong>التاريخ:</strong> ${r.date}</div>
          <div><strong>دخول:</strong> ${r.check_in ? new Date(r.check_in).toLocaleTimeString('ar-EG') : '-'}</div>
          <div><strong>خروج:</strong> ${r.check_out ? new Date(r.check_out).toLocaleTimeString('ar-EG') : '-'}</div>
        </div>
      `).join('');

      const todayRec = data.find(d => d.date === today);
      if (todayRec) {
        statusEl.textContent = `${todayRec.check_in ? 'تم تسجيل الحضور' : 'لم يتم تسجيل الحضور'} ${todayRec.check_out ? '- تم تسجيل الانصراف' : ''}`;
      }
    } catch (err) {
      console.error('Error loading secretary log', err);
      logEl.innerHTML = '<p class="no-data">خطأ في تحميل السجل.</p>';
      statusEl.textContent = 'خطأ في تحميل الحالة';
    }
  }

  document.addEventListener('click', function(e){
    if (e.target.closest('#secShowLog')) {
      const wrapper = document.getElementById('secretaryLogWrapper');
      if (wrapper.style.display === 'none' || wrapper.style.display === '') {
        wrapper.style.display = 'block';
        renderSecretaryLog();
        e.target.textContent = 'إخفاء السجل';
      } else {
        wrapper.style.display = 'none';
        e.target.textContent = 'عرض السجل';
      }
    }
    if (e.target.closest('#secCheckIn') && typeof checkInSecretary === 'function') checkInSecretary();
    if (e.target.closest('#secCheckOut') && typeof checkOutSecretary === 'function') checkOutSecretary();
  });

  window.addEventListener('load', () => setTimeout(renderSecretaryLog, 300));
  window.renderSecretaryLog = renderSecretaryLog;
})();
