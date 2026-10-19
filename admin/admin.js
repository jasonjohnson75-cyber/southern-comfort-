const form = document.getElementById('photoForm');
const fileInput = document.getElementById('photoInput');
const previewWrap = document.getElementById('previewWrap');
const previewImage = document.getElementById('previewImage');
const changePhoto = document.getElementById('changePhoto');
const categoryInput = document.getElementById('categoryInput');
const captionInput = document.getElementById('captionInput');
const captionCount = document.getElementById('captionCount');
const publishInput = document.getElementById('publishInput');
const uploadButton = document.getElementById('uploadButton');
const statusMessage = document.getElementById('statusMessage');
const gallery = document.getElementById('adminGallery');
const refreshButton = document.getElementById('refreshButton');
const uploadBox = document.querySelector('.upload-box');

let selectedFile = null;

function setStatus(message, type='') {
  statusMessage.textContent = message;
  statusMessage.className = 'status-message' + (type ? ' ' + type : '');
}

function showPreview(file) {
  selectedFile = file;
  previewImage.src = URL.createObjectURL(file);
  previewWrap.hidden = false;
  uploadBox.style.display = 'none';
}

fileInput.addEventListener('change', () => {
  const file = fileInput.files?.[0];
  if (file) showPreview(file);
});

changePhoto.addEventListener('click', () => {
  fileInput.value = '';
  selectedFile = null;
  previewWrap.hidden = true;
  uploadBox.style.display = '';
  fileInput.click();
});

captionInput.addEventListener('input', () => {
  captionCount.textContent = String(captionInput.value.length);
});

['dragenter','dragover'].forEach(type => uploadBox.addEventListener(type, e => {
  e.preventDefault();
  uploadBox.classList.add('dragover');
}));
['dragleave','drop'].forEach(type => uploadBox.addEventListener(type, e => {
  e.preventDefault();
  uploadBox.classList.remove('dragover');
}));
uploadBox.addEventListener('drop', e => {
  const file = e.dataTransfer?.files?.[0];
  if (file) showPreview(file);
});

async function decodeForCanvas(file) {
  if ('createImageBitmap' in window) {
    try {
      const bitmap = await createImageBitmap(file);
      return {
        width: bitmap.width,
        height: bitmap.height,
        draw(ctx, width, height) { ctx.drawImage(bitmap, 0, 0, width, height); },
        cleanup() { bitmap.close?.(); }
      };
    } catch {}
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = objectUrl;
    await image.decode();
    return {
      width: image.naturalWidth,
      height: image.naturalHeight,
      draw(ctx, width, height) { ctx.drawImage(image, 0, 0, width, height); },
      cleanup() { URL.revokeObjectURL(objectUrl); }
    };
  } catch {
    URL.revokeObjectURL(objectUrl);
    throw new Error('This phone could not prepare that photo. Try choosing a JPG, PNG, or WebP image.');
  }
}

async function compressImage(file) {
  if (file.size > 15 * 1024 * 1024) {
    throw new Error('Please choose a photo smaller than 15 MB.');
  }

  const source = await decodeForCanvas(file);
  const maxSide = 1800;
  const scale = Math.min(1, maxSide / Math.max(source.width, source.height));
  const width = Math.max(1, Math.round(source.width * scale));
  const height = Math.max(1, Math.round(source.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { alpha:false });
  source.draw(ctx, width, height);
  source.cleanup();

  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob(result => result ? resolve(result) : reject(new Error('Could not prepare this photo.')), 'image/webp', 0.84);
  });

  return new File([blob], 'southern-comfort-project.webp', { type:'image/webp' });
}

form.addEventListener('submit', async e => {
  e.preventDefault();
  if (!selectedFile) {
    setStatus('Choose a photo first.', 'error');
    return;
  }

  uploadButton.disabled = true;
  setStatus('Preparing photo…');

  try {
    const optimized = await compressImage(selectedFile);
    const data = new FormData();
    data.append('photo', optimized);
    data.append('category', categoryInput.value);
    data.append('caption', captionInput.value.trim());
    data.append('published', String(publishInput.checked));

    setStatus('Uploading…');
    const response = await fetch('/admin/api/photos', {
      method:'POST',
      body:data,
      headers:{'Accept':'application/json'}
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || 'Upload failed.');

    setStatus(publishInput.checked ? 'Photo published successfully.' : 'Photo saved as hidden.', 'success');
    form.reset();
    captionCount.textContent = '0';
    selectedFile = null;
    previewWrap.hidden = true;
    uploadBox.style.display = '';
    await loadPhotos();
  } catch (error) {
    setStatus(error.message || 'Upload failed.', 'error');
  } finally {
    uploadButton.disabled = false;
  }
});

async function loadPhotos() {
  gallery.innerHTML = '<p class="empty-state">Loading photos…</p>';
  try {
    const response = await fetch('/admin/api/photos', {
      headers:{'Accept':'application/json'},
      cache:'no-store'
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || 'Could not load photos.');

    const photos = Array.isArray(payload.photos) ? payload.photos : [];
    if (!photos.length) {
      gallery.innerHTML = '<p class="empty-state">No photos yet. Upload the first project photo above.</p>';
      return;
    }

    gallery.replaceChildren();
    photos.forEach(photo => {
      const card = document.createElement('article');
      card.className = 'admin-photo';

      const img = document.createElement('img');
      img.src = photo.url;
      img.alt = photo.caption || 'Southern Comfort project photo';
      img.loading = 'lazy';

      const body = document.createElement('div');
      body.className = 'admin-photo-body';

      const category = document.createElement('span');
      category.className = 'admin-photo-category';
      category.textContent = photo.category || 'Project';

      const caption = document.createElement('p');
      caption.className = 'admin-photo-caption';
      caption.textContent = photo.caption || 'No caption';

      const meta = document.createElement('div');
      meta.className = 'admin-photo-meta';

      const status = document.createElement('span');
      status.className = 'status-pill' + (photo.published ? '' : ' hidden');
      status.textContent = photo.published ? 'Published' : 'Hidden';

      const del = document.createElement('button');
      del.className = 'delete-button';
      del.type = 'button';
      del.textContent = 'Delete';
      del.addEventListener('click', () => deletePhoto(photo));

      meta.append(status, del);
      body.append(category, caption, meta);
      card.append(img, body);
      gallery.appendChild(card);
    });
  } catch (error) {
    gallery.innerHTML = '<p class="empty-state">Photo service is not connected yet. Finish the one-time Cloudflare R2 and Access setup.</p>';
  }
}

async function deletePhoto(photo) {
  if (!confirm('Delete this photo from the website?')) return;
  try {
    const response = await fetch('/admin/api/photos/' + encodeURIComponent(photo.id), {
      method:'DELETE',
      headers:{'Accept':'application/json'}
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || 'Delete failed.');
    await loadPhotos();
  } catch (error) {
    alert(error.message || 'Delete failed.');
  }
}

refreshButton.addEventListener('click', loadPhotos);
loadPhotos();
