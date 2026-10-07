const ICON =
  '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2.5"/><circle cx="8.5" cy="10" r="1.5"/><path d="M21 15.5 16 10.5 8.5 18"/></svg>';

const done = new WeakSet();

function setFiles(input, files) {
  const dt = new DataTransfer();
  for (const f of files) dt.items.add(f);
  input.files = dt.files;
}

function isImage(file) {
  return file && /^image\/(png|jpe?g|webp|gif)/.test(file.type || "");
}

function buildPreview(input) {
  const wrap = document.createElement("div");
  wrap.className = "img-dz-preview";
  wrap.hidden = true;
  const img = document.createElement("img");
  img.alt = "پیش‌نمایش تصویر";
  wrap.appendChild(img);
  input.addEventListener("change", () => {
    const f = input.files && input.files[0];
    if (f && isImage(f)) {
      if (wrap.dataset.url) URL.revokeObjectURL(wrap.dataset.url);
      const url = URL.createObjectURL(f);
      wrap.dataset.url = url;
      img.src = url;
      wrap.hidden = false;
    } else {
      wrap.hidden = true;
      if (wrap.dataset.url) {
        URL.revokeObjectURL(wrap.dataset.url);
        delete wrap.dataset.url;
      }
    }
  });
  return wrap;
}

function enhance(input) {
  if (done.has(input)) return;
  done.add(input);
  input.setAttribute("data-ts", "dz");

  const dz = document.createElement("div");
  dz.className = "img-dz";
  dz.setAttribute("role", "button");
  dz.setAttribute("tabindex", "0");
  dz.innerHTML =
    ICON +
    '<span class="img-dz-text">تصویر را انتخاب کن یا اینجا رها کن</span>' +
    '<span class="img-dz-sub">PNG، JPG یا WEBP</span>';
  const preview = buildPreview(input);
  dz.appendChild(preview);
  input.insertAdjacentElement("afterend", dz);

  const openPicker = () => input.click();
  dz.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    openPicker();
  });
  dz.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openPicker();
    }
  });
  ["dragenter", "dragover"].forEach((t) =>
    dz.addEventListener(t, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dz.classList.add("is-dragover");
    })
  );
  ["dragleave", "drop"].forEach((t) =>
    dz.addEventListener(t, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dz.classList.remove("is-dragover");
    })
  );
  dz.addEventListener("drop", (e) => {
    const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (isImage(f)) {
      setFiles(input, [f]);
      input.dispatchEvent(new Event("change", { bubbles: true }));
    }
  });
}

export function enhanceModalImageInputs(root) {
  const scope = root || document;
  scope.querySelectorAll(".te-modal-file-input").forEach(enhance);
  const mo = new MutationObserver((muts) => {
    muts.forEach((m) =>
      m.addedNodes.forEach((n) => {
        if (!(n instanceof Element)) return;
        if (n.matches && n.matches(".te-modal-file-input")) enhance(n);
        n.querySelectorAll &&
          n.querySelectorAll(".te-modal-file-input").forEach(enhance);
      })
    );
  });
  mo.observe(document.body, { childList: true, subtree: true });
  return mo;
}
