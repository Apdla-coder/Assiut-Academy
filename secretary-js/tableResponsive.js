(function(){
  function applyDataLabels(table){
    const headers = Array.from(table.querySelectorAll('thead th')).map(th => th.textContent.trim());
    table.querySelectorAll('tbody tr').forEach(row => {
      Array.from(row.children).forEach((td, idx) => {
        if (!td.hasAttribute('data-label') && headers[idx]) {
          td.setAttribute('data-label', headers[idx]);
        }
      });
    });
  }

  function applyAll(){ document.querySelectorAll('table').forEach(applyDataLabels); }

  window.addEventListener('load', applyAll);
  const observer = new MutationObserver(() => setTimeout(applyAll, 50));
  observer.observe(document.body, { childList: true, subtree: true });
})();
