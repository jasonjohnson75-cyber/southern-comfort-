
const menuBtn = document.querySelector('.menu-btn');
const nav = document.querySelector('.main-nav');

function closeMenu() {
  if (!nav || !menuBtn) return;
  nav.classList.remove('open');
  menuBtn.setAttribute('aria-expanded', 'false');
  menuBtn.setAttribute('aria-label', 'Open navigation');
}

menuBtn?.addEventListener('click', () => {
  const isOpen = nav?.classList.toggle('open');
  menuBtn.setAttribute('aria-expanded', String(Boolean(isOpen)));
  menuBtn.setAttribute('aria-label', isOpen ? 'Close navigation' : 'Open navigation');
});

document.querySelectorAll('.main-nav a').forEach(link => {
  link.addEventListener('click', closeMenu);
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closeMenu();
});

document.addEventListener('click', (event) => {
  if (!nav?.classList.contains('open')) return;
  if (nav.contains(event.target) || menuBtn?.contains(event.target)) return;
  closeMenu();
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

window.addEventListener('resize', () => {
  if (window.innerWidth > 900) closeMenu();
});


// Load published photos from the Southern Comfort Photo Manager.
// The gallery remains hidden until at least one published photo is available.
async function loadRecentWork() {
  const section = document.getElementById('recent-work');
  const gallery = document.getElementById('photoGallery');
  if (!section || !gallery) return;

  try {
    const response = await fetch('/api/photos', {
      headers: { 'Accept': 'application/json' },
      cache: 'no-store'
    });
    if (!response.ok) return;

    const payload = await response.json();
    const photos = Array.isArray(payload.photos) ? payload.photos.slice(0, 9) : [];
    if (!photos.length) return;

    const fragment = document.createDocumentFragment();
    photos.forEach(photo => {
      const card = document.createElement('article');
      card.className = 'photo-card';

      const image = document.createElement('img');
      image.loading = 'lazy';
      image.decoding = 'async';
      image.src = photo.url;
      image.alt = photo.caption || (photo.category ? `Southern Comfort Mechanical ${photo.category} project` : 'Southern Comfort Mechanical recent project');

      const copy = document.createElement('div');
      copy.className = 'photo-card-copy';

      if (photo.category) {
        const category = document.createElement('span');
        category.className = 'photo-category';
        category.textContent = photo.category;
        copy.appendChild(category);
      }

      if (photo.caption) {
        const caption = document.createElement('p');
        caption.className = 'photo-caption';
        caption.textContent = photo.caption;
        copy.appendChild(caption);
      }

      card.append(image, copy);
      fragment.appendChild(card);
    });

    gallery.replaceChildren(fragment);
    section.hidden = false;
  } catch {
    // Keep the public gallery hidden if the photo service is unavailable.
  }
}

loadRecentWork();
