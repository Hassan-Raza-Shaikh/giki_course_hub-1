/* main.js — GIKI Course Hub */

// ── Drag & Drop Upload ─────────────────────────────────────────
const dropArea = document.getElementById('drop-area');
const fileInput = document.getElementById('file-input');
const dropText = document.getElementById('drop-text');

if (dropArea && fileInput) {
  ['dragenter', 'dragover'].forEach(evt => {
    dropArea.addEventListener(evt, (e) => {
      e.preventDefault();
      dropArea.classList.add('drag-over');
    });
  });

  ['dragleave', 'drop'].forEach(evt => {
    dropArea.addEventListener(evt, () => dropArea.classList.remove('drag-over'));
  });

  dropArea.addEventListener('drop', (e) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files.length) {
      fileInput.files = files;
      dropText.textContent = `✅ Selected: ${files[0].name}`;
    }
  });

  fileInput.addEventListener('change', () => {
    if (fileInput.files.length) {
      dropText.textContent = `✅ Selected: ${fileInput.files[0].name}`;
    }
  });
}

// ── Auto-close flash messages ─────────────────────────────────
document.querySelectorAll('.flash').forEach(el => {
  setTimeout(() => {
    el.style.transition = 'opacity 0.4s';
    el.style.opacity = '0';
    setTimeout(() => el.remove(), 400);
  }, 4000);
});

// ── Star Rating interaction fix ───────────────────────────────
// CSS handles hover; this ensures the correct value is submitted
document.querySelectorAll('.star-rating input').forEach(input => {
  input.addEventListener('change', () => {
    document.querySelectorAll('.star-rating label').forEach((lbl, i) => {
      lbl.style.color = i < input.value ? 'var(--warning)' : 'var(--border)';
    });
  });
});

// ── Confirm on destructive actions ────────────────────────────
document.querySelectorAll('[data-confirm]').forEach(btn => {
  btn.addEventListener('click', (e) => {
    if (!confirm(btn.dataset.confirm)) e.preventDefault();
  });
});
