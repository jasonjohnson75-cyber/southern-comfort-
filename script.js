
const menuBtn = document.querySelector('.menu-btn');
const nav = document.querySelector('.main-nav');

menuBtn?.addEventListener('click', () => {
  const isOpen = nav.classList.toggle('open');
  menuBtn.setAttribute('aria-expanded', String(isOpen));
  if (isOpen) {
    nav.style.display='flex';
    nav.style.position='absolute';
    nav.style.top='72px';
    nav.style.left='14px';
    nav.style.right='14px';
    nav.style.background='#fff';
    nav.style.padding='18px';
    nav.style.flexDirection='column';
    nav.style.boxShadow='0 12px 28px rgba(0,0,0,.14)';
    nav.style.borderRadius='10px';
  } else {
    nav.removeAttribute('style');
  }
});

// Close mobile navigation when a link is selected.
document.querySelectorAll('.main-nav a').forEach(link => {
  link.addEventListener('click', () => {
    nav.classList.remove('open');
    nav.removeAttribute('style');
    menuBtn?.setAttribute('aria-expanded', 'false');
  });
});

// Preselect the most relevant service/request when CTA buttons are clicked.
const serviceSelect = document.getElementById('serviceSelect');
document.querySelectorAll('.action-link').forEach(link => {
  link.addEventListener('click', () => {
    const requested = link.dataset.request;
    if (!requested || !serviceSelect) return;
    const options = [...serviceSelect.options];
    const exact = options.find(o => o.text.trim() === requested);
    if (exact) serviceSelect.value = exact.value;
  });
});

// Functional no-backend fallback: build a pre-addressed email from the service form.
document.getElementById('requestForm')?.addEventListener('submit', (e) => {
  e.preventDefault();
  const data = new FormData(e.currentTarget);
  const subject = encodeURIComponent(`Southern Comfort Website Request - ${data.get('service') || 'Service'}`);
  const body = encodeURIComponent(
`Name: ${data.get('name') || ''}
Phone: ${data.get('phone') || ''}
Email: ${data.get('email') || ''}
Service / Request: ${data.get('service') || ''}

Message:
${data.get('message') || ''}`
  );
  window.location.href = `mailto:souconcom1995@yahoo.com?subject=${subject}&body=${body}`;
});
