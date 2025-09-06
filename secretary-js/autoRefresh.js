(function () {
  try {
    const key = "assiut_academy_refreshed_v1";
    if (!sessionStorage.getItem(key)) {
      sessionStorage.setItem(key, "1");
      setTimeout(() => {
        try { location.reload(); } 
        catch (e) { console.warn("reload failed", e); }
      }, 200);
    } else {
      sessionStorage.removeItem(key);
    }
  } catch (err) {
    console.warn("Auto-refresh script error", err);
  }
})();
