// تحكم في المودال (فتح/إغلاق/أزرار)
document.addEventListener("DOMContentLoaded", () => {
  const modal = document.getElementById("waPreviewModal");
  const closeBtns = [
    document.getElementById("waPreviewClose"),
    document.getElementById("waCloseBtn")
  ];

  // غلق المودال
  closeBtns.forEach(btn => {
    if (btn) btn.addEventListener("click", () => modal.style.display = "none");
  });

  // نسخ النص
  const copyBtn = document.getElementById("waCopyBtn");
  if (copyBtn) {
    copyBtn.addEventListener("click", () => {
      const textArea = document.getElementById("waPreviewMessage");
      textArea.select();
      document.execCommand("copy");
      alert("تم نسخ النص ✔");
    });
  }

  // فتح واتساب
  const openBtn = document.getElementById("waOpenBtn");
  if (openBtn) {
    openBtn.addEventListener("click", () => {
      const phone = document.getElementById("waPreviewPhone").textContent.trim();
      const message = document.getElementById("waPreviewMessage").value;
      const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
      window.open(url, "_blank");
    });
  }
});
