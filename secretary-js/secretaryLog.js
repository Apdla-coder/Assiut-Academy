// ✅ تحميل المستخدم الحالي
async function loadCurrentUser() {
  try {
    const { data, error } = await supabaseClient.auth.getUser();
    if (error) throw error;

    if (data?.user) {
      window.userId = data.user.id;
      console.log("✅ المستخدم الحالي:", window.userId);
      if (typeof window.loadSecretaryStatus === "function") {
        window.loadSecretaryStatus();
      }
    } else {
      window.location.href = "index.html";
    }
  } catch (err) {
    console.error("❌ خطأ في جلب المستخدم:", err);
    showStatus?.("فشل التحقق من المستخدم", "error");
    window.location.href = "index.html";
  }
}

// ✅ تحميل حالة السكرتير
async function loadSecretaryStatus() {
  if (!window.userId) return;

  const today = new Date().toISOString().split("T")[0];
  const { data: record, error } = await supabaseClient
    .from("secretary_attendance")
    .select("*")
    .eq("secretary_id", window.userId)
    .eq("attendance_date", today)
    .maybeSingle();

  const statusEl = document.getElementById("secretaryStatus");
  const checkInBtn = document.getElementById("secCheckIn");
  const checkOutBtn = document.getElementById("secCheckOut");

  if (error) {
    console.error("❌ خطأ في جلب الحالة:", error);
    statusEl.textContent = "⚠️ خطأ في الاتصال";
    return;
  }

  if (!record) {
    statusEl.textContent = "⏳ لم يتم تسجيل الحضور بعد";
    checkInBtn.disabled = false;
    checkOutBtn.disabled = true;
    return;
  }

  if (!record.check_in) {
    statusEl.textContent = "⏳ لم يتم تسجيل الحضور بعد";
    checkInBtn.disabled = false;
    checkOutBtn.disabled = true;
  } else if (record.check_in && !record.check_out) {
    statusEl.textContent = "✅ تم الحضور (في انتظار الانصراف)";
    checkInBtn.disabled = true;
    checkOutBtn.disabled = false;
  } else {
    statusEl.textContent = "👋 تم الحضور والانصراف";
    checkInBtn.disabled = true;
    checkOutBtn.disabled = true;
  }
}

// ✅ تسجيل الحضور
async function checkInSecretary() {
  if (!window.userId) return;

  const today = new Date().toISOString().split("T")[0];
  const now = new Date().toISOString();

  try {
    const { error } = await supabaseClient
      .from("secretary_attendance")
      .upsert(
        {
          secretary_id: window.userId,
          attendance_date: today,
          check_in: now,
        },
        { onConflict: ["secretary_id", "attendance_date"] }
      );

    if (error) throw error;

    showStatus("✅ تم تسجيل الحضور", "success");
    window.loadSecretaryStatus();
  } catch (error) {
    console.error("❌ خطأ في تسجيل الحضور:", error);
    showStatus("خطأ في تسجيل الحضور", "error");
  }
}

async function checkOutSecretary() {
  if (!window.userId) {
    showStatus("❌ لم يتم تحميل المستخدم", "error");
    return;
  }

  const today = new Date().toISOString().split("T")[0];
  const now = new Date().toISOString();

  try {
    const { data: existing, error: fetchError } = await supabaseClient
      .from("secretary_attendance")
      .select("id, check_in, check_out")
      .eq("secretary_id", window.userId)
      .eq("attendance_date", today)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!existing) {
      showStatus("⚠️ لم يتم تسجيل الحضور بعد", "warning");
      return;
    }
    if (!existing.check_in) {
      showStatus("⚠️ لا يمكن الانصراف بدون حضور", "warning");
      return;
    }
    if (existing.check_out) {
      showStatus("ℹ️ تم الانصراف مسبقًا", "info");
      return;
    }

    // ✅ نستخدم update مباشرةً
    const { error: updateError } = await supabaseClient
      .from("secretary_attendance")
      .update({ check_out: now })
      .eq("id", existing.id);

    if (updateError) throw updateError;

    console.log("✅ تم تسجيل الانصراف بنجاح:", now);
    showStatus("👋 تم تسجيل الانصراف", "success");
    window.loadSecretaryStatus();
  } catch (error) {
    console.error("❌ خطأ غير متوقع:", error);
    showStatus("حدث خطأ", "error");
  }
}

// ✅ عرض السجل
async function renderSecretaryLog() {
  const logEl = document.getElementById("secretaryLog");
  const statusEl = document.getElementById("secretaryStatus");
  if (!logEl || typeof supabaseClient === "undefined" || !window.userId) return;

  statusEl.textContent = "جارٍ تحميل سجل السكرتير...";
  try {
    const today = new Date().toISOString().split("T")[0];
    const { data, error } = await supabaseClient
      .from("secretary_attendance")
      .select("*")
      .eq("secretary_id", window.userId)
      .order("attendance_date", { ascending: false })
      .limit(50);

    if (error) throw error;
    if (!data || !data.length) {
      logEl.innerHTML = '<p class="no-data">لا يوجد سجلات.</p>';
      statusEl.textContent = "لم يتم تسجيل حضور اليوم.";
      return;
    }

    logEl.innerHTML = data
      .map(
        (r) => `
        <div class="secretary-log-card">
          <div><strong>التاريخ:</strong> ${r.attendance_date}</div>
          <div><strong>دخول:</strong> ${
            r.check_in ? new Date(r.check_in).toLocaleTimeString("ar-EG") : "-"
          }</div>
          <div><strong>خروج:</strong> ${
            r.check_out ? new Date(r.check_out).toLocaleTimeString("ar-EG") : "-"
          }</div>
        </div>
      `
      )
      .join("");

    // ✅ تحديث حالة اليوم
    const todayRec = data.find((d) => d.attendance_date === today);
    if (todayRec) {
      statusEl.textContent =
        (todayRec.check_in ? "تم تسجيل الحضور" : "لم يتم تسجيل الحضور") +
        (todayRec.check_out ? " - تم تسجيل الانصراف" : "");
    } else {
      statusEl.textContent = "⏳ لم يتم تسجيل الحضور بعد";
    }
  } catch (err) {
    console.error("❌ خطأ في تحميل سجل السكرتير:", err);
    logEl.innerHTML = '<p class="no-data">خطأ في تحميل السجل.</p>';
    statusEl.textContent = "⚠️ خطأ في تحميل الحالة";
  }
}

// ✅ جعل الدوال عالمية
window.loadCurrentUser = loadCurrentUser;
window.loadSecretaryStatus = loadSecretaryStatus;
window.checkInSecretary = checkInSecretary;
window.checkOutSecretary = checkOutSecretary;
window.renderSecretaryLog = renderSecretaryLog;

// ✅ ربط الأحداث بعد تحميل الصفحة
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("secCheckIn")?.addEventListener("click", checkInSecretary);
  document.getElementById("secCheckOut")?.addEventListener("click", checkOutSecretary);

  document.getElementById("secShowLog")?.addEventListener("click", (e) => {
    const wrapper = document.getElementById("secretaryLogWrapper");
    if (wrapper.style.display === "none" || wrapper.style.display === "") {
      wrapper.style.display = "block";
      renderSecretaryLog();
      e.target.textContent = "إخفاء السجل";
    } else {
      wrapper.style.display = "none";
      e.target.textContent = "عرض السجل";
    }
  });

  loadCurrentUser();
});
