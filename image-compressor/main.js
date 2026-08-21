import { inject } from '@vercel/analytics';

// Initialize Vercel Analytics
inject();

document.addEventListener('DOMContentLoaded', () => {
  const fileInput = document.getElementById('file-input');
  const browseBtn = document.getElementById('browse-btn');
  const replaceBtn = document.getElementById('replace-btn');
  const uploadZone = document.getElementById('upload-zone');
  const workspaceZone = document.getElementById('workspace-zone');

  const fileNameEl = document.getElementById('file-name');
  const fileDimsEl = document.getElementById('file-dims');
  const sizeOriginalEl = document.getElementById('size-original');
  const sizeCompressedEl = document.getElementById('size-compressed');
  const savingsPercentEl = document.getElementById('savings-percent');

  const qualityRange = document.getElementById('quality-range');
  const qualityDisplay = document.getElementById('quality-display');
  const formatSelect = document.getElementById('format-select');
  const presetPills = document.querySelectorAll('.pill');

  const originalPreview = document.getElementById('original-preview');
  const compressedPreview = document.getElementById('compressed-preview');
  const downloadLink = document.getElementById('download-link');

  const comparisonContainer = document.getElementById('comparison-slider');
  const originalOverlay = document.getElementById('original-overlay');
  const sliderHandle = document.getElementById('slider-handle');

  let originalFile = null;
  let originalImageObject = null;
  let currentCompressedUrl = null;
  let currentOriginalUrl = null;
  let isDraggingSlider = false;

  // File triggers
  uploadZone.addEventListener('click', () => fileInput.click());
  browseBtn.addEventListener('click', (e) => { e.stopPropagation(); fileInput.click(); });
  replaceBtn.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) handleFileSelect(e.target.files[0]);
  });

  // Drag and drop
  ['dragenter', 'dragover'].forEach(n => uploadZone.addEventListener(n, (e) => { e.preventDefault(); uploadZone.classList.add('drag-active'); }));
  ['dragleave', 'drop'].forEach(n => uploadZone.addEventListener(n, (e) => { e.preventDefault(); uploadZone.classList.remove('drag-active'); }));
  uploadZone.addEventListener('drop', (e) => {
    if (e.dataTransfer && e.dataTransfer.files[0]) handleFileSelect(e.dataTransfer.files[0]);
  });

  // Clipboard Paste
  document.addEventListener('paste', (e) => {
    const items = e.clipboardData && e.clipboardData.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) handleFileSelect(file);
        break;
      }
    }
  });

  qualityRange.addEventListener('input', (e) => {
    qualityDisplay.textContent = `${e.target.value}%`;
    syncPills(e.target.value);
    processImage();
  });

  formatSelect.addEventListener('change', () => processImage());

  presetPills.forEach(pill => {
    pill.addEventListener('click', () => {
      const q = pill.getAttribute('data-quality');
      qualityRange.value = q;
      qualityDisplay.textContent = `${q}%`;
      syncPills(q);
      processImage();
    });
  });

  function handleFileSelect(file) {
    if (!file.type.match('image.*')) return alert('Please upload a valid image.');
    originalFile = file;

    if (currentOriginalUrl) URL.revokeObjectURL(currentOriginalUrl);
    if (currentCompressedUrl) URL.revokeObjectURL(currentCompressedUrl);

    currentOriginalUrl = URL.createObjectURL(file);
    const img = new Image();
    img.src = currentOriginalUrl;

    img.onload = () => {
      originalImageObject = img;
      fileNameEl.textContent = file.name;
      fileDimsEl.textContent = `${img.naturalWidth} × ${img.naturalHeight}`;
      sizeOriginalEl.textContent = formatBytes(file.size);
      originalPreview.src = currentOriginalUrl;

      uploadZone.classList.add('hidden');
      workspaceZone.classList.remove('hidden');

      setSliderPosition(50);
      processImage();
    };
  }

  function processImage() {
    if (!originalImageObject) return;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = originalImageObject.naturalWidth;
    canvas.height = originalImageObject.naturalHeight;

    ctx.drawImage(originalImageObject, 0, 0);

    const format = formatSelect.value;
    const quality = parseFloat(qualityRange.value) / 100;

    canvas.toBlob((blob) => {
      if (!blob) return;

      if (currentCompressedUrl) URL.revokeObjectURL(currentCompressedUrl);
      currentCompressedUrl = URL.createObjectURL(blob);

      compressedPreview.src = currentCompressedUrl;
      downloadLink.href = currentCompressedUrl;

      const ext = format.split('/')[1];
      const rawName = originalFile.name.substring(0, originalFile.name.lastIndexOf('.')) || 'image';
      downloadLink.download = `${rawName}-compressed.${ext}`;

      updateMetrics(originalFile.size, blob.size);
    }, format, quality);
  }

  function updateMetrics(origSize, compSize) {
    sizeCompressedEl.textContent = formatBytes(compSize);
    const diff = origSize - compSize;
    const percentage = Math.round((diff / origSize) * 100);

    if (percentage >= 0) {
      savingsPercentEl.textContent = `-${percentage}%`;
      savingsPercentEl.style.color = 'var(--accent-success)';
    } else {
      savingsPercentEl.textContent = `+${Math.abs(percentage)}%`;
      savingsPercentEl.style.color = '#ef4444';
    }
  }

  function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024, sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  function syncPills(val) {
    presetPills.forEach(p => p.classList.toggle('active', p.getAttribute('data-quality') === String(val)));
  }

  function setSliderPosition(percentage) {
    const clamped = Math.max(0, Math.min(100, percentage));
    originalOverlay.style.width = `${clamped}%`;
    sliderHandle.style.left = `${clamped}%`;
    if (comparisonContainer) originalPreview.style.width = `${comparisonContainer.offsetWidth}px`;
  }

  function handleMove(clientX) {
    if (!comparisonContainer) return;
    const rect = comparisonContainer.getBoundingClientRect();
    setSliderPosition(((clientX - rect.left) / rect.width) * 100);
  }

  comparisonContainer.addEventListener('mousedown', (e) => { isDraggingSlider = true; handleMove(e.clientX); });
  window.addEventListener('mouseup', () => isDraggingSlider = false);
  window.addEventListener('mousemove', (e) => { if (isDraggingSlider) handleMove(e.clientX); });
});
