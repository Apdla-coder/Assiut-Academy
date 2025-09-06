(function(){
  let toggle = document.getElementById('menuToggle');
  const sidebar = document.getElementById('appSidebar');
  const overlay = document.getElementById('sidebarOverlay');
  const navLinks = document.querySelectorAll('.sidebar .nav-link');

  if (toggle && toggle.parentNode) {
    const clone = toggle.cloneNode(true);
    toggle.parentNode.replaceChild(clone, toggle);
    toggle = clone;
  }

  function openSidebar(){
    sidebar.classList.add('active');
    overlay.classList.add('active');
  }
  function closeSidebar(){
    sidebar.classList.remove('active');
    overlay.classList.remove('active');
  }

  if (toggle && sidebar && overlay) {
    toggle.addEventListener('click', e => {
      e.preventDefault();
      sidebar.classList.contains('active') ? closeSidebar() : openSidebar();
    });
    overlay.addEventListener('click', closeSidebar);
    navLinks.forEach(link => link.addEventListener('click', () => {
      if (window.innerWidth <= 768) closeSidebar();
    }));
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeSidebar(); });
  }
})();
