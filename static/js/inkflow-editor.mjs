import L from "dompurify";
class k {
  /**
   * Returns the current selection object.
   */
  getSelection() {
    return window.getSelection();
  }
  /**
   * Returns the first range of the current selection.
   */
  getRange() {
    const e = this.getSelection();
    return !e || e.rangeCount === 0 ? null : e.getRangeAt(0);
  }
  /**
   * Serializes the current selection into a path-based format relative to a root element.
   * This allows restoring selection even if the DOM nodes are replaced but the structure is similar.
   */
  getSelectionPath(e) {
    const t = this.getRange();
    return !t || !e.contains(t.commonAncestorContainer) ? null : {
      startPath: this.getNodePath(t.startContainer, e),
      startOffset: t.startOffset,
      endPath: this.getNodePath(t.endContainer, e),
      endOffset: t.endOffset
    };
  }
  /**
   * Restores selection from a path-based serialization.
   */
  restoreSelectionPath(e, t) {
    if (t)
      try {
        const i = this.getNodeByPath(t.startPath, e), n = this.getNodeByPath(t.endPath, e);
        if (i && n) {
          const o = document.createRange();
          o.setStart(i, Math.min(t.startOffset, i.textContent?.length || 0)), o.setEnd(n, Math.min(t.endOffset, n.textContent?.length || 0)), this.restoreSelection(o);
        }
      } catch (i) {
        console.warn("Failed to restore selection path:", i);
      }
  }
  getNodePath(e, t) {
    const i = [];
    let n = e;
    for (; n !== t && n.parentElement; ) {
      const o = Array.from(n.parentElement.childNodes).indexOf(n);
      i.unshift(o), n = n.parentElement;
    }
    return i;
  }
  getNodeByPath(e, t) {
    let i = t;
    for (const n of e)
      if (i.childNodes[n])
        i = i.childNodes[n];
      else
        return null;
    return i;
  }
  /**
   * Saves the current selection range.
   */
  saveSelection() {
    const e = this.getRange();
    return e ? e.cloneRange() : null;
  }
  /**
   * Restores a previously saved range.
   */
  restoreSelection(e) {
    if (!e) return;
    const t = this.getSelection();
    if (t)
      try {
        if (!e.startContainer || !document.contains(e.startContainer))
          return;
        t.removeAllRanges(), t.addRange(e);
      } catch (i) {
        console.warn("Interrupted selection restoration:", i);
      }
  }
  /**
   * Checks if the selection is within a specific element.
   */
  isSelectionInElement(e) {
    const t = this.getRange();
    return t ? e.contains(t.commonAncestorContainer) : !1;
  }
  /**
   * Clears the current selection.
   */
  clearSelection() {
    const e = this.getSelection();
    e && e.removeAllRanges();
  }
  /**
   * Moves the cursor to the end of the specified element.
   */
  setCursorAtEnd(e) {
    const t = document.createRange();
    t.selectNodeContents(e), t.collapse(!1), this.restoreSelection(t);
  }
  /**
   * Moves the cursor to the start of the specified element.
   */
  setCursorAtStart(e) {
    const t = document.createRange();
    t.selectNodeContents(e), t.collapse(!0), this.restoreSelection(t);
  }
  /**
   * Temporary markers for robust preservation across structural changes.
   */
  saveSelectionMarkers(e) {
    const t = this.getRange();
    if (!t || !e.contains(t.commonAncestorContainer)) return;
    const i = document.createElement("span");
    i.id = "te-selection-start", i.style.display = "none";
    const n = document.createElement("span");
    n.id = "te-selection-end", n.style.display = "none";
    const o = t.cloneRange();
    o.collapse(!1), o.insertNode(n);
    const s = t.cloneRange();
    s.collapse(!0), s.insertNode(i);
  }
  restoreSelectionMarkers(e) {
    const t = e.querySelector("#te-selection-start"), i = e.querySelector("#te-selection-end");
    if (t && i) {
      const n = document.createRange();
      n.setStartAfter(t), n.setEndBefore(i), this.restoreSelection(n);
    } else if (t) {
      const n = document.createRange();
      n.setStartAfter(t), n.collapse(!0), this.restoreSelection(n);
    }
    t && t.remove(), i && i.remove();
  }
  removeSelectionMarkers(e) {
    e.querySelectorAll("#te-selection-start, #te-selection-end").forEach((t) => t.remove());
  }
}
class S {
  editor;
  activeContainer = null;
  isResizing = !1;
  startX = 0;
  startY = 0;
  startWidth = 0;
  startHeight = 0;
  currentHandle = null;
  aspectRatio = 1;
  boundMouseDown;
  boundMouseMove;
  boundMouseUp;
  boundKeyDown;
  constructor(e) {
    this.editor = e, this.boundMouseDown = this.handleMouseDown.bind(this), this.boundMouseMove = this.handleMouseMove.bind(this), this.boundMouseUp = this.handleMouseUp.bind(this), this.boundKeyDown = this.handleKeyDown.bind(this), this.setupListeners();
  }
  setupListeners() {
    const e = this.editor.el;
    e.addEventListener("mousedown", this.boundMouseDown), window.addEventListener("mousemove", this.boundMouseMove), window.addEventListener("mouseup", this.boundMouseUp), e.addEventListener("keydown", this.boundKeyDown), e.addEventListener("blur", this.deselectImage.bind(this));
  }
  handleMouseDown(e) {
    const t = e.target;
    if (t.classList.contains("te-image-resizer")) {
      e.preventDefault(), e.stopPropagation();
      const n = t.closest(".te-image-container");
      n && (this.selectImage(n), this.startResize(e, t));
      return;
    }
    const i = t.closest(".te-image-container");
    i ? this.selectImage(i) : this.deselectImage();
  }
  handleMouseMove(e) {
    this.isResizing && this.handleResize(e);
  }
  handleMouseUp() {
    this.isResizing && this.stopResize();
  }
  handleKeyDown(e) {
    if ((e.key === "Backspace" || e.key === "Delete") && this.activeContainer) {
      const t = this.editor.selection.getRange();
      if (t && this.activeContainer.contains(t.commonAncestorContainer)) {
        e.preventDefault();
        const i = this.activeContainer.querySelector("img"), n = i?.getAttribute("data-image-id"), o = i?.src, s = this.editor.getOptions();
        s.onImageDelete && s.onImageDelete(n || void 0, o), n && s.imageEndpoints?.delete && fetch(s.imageEndpoints.delete, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: n, url: o })
        }).catch((r) => console.error("Failed to notify server of image deletion", r)), this.activeContainer.remove(), this.activeContainer = null, this.editor.el.dispatchEvent(new Event("input", { bubbles: !0 }));
      }
    }
  }
  destroy() {
    const e = this.editor.el;
    e && (e.removeEventListener("mousedown", this.boundMouseDown), e.removeEventListener("keydown", this.boundKeyDown), e.removeEventListener("blur", this.deselectImage.bind(this))), window.removeEventListener("mousemove", this.boundMouseMove), window.removeEventListener("mouseup", this.boundMouseUp);
  }
  selectImage(e) {
    this.activeContainer && this.activeContainer.classList.remove("active"), this.activeContainer = e, this.activeContainer.classList.add("active");
  }
  deselectImage() {
    this.activeContainer && (this.activeContainer.classList.remove("active"), this.activeContainer = null);
  }
  startResize(e, t) {
    if (!this.activeContainer) return;
    this.isResizing = !0, this.currentHandle = Array.from(t.classList).find((n) => n.startsWith("te-resizer-"))?.replace("te-resizer-", "") || null;
    const i = this.activeContainer.querySelector("img");
    this.startX = e.clientX, this.startY = e.clientY, this.startWidth = i.clientWidth, this.startHeight = i.clientHeight, this.aspectRatio = this.startWidth / this.startHeight, document.body.style.cursor = window.getComputedStyle(t).cursor;
  }
  handleResize(e) {
    if (!this.activeContainer || !this.isResizing) return;
    const t = this.activeContainer.querySelector("img"), i = e.clientX - this.startX, n = e.clientY - this.startY;
    let o = this.startWidth, s = this.startHeight;
    this.currentHandle?.includes("right") ? o = this.startWidth + i : this.currentHandle?.includes("left") ? o = this.startWidth - i : this.currentHandle?.includes("bottom") ? o = this.startWidth + n * this.aspectRatio : this.currentHandle?.includes("top") && (o = this.startWidth - n * this.aspectRatio), s = o / this.aspectRatio, o > 50 && o < this.editor.el.clientWidth && (t.style.width = `${o}px`, t.style.height = `${s}px`);
  }
  stopResize() {
    this.isResizing = !1, this.currentHandle = null, document.body.style.cursor = "", this.editor.el.dispatchEvent(new Event("input", { bubbles: !0 }));
  }
}
class M {
  stack = [];
  index = -1;
  maxDepth = 50;
  constructor(e) {
    e !== void 0 && this.record(e, null);
  }
  /**
   * Records a new state in the history stack.
   * Clears any "redo" states if we record a new action.
   */
  record(e, t) {
    if (this.index >= 0 && this.stack[this.index].html === e) {
      this.stack[this.index].selection = t;
      return;
    }
    this.index < this.stack.length - 1 && (this.stack = this.stack.slice(0, this.index + 1)), this.stack.push({ html: e, selection: t }), this.index++, this.stack.length > this.maxDepth && (this.stack.shift(), this.index--);
  }
  /**
   * Returns the previous state if available.
   */
  undo() {
    return this.index > 0 ? (this.index--, this.stack[this.index]) : null;
  }
  /**
   * Returns the next state if available.
   */
  redo() {
    return this.index < this.stack.length - 1 ? (this.index++, this.stack[this.index]) : null;
  }
  /**
   * Checks if undo is possible.
   */
  canUndo() {
    return this.index > 0;
  }
  /**
   * Checks if redo is possible.
   */
  canRedo() {
    return this.index < this.stack.length - 1;
  }
}
const R = {
  type: "button",
  title: "برگردان",
  command: "undo",
  icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7v6h6"></path><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"></path></svg>'
}, A = {
  type: "button",
  title: "تکرار",
  command: "redo",
  icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 7v6h-6"></path><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7"></path></svg>'
}, H = {
  type: "select",
  title: "عنوان",
  command: "formatBlock",
  icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h8"></path><path d="M4 18V6"></path><path d="M12 18V6"></path><path d="M17 12h3"></path><path d="M17 18V6"></path></svg>',
  options: [
    { label: "پاراگراف", value: "p" },
    { label: "عنوان ۱", value: "h1" },
    { label: "عنوان ۲", value: "h2" },
    { label: "عنوان ۳", value: "h3" },
    { label: "عنوان ۴", value: "h4" },
    { label: "عنوان ۵", value: "h5" },
    { label: "عنوان ۶", value: "h6" }
  ]
}, N = {
  type: "select",
  title: "فونت",
  command: "fontFamily",
  options: [
    { label: "Inter", value: "'Inter', sans-serif" },
    { label: "Arial", value: "Arial, sans-serif" },
    { label: "Georgia", value: "Georgia, serif" },
    { label: "Courier", value: "'Courier New', monospace" },
    { label: "Times New Roman", value: "'Times New Roman', serif" },
    { label: "Verdana", value: "Verdana, sans-serif" },
    { label: "Tahoma", value: "Tahoma, sans-serif" },
    { label: "Roboto", value: "'Roboto', sans-serif" },
    { label: "Open Sans", value: "'Open Sans', sans-serif" },
    { label: "Montserrat", value: "'Montserrat', sans-serif" },
    { label: "Lato", value: "'Lato', sans-serif" },
    { label: "Poppins", value: "'Poppins', sans-serif" },
    { label: "Oswald", value: "'Oswald', sans-serif" },
    { label: "Playfair Display", value: "'Playfair Display', serif" },
    { label: "Merriweather", value: "'Merriweather', serif" }
  ]
}, I = {
  type: "input",
  title: "اندازه",
  command: "fontSize",
  placeholder: "اندازه",
  value: "16"
}, P = {
  type: "select",
  title: "فاصله خطوط",
  command: "lineHeight",
  options: [
    { label: "عادی", value: "normal" },
    { label: "1.0", value: "1.0" },
    { label: "1.1", value: "1.1" },
    { label: "1.2", value: "1.2" },
    { label: "1.3", value: "1.3" },
    { label: "1.4", value: "1.4" },
    { label: "1.5", value: "1.5" },
    { label: "1.6", value: "1.6" },
    { label: "1.7", value: "1.7" },
    { label: "1.8", value: "1.8" },
    { label: "1.9", value: "1.9" },
    { label: "2.0", value: "2.0" }
  ],
  value: "normal"
}, B = {
  type: "button",
  title: "درشت",
  command: "bold",
  icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 12a4 4 0 0 0 0-8H6v8"/><path d="M15 20a4 4 0 0 0 0-8H6v8Z"/></svg>'
}, z = {
  type: "button",
  title: "کج",
  command: "italic",
  icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="4" x2="10" y2="4"></line><line x1="14" y1="20" x2="5" y2="20"></line><line x1="15" y1="4" x2="9" y2="20"></line></svg>'
}, O = {
  type: "button",
  title: "زیرخط",
  command: "underline",
  icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3v7a6 6 0 0 0 6 6 6 6 0 0 0 6-6V3"></path><line x1="4" y1="21" x2="20" y2="21"></line></svg>'
}, D = {
  type: "button",
  title: "خط‌خورده",
  command: "strikeThrough",
  icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4H9a3 3 0 0 0-2.83 4"></path><path d="M14 12a4 4 0 0 1 0 8H6"></path><line x1="4" y1="12" x2="20" y2="12"></line></svg>'
}, j = {
  type: "color-picker",
  title: "رنگ متن",
  command: "foreColor",
  icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h16"/><path d="m6 16 6-12 6 12"/><path d="M8 12h8"/></svg>',
  value: "#1e293b"
}, q = {
  type: "color-picker",
  title: "رنگ هایلایت",
  command: "backColor",
  icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 11-6 6v3h9l3-3"/><path d="m22 12-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4"/></svg>',
  value: "#ffffff"
}, U = {
  type: "button",
  title: "چینش به چپ",
  command: "justifyLeft",
  icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="21" y1="6" x2="3" y2="6"></line><line x1="15" y1="10" x2="3" y2="10"></line><line x1="21" y1="14" x2="3" y2="14"></line><line x1="15" y1="18" x2="3" y2="18"></line></svg>'
}, F = {
  type: "button",
  title: "چینش به وسط",
  command: "justifyCenter",
  icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="21" y1="6" x2="3" y2="6"></line><line x1="18" y1="10" x2="6" y2="10"></line><line x1="21" y1="14" x2="3" y2="14"></line><line x1="18" y1="18" x2="6" y2="18"></line></svg>'
}, W = {
  type: "button",
  title: "چینش به راست",
  command: "justifyRight",
  icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="21" y1="6" x2="3" y2="6"></line><line x1="21" y1="10" x2="9" y2="10"></line><line x1="21" y1="14" x2="3" y2="14"></line><line x1="21" y1="18" x2="9" y2="18"></line></svg>'
}, $ = {
  type: "button",
  title: "چینش کامل",
  command: "justifyFull",
  icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="21" y1="6" x2="3" y2="6"></line><line x1="21" y1="10" x2="3" y2="10"></line><line x1="21" y1="14" x2="3" y2="14"></line><line x1="21" y1="18" x2="3" y2="18"></line></svg>'
}, _ = {
  type: "button",
  title: "لیست بولت‌دار",
  command: "insertUnorderedList",
  icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>'
}, V = {
  type: "button",
  title: "لیست شماره‌دار",
  command: "insertOrderedList",
  icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="10" y1="6" x2="21" y2="6"></line><line x1="10" y1="12" x2="21" y2="12"></line><line x1="10" y1="18" x2="21" y2="18"></line><path d="M4 6h1v4"></path><path d="M4 10h2"></path><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"></path></svg>'
}, K = {
  type: "button",
  title: "کم‌کردن تورفتگی",
  command: "outdent",
  icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline><line x1="21" y1="12" x2="9" y2="12"></line><line x1="21" y1="6" x2="3" y2="6"></line><line x1="21" y1="18" x2="3" y2="18"></line></svg>'
}, G = {
  type: "button",
  title: "تورفتگی",
  command: "indent",
  icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline><line x1="3" y1="12" x2="15" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>'
}, X = {
  type: "button",
  title: "خط جداکننده",
  command: "insertHorizontalRule",
  icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>'
}, Y = {
  type: "button",
  title: "پاک‌کردن قالب‌بندی",
  command: "removeFormat",
  icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7V4h16v3"></path><path d="M5 20h6"></path><path d="M13 4 8 20"></path><path d="m15 15 5 5"></path><path d="m20 15-5 5"></path></svg>'
}, Q = {
  type: "button",
  title: "درج ایموجی",
  command: "insertEmoji",
  icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M8 14s1.5 2 4 2 4-2 4-2"></path><line x1="9" y1="9" x2="9.01" y2="9"></line><line x1="15" y1="9" x2="15.01" y2="9"></line></svg>'
}, J = {
  type: "button",
  title: "درج پیوند",
  command: "createLink",
  icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>'
}, Z = {
  type: "button",
  title: "درج تصویر",
  command: "insertImage",
  icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>'
}, ee = {
  type: "button",
  command: "insertTable",
  title: "درج جدول",
  icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3h18v18H3zM21 9H3M21 15H3M12 3v18"/></svg>'
}, te = {
  type: "button",
  id: "code-block",
  title: "بلوک کد",
  command: "insertCodeBlock",
  icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>'
}, b = { type: "divider", title: "" }, x = [
  { ...R, id: "undo" },
  { ...A, id: "redo" },
  b,
  { ...H, id: "heading" },
  { ...N, id: "font-family" },
  { ...I, id: "font-size" },
  { ...P, id: "line-height" },
  b,
  { ...B, id: "bold" },
  { ...z, id: "italic" },
  { ...O, id: "underline" },
  { ...D, id: "strikethrough" },
  b,
  { ...j, id: "text-color" },
  { ...q, id: "highlight-color" },
  b,
  { ...U, id: "align-left" },
  { ...F, id: "align-center" },
  { ...W, id: "align-right" },
  { ...$, id: "align-justify" },
  b,
  { ..._, id: "bullet-list" },
  { ...V, id: "ordered-list" },
  { ...K, id: "outdent" },
  { ...G, id: "indent" },
  b,
  { ...X, id: "horizontal-rule" },
  { ...Q, id: "emoji" },
  { ...J, id: "link" },
  { ...Z, id: "image" },
  { ...ee, id: "table" },
  { ...te, id: "code-block" },
  { ...Y, id: "clear-formatting" }
];
class E {
  container;
  onConfirm;
  onClose;
  dark;
  theme;
  fields;
  constructor(e, t, i, n, o, s) {
    this.fields = t, this.onConfirm = i, this.onClose = n, this.theme = o, this.dark = s, this.container = this.createModalElement(e, t), this.setupEvents();
  }
  createModalElement(e, t) {
    const i = document.createElement("div");
    i.classList.add("te-modal"), this.theme && this.applyTheme(i, this.theme), this.dark && i.classList.add("te-dark");
    const n = document.createElement("div");
    n.classList.add("te-modal-header"), n.textContent = e, i.appendChild(n);
    const o = document.createElement("div");
    o.classList.add("te-modal-body"), t.forEach((c) => {
      const a = document.createElement("div");
      a.classList.add("te-modal-field");
      const h = document.createElement("label");
      h.setAttribute("for", c.id), h.textContent = c.label;
      const d = document.createElement("input");
      d.type = c.type, d.id = c.id, d.classList.add("te-modal-input"), c.placeholder && (d.placeholder = c.placeholder), c.defaultValue && (d.value = c.defaultValue), c.min && (d.min = c.min), c.max && (d.max = c.max), c.type === "file" && (d.accept = "image/*", d.classList.add("te-modal-file-input")), a.appendChild(h), a.appendChild(d), o.appendChild(a);
    }), i.appendChild(o);
    const s = document.createElement("div");
    s.classList.add("te-modal-footer");
    const r = document.createElement("button");
    r.classList.add("te-modal-btn", "te-modal-btn-cancel"), r.textContent = "انصراف";
    const l = document.createElement("button");
    return l.classList.add("te-modal-btn", "te-modal-btn-confirm"), l.textContent = "درج", s.appendChild(r), s.appendChild(l), i.appendChild(s), i;
  }
  setupEvents() {
    const e = this.container.querySelector(".te-modal-btn-cancel"), t = this.container.querySelector(".te-modal-btn-confirm");
    e.addEventListener("click", () => this.close()), t.addEventListener("click", () => {
      const o = {};
      this.fields.forEach((s) => {
        const r = this.container.querySelector(`#${s.id}`);
        s.type === "file" ? o[s.id] = r.files && r.files.length > 0 ? r.files[0] : null : o[s.id] = r.value;
      }), this.onConfirm(o), this.close();
    });
    const i = (o) => {
      o.key === "Escape" && this.close(), o.key === "Enter" && t.click();
    };
    this.container.addEventListener("keydown", i);
    const n = (o) => {
      this.container.contains(o.target) || (this.close(), document.removeEventListener("mousedown", n));
    };
    setTimeout(() => document.addEventListener("mousedown", n), 0);
  }
  show(e) {
    document.body.appendChild(this.container);
    const t = e.getBoundingClientRect(), i = 260, n = t.bottom + window.scrollY + 10;
    let o = t.left + window.scrollX;
    o + i > window.innerWidth && (o = window.innerWidth - i - 20), this.container.style.top = `${n}px`, this.container.style.left = `${o}px`;
    const s = this.container.querySelector("input");
    s && s.focus();
  }
  close() {
    this.container.parentElement && (this.container.remove(), this.onClose());
  }
  applyTheme(e, t) {
    const i = {
      primaryColor: "--te-primary-color",
      primaryHover: "--te-primary-hover",
      bgApp: "--te-bg-app",
      bgEditor: "--te-bg-editor",
      toolbarBg: "--te-toolbar-bg",
      borderColor: "--te-border-color",
      borderFocus: "--te-border-focus",
      textMain: "--te-text-main",
      textMuted: "--te-text-muted",
      placeholder: "--te-placeholder",
      btnHover: "--te-btn-hover",
      btnActive: "--te-btn-active",
      radiusLg: "--te-radius-lg",
      radiusMd: "--te-radius-md",
      radiusSm: "--te-radius-sm",
      shadowSm: "--te-shadow-sm",
      shadowMd: "--te-shadow-md",
      shadowLg: "--te-shadow-lg"
    };
    for (const [n, o] of Object.entries(i)) {
      const s = t[n];
      s && e.style.setProperty(o, s);
    }
  }
}
class ie {
  container;
  editor;
  activeModal = null;
  savedRange = null;
  isVisible = !1;
  constructor(e) {
    this.editor = e, this.container = this.createContainer(), this.setupListeners(), document.body.appendChild(this.container);
  }
  createContainer() {
    const e = document.createElement("div");
    e.className = "te-floating-toolbar te-glass", e.style.display = "none", e.style.position = "absolute", e.style.zIndex = "2000";
    const i = this.editor.getOptions().toolbarPosition === "floating", n = i ? ["bold", "italic", "underline", "strikethrough", "textColor", "highlight-color", "divider", "heading", "bullet-list", "ordered-list", "divider", "link", "image", "table", "code-block", "emoji", "clear-formatting"] : ["heading", "bold", "italic", "underline", "strikethrough", "highlight-color", "link", "clear-formatting"];
    return (i ? x.filter((s) => s.id && (n.includes(s.id) || s.type === "divider")) : x.filter((s) => s.id && n.includes(s.id))).forEach((s) => {
      if (s.type === "divider") {
        const l = document.createElement("div");
        l.className = "te-floating-divider", e.appendChild(l);
        return;
      }
      const r = document.createElement("button");
      r.className = "te-floating-btn", r.title = s.title, r.innerHTML = s.icon || s.title, r.onclick = (l) => {
        l.preventDefault(), l.stopPropagation();
        const c = window.getSelection();
        c && c.rangeCount > 0 && (this.savedRange = c.getRangeAt(0).cloneRange()), this.handleCommand(s);
      }, e.appendChild(r);
    }), e;
  }
  handleCommand(e) {
    if (e.command === "createLink") {
      const t = window.getSelection();
      t && t.rangeCount > 0 && (this.savedRange = t.getRangeAt(0).cloneRange()), this.activeModal && this.activeModal.close(), this.activeModal = new E(
        "درج پیوند",
        [{ id: "url", label: "آدرس", type: "text", placeholder: "https://example.com" }],
        (i) => {
          if (this.savedRange) {
            const n = window.getSelection();
            n && (n.removeAllRanges(), n.addRange(this.savedRange));
          }
          this.editor.execute("createLink", i.url), this.savedRange = null, this.hide();
        },
        () => {
          this.activeModal = null, this.savedRange = null;
        },
        this.editor.getOptions().theme,
        this.editor.getOptions().dark
      ), this.activeModal.show(this.container);
    } else if (e.id === "heading") {
      if (this.savedRange) {
        const t = window.getSelection();
        t && (t.removeAllRanges(), t.addRange(this.savedRange));
      }
      this.editor.execute("formatBlock", "H2"), this.savedRange = null;
    } else if (e.id === "highlight-color") {
      if (this.savedRange) {
        const t = window.getSelection();
        t && (t.removeAllRanges(), t.addRange(this.savedRange));
      }
      this.editor.execute("backColor", "#fef08a"), this.savedRange = null;
    } else {
      if (this.savedRange) {
        const t = window.getSelection();
        t && (t.removeAllRanges(), t.addRange(this.savedRange));
      }
      this.editor.execute(e.command || "", e.value), this.savedRange = null;
    }
    this.hide();
  }
  setupListeners() {
    const e = () => {
      setTimeout(() => this.updatePosition(), 50);
    };
    this.editor.el.addEventListener("mouseup", e), this.editor.el.addEventListener("keyup", e), this.editor.el.addEventListener("scroll", () => {
      this.isVisible && !this.activeModal && this.hide();
    }, !0), window.addEventListener("mousedown", (t) => {
      !this.container.contains(t.target) && !this.editor.el.contains(t.target) && this.hide();
    }), window.addEventListener("resize", () => {
      this.isVisible && this.updatePosition();
    });
  }
  updatePosition() {
    const e = window.getSelection(), i = this.editor.getOptions().toolbarPosition === "floating";
    if (!e || e.rangeCount === 0) {
      this.activeModal || this.hide();
      return;
    }
    if (e.isCollapsed && !i) {
      this.activeModal || this.hide();
      return;
    }
    const n = e.getRangeAt(0);
    if (!this.editor.el.contains(n.commonAncestorContainer)) {
      this.hide();
      return;
    }
    const o = n.getBoundingClientRect(), r = (this.container.offsetParent || document.documentElement).getBoundingClientRect();
    this.container.style.display = "flex", this.isVisible = !0;
    const l = this.container.offsetWidth, c = this.container.offsetHeight;
    let a = o.top - r.top - c - 10, h = o.left - r.left + o.width / 2 - l / 2;
    o.top - c - 15 < 0 && (a = o.bottom - r.top + 10);
    const d = 10 - r.left, m = window.innerWidth - 10 - r.left - l;
    h < d && (h = d), h > m && (h = m), this.container.style.top = `${a}px`, this.container.style.left = `${h}px`, this.container.classList.add("te-floating-visible");
  }
  hide() {
    this.container.style.display = "none", this.container.classList.remove("te-floating-visible"), this.isVisible = !1;
  }
  destroy() {
    this.container.remove();
  }
  setDarkMode(e) {
    e ? this.container.classList.add("te-dark") : this.container.classList.remove("te-dark");
  }
}
class T {
  /**
   * Compresses an image file using HTML5 Canvas.
   */
  static async compressImage(e, t) {
    return new Promise((i, n) => {
      if (e.size <= t * 1024 * 1024 && e.type === "image/webp")
        return i(e);
      const o = new Image();
      o.src = URL.createObjectURL(e), o.onload = () => {
        const s = document.createElement("canvas");
        let r = o.width, l = o.height;
        const c = 2e3;
        (r > c || l > c) && (r > l ? (l = Math.round(l * c / r), r = c) : (r = Math.round(r * c / l), l = c)), s.width = r, s.height = l;
        const a = s.getContext("2d");
        if (!a)
          return n(new Error("Failed to get canvas context"));
        a.drawImage(o, 0, 0, r, l), s.toBlob(
          (h) => {
            h ? i(h) : n(new Error("Canvas toBlob failed"));
          },
          "image/webp",
          0.8
          // 80% quality is professional standard
        ), URL.revokeObjectURL(o.src);
      }, o.onerror = () => {
        URL.revokeObjectURL(o.src), n(new Error("Failed to load image for compression"));
      };
    });
  }
  /**
   * Uploads a file based on editor configuration.
   */
  static async uploadFile(e, t) {
    const i = e instanceof File ? e.name : "upload.webp";
    if (t.imageEndpoints?.upload) {
      const n = new FormData();
      n.append("file", e, i);
      try {
        const o = await fetch(t.imageEndpoints.upload, {
          method: "POST",
          body: n
        });
        if (o.ok) {
          const s = await o.json();
          return {
            imageUrl: s.imageUrl,
            imageId: s.imageId
          };
        }
        console.warn("Custom upload endpoint returned an error, falling back.");
      } catch (o) {
        console.error("Custom upload failed:", o);
      }
    }
    if (t.cloudinaryFallback) {
      const { cloudName: n, uploadPreset: o } = t.cloudinaryFallback, s = `https://api.cloudinary.com/v1_1/${n}/image/upload`, r = new FormData();
      r.append("file", e, i), r.append("upload_preset", o);
      try {
        const l = await fetch(s, {
          method: "POST",
          body: r
        });
        if (l.ok)
          return {
            imageUrl: (await l.json()).secure_url
          };
        console.warn("Cloudinary upload failed, falling back.");
      } catch (l) {
        console.error("Cloudinary fallback failed:", l);
      }
    }
    return null;
  }
}
class ne {
  container;
  editableElement;
  selection;
  imageManager;
  history;
  options;
  saveTimeout = null;
  historyTimeout = null;
  pendingStyles = {};
  observer = null;
  floatingToolbar = null;
  magicStateMap = /* @__PURE__ */ new Map();
  eventListeners = [];
  loaderElement = null;
  isUndoingRedoing = !1;
  normalizeTimeout = null;
  constructor(e, t = {}) {
    this.options = t, e ? this.mount(e) : (this.selection = new k(), this.imageManager = new S(this), this.history = new M(""));
  }
  /**
   * Mounts the editor to a DOM container.
   */
  mount(e) {
    if (this.container) {
      console.warn("Inkflow: Editor is already mounted.");
      return;
    }
    this.container = e, !(typeof document > "u" || !e) && this.initializeUI();
  }
  initializeUI() {
    this.container.innerHTML = "", this.container.classList.add("te-container"), this.options.dark && this.container.classList.add("te-dark"), this.options.showLoader !== !1 && this.createLoader(), this.editableElement = this.createEditableElement(), this.selection = new k(), this.imageManager = new S(this), this.history = new M(this.editableElement.innerHTML), this.setupInputHandlers(), this.setupEventListeners(), this.setupLimitEnforcement(), this.setupLinkClickHandlers(), this.setupImageObserver(), this.checkPlaceholder(), this.container.appendChild(this.editableElement), this.options.autofocus && this.focus(), this.options.theme && this.applyTheme(this.options.theme), this.options.maxImageSizeMB === void 0 && (this.options.maxImageSizeMB = 5), document.execCommand("defaultParagraphSeparator", !1, "p"), this.floatingToolbar = new ie(this), this.options.dark && this.floatingToolbar.setDarkMode(!0), this.options.showLoader !== !1 && setTimeout(() => this.hideLoader(), 300);
  }
  setupEventListeners() {
    this.addEventListener(this.editableElement, "mousedown", (e) => {
      e.target === this.editableElement && setTimeout(() => {
        this.editableElement.lastElementChild ? this.selection.setCursorAtEnd(this.editableElement.lastElementChild) : this.normalize();
      }, 0);
    }), this.addEventListener(this.editableElement, "focus", () => {
      (this.editableElement.children.length === 0 || this.editableElement.firstElementChild && !["P", "H1", "H2", "H3", "H4", "H5", "H6", "UL", "OL", "LI", "PRE"].includes(this.editableElement.firstElementChild.tagName)) && this.normalize();
      const e = window.getSelection();
      e && e.anchorNode === this.editableElement && this.editableElement.lastElementChild && this.selection.setCursorAtEnd(this.editableElement.lastElementChild);
    }), this.addEventListener(this.editableElement, "click", (e) => {
      const t = e.target;
      t.classList.contains("te-code-copy-btn") && this.handleCodeCopy(t), (t.classList.contains("te-code-remove-btn") || t.closest(".te-code-remove-btn")) && (e.preventDefault(), e.stopPropagation());
    }), this.addEventListener(this.editableElement, "mousedown", (e) => {
      const t = e.target;
      if ((t.classList.contains("te-resize-corner") || t.classList.contains("te-resize-bar")) && this.handleCodeResizeStart(e, t), t.classList.contains("te-code-remove-btn") || t.closest(".te-code-remove-btn")) {
        e.preventDefault(), e.stopPropagation();
        const i = t.classList.contains("te-code-remove-btn") ? t : t.closest(".te-code-remove-btn");
        this.handleCodeRemove(i);
      }
    }), this.addEventListener(this.editableElement, "contextmenu", (e) => {
      const i = e.target.closest(".te-code-wrapper");
      i && (e.preventDefault(), this.showCodeContextMenu(e.clientX, e.clientY, i));
    });
  }
  /**
   * Applies custom theme variables to the editor container.
   */
  applyTheme(e) {
    const t = this.container, i = {
      primaryColor: "--te-primary-color",
      primaryHover: "--te-primary-hover",
      bgApp: "--te-bg-app",
      bgEditor: "--te-bg-editor",
      toolbarBg: "--te-toolbar-bg",
      borderColor: "--te-border-color",
      borderFocus: "--te-border-focus",
      textMain: "--te-text-main",
      textMuted: "--te-text-muted",
      placeholder: "--te-placeholder",
      btnHover: "--te-btn-hover",
      btnActive: "--te-btn-active",
      radiusLg: "--te-radius-lg",
      radiusMd: "--te-radius-md",
      radiusSm: "--te-radius-sm",
      shadowSm: "--te-shadow-sm",
      shadowMd: "--te-shadow-md",
      shadowLg: "--te-shadow-lg"
    };
    for (const [n, o] of Object.entries(i)) {
      const s = e[n];
      s && t.style.setProperty(o, s);
    }
  }
  /**
   * Toggles dark mode on the editor.
   */
  setDarkMode(e) {
    this.options.dark = e, e ? (this.container.classList.add("te-dark"), this.floatingToolbar?.setDarkMode(!0)) : (this.container.classList.remove("te-dark"), this.floatingToolbar?.setDarkMode(!1));
  }
  /**
   * Destroys the editor instance and cleans up.
   */
  destroy() {
    this.observer && (this.observer.disconnect(), this.observer = null), this.saveTimeout && clearTimeout(this.saveTimeout), this.historyTimeout && clearTimeout(this.historyTimeout), this.normalizeTimeout && clearTimeout(this.normalizeTimeout), this.imageManager && typeof this.imageManager.destroy == "function" && this.imageManager.destroy(), this.eventListeners.forEach(({ target: e, type: t, handler: i }) => {
      e.removeEventListener(t, i);
    }), this.eventListeners = [], this.container.innerHTML = "", this.container.classList.remove("te-container", "te-dark", "te-toolbar-bottom", "te-toolbar-floating"), this.container.removeAttribute("style"), this.floatingToolbar && (this.floatingToolbar.destroy(), this.floatingToolbar = null);
  }
  checkPlaceholder() {
    if (!this.editableElement) return;
    if (this.editableElement.textContent?.trim() === "" && !this.editableElement.querySelector("img") && !this.editableElement.querySelector("table") && !this.editableElement.querySelector("ul") && !this.editableElement.querySelector("ol") && !this.editableElement.querySelector("hr") && !this.editableElement.querySelector("figure") && !this.editableElement.querySelector("blockquote") && !this.editableElement.querySelector("pre")) {
      this.editableElement.classList.add("is-empty");
      const t = this.editableElement.firstElementChild;
      t && (this.editableElement.style.textAlign = t.style.textAlign);
    } else
      this.editableElement.classList.remove("is-empty"), this.editableElement.style.textAlign = "";
  }
  addEventListener(e, t, i, n) {
    e.addEventListener(t, i, n), this.eventListeners.push({ target: e, type: t, handler: i });
  }
  setupImageObserver() {
    this.observer = new MutationObserver((e) => {
      e.forEach((t) => {
        t.addedNodes.forEach((i) => {
          if (i.nodeType === Node.ELEMENT_NODE) {
            const n = i;
            n.tagName === "IMG" && !n.closest(".te-image-container") ? this.wrapImage(n) : n.querySelectorAll("img:not(.te-image)").forEach((s) => {
              s.closest(".te-image-container") || this.wrapImage(s);
            });
          }
        });
      });
    }), this.observer.observe(this.editableElement, {
      childList: !0,
      subtree: !0
    });
  }
  /**
   * Wraps a raw <img> element in the interactive container
   */
  wrapImage(e) {
    const t = e.parentElement;
    if (!t) return;
    const i = document.createElement("figure");
    i.classList.add("te-image-container"), i.setAttribute("contenteditable", "false");
    const n = document.createElement("img");
    n.src = e.src, n.alt = e.alt || "", e.width && (n.style.width = `${e.width}px`), e.height && (n.style.height = `${e.height}px`), n.classList.add("te-image");
    const o = document.createElement("figcaption");
    if (o.classList.add("te-image-caption"), o.setAttribute("contenteditable", "true"), o.setAttribute("data-placeholder", "شرح تصویر می‌نویس..."), ["top-left", "top-right", "bottom-left", "bottom-right"].forEach((r) => {
      const l = document.createElement("div");
      l.classList.add("te-image-resizer", `te-resizer-${r}`), i.appendChild(l);
    }), i.appendChild(n), i.appendChild(o), t.replaceChild(i, e), !i.nextElementSibling) {
      const r = document.createElement("p");
      r.innerHTML = "<br>", i.after(r);
    }
  }
  setupInputHandlers() {
    this.addEventListener(this.editableElement, "beforeinput", (e) => {
      if (e.inputType === "insertText" && Object.keys(this.pendingStyles).length > 0) {
        const t = e.data;
        if (!t) return;
        e.preventDefault();
        const i = document.createElement("span");
        for (const [o, s] of Object.entries(this.pendingStyles))
          i.style.setProperty(o, s);
        i.textContent = t;
        const n = this.selection.getRange();
        if (n) {
          n.deleteContents(), n.insertNode(i);
          const o = document.createRange();
          o.setStart(i.firstChild, t.length), o.setEnd(i.firstChild, t.length), this.selection.restoreSelection(o), this.pendingStyles = {}, this.editableElement.dispatchEvent(new Event("input", { bubbles: !0 }));
        }
      }
    }), this.addEventListener(this.editableElement, "input", () => {
      this.checkPlaceholder();
    }), this.addEventListener(document, "selectionchange", () => {
      const e = window.getSelection();
      e && e.rangeCount > 0 && (e.getRangeAt(0).collapsed || (this.pendingStyles = {}));
    }), this.addEventListener(this.editableElement, "dragover", (e) => {
      e.preventDefault(), e.dataTransfer.dropEffect = "copy", this.editableElement.classList.add("dragover");
    }), this.addEventListener(this.editableElement, "dragleave", () => {
      this.editableElement.classList.remove("dragover");
    }), this.addEventListener(this.editableElement, "drop", (e) => {
      e.preventDefault(), this.editableElement.classList.remove("dragover");
      const t = e.dataTransfer?.files;
      t && t.length > 0 && this.handleFiles(Array.from(t));
    }), this.addEventListener(this.editableElement, "paste", this.handlePaste.bind(this)), this.addEventListener(this.editableElement, "input", () => {
      this.handleInput();
    }), this.addEventListener(this.editableElement, "keydown", (e) => {
      if (e.key === "Enter") {
        const t = window.getSelection();
        if (t && t.rangeCount > 0) {
          const i = t.getRangeAt(0);
          (i.startContainer.nodeType === Node.ELEMENT_NODE ? i.startContainer : i.startContainer.parentElement)?.closest("li") && setTimeout(() => {
            this.normalize(), this.triggerChange();
          }, 0);
        }
      }
      if (e.key === "Enter" && !e.shiftKey) {
        const t = this.selection.getRange();
        if (t && t.collapsed) {
          const i = t.startContainer, n = (i.nodeType === Node.ELEMENT_NODE ? i : i.parentElement)?.closest("pre");
          if (n) {
            const o = document.createRange();
            o.setStart(n, 0), o.setEnd(t.startContainer, t.startOffset);
            const s = o.toString(), r = document.createRange();
            r.setStart(t.startContainer, t.startOffset), r.setEnd(n, n.childNodes.length);
            const l = r.toString(), c = s === "" || s.endsWith(`
`), a = l === "" || l.startsWith(`
`);
            if (c && a) {
              e.preventDefault();
              const h = n.textContent || "", d = s.length;
              h.charAt(d) === `
` ? n.textContent = h.slice(0, d) + h.slice(d + 1) : h.charAt(d - 1) === `
` && (n.textContent = h.slice(0, d - 1) + h.slice(d));
              const m = document.createElement("p");
              m.innerHTML = "<br>", n.after(m);
              const u = document.createRange();
              u.setStart(m, 0), u.setEnd(m, 0), this.selection.restoreSelection(u), this.normalize(), this.triggerChange();
              return;
            }
          }
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z" ? (e.preventDefault(), e.shiftKey ? this.redo() : this.undo()) : (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y" && (e.preventDefault(), this.redo()), e.key === "Tab") {
        const t = window.getSelection();
        if (t && t.rangeCount > 0) {
          const n = t.getRangeAt(0).commonAncestorContainer;
          (n.nodeType === Node.ELEMENT_NODE ? n : n.parentElement)?.closest("pre") && (e.preventDefault(), document.execCommand("insertText", !1, "    "));
        }
      }
    });
  }
  /**
   * Sets up strict character limit enforcement.
   */
  setupLimitEnforcement() {
    this.editableElement.addEventListener("keydown", (e) => {
      if (!this.options.maxCharCount || !this.options.strictCharLimit) return;
      if (this.getCharCount() >= this.options.maxCharCount) {
        const i = [
          "Backspace",
          "Delete",
          "ArrowLeft",
          "ArrowRight",
          "ArrowUp",
          "ArrowDown",
          "Home",
          "End",
          "PageUp",
          "PageDown",
          "Control",
          "Meta",
          "Alt",
          "Shift",
          "a",
          "c",
          "v",
          "x",
          "z",
          "y"
          // Allow common shortcuts
        ];
        if ((e.ctrlKey || e.metaKey) && i.includes(e.key.toLowerCase()))
          return;
        i.includes(e.key) || (e.preventDefault(), e.stopPropagation());
      }
    });
  }
  /**
   * Immediately records a history state if one is pending.
   */
  flushHistoryRecord() {
    if (this.historyTimeout) {
      clearTimeout(this.historyTimeout), this.historyTimeout = null;
      const e = this.editableElement.innerHTML, t = this.selection.getSelectionPath(this.editableElement);
      this.history.record(e, t);
    }
  }
  handleInput() {
    if (this.isUndoingRedoing) return;
    Array.from(this.editableElement.childNodes).some(
      (i) => i.nodeType === Node.TEXT_NODE && i.nodeValue?.trim() || i.nodeType === Node.ELEMENT_NODE && !["P", "H1", "H2", "H3", "H4", "H5", "H6", "UL", "OL", "LI", "BLOCKQUOTE", "PRE", "TABLE", "DIV"].includes(i.tagName)
    ) && this.normalize(), this.normalizeTimeout && clearTimeout(this.normalizeTimeout), this.normalizeTimeout = setTimeout(() => {
      this.normalize();
    }, 200), this.scheduleHistoryRecord(), this.options.autoSave && (this.options.onSaving && this.options.onSaving(), this.scheduleAutoSave()), this.options.onChange && this.options.onChange(this.getHTML());
  }
  scheduleHistoryRecord() {
    this.historyTimeout && clearTimeout(this.historyTimeout), this.historyTimeout = setTimeout(() => {
      const e = this.editableElement.innerHTML, t = this.selection.getSelectionPath(this.editableElement);
      this.history.record(e, t);
    }, 200);
  }
  scheduleAutoSave() {
    this.saveTimeout && clearTimeout(this.saveTimeout);
    const e = this.options.autoSaveInterval || 300;
    this.saveTimeout = setTimeout(() => {
      this.save();
    }, e);
  }
  save() {
    this.options.onSave && this.options.onSave(this.getHTML());
  }
  undo() {
    this.flushHistoryRecord();
    const e = this.history.undo();
    e !== null && (this.isUndoingRedoing = !0, this.editableElement.innerHTML = e.html, e.selection && this.selection.restoreSelectionPath(this.editableElement, e.selection), this.triggerChange(), this.isUndoingRedoing = !1);
  }
  redo() {
    this.flushHistoryRecord();
    const e = this.history.redo();
    e !== null && (this.isUndoingRedoing = !0, this.editableElement.innerHTML = e.html, e.selection && this.selection.restoreSelectionPath(this.editableElement, e.selection), this.triggerChange(), this.isUndoingRedoing = !1);
  }
  triggerChange() {
    this.editableElement.dispatchEvent(new Event("input", { bubbles: !0 }));
  }
  createLoader() {
    this.loaderElement = document.createElement("div"), this.loaderElement.className = "te-loader-overlay";
    const e = document.createElement("div");
    e.className = "te-loader-spinner";
    const t = document.createElement("div");
    t.className = "te-loader-shimmer";
    const i = document.createElement("div");
    i.className = "te-loader-text", i.textContent = "در حال آماده‌سازی ویرایشگر…", this.loaderElement.appendChild(e), this.loaderElement.appendChild(t), this.loaderElement.appendChild(i), this.container.appendChild(this.loaderElement);
  }
  hideLoader() {
    this.loaderElement && (this.loaderElement.classList.add("hidden"), setTimeout(() => {
      this.loaderElement && this.loaderElement.parentNode && this.loaderElement.parentNode.removeChild(this.loaderElement), this.loaderElement = null;
    }, 400));
  }
  createEditableElement() {
    const e = document.createElement("div");
    return e.setAttribute("contenteditable", "true"), e.setAttribute("role", "textbox"), e.setAttribute("aria-multiline", "true"), e.setAttribute("spellcheck", "false"), e.classList.add("te-content"), this.options.placeholder ? (e.setAttribute("data-placeholder", this.options.placeholder), e.setAttribute("aria-label", this.options.placeholder)) : e.setAttribute("aria-label", "ویرایشگر متن"), e.style.minHeight = "150px", e.style.outline = "none", e.style.padding = "1rem", e.innerHTML === "" && (e.innerHTML = "<p><br></p>"), e;
  }
  /**
   * Focuses the editor.
   */
  focus() {
    this.editableElement.focus();
  }
  /**
   * Executes a command on the current selection.
   */
  execute(e, t = null) {
    if (this.focus(), document.execCommand(e, !1, t ?? void 0), e === "removeFormat" && (document.execCommand("formatBlock", !1, "p"), this.pendingStyles = {}), e === "magicFormat") {
      this.magicFormat();
      return;
    }
    if (e === "resetMagicFormat") {
      this.resetMagicFormat();
      return;
    }
    if (e === "insertCodeBlock") {
      this.insertCodeBlock();
      return;
    }
    if (e === "indent" || e === "outdent") {
      this.applyIndent(e === "indent");
      this.normalize(), this.triggerChange();
      return;
    }
    this.normalize(), this.triggerChange();
  }
  /**
   * Special handler for links to open them in a new tab when clicked.
   */
  setupLinkClickHandlers() {
    this.addEventListener(this.editableElement, "click", (e) => {
      const i = e.target.closest("a");
      if (i && this.editableElement.contains(i)) {
        e.preventDefault();
        const n = i.getAttribute("href");
        n && window.open(n, "_blank", "noopener,noreferrer");
      }
    });
  }
  /**
   * Magic Format logic: Cycles through aesthetic presets for the entire document.
   */
  magicFormat() {
    const t = ((this.magicStateMap.get(this.editableElement) || 0) + 1) % 3;
    this.magicStateMap.set(this.editableElement, t);
    const i = Array.from(this.editableElement.querySelectorAll("p, h1, h2, h3, h4, h5, h6, table, blockquote, figure, li"));
    i.length !== 0 && (i.forEach((n) => {
      this.enrichBlockWithEmojis(n), n.tagName === "TABLE" ? this.formatMagicTable(n, t) : n.tagName === "FIGURE" || n.querySelector("img") ? this.formatMagicImage(n, t) : n.tagName.startsWith("H") ? this.formatMagicHeading(n, t) : (n.tagName === "P" || n.tagName === "LI" || n.tagName === "BLOCKQUOTE") && this.formatMagicText(n, t);
    }), this.normalize(), this.history.record(this.editableElement.innerHTML, this.selection.getSelectionPath(this.editableElement)), this.handleInput());
  }
  /**
   * Resets all magic formatting (inline styles) from the document.
   */
  resetMagicFormat() {
    Array.from(this.editableElement.querySelectorAll("p, h1, h2, h3, h4, h5, h6, table, blockquote, figure, li")).forEach((t) => {
      t.removeAttribute("style"), t.querySelectorAll("*").forEach((i) => {
        i.removeAttribute("style");
      });
    }), this.magicStateMap.clear(), this.normalize(), this.history.record(this.editableElement.innerHTML, this.selection.getSelectionPath(this.editableElement)), this.handleInput();
  }
  formatMagicTable(e, t) {
    [
      // State 0: Premium Zebra (Modern Rounded)
      () => {
        e.style.borderCollapse = "separate", e.style.borderRadius = "12px", e.style.overflow = "hidden", e.style.border = "1px solid var(--te-border-color)", e.style.boxShadow = "0 4px 6px -1px rgba(0,0,0,0.1)", e.querySelectorAll("td, th").forEach((n) => {
          n.style.border = "1px solid var(--te-border-color)";
        });
      },
      // State 1: Clean Minimal (No vertical borders, soft header)
      () => {
        e.style.borderCollapse = "collapse", e.style.borderRadius = "0", e.style.boxShadow = "none", e.style.border = "none", e.style.borderTop = "2px solid var(--te-primary-color)", e.style.borderBottom = "2px solid var(--te-primary-color)", e.querySelectorAll("td, th").forEach((n) => {
          n.style.borderLeft = "none", n.style.borderRight = "none", n.style.borderBottom = "1px solid var(--te-border-color)";
        });
      },
      // State 2: Ultra Minimal (No borders whatsoever)
      () => {
        e.style.border = "none", e.style.boxShadow = "none", e.style.background = "none", e.style.borderRadius = "0", e.querySelectorAll("td, th").forEach((n) => {
          n.style.border = "none", n.style.padding = "12px 0";
        });
      }
    ][t]();
  }
  formatMagicImage(e, t) {
    const i = e.querySelector("img");
    if (!i) return;
    [
      // State 0: Shadow & Rounded
      () => {
        i.style.borderRadius = "12px", i.style.boxShadow = "0 10px 15px -3px rgba(0,0,0,0.1)", i.style.border = "1px solid var(--te-border-color)";
      },
      // State 1: Thick Border Frame
      () => {
        i.style.borderRadius = "0", i.style.border = "8px solid white", i.style.boxShadow = "0 1px 3px rgba(0,0,0,0.2)";
      },
      // State 2: Soft Minimal
      () => {
        i.style.borderRadius = "8px", i.style.boxShadow = "none", i.style.border = "none";
      }
    ][t]();
  }
  formatMagicHeading(e, t) {
    [
      // State 0: Typography Focus (Modern Weight)
      () => {
        e.style.fontWeight = "800", e.style.color = "var(--te-primary-color)", e.style.letterSpacing = "-0.02em", e.style.border = "none", e.style.marginBottom = "1.5rem";
      },
      // State 1: Elegant Serif Look (Soft Color)
      () => {
        e.style.fontFamily = "serif", e.style.color = "#4338ca", e.style.fontStyle = "italic", e.style.border = "none", e.style.letterSpacing = "normal";
      },
      // State 2: All Caps & Spaced (Professional Accent)
      () => {
        e.style.textTransform = "uppercase", e.style.letterSpacing = "0.2em", e.style.color = "#1e1b4b", e.style.fontWeight = "900", e.style.border = "none";
      }
    ][t]();
  }
  formatMagicText(e, t) {
    [
      // State 0: Premium Reading Mode
      () => {
        e.style.lineHeight = "2", e.style.fontSize = "1.15rem", e.style.color = "#334155", e.style.fontWeight = "400", e.style.border = "none";
      },
      // State 1: Soft Highlight Look
      () => {
        e.style.background = "rgba(99, 102, 241, 0.05)", e.style.borderLeft = "4px solid #818cf8", e.style.padding = "1rem 1.5rem", e.style.borderRadius = "8px", e.style.color = "#1e293b";
      },
      // State 2: Modern Clean Minimal
      () => {
        e.style.fontWeight = "500", e.style.letterSpacing = "0.01em", e.style.color = "#0f172a", e.style.background = "none", e.style.border = "none", e.style.padding = "0.5rem 0";
      }
    ][t]();
  }
  /**
   * Enriches text nodes within a block with emojis without breaking HTML structure.
   */
  enrichBlockWithEmojis(e) {
    const t = {
      success: "✅",
      error: "❌",
      warning: "⚠️",
      info: "ℹ️",
      magic: "✨",
      done: "🎯",
      plan: "📝",
      link: "🔗",
      image: "🖼️",
      table: "📊",
      celebrate: "🎉",
      rocket: "🚀"
    }, i = document.createTreeWalker(e, NodeFilter.SHOW_TEXT);
    let n;
    for (; n = i.nextNode(); ) {
      let o = n.nodeValue || "", s = !1;
      Object.entries(t).forEach(([r, l]) => {
        const c = new RegExp(`\\b${r}\\b`, "gi");
        c.test(o) && !o.includes(l) && (o = o.replace(c, `${l} ${r}`), s = !0);
      }), s && (n.nodeValue = o);
    }
  }
  /**
   * Inserts a table at the current selection.
   */
  insertTable(e = 3, t = 3) {
    this.focus();
    const i = this.selection.getRange();
    if (!i) return;
    const n = document.createElement("table");
    if (n.classList.add("te-table"), e > 0) {
      const s = document.createElement("thead"), r = document.createElement("tr");
      for (let l = 0; l < t; l++) {
        const c = document.createElement("th");
        c.innerHTML = "<br>", r.appendChild(c);
      }
      s.appendChild(r), n.appendChild(s);
    }
    if (e > 1) {
      const s = document.createElement("tbody");
      for (let r = 1; r < e; r++) {
        const l = document.createElement("tr");
        for (let c = 0; c < t; c++) {
          const a = document.createElement("td");
          a.innerHTML = "<br>", l.appendChild(a);
        }
        s.appendChild(l);
      }
      n.appendChild(s);
    }
    i.deleteContents(), i.insertNode(n);
    const o = n.nextElementSibling;
    if (!o || o.tagName !== "P") {
      const s = document.createElement("p");
      s.innerHTML = "<br>", n.after(s), o && o.tagName === "BR" && o.remove();
    }
    this.editableElement.dispatchEvent(new Event("input", { bubbles: !0 }));
  }
  /**
   * Adds a row to the currently selected table.
   */
  addRow() {
    const e = this.getSelectedTable();
    if (!e) return;
    const t = document.createElement("tr");
    t.style.borderBottom = "1px solid var(--te-border-color)";
    const i = e.rows[0].cells.length;
    for (let o = 0; o < i; o++) {
      const s = document.createElement("td");
      s.innerHTML = "<br>", t.appendChild(s);
    }
    const n = this.getSelectedTd();
    n ? n.parentElement?.after(t) : e.appendChild(t), this.editableElement.dispatchEvent(new Event("input", { bubbles: !0 }));
  }
  /**
   * Deletes the currently selected row.
   */
  deleteRow() {
    const e = this.getSelectedTd();
    if (e && e.parentElement) {
      const t = e.parentElement, i = t.closest("table");
      if (i && i.rows.length > 1) {
        const n = t.rowIndex, o = i.rows[n + 1] || i.rows[n - 1], s = e.cellIndex;
        if (t.remove(), o && o.cells[s]) {
          const r = document.createRange();
          r.selectNodeContents(o.cells[s]), r.collapse(!0), this.selection.restoreSelection(r);
        }
        this.editableElement.dispatchEvent(new Event("input", { bubbles: !0 }));
      }
    }
  }
  /**
   * Adds a column to the currently selected table.
   */
  addColumn() {
    const e = this.getSelectedTable();
    if (!e) return;
    const t = this.getSelectedTd(), i = t ? t.cellIndex : -1;
    for (let n = 0; n < e.rows.length; n++) {
      const o = e.rows[n], s = document.createElement("td");
      s.innerHTML = "<br>", i !== -1 ? o.cells[i].after(s) : o.appendChild(s);
    }
    this.editableElement.dispatchEvent(new Event("input", { bubbles: !0 }));
  }
  /**
   * Deletes the currently selected column.
   */
  deleteColumn() {
    const e = this.getSelectedTd();
    if (!e) return;
    const t = this.getSelectedTable();
    if (!t) return;
    const i = e.cellIndex;
    if (t.rows[0].cells.length > 1) {
      const n = e.nextElementSibling || e.previousElementSibling;
      for (let o = 0; o < t.rows.length; o++)
        t.rows[o].cells[i].remove();
      if (n) {
        const o = document.createRange();
        o.selectNodeContents(n), o.collapse(!0), this.selection.restoreSelection(o);
      }
      this.editableElement.dispatchEvent(new Event("input", { bubbles: !0 }));
    }
  }
  getSelectedTd() {
    const e = window.getSelection();
    if (!e || e.rangeCount === 0) return null;
    let t = e.anchorNode;
    for (; t && t !== this.editableElement; ) {
      if (t.nodeName === "TD" || t.nodeName === "TH") return t;
      t = t.parentNode;
    }
    return null;
  }
  getSelectedTable() {
    const e = this.getSelectedTd();
    return e ? e.closest("table") : null;
  }
  /**
   * Recursively removes a style property from all elements in a fragment.
   */
  clearStyleRecursive(e, t) {
    const i = document.createTreeWalker(e, NodeFilter.SHOW_ELEMENT);
    let n = i.nextNode();
    for (; n; )
      n.style.getPropertyValue(t) && (n.style.removeProperty(t), n.tagName === "SPAN" && n.style.length === 0 && !n.id && !n.className && n.replaceWith(...Array.from(n.childNodes))), n = i.nextNode();
  }
  /**
   * Applies an inline style to the selection.
   * This is used for properties like font-size (px) and font-family
   * where execCommand is outdated or limited.
   */
  /**
   * Applies an inline style to the selection.
   * This is used for properties like font-size (px) and font-family
   * where execCommand is outdated or limited.
   */
  setStyle(e, t, i) {
    if (!i) {
      const r = window.getSelection();
      if (!r || r.rangeCount === 0) return null;
      i = r.getRangeAt(0);
    }
    if (i.collapsed)
      return this.pendingStyles[e] = t, i;
    if (["line-height"].includes(e))
      return this.setBlockStyle(e, t, i);
    let o = i.commonAncestorContainer;
    o.nodeType === Node.TEXT_NODE && (o = o.parentElement);
    let s = null;
    if (o.tagName === "SPAN" && o.children.length === 0 && o.textContent === i.toString())
      o.style.setProperty(e, t), s = i.cloneRange();
    else {
      const r = document.createElement("span");
      r.style.setProperty(e, t);
      try {
        const l = o.tagName === "SPAN" ? o : null, c = i.extractContents();
        this.clearStyleRecursive(c, e), r.appendChild(c), i.insertNode(r), l && l.innerHTML === "" && l.remove();
        const a = document.createRange();
        a.selectNodeContents(r), s = a;
        const h = window.getSelection();
        h && h.rangeCount > 0 && (h.removeAllRanges(), h.addRange(a));
      } catch (l) {
        console.warn("Failed to apply style:", l);
      }
    }
    return this.editableElement.dispatchEvent(new Event("input", { bubbles: !0 })), s;
  }
  /**
   * Applies a style to the block-level containers within the range.
   */
  setBlockStyle(e, t, i) {
    const n = ["P", "H1", "H2", "H3", "H4", "H5", "H6", "LI", "TD", "TH", "DIV", "BLOCKQUOTE"], o = /* @__PURE__ */ new Set();
    if (Array.from(this.editableElement.querySelectorAll(n.join(","))).forEach((r) => {
      i.intersectsNode(r) && o.add(r);
    }), o.size === 0) {
      let r = i.commonAncestorContainer;
      for (; r && r !== this.editableElement.parentElement; ) {
        if (r.nodeType === Node.ELEMENT_NODE && n.includes(r.tagName)) {
          o.add(r);
          break;
        }
        r = r.parentNode;
      }
    }
    return o.forEach((r) => {
      r.style.setProperty(e, t);
    }), this.editableElement.dispatchEvent(new Event("input", { bubbles: !0 })), i;
  }
  /**
   * Creates a link at the current selection.
   * Ensures the link opens in a new tab with proper security attributes.
   */
  createLink(e) {
    if (this.focus(), e = e.trim(), /^(javascript|vbscript|data|file):/i.test(e)) {
      console.warn("Security Warning: Blocked malicious URI scheme.");
      return;
    }
    const i = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(e);
    !/^https?:\/\//i.test(e) && !/^mailto:/i.test(e) && !e.startsWith("#") && (i ? e = "mailto:" + e : e = "https://" + e);
    const n = window.getSelection();
    if (n && n.rangeCount > 0) {
      const o = n.getRangeAt(0);
      if (o.collapsed) {
        const s = document.createTextNode(e);
        o.insertNode(s);
        const r = document.createRange();
        r.selectNodeContents(s), n.removeAllRanges(), n.addRange(r);
      }
    }
    if (document.execCommand("createLink", !1, e), n && n.rangeCount > 0) {
      let s = n.getRangeAt(0).commonAncestorContainer;
      s.nodeType === Node.TEXT_NODE && (s = s.parentElement);
      let r = null;
      s.tagName === "A" ? r = s : r = s.querySelector("a"), r && (r.setAttribute("target", "_blank"), r.setAttribute("rel", "noopener noreferrer"));
    }
    this.editableElement.dispatchEvent(new Event("input", { bubbles: !0 }));
  }
  /**
   * Inserts an image at the current selection.
   */
  insertImage(e, t, i = !1) {
    this.focus();
    const n = this.selection.getRange();
    if (!n) return null;
    const o = document.createElement("figure");
    o.classList.add("te-image-container"), o.setAttribute("contenteditable", "false"), i && o.classList.add("is-loading");
    const s = document.createElement("img");
    s.src = e, s.classList.add("te-image"), t && s.setAttribute("data-image-id", t);
    const r = document.createElement("figcaption");
    r.classList.add("te-image-caption"), r.setAttribute("contenteditable", "true"), r.setAttribute("data-placeholder", "شرح تصویر می‌نویس..."), ["top-left", "top-right", "bottom-left", "bottom-right"].forEach((h) => {
      const d = document.createElement("div");
      d.classList.add("te-image-resizer", `te-resizer-${h}`), o.appendChild(d);
    }), o.appendChild(s), o.appendChild(r), n.deleteContents(), n.insertNode(o);
    const c = document.createElement("p");
    c.innerHTML = "<br>", o.after(c);
    const a = document.createRange();
    return a.setStart(c, 0), a.setEnd(c, 0), this.selection.restoreSelection(a), this.editableElement.dispatchEvent(new Event("input", { bubbles: !0 })), this.save(), o;
  }
  /**
   * Returns the clean and optimized HTML content of the editor.
   */
  getHTML() {
    const e = this.normalizeHTML(this.editableElement.innerHTML);
    return e === "<p><br></p>" || e === "<p></p>" ? "" : e;
  }
  /**
   * Returns the plain text content of the editor.
   */
  getText() {
    return this.editableElement.innerText || this.editableElement.textContent || "";
  }
  /**
   * Returns the current character count based on plain text.
   */
  getCharCount() {
    return this.getText().replace(/\n$/, "").length;
  }
  /**
   * Normalizes the editor's content in-place.
   */
  normalize() {
    const e = this.editableElement.innerHTML;
    this.selection.saveSelectionMarkers(this.editableElement);
    const t = this.normalizeHTML(this.editableElement.innerHTML);
    t !== e ? (this.editableElement.innerHTML = t, this.selection.restoreSelectionMarkers(this.editableElement)) : this.selection.removeSelectionMarkers(this.editableElement), this.checkPlaceholder();
  }
  normalizationContainer = null;
  /**
   * Internal helper to strictly sanitize HTML strings.
   */
  sanitize(e) {
    L.addHook("afterSanitizeAttributes", (i) => {
      i.tagName === "A" && (i.setAttribute("target", "_blank"), i.setAttribute("rel", "noopener noreferrer"));
    });
    const t = L.sanitize(e, {
      ALLOWED_TAGS: [
        "b",
        "i",
        "u",
        "s",
        "span",
        "div",
        "p",
        "br",
        "a",
        "h1",
        "h2",
        "h3",
        "h4",
        "h5",
        "h6",
        "ul",
        "ol",
        "li",
        "blockquote",
        "hr",
        "pre",
        "code",
        "img",
        "table",
        "tbody",
        "tr",
        "td",
        "th",
        "thead",
        "tfoot",
        "figure",
        "figcaption"
      ],
      ALLOWED_ATTR: [
        "href",
        "src",
        "alt",
        "style",
        "color",
        "background-color",
        "class",
        "id",
        "target",
        "rel",
        "contenteditable",
        "data-placeholder",
        "data-image-id"
      ],
      ALLOW_DATA_ATTR: !0,
      FORBID_TAGS: ["script", "style", "iframe", "object", "embed", "form", "textarea"],
      FORBID_ATTR: ["onerror", "onload", "onclick", "onmouseover"]
    });
    return L.removeHook("afterSanitizeAttributes"), t;
  }
  isBlockElement(e) {
    if (e.nodeType !== Node.ELEMENT_NODE) return !1;
    const t = e.tagName;
    return ["P", "DIV", "H1", "H2", "H3", "H4", "H5", "H6", "UL", "OL", "TABLE", "BLOCKQUOTE", "PRE", "HR", "FIGURE"].includes(t);
  }
  /**
   * Optimizes HTML by fixing invalid nesting and removing redundant tags.
   */
  normalizeHTML(e) {
    this.normalizationContainer || (this.normalizationContainer = document.createElement("div"));
    const t = this.normalizationContainer;
    t.innerHTML = e;
    const i = Array.from(t.childNodes);
    let n = null;
    i.forEach((a) => {
      if (this.isBlockElement(a)) {
        if (n = null, a.nodeName === "PRE") {
          const h = a;
          if (!h.querySelector("code")) {
            const u = document.createElement("code");
            u.innerHTML = h.innerHTML, h.innerHTML = "", h.appendChild(u);
          }
          let d = h.parentElement;
          (!d || !d.classList.contains("te-code-wrapper")) && (d = document.createElement("div"), d.className = "te-code-wrapper", d.contentEditable = "false", h.before(d), d.appendChild(h), h.contentEditable = "true");
          let m = d.querySelector(".te-code-controls");
          if (m || (m = document.createElement("div"), m.className = "te-code-controls", m.contentEditable = "false", d.insertBefore(m, h)), !m.querySelector(".te-code-copy-btn")) {
            const u = document.createElement("div");
            u.className = "te-code-copy-btn", u.textContent = "کپی", u.contentEditable = "false", m.appendChild(u);
          }
          if (!m.querySelector(".te-code-remove-btn")) {
            const u = document.createElement("div");
            u.className = "te-code-remove-btn", u.contentEditable = "false", u.title = "حذف بلوک کد", u.innerHTML = '<span class="te-close-icon">&times;</span>', m.appendChild(u);
          }
          d.querySelectorAll(":scope > .te-code-remove-btn, :scope > pre > .te-code-copy-btn").forEach((u) => u.remove()), ["top", "bottom", "left", "right"].forEach((u) => {
            if (!d.querySelector(`.te-bar-${u}`)) {
              const p = document.createElement("div");
              p.className = `te-resize-bar te-bar-${u}`, p.contentEditable = "false", d.appendChild(p);
            }
          }), ["tl", "tr", "bl", "br"].forEach((u) => {
            if (!d.querySelector(`.te-corner-${u}`)) {
              const p = document.createElement("div");
              p.className = `te-resize-corner te-corner-${u}`, p.contentEditable = "false", d.appendChild(p);
            }
          }), d.querySelectorAll(":scope > .te-code-resize-handle, :scope > .te-code-resize-bar").forEach((u) => u.remove());
        }
      } else {
        if (a.nodeType === Node.TEXT_NODE && (a.textContent || "").trim() === "" && !n)
          return;
        n || (n = document.createElement("p"), a.before(n)), n.appendChild(a);
      }
    }), t.querySelectorAll("p").forEach((a) => {
      const h = a.querySelectorAll("ul, ol, table, h1, h2, h3, h4, h5, h6, pre, blockquote");
      h.length > 0 && (h.forEach((d) => {
        a.after(d);
      }), (a.innerHTML.trim() === "" || a.innerHTML.trim() === "<br>") && a.remove());
    }), t.querySelectorAll("span").forEach((a) => {
      if (!a.id.startsWith("te-selection-"))
        if (a.attributes.length === 0) {
          const h = document.createTextNode(a.textContent || "");
          a.replaceWith(h);
        } else a.innerHTML.trim() === "" && a.remove();
    }), Array.from(t.querySelectorAll("span")).forEach((a) => {
      if (!a.parentNode) return;
      let h = a.nextSibling;
      for (; h && h.nodeType === Node.TEXT_NODE && h.textContent?.trim() === ""; )
        h = h.nextSibling;
      if (h && h.nodeType === Node.ELEMENT_NODE && h.tagName === "SPAN") {
        const d = h, m = a.getAttribute("style") || "", u = d.getAttribute("style") || "", p = a.getAttribute("class") || "", f = d.getAttribute("class") || "";
        if (m === u && p === f && !a.id && !d.id) {
          for (; d.firstChild; )
            a.appendChild(d.firstChild);
          d.remove();
        }
      }
    });
    const r = Array.from(t.querySelectorAll("p"));
    r.forEach((a) => {
      a.innerHTML.trim() === "" && t.childNodes.length > 1 && a !== t.lastElementChild && a.remove();
    });
    for (let a = r.length - 1; a >= 0; a--) {
      const h = r[a], d = h.innerHTML.trim() === "" || h.innerHTML.trim() === "<br>", m = h === t.lastElementChild;
      if (d && m && t.children.length > 1)
        h.remove();
      else
        break;
    }
    const l = t.lastElementChild;
    if (l && ["PRE", "TABLE", "FIGURE", "BLOCKQUOTE", "UL", "OL", "HR"].includes(l.tagName)) {
      const a = document.createElement("p");
      a.innerHTML = "<br>", t.appendChild(a);
    }
    return t.innerHTML.trim() === "" || t.innerHTML.trim() === "<p><br></p>" || t.innerHTML.trim() === "<p></p>" ? "<p><br></p>" : this.sanitize(t.innerHTML);
  }
  // Handle paste events to sanitize inherited malware and styles
  handlePaste(e) {
    e.preventDefault();
    let t = (e.clipboardData || window.clipboardData).getData("text/plain"), i = (e.clipboardData || window.clipboardData).getData("text/html");
    if (e.clipboardData && e.clipboardData.items) {
      const o = [];
      for (let s = 0; s < e.clipboardData.items.length; s++) {
        const r = e.clipboardData.items[s];
        if (r.type.startsWith("image/")) {
          const l = r.getAsFile();
          l && o.push(l);
        }
      }
      if (o.length > 0) {
        this.handleFiles(o);
        return;
      }
    }
    if (this.options.maxCharCount && this.options.strictCharLimit) {
      const o = this.getCharCount(), s = window.getSelection();
      let r = 0;
      s && s.rangeCount > 0 && (r = s.toString().length);
      const l = this.options.maxCharCount - (o - r);
      if (l <= 0)
        return;
      t.length > l && (t = t.substring(0, l), i = "");
    }
    const n = /<([a-z1-6]+)\b[^>]*>[\s\S]*<\/\1>/i.test(t) || /^\s*<[a-z1-6]+\b[^>]*>/i.test(t);
    if (!i && t && n && (i = t.replace(/(\r\n|\n|\r)/gm, " ").replace(/>\s+</g, "><").trim()), i) {
      const o = this.sanitize(i);
      this.execute("insertHTML", o);
    } else t && this.execute("insertText", t);
  }
  /**
   * Sets the HTML content of the editor.
   */
  setHTML(e) {
    const t = this.sanitize(e);
    this.editableElement.innerHTML = t;
  }
  /**
   * Internal access to the editable element.
   */
  get el() {
    return this.editableElement;
  }
  /**
   * Returns the editor options.
   */
  getOptions() {
    return this.options;
  }
  /**
   * Internal helper to handle multiple files.
   */
  async handleFiles(e) {
    const t = this.options.maxImageSizeMB || 5;
    for (const i of e) {
      if (!i.type.startsWith("image/")) continue;
      let n = null;
      try {
        if (i.size > t * 1024 * 1024 * 3) {
          console.warn(`File ${i.name} is too large to even attempt processing.`);
          continue;
        }
        this.options.onSaving && this.options.onSaving();
        const o = URL.createObjectURL(i);
        n = this.insertImage(o, void 0, !0);
        const s = await T.compressImage(i, t), r = URL.createObjectURL(s);
        if (n) {
          const c = n.querySelector("img");
          c && (c.src = r);
        }
        if (s.size > t * 1024 * 1024) {
          alert(`حجم تصویر «${i.name}» از سقف ${t} مگابایت بیشتر است، حتی بعد از فشرده‌سازی.`), n?.remove();
          continue;
        }
        const l = await T.uploadFile(s, this.options);
        if (l)
          if (n) {
            const c = n.querySelector("img");
            c && (c.src = l.imageUrl, l.imageId && c.setAttribute("data-image-id", l.imageId)), n.classList.remove("is-loading");
          } else
            this.insertImage(l.imageUrl, l.imageId);
        else {
          const c = new FileReader();
          c.onload = (a) => {
            const h = a.target?.result;
            if (n) {
              const d = n.querySelector("img");
              d && (d.src = h), n.classList.remove("is-loading");
            } else
              this.insertImage(h);
          }, c.readAsDataURL(s);
        }
      } catch (o) {
        console.error("Image handling failed", o), n?.remove();
      } finally {
        this.options.onSave && this.save();
      }
    }
  }
  insertCodeBlock() {
    const e = window.getSelection();
    if (!e || e.rangeCount === 0) return;
    const t = e.getRangeAt(0), i = document.createElement("div");
    i.className = "te-code-wrapper", i.contentEditable = "false";
    const n = document.createElement("pre");
    n.contentEditable = "true";
    const o = document.createElement("code");
    o.innerHTML = "<br>", n.appendChild(o);
    const s = document.createElement("div");
    s.className = "te-code-controls", s.contentEditable = "false";
    const r = document.createElement("div");
    r.className = "te-code-copy-btn", r.textContent = "کپی", r.contentEditable = "false";
    const l = document.createElement("div");
    l.className = "te-code-remove-btn", l.innerHTML = '<span class="te-close-icon">&times;</span>', l.contentEditable = "false", l.title = "حذف بلوک کد", s.appendChild(r), s.appendChild(l), i.appendChild(s), i.appendChild(n), ["top", "bottom", "left", "right"].forEach((c) => {
      const a = document.createElement("div");
      a.className = `te-resize-bar te-bar-${c}`, a.contentEditable = "false", i.appendChild(a);
    }), ["tl", "tr", "bl", "br"].forEach((c) => {
      const a = document.createElement("div");
      a.className = `te-resize-corner te-corner-${c}`, a.contentEditable = "false", i.appendChild(a);
    }), t.deleteContents(), t.insertNode(i), this.selection.setCursorAtStart(o), this.normalize(), this.history.record(this.editableElement.innerHTML, this.selection.getSelectionPath(this.editableElement));
  }
  applyIndent(e) {
    const i = this.selection.getRange();
    if (!i) return;
    const n = this.editableElement, o = e ? 28 : -28, a = getComputedStyle(n).direction === "rtl", s = new Set();
    i.getClientRects().forEach((u) => n.querySelectorAll("p, li, h1, h2, h3, h4, h5, h6, blockquote, pre, figure, div").forEach((c) => {
      const d = c.getClientRects();
      d.length > 0 && d.some((v) => v.top < u.bottom && v.bottom > u.top) && s.add(c);
    }));
    if (s.size === 0) {
      let u = i.commonAncestorContainer;
      u.nodeType === 3 && (u = u.parentElement);
      u && n.contains(u) && (u.matches && u.matches("p, li, h1, h2, h3, h4, h5, h6, blockquote, pre, figure, div") ? s.add(u) : n.querySelectorAll("p, li, h1, h2, h3, h4, h5, h6, blockquote, pre, figure, div").forEach((v) => {
        u.contains(v) && s.add(v);
      }));
    }
    const r = a ? "marginRight" : "marginLeft";
    s.forEach((v) => {
      const f = parseInt(getComputedStyle(v)[r], 10) || 0, g = Math.max(0, f + o);
      g === 0 ? v.style.removeProperty(r.toLowerCase()) : v.style[r] = g + "px";
    });
  }
  handleCodeRemove(e) {
    const t = e.closest(".te-code-wrapper");
    if (!t) return;
    const i = t.previousElementSibling, n = t.nextElementSibling, o = t.parentElement;
    if (t.remove(), n)
      if (n.tagName === "PRE" || n.classList.contains("te-code-wrapper")) {
        const s = n.querySelector("code") || n.querySelector("pre") || n;
        this.selection.setCursorAtStart(s);
      } else
        this.selection.setCursorAtStart(n);
    else if (i)
      this.selection.setCursorAtEnd(i);
    else if (o) {
      const s = document.createElement("p");
      s.innerHTML = "<br>", o.appendChild(s), this.selection.setCursorAtStart(s);
    }
    this.normalize(), this.history.record(this.editableElement.innerHTML, this.selection.getSelectionPath(this.editableElement));
  }
  handleCodeCopy(e) {
    if (e.classList.contains("copied")) return;
    const t = e.parentElement;
    if (!t) return;
    const i = t.querySelector("code"), n = i ? i.innerText : t.innerText.replace("کپی", "").trim();
    navigator.clipboard.writeText(n).then(() => {
      const o = e.textContent;
      e.textContent = "کپی شد", e.classList.add("copied"), setTimeout(() => {
        e.textContent = o, e.classList.remove("copied");
      }, 2e3);
    });
  }
  showCodeContextMenu(e, t, i) {
    this.hideCodeContextMenu();
    const n = document.createElement("div");
    n.className = "te-code-context-menu", n.style.left = `${e}px`, n.style.top = `${t}px`;
    const o = document.createElement("div");
    o.className = "te-menu-section", o.innerHTML = '<div class="te-menu-label">Code Themes</div>';
    const s = document.createElement("div");
    s.className = "te-theme-grid";
    const r = ["slate", "ocean", "forest", "crimson", "terminal"], l = Array.from(i.classList).find((d) => d.startsWith("te-theme-"))?.replace("te-theme-", "") || "slate";
    r.forEach((d) => {
      const m = document.createElement("div");
      m.className = `te-theme-dot ${d === l ? "active" : ""}`, m.dataset.theme = d, m.title = d.charAt(0).toUpperCase() + d.slice(1), m.onclick = (u) => {
        u.stopPropagation(), this.applyCodeTheme(i, d), this.hideCodeContextMenu();
      }, s.appendChild(m);
    }), o.appendChild(s), n.appendChild(o);
    const c = document.createElement("div");
    c.className = "te-custom-color-trigger", c.innerHTML = '<span>Custom Color</span><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>', c.onclick = (d) => {
      d.stopPropagation(), this.showCustomColorPicker(i, o, n);
    }, n.appendChild(c), document.body.appendChild(n);
    const a = n.getBoundingClientRect();
    a.right > window.innerWidth && (n.style.left = `${window.innerWidth - a.width - 10}px`), a.bottom > window.innerHeight && (n.style.top = `${window.innerHeight - a.height - 10}px`);
    const h = (d) => {
      n.contains(d.target) || (this.hideCodeContextMenu(), document.removeEventListener("mousedown", h), document.removeEventListener("wheel", h));
    };
    setTimeout(() => {
      document.addEventListener("mousedown", h), document.addEventListener("wheel", h);
    }, 0);
  }
  hideCodeContextMenu() {
    const e = document.querySelector(".te-code-context-menu");
    e && e.remove();
  }
  applyCodeTheme(e, t) {
    const i = e.querySelector("pre");
    i && i.removeAttribute("style"), Array.from(e.classList).forEach((n) => {
      n.startsWith("te-theme-") && e.classList.remove(n);
    }), t !== "slate" && e.classList.add(`te-theme-${t}`), this.history.record(this.editableElement.innerHTML, this.selection.getSelectionPath(this.editableElement));
  }
  showCustomColorPicker(e, t, i) {
    const n = i.querySelector(".te-color-picker-container");
    if (n) {
      n.remove();
      return;
    }
    const o = document.createElement("div");
    o.className = "te-color-picker-container";
    const r = e.querySelector("pre").style.backgroundColor || "#0f172a";
    let l = r;
    if (r.startsWith("rgb")) {
      const d = r.match(/\d+/g);
      d && (l = "#" + d.map((m) => parseInt(m).toString(16).padStart(2, "0")).join(""));
    }
    o.innerHTML = `
      <div class="te-color-input-wrapper">
        <input type="color" class="te-color-input" value="${l.startsWith("#") ? l : "#0f172a"}">
        <span style="font-size: 11px; color: #e2e8f0;">Choose Color</span>
      </div>
      <div class="te-picker-actions">
        <button class="te-picker-btn cancel">Cancel</button>
        <button class="te-picker-btn apply">Apply</button>
      </div>
    `;
    const c = o.querySelector(".te-color-input"), a = o.querySelector(".te-picker-btn.apply"), h = o.querySelector(".te-picker-btn.cancel");
    a.onclick = (d) => {
      d.stopPropagation(), this.applyCustomColor(e, c.value), this.hideCodeContextMenu();
    }, h.onclick = (d) => {
      d.stopPropagation(), o.remove();
    }, i.appendChild(o);
  }
  applyCustomColor(e, t) {
    const i = e.querySelector("pre");
    if (!i) return;
    Array.from(e.classList).forEach((o) => {
      o.startsWith("te-theme-") && e.classList.remove(o);
    });
    const n = this.getContrastColor(t);
    i.style.backgroundColor = t, i.style.color = n, i.style.borderColor = this.adjustColorBrightness(t, -20), this.history.record(this.editableElement.innerHTML, this.selection.getSelectionPath(this.editableElement));
  }
  getContrastColor(e) {
    e.startsWith("#") && (e = e.slice(1));
    const t = parseInt(e.substr(0, 2), 16), i = parseInt(e.substr(2, 2), 16), n = parseInt(e.substr(4, 2), 16);
    return (t * 299 + i * 587 + n * 114) / 1e3 >= 128 ? "#0f172a" : "#f8fafc";
  }
  adjustColorBrightness(e, t) {
    e.startsWith("#") && (e = e.slice(1));
    let i = parseInt(e.substr(0, 2), 16), n = parseInt(e.substr(2, 2), 16), o = parseInt(e.substr(4, 2), 16);
    return i = Math.max(0, Math.min(255, i + i * t / 100)), n = Math.max(0, Math.min(255, n + n * t / 100)), o = Math.max(0, Math.min(255, o + o * t / 100)), "#" + [i, n, o].map((s) => Math.round(s).toString(16).padStart(2, "0")).join("");
  }
  handleCodeResizeStart(e, t) {
    e.preventDefault(), e.stopPropagation();
    const i = t.closest(".te-code-wrapper");
    if (!i.querySelector("pre")) return;
    const o = e.clientX, s = e.clientY, r = i.offsetWidth, l = i.offsetHeight, c = parseInt(window.getComputedStyle(i).marginTop || "0"), a = parseInt(window.getComputedStyle(i).marginLeft || "0"), h = t.classList.contains("te-bar-top") || t.classList.contains("te-corner-tl") || t.classList.contains("te-corner-tr"), d = t.classList.contains("te-bar-bottom") || t.classList.contains("te-corner-bl") || t.classList.contains("te-corner-br"), m = t.classList.contains("te-bar-left") || t.classList.contains("te-corner-tl") || t.classList.contains("te-corner-bl"), u = t.classList.contains("te-bar-right") || t.classList.contains("te-corner-tr") || t.classList.contains("te-corner-br");
    t.classList.add("active"), i.classList.add("resizing");
    const p = (v) => {
      const C = v.clientX - o, w = v.clientY - s;
      if (d)
        i.style.height = `${Math.max(60, l + w)}px`;
      else if (h) {
        const y = Math.max(60, l - w);
        y > 60 && (i.style.height = `${y}px`, i.style.marginTop = `${c + w}px`);
      }
      if (u)
        i.style.width = `${Math.max(100, r + C)}px`;
      else if (m) {
        const y = Math.max(100, r - C);
        y > 100 && (i.style.width = `${y}px`, i.style.marginLeft = `${a + C}px`);
      }
    }, f = () => {
      t.classList.remove("active"), i.classList.remove("resizing"), document.body.style.cursor = "", window.removeEventListener("mousemove", p), window.removeEventListener("mouseup", f), this.history.record(this.editableElement.innerHTML, this.selection.getSelectionPath(this.editableElement));
    };
    window.addEventListener("mousemove", p), window.addEventListener("mouseup", f);
  }
}
const EMOJI_LIST = [{ emoji: "😀", name: "grinning", category: "خنده و احساسات" }, { emoji: "😃", name: "smile", category: "خنده و احساسات" }, { emoji: "😄", name: "laughing", category: "خنده و احساسات" }, { emoji: "😁", name: "beaming", category: "خنده و احساسات" }, { emoji: "😆", name: "joy", category: "خنده و احساسات" }, { emoji: "😅", name: "sweat", category: "خنده و احساسات" }, { emoji: "😂", name: "rofl", category: "خنده و احساسات" }, { emoji: "😊", name: "blush", category: "خنده و احساسات" }, { emoji: "😇", name: "innocent", category: "خنده و احساسات" }, { emoji: "🙂", name: "slight-smile", category: "خنده و احساسات" }, { emoji: "🙃", name: "upside-down", category: "خنده و احساسات" }, { emoji: "😉", name: "wink", category: "خنده و احساسات" }, { emoji: "😌", name: "relieved", category: "خنده و احساسات" }, { emoji: "😍", name: "heart-eyes", category: "خنده و احساسات" }, { emoji: "😘", name: "kiss", category: "خنده و احساسات" }, { emoji: "🥰", name: "adoring", category: "خنده و احساسات" }, { emoji: "😗", name: "kiss-face", category: "خنده و احساسات" }, { emoji: "😙", name: "kiss-blush", category: "خنده و احساسات" }, { emoji: "😚", name: "kiss-wink", category: "خنده و احساسات" }, { emoji: "😋", name: "yummy", category: "خنده و احساسات" }, { emoji: "😛", name: "stuck-out-tongue", category: "خنده و احساسات" }, { emoji: "😜", name: "wink-tongue", category: "خنده و احساسات" }, { emoji: "😏", name: "smirk", category: "خنده و احساسات" }, { emoji: "😒", name: "unamused", category: "خنده و احساسات" }, { emoji: "😞", name: "disappointed", category: "خنده و احساسات" }, { emoji: "😔", name: "pensive", category: "خنده و احساسات" }, { emoji: "😟", name: "worried", category: "خنده و احساسات" }, { emoji: "🙁", name: "slight-frown", category: "خنده و احساسات" }, { emoji: "😣", name: "confused", category: "خنده و احساسات" }, { emoji: "😖", name: "confounded", category: "خنده و احساسات" }, { emoji: "😫", name: "tired", category: "خنده و احساسات" }, { emoji: "😩", name: "weary", category: "خنده و احساسات" }, { emoji: "🥺", name: "pleading", category: "خنده و احساسات" }, { emoji: "😮", name: "open-mouth", category: "خنده و احساسات" }, { emoji: "😯", name: "hushed", category: "خنده و احساسات" }, { emoji: "😲", name: "astonished", category: "خنده و احساسات" }, { emoji: "🥱", name: "yawning", category: "خنده و احساسات" }, { emoji: "😦", name: "grimacing", category: "خنده و احساسات" }, { emoji: "😧", name: "angry", category: "خنده و احساسات" }, { emoji: "😨", name: "fearful", category: "خنده و احساسات" }, { emoji: "😰", name: "anxious", category: "خنده و احساسات" }, { emoji: "😶", name: "neutral", category: "خنده و احساسات" }, { emoji: "😐", name: "expressionless", category: "خنده و احساسات" }, { emoji: "😑", name: "meh", category: "خنده و احساسات" }, { emoji: "😬", name: "grimace", category: "خنده و احساسات" }, { emoji: "🙄", name: "roll-eyes", category: "خنده و احساسات" }, { emoji: "😕", name: "confused2", category: "خنده و احساسات" }, { emoji: "😤", name: "triumph", category: "خنده و احساسات" }, { emoji: "😳", name: "flushed", category: "خنده و احساسات" }, { emoji: "🥶", name: "cold-face", category: "خنده و احساسات" }, { emoji: "🥵", name: "hot-face", category: "خنده و احساسات" }, { emoji: "😎", name: "cool", category: "خنده و احساسات" }, { emoji: "🙃", name: "upside", category: "خنده و احساسات" }, { emoji: "🙌", name: "raise-hands", category: "خنده و احساسات" }, { emoji: "🙏", name: "pray", category: "خنده و احساسات" }, { emoji: "❤️", name: "red-heart", category: "نمادها" }, { emoji: "✨", name: "sparkles", category: "نمادها" }, { emoji: "⭐", name: "star", category: "نمادها" }, { emoji: "⚡", name: "zap", category: "نمادها" }, { emoji: "☘", name: "shamrock", category: "نمادها" }, { emoji: "☕", name: "coffee", category: "نمادها" }, { emoji: "✈", name: "airplane", category: "نمادها" }, { emoji: "⛵", name: "sailboat", category: "نمادها" }, { emoji: "✉", name: "envelope", category: "نمادها" }, { emoji: "⚽", name: "soccer", category: "نمادها" }, { emoji: "⚾", name: "baseball", category: "نمادها" }, { emoji: "⛳", name: "golf", category: "نمادها" }, { emoji: "♠", name: "spades", category: "نمادها" }, { emoji: "🤞", name: "crossed-fingers", category: "دست‌ها" }, { emoji: "👍", name: "thumbs-up", category: "دست‌ها" }, { emoji: "👎", name: "thumbs-down", category: "دست‌ها" }, { emoji: "👌", name: "ok", category: "دست‌ها" }, { emoji: "🤌", name: "pinched-fingers", category: "دست‌ها" }, { emoji: "🤟", name: "rock-on", category: "دست‌ها" }, { emoji: "🤘", name: "horns", category: "دست‌ها" }, { emoji: "👈", name: "point-left", category: "دست‌ها" }, { emoji: "👉", name: "point-right", category: "دست‌ها" }, { emoji: "👆", name: "point-up", category: "دست‌ها" }, { emoji: "👇", name: "point-down", category: "دست‌ها" }, { emoji: "☝", name: "index-up", category: "دست‌ها" }, { emoji: "👏", name: "clap", category: "دست‌ها" }, { emoji: "👊", name: "fist", category: "دست‌ها" }, { emoji: "✊", name: "raised-fist", category: "دست‌ها" }, { emoji: "👋", name: "wave", category: "دست‌ها" }, { emoji: "🖐", name: "raised-hand", category: "دست‌ها" }, { emoji: "✋", name: "stop", category: "دست‌ها" }, { emoji: "🧐", name: "monocle", category: "حیوانات" }, { emoji: "🧡", name: "orange-heart", category: "حیوانات" }, { emoji: "🐶", name: "dog", category: "حیوانات" }, { emoji: "🐱", name: "cat", category: "حیوانات" }, { emoji: "🐭", name: "mouse", category: "حیوانات" }, { emoji: "🐹", name: "hamster", category: "حیوانات" }, { emoji: "🐰", name: "rabbit", category: "حیوانات" }, { emoji: "🦊", name: "fox", category: "حیوانات" }, { emoji: "🐻", name: "bear", category: "حیوانات" }, { emoji: "🐼", name: "panda", category: "حیوانات" }, { emoji: "🐨", name: "koala", category: "حیوانات" }, { emoji: "🐯", name: "tiger", category: "حیوانات" }, { emoji: "🐮", name: "cow", category: "حیوانات" }, { emoji: "🐷", name: "pig", category: "حیوانات" }, { emoji: "🐸", name: "frog", category: "حیوانات" }, { emoji: "🐵", name: "monkey", category: "حیوانات" }, { emoji: "🐔", name: "chicken", category: "حیوانات" }, { emoji: "🐧", name: "penguin", category: "حیوانات" }, { emoji: "🐦", name: "bird", category: "حیوانات" }, { emoji: "🦆", name: "duck", category: "حیوانات" }, { emoji: "🦅", name: "eagle", category: "حیوانات" }, { emoji: "🦉", name: "owl", category: "حیوانات" }, { emoji: "🦇", name: "bat", category: "حیوانات" }, { emoji: "🐺", name: "wolf", category: "حیوانات" }, { emoji: "🐗", name: "boar", category: "حیوانات" }, { emoji: "🐛", name: "bug", category: "حیوانات" }, { emoji: "🦋", name: "butterfly", category: "حیوانات" }, { emoji: "🐌", name: "snail", category: "حیوانات" }, { emoji: "🐞", name: "ladybug", category: "حیوانات" }, { emoji: "🐜", name: "ant", category: "حیوانات" }, { emoji: "🦈", name: "shark", category: "حیوانات" }, { emoji: "🐙", name: "octopus", category: "حیوانات" }, { emoji: "🦑", name: "squid", category: "حیوانات" }, { emoji: "🐡", name: "blowfish", category: "حیوانات" }, { emoji: "🐠", name: "fish", category: "حیوانات" }, { emoji: "🐬", name: "dolphin", category: "حیوانات" }, { emoji: "🐳", name: "whale", category: "حیوانات" }, { emoji: "🐋", name: "whale2", category: "حیوانات" }, { emoji: "🐴", name: "horse", category: "حیوانات" }, { emoji: "🐝", name: "honeybee", category: "حیوانات" }, { emoji: "🐢", name: "turtle", category: "حیوانات" }, { emoji: "🐍", name: "snake", category: "حیوانات" }, { emoji: "🦎", name: "lizard", category: "حیوانات" }, { emoji: "🐊", name: "crocodile", category: "حیوانات" }, { emoji: "🐅", name: "leopard", category: "حیوانات" }, { emoji: "🐘", name: "elephant", category: "حیوانات" }, { emoji: "🦏", name: "rhino", category: "حیوانات" }, { emoji: "🦙", name: "llama", category: "حیوانات" }, { emoji: "🦒", name: "giraffe", category: "حیوانات" }, { emoji: "🐕", name: "dog2", category: "حیوانات" }, { emoji: "🐇", name: "rabbit2", category: "حیوانات" }, { emoji: "🦝", name: "raccoon", category: "حیوانات" }, { emoji: "🐐", name: "goat", category: "حیوانات" }, { emoji: "🧀", name: "cheese", category: "حیوانات" }, { emoji: "🧁", name: "cupcake", category: "حیوانات" }, { emoji: "🍏", name: "green-apple", category: "غذا و نوشیدنی" }, { emoji: "🍎", name: "red-apple", category: "غذا و نوشیدنی" }, { emoji: "🍐", name: "pear", category: "غذا و نوشیدنی" }, { emoji: "🍊", name: "orange", category: "غذا و نوشیدنی" }, { emoji: "🍋", name: "lemon", category: "غذا و نوشیدنی" }, { emoji: "🍌", name: "banana", category: "غذا و نوشیدنی" }, { emoji: "🍉", name: "watermelon", category: "غذا و نوشیدنی" }, { emoji: "🍇", name: "grapes", category: "غذا و نوشیدنی" }, { emoji: "🍓", name: "strawberry", category: "غذا و نوشیدنی" }, { emoji: "🍈", name: "melon", category: "غذا و نوشیدنی" }, { emoji: "🍒", name: "cherries", category: "غذا و نوشیدنی" }, { emoji: "🍑", name: "peach", category: "غذا و نوشیدنی" }, { emoji: "🥭", name: "mango", category: "غذا و نوشیدنی" }, { emoji: "🍍", name: "pineapple", category: "غذا و نوشیدنی" }, { emoji: "🥥", name: "coconut", category: "غذا و نوشیدنی" }, { emoji: "🥝", name: "kiwi", category: "غذا و نوشیدنی" }, { emoji: "🥕", name: "carrot", category: "غذا و نوشیدنی" }, { emoji: "🥒", name: "cucumber", category: "غذا و نوشیدنی" }, { emoji: "🍔", name: "hamburger", category: "غذا و نوشیدنی" }, { emoji: "🍟", name: "fries", category: "غذا و نوشیدنی" }, { emoji: "🍕", name: "pizza", category: "غذا و نوشیدنی" }, { emoji: "🥪", name: "sandwich", category: "غذا و نوشیدنی" }, { emoji: "🍳", name: "fried-egg", category: "غذا و نوشیدنی" }, { emoji: "🥐", name: "croissant", category: "غذا و نوشیدنی" }, { emoji: "🍞", name: "bread", category: "غذا و نوشیدنی" }, { emoji: "🥨", name: "pretzel", category: "غذا و نوشیدنی" }, { emoji: "🥖", name: "baguette", category: "غذا و نوشیدنی" }, { emoji: "🥚", name: "egg", category: "غذا و نوشیدنی" }, { emoji: "🥓", name: "bacon", category: "غذا و نوشیدنی" }, { emoji: "🥞", name: "pancakes", category: "غذا و نوشیدنی" }, { emoji: "🍝", name: "spaghetti", category: "غذا و نوشیدنی" }, { emoji: "🍜", name: "ramen", category: "غذا و نوشیدنی" }, { emoji: "🍲", name: "stew", category: "غذا و نوشیدنی" }, { emoji: "🍥", name: "fish-cake", category: "غذا و نوشیدنی" }, { emoji: "🍣", name: "sushi", category: "غذا و نوشیدنی" }, { emoji: "🍱", name: "bento", category: "غذا و نوشیدنی" }, { emoji: "🍤", name: "fried-shrimp", category: "غذا و نوشیدنی" }, { emoji: "🍙", name: "rice-ball", category: "غذا و نوشیدنی" }, { emoji: "🍛", name: "curry", category: "غذا و نوشیدنی" }, { emoji: "🍴", name: "fork-knife", category: "غذا و نوشیدنی" }, { emoji: "🍷", name: "wine", category: "غذا و نوشیدنی" }, { emoji: "🍸", name: "cocktail", category: "غذا و نوشیدنی" }, { emoji: "🍹", name: "tropical-drink", category: "غذا و نوشیدنی" }, { emoji: "🍺", name: "beer", category: "غذا و نوشیدنی" }, { emoji: "🍾", name: "champagne", category: "غذا و نوشیدنی" }, { emoji: "🍵", name: "tea", category: "غذا و نوشیدنی" }, { emoji: "🍫", name: "chocolate", category: "غذا و نوشیدنی" }, { emoji: "🍬", name: "candy", category: "غذا و نوشیدنی" }, { emoji: "🍭", name: "lollipop", category: "غذا و نوشیدنی" }, { emoji: "🍮", name: "custard", category: "غذا و نوشیدنی" }, { emoji: "🍯", name: "honey", category: "غذا و نوشیدنی" }, { emoji: "🍩", name: "doughnut", category: "غذا و نوشیدنی" }, { emoji: "🍪", name: "cookie", category: "غذا و نوشیدنی" }, { emoji: "🍰", name: "shortcake", category: "غذا و نوشیدنی" }, { emoji: "🍡", name: "dango", category: "غذا و نوشیدنی" }, { emoji: "🥮", name: "moon-cake", category: "غذا و نوشیدنی" }, { emoji: "🍧", name: "shaved-ice", category: "غذا و نوشیدنی" }, { emoji: "🍨", name: "ice-cream", category: "غذا و نوشیدنی" }, { emoji: "🚗", name: "car", category: "سفر و حمل‌ونقل" }, { emoji: "🚕", name: "taxi", category: "سفر و حمل‌ونقل" }, { emoji: "🚙", name: "suv", category: "سفر و حمل‌ونقل" }, { emoji: "🚌", name: "bus", category: "سفر و حمل‌ونقل" }, { emoji: "🚲", name: "bicycle", category: "سفر و حمل‌ونقل" }, { emoji: "🚢", name: "ship", category: "سفر و حمل‌ونقل" }, { emoji: "🚀", name: "rocket", category: "سفر و حمل‌ونقل" }, { emoji: "🛸", name: "saucer", category: "سفر و حمل‌ونقل" }, { emoji: "🚁", name: "helicopter", category: "سفر و حمل‌ونقل" }, { emoji: "🚤", name: "speedboat", category: "سفر و حمل‌ونقل" }, { emoji: "🚡", name: "aerial-lift", category: "سفر و حمل‌ونقل" }, { emoji: "🛏", name: "bed", category: "سفر و حمل‌ونقل" }, { emoji: "🚴", name: "cyclist", category: "سفر و حمل‌ونقل" }, { emoji: "💛", name: "yellow-heart", category: "اشیا" }, { emoji: "💚", name: "green-heart", category: "اشیا" }, { emoji: "💙", name: "blue-heart", category: "اشیا" }, { emoji: "💜", name: "purple-heart", category: "اشیا" }, { emoji: "🖤", name: "black-heart", category: "اشیا" }, { emoji: "💔", name: "broken-heart", category: "اشیا" }, { emoji: "💕", name: "two-hearts", category: "اشیا" }, { emoji: "💖", name: "sparkling-heart", category: "اشیا" }, { emoji: "💗", name: "growing-heart", category: "اشیا" }, { emoji: "💘", name: "heart-arrow", category: "اشیا" }, { emoji: "💝", name: "gift-heart", category: "اشیا" }, { emoji: "💯", name: "hundred", category: "اشیا" }, { emoji: "🔥", name: "fire", category: "اشیا" }, { emoji: "💥", name: "collision", category: "اشیا" }, { emoji: "💪", name: "muscle", category: "اشیا" }, { emoji: "🦁", name: "lion", category: "اشیا" }, { emoji: "🦀", name: "crab", category: "اشیا" }, { emoji: "🦄", name: "unicorn", category: "اشیا" }, { emoji: "🗼", name: "tower", category: "اشیا" }, { emoji: "🗽", name: "statue-liberty", category: "اشیا" }, { emoji: "📱", name: "phone", category: "اشیا" }, { emoji: "💻", name: "laptop", category: "اشیا" }, { emoji: "🖥", name: "desktop", category: "اشیا" }, { emoji: "🖨", name: "printer", category: "اشیا" }, { emoji: "🖱", name: "mouse-pointer", category: "اشیا" }, { emoji: "💽", name: "cd", category: "اشیا" }, { emoji: "💾", name: "floppy", category: "اشیا" }, { emoji: "💿", name: "dvd", category: "اشیا" }, { emoji: "📀", name: "vhs", category: "اشیا" }, { emoji: "📺", name: "tv", category: "اشیا" }, { emoji: "📻", name: "radio", category: "اشیا" }, { emoji: "📼", name: "vhs-tape", category: "اشیا" }, { emoji: "📷", name: "camera", category: "اشیا" }, { emoji: "📸", name: "camera-flash", category: "اشیا" }, { emoji: "📹", name: "video", category: "اشیا" }, { emoji: "🔍", name: "magnifier-right", category: "اشیا" }, { emoji: "🔬", name: "microscope", category: "اشیا" }, { emoji: "🔭", name: "telescope", category: "اشیا" }, { emoji: "🕯", name: "candle", category: "اشیا" }, { emoji: "💡", name: "bulb", category: "اشیا" }, { emoji: "📔", name: "diary", category: "اشیا" }, { emoji: "📕", name: "red-book", category: "اشیا" }, { emoji: "📖", name: "open-book", category: "اشیا" }, { emoji: "📗", name: "green-book", category: "اشیا" }, { emoji: "📘", name: "blue-book", category: "اشیا" }, { emoji: "📙", name: "yellow-book", category: "اشیا" }, { emoji: "📚", name: "books", category: "اشیا" }, { emoji: "📓", name: "notebook", category: "اشیا" }, { emoji: "📜", name: "scroll", category: "اشیا" }, { emoji: "📝", name: "memo", category: "اشیا" }, { emoji: "📄", name: "page", category: "اشیا" }, { emoji: "📃", name: "page-curl", category: "اشیا" }, { emoji: "📰", name: "newspaper", category: "اشیا" }, { emoji: "📬", name: "mailbox", category: "اشیا" }, { emoji: "💰", name: "money-bag", category: "اشیا" }, { emoji: "💴", name: "yen", category: "اشیا" }, { emoji: "💵", name: "dollar", category: "اشیا" }, { emoji: "💶", name: "euro", category: "اشیا" }, { emoji: "💷", name: "pound", category: "اشیا" }, { emoji: "💸", name: "money", category: "اشیا" }, { emoji: "📮", name: "postbox", category: "اشیا" }, { emoji: "📨", name: "incoming-mail", category: "اشیا" }, { emoji: "📩", name: "mail", category: "اشیا" }, { emoji: "🤃", name: "silly", category: "فعالیت‌ها" }, { emoji: "🤣", name: "crying-laughing", category: "فعالیت‌ها" }, { emoji: "🤪", name: "zany", category: "فعالیت‌ها" }, { emoji: "🤨", name: "squinting", category: "فعالیت‌ها" }, { emoji: "🤓", name: "nerd", category: "فعالیت‌ها" }, { emoji: "🤑", name: "money-face", category: "فعالیت‌ها" }, { emoji: "🤔", name: "thinking", category: "فعالیت‌ها" }, { emoji: "🤥", name: "liar", category: "فعالیت‌ها" }, { emoji: "🤭", name: "gags", category: "فعالیت‌ها" }, { emoji: "🤫", name: "shushing", category: "فعالیت‌ها" }, { emoji: "🤗", name: "hugging", category: "فعالیت‌ها" }, { emoji: "🤠", name: "cowboy", category: "فعالیت‌ها" }, { emoji: "🤯", name: "exploding-head", category: "فعالیت‌ها" }, { emoji: "🤍", name: "white-heart", category: "فعالیت‌ها" }, { emoji: "🌟", name: "glowing-star", category: "فعالیت‌ها" }, { emoji: "🍀", name: "clover", category: "فعالیت‌ها" }, { emoji: "🎯", name: "dart", category: "فعالیت‌ها" }, { emoji: "🏆", name: "trophy", category: "فعالیت‌ها" }, { emoji: "👀", name: "eyes", category: "فعالیت‌ها" }, { emoji: "🤷", name: "shrug", category: "فعالیت‌ها" }, { emoji: "🍅", name: "tomato", category: "فعالیت‌ها" }, { emoji: "🌽", name: "corn", category: "فعالیت‌ها" }, { emoji: "🌮", name: "taco", category: "فعالیت‌ها" }, { emoji: "🌯", name: "burrito", category: "فعالیت‌ها" }, { emoji: "🥯", name: "bagel", category: "فعالیت‌ها" }, { emoji: "🌾", name: "rice", category: "فعالیت‌ها" }, { emoji: "🥄", name: "spoon", category: "فعالیت‌ها" }, { emoji: "🎂", name: "cake", category: "فعالیت‌ها" }, { emoji: "🏍", name: "motorcycle", category: "فعالیت‌ها" }, { emoji: "🎡", name: "ferris-wheel", category: "فعالیت‌ها" }, { emoji: "🎢", name: "roller-coaster", category: "فعالیت‌ها" }, { emoji: "🎠", name: "carousel", category: "فعالیت‌ها" }, { emoji: "🏰", name: "castle", category: "فعالیت‌ها" }, { emoji: "🏯", name: "japanese-castle", category: "فعالیت‌ها" }, { emoji: "🏭", name: "factory", category: "فعالیت‌ها" }, { emoji: "🏠", name: "house", category: "فعالیت‌ها" }, { emoji: "🏢", name: "office", category: "فعالیت‌ها" }, { emoji: "🌉", name: "bridge", category: "فعالیت‌ها" }, { emoji: "⌚", name: "watch", category: "فعالیت‌ها" }, { emoji: "⌨", name: "keyboard", category: "فعالیت‌ها" }, { emoji: "🎥", name: "movie-camera", category: "فعالیت‌ها" }, { emoji: "📡", name: "satellite", category: "فعالیت‌ها" }, { emoji: "📧", name: "email", category: "فعالیت‌ها" }, { emoji: "📦", name: "package", category: "فعالیت‌ها" }, { emoji: "🏷", name: "label", category: "فعالیت‌ها" }, { emoji: "🏀", name: "basketball", category: "فعالیت‌ها" }, { emoji: "🏈", name: "football", category: "فعالیت‌ها" }, { emoji: "🎾", name: "tennis", category: "فعالیت‌ها" }, { emoji: "🏐", name: "volleyball", category: "فعالیت‌ها" }, { emoji: "🏉", name: "rugby", category: "فعالیت‌ها" }, { emoji: "🎱", name: "pool", category: "فعالیت‌ها" }, { emoji: "🎿", name: "ski", category: "فعالیت‌ها" }, { emoji: "🏄", name: "surfer", category: "فعالیت‌ها" }, { emoji: "🏊", name: "swimmer", category: "فعالیت‌ها" }, { emoji: "🥊", name: "boxing-glove", category: "فعالیت‌ها" }, { emoji: "🎽", name: "running-shirt", category: "فعالیت‌ها" }, { emoji: "🏇", name: "horse-racing", category: "فعالیت‌ها" }, { emoji: "🥇", name: "gold-medal", category: "فعالیت‌ها" }, { emoji: "🥈", name: "silver-medal", category: "فعالیت‌ها" }, { emoji: "🥉", name: "bronze-medal", category: "فعالیت‌ها" }, { emoji: "🏅", name: "medal-sports", category: "فعالیت‌ها" }, { emoji: "🎖", name: "medal-military", category: "فعالیت‌ها" }, { emoji: "🎗", name: "ribbon", category: "فعالیت‌ها" }, { emoji: "🎫", name: "ticket", category: "فعالیت‌ها" }, { emoji: "🎪", name: "circus-tent", category: "فعالیت‌ها" }, { emoji: "🎭", name: "performing-arts", category: "فعالیت‌ها" }, { emoji: "🎨", name: "artist", category: "فعالیت‌ها" }, { emoji: "🎬", name: "clapper", category: "فعالیت‌ها" }, { emoji: "🎤", name: "microphone", category: "فعالیت‌ها" }, { emoji: "🎧", name: "headphones", category: "فعالیت‌ها" }, { emoji: "🎼", name: "music", category: "فعالیت‌ها" }, { emoji: "🎹", name: "keyboard-musical", category: "فعالیت‌ها" }, { emoji: "🥁", name: "drum", category: "فعالیت‌ها" }, { emoji: "🎷", name: "saxophone", category: "فعالیت‌ها" }, { emoji: "🎺", name: "trumpet", category: "فعالیت‌ها" }, { emoji: "🎸", name: "guitar", category: "فعالیت‌ها" }, { emoji: "🎻", name: "violin", category: "فعالیت‌ها" }, { emoji: "🎮", name: "game", category: "فعالیت‌ها" }, { emoji: "🎯", name: "game-dart", category: "فعالیت‌ها" }, { emoji: "🎲", name: "dice", category: "فعالیت‌ها" }, { emoji: "🎰", name: "slot", category: "فعالیت‌ها" }, { emoji: "🎳", name: "bowling", category: "فعالیت‌ها" }, { emoji: "🃏", name: "joker", category: "فعالیت‌ها" },];

const EMOJI_NAMES_FA = {
"adoring": "عاشقانه",
"aerial-lift": "گوندولا",
"airplane": "هواپیما",
"angry": "عصبانی",
"ant": "مورچه",
"anxious": "مضطرب",
"artist": "هنرمند",
"astonished": "متحیر",
"bacon": "بیکن",
"bagel": "باگل",
"baguette": "باگت",
"banana": "موز",
"baseball": "بیسبال",
"basketball": "بسکتبال",
"bat": "خفاش",
"beaming": "لبخند درخشان",
"bear": "خرس",
"bed": "تخت",
"beer": "آبجو",
"bento": "بن‌تو",
"bicycle": "دوچرخه",
"bird": "پرنده",
"black-heart": "قلب سیاه",
"blowfish": "ماهی بادکنکی",
"blue-book": "کتاب آبی",
"blue-heart": "قلب آبی",
"blush": "خجالت زده",
"boar": "خوک وحشی",
"books": "کتاب‌ها",
"bowling": "بولینگ",
"boxing-glove": "دستکش بوکس",
"bread": "نان",
"bridge": "پل",
"broken-heart": "قلب شکسته",
"bronze-medal": "مدال برنزی",
"bug": "حشره",
"bulb": "لامپ",
"burrito": "بریتو",
"bus": "اتوبوس",
"butterfly": "پروانه",
"cake": "کیک",
"camera": "دوربین",
"camera-flash": "دوربین با فلش",
"candle": "شمع",
"candy": "شیرینی",
"car": "ماشین",
"carousel": "کالسکه‌ی چرخان",
"carrot": "هویج",
"castle": "قلعه",
"cat": "گربه",
"cd": "سی‌دی",
"champagne": "شامپاین",
"cheese": "پنیر",
"cherries": "گیلاس",
"chicken": "مرغ",
"chocolate": "شکلات",
"circus-tent": "چادر سرک",
"clap": "دست زدن",
"clapper": "کلپ‌بورد",
"clover": "چهاربرگ",
"cocktail": "کوکتیل",
"coconut": "نارگیل",
"coffee": "قهوه",
"cold-face": "سرزده",
"collision": "برخورد",
"confounded": "دردسر کشیده",
"confused": "کلافه",
"confused2": "گمگشت",
"cookie": "بیسکویت",
"cool": "کول و باوقار",
"corn": "ذرت",
"cow": "گاو",
"cowboy": "کابوی",
"crab": "خرچنگ",
"crocodile": "تمساح",
"croissant": "کروسان",
"crossed-fingers": "انگشت به رها",
"crying-laughing": "خنده در اشک",
"cucumber": "خیار",
"cupcake": "کاپ‌کیک",
"curry": "کاره",
"custard": "کاستارد",
"cyclist": "دوچرخه سوار",
"dango": "دائنگو",
"dart": "پیکان",
"desktop": "کامپیوتر",
"diary": "یادداشت روزانه",
"dice": "تاس",
"disappointed": "ناامید",
"dog": "سگ",
"dog2": "سگ (نسخه دو)",
"dollar": "دلار",
"dolphin": "دلفین",
"doughnut": "دونات",
"drum": "طبل",
"duck": "اردک",
"dvd": "دی‌وی‌دی",
"eagle": "عقاب",
"egg": "تخم مرغ",
"elephant": "فیل",
"email": "ایمیل",
"envelope": "پاکت نامه",
"euro": "یورو",
"exploding-head": "انفجار سر",
"expressionless": "بی‌حالت",
"eyes": "چشم‌ها",
"factory": "کارخانه",
"fearful": "ترسیده",
"ferris-wheel": "چرخ‌فریس",
"fire": "آتش",
"fish": "ماهی",
"fish-cake": "کتلت ماهی",
"fist": "مشت",
"floppy": "فلاپی",
"flushed": "سرخ شده",
"football": "فوتبال آمریکایی",
"fork-knife": "چنگال و قاشق",
"fox": "روباه",
"fried-egg": "تخم مرغ نیمرو",
"fried-shrimp": "شیرمنی سرخ",
"fries": "سیب‌زمینی سوخته",
"frog": "قورباغه",
"gags": "دست روی دهان",
"game": "بازی",
"game-dart": "پرتاب پیکان",
"gift-heart": "قلب هدیه",
"giraffe": "زارعه",
"glowing-star": "ستاره‌ی درخشان",
"goat": "بز",
"gold-medal": "مدال طلایی",
"golf": "گلف",
"grapes": "انگور",
"green-apple": "سیب سبز",
"green-book": "کتاب سبز",
"green-heart": "قلب سبز",
"grimace": "خمیر صورت",
"grimacing": "غصه",
"grinning": "خندیدن",
"growing-heart": "قلب در حال رشد",
"guitar": "گیتار",
"hamburger": "همبرگر",
"hamster": "همستر",
"headphones": "هدفون",
"heart-arrow": "قلب با پیکان",
"heart-eyes": "چشم‌های قلبی",
"helicopter": "هلیکوپتر",
"honey": "عسل",
"honeybee": "زنبور عسل",
"horns": "نشان وِر",
"horse": "اسب",
"horse-racing": "سواری",
"hot-face": "داغ",
"house": "خانه",
"hugging": "در آغوش گرفتن",
"hundred": "صد",
"hushed": "ساکت",
"ice-cream": "بستنی",
"incoming-mail": "ایمیل ورودی",
"index-up": "اشاره با انگشت به بالا",
"innocent": "بی‌گناه",
"japanese-castle": "قلعه ژاپنی",
"joker": "جوکر",
"joy": "شادی",
"keyboard": "کیبورد",
"keyboard-musical": "پیانو",
"kiss": "بوسه",
"kiss-blush": "بوسه‌ی خجالت‌زده",
"kiss-face": "لبخند بوسه",
"kiss-wink": "بوسه و چشمک",
"kiwi": "کیوی",
"koala": "کوالا",
"label": "برچسب",
"ladybug": "پُرک",
"laptop": "لپ‌تاپ",
"laughing": "خنده",
"lemon": "لیمو",
"leopard": "پلنگ",
"liar": "دروغگو",
"lion": "شیر",
"lizard": "مارمولک",
"llama": "لاما",
"lollipop": "لالی‌پاپ",
"magnifier-right": "ذره‌بین",
"mail": "نامه",
"mailbox": "صندوق پُست",
"mango": "انبه",
"medal-military": "نشان نظامی",
"medal-sports": "مدال ورزشی",
"meh": "بی‌تفاوت",
"melon": "خربزه",
"memo": "یادداشت",
"microphone": "میکروفن",
"microscope": "میکروسکوپ",
"money": "پول",
"money-bag": "کیسه پول",
"money-face": "صورت پول",
"monkey": "میمون",
"monocle": "نیم‌عینک",
"moon-cake": "کیک ماه",
"motorcycle": "موتور",
"mouse": "موش",
"mouse-pointer": "نشانگر ماوس",
"movie-camera": "دوربین فیلم",
"muscle": "عضو",
"music": "موسیقی",
"nerd": "کتاب‌دوست",
"neutral": "خنثی",
"newspaper": "روزنامه",
"notebook": "دفترچه",
"octopus": "هشت‌پا",
"office": "دفتر",
"ok": "اوکی",
"open-book": "کتاب باز",
"open-mouth": "دهان باز",
"orange": "پرتقال",
"orange-heart": "قلب نارنجی",
"owl": "جغد",
"package": "بسته",
"page": "صفحه",
"page-curl": "برگ برگردیده",
"pancakes": "پنکیک",
"panda": "پاندا",
"peach": "هلو",
"pear": "آلو",
"penguin": "پنگوئن",
"pensive": "تو فکر",
"performing-arts": "هنرهای نمایشی",
"phone": "گوشی",
"pig": "خوک",
"pinched-fingers": "انگشتان نزدیک",
"pineapple": "آناناس",
"pizza": "پیتزا",
"pleading": "مظلوم",
"point-down": "اشاره به پایین",
"point-left": "اشاره به چپ",
"point-right": "اشاره به راست",
"point-up": "اشاره به بالا",
"pool": "بیلیارد",
"postbox": "جعبه پُست",
"pound": "پوند",
"pray": "دعا",
"pretzel": "نوش گره",
"printer": "پرینتر",
"purple-heart": "قلب بنفش",
"rabbit": "خرگوش",
"rabbit2": "خرگوش (نسخه دو)",
"raccoon": "راسون",
"radio": "رادیو",
"raised-fist": "مشت بالاست",
"raised-hand": "دست بالاست",
"raise-hands": "دست‌ها بالاست",
"ramen": "رامن",
"red-apple": "سیب قرمز",
"red-book": "کتاب قرمز",
"red-heart": "قلب قرمز",
"relieved": "آرامش",
"rhino": "زیرش",
"ribbon": "نوار روبان",
"rice": "برنج",
"rice-ball": "نوریگی",
"rocket": "موشک",
"rock-on": "نشان راک",
"rofl": "خنده‌ی غلتان",
"roller-coaster": "اسلاید کوهستان",
"roll-eyes": "چرخش چشم",
"rugby": "رگبی",
"running-shirt": "لباس دو",
"sailboat": "کشتی بادبانی",
"sandwich": "ساندویچ",
"satellite": "ماهواره",
"saucer": "پرنده فضایی",
"saxophone": "ساکسفون",
"scroll": "اسکرول",
"shamrock": "شامراک",
"shark": "کوسه",
"shaved-ice": "یخ ریز شده",
"ship": "کشتی",
"shortcake": "کیک کوچک",
"shrug": "شانه بالا کشیدن",
"shushing": "ساکت کن",
"silly": "بامزه",
"silver-medal": "مدال نقره‌ای",
"ski": "اسکی",
"slight-frown": "کمی اخم",
"slight-smile": "کمی لبخند",
"slot": "اسلات",
"smile": "لبخند",
"smirk": "نیم‌لبخند",
"snail": "حلزون",
"snake": "مار",
"soccer": "فوتبال",
"spades": "اسپید",
"spaghetti": "اسپاگتی",
"sparkles": "جلمه جلمه",
"sparkling-heart": "قلب درخشان",
"speedboat": "قایق تندرو",
"spoon": "قاشق",
"squid": "ماهی تن",
"squinting": "چشمک",
"star": "ستاره",
"statue-liberty": "مجسمه آزادی",
"stew": "خورشت",
"stop": "توقف",
"strawberry": "توت‌فرنگی",
"stuck-out-tongue": "زبان در اومده",
"surfer": "موج‌سوار",
"sushi": "سوشی",
"suv": "اس‌وی‌وی",
"sweat": "عرق",
"swimmer": "شناگر",
"taco": "تاکو",
"taxi": "تاکسی",
"tea": "چای",
"telescope": "تلسکوپ",
"tennis": "تنیس",
"thinking": "فکر کردن",
"thumbs-down": "انگشت شست پایین",
"thumbs-up": "انگشت شست بالا",
"ticket": "بلیت",
"tiger": "ببر",
"tired": "خسته",
"tomato": "گوجه",
"tower": "برج",
"triumph": "پیروزی",
"trophy": "جام",
"tropical-drink": "نوشیدنی استوایی",
"trumpet": "سورنا",
"turtle": "لاک‌پشت",
"tv": "تلویزیون",
"two-hearts": "دو قلب",
"unamused": "بی‌حوصله",
"unicorn": "یونیکورن",
"upside": "برعکس",
"upside-down": "برعکس سرپا",
"vhs": "وی‌اچ‌اس",
"vhs-tape": "نوار وی‌اچ‌اس",
"video": "ویدیو",
"violin": "ویولن",
"volleyball": "والیبال",
"watch": "ساعت",
"watermelon": "هندوانه",
"wave": "سلام با دست",
"weary": "خسته",
"whale": "نهنگ",
"whale2": "نهنگ (نسخه دو)",
"white-heart": "قلب سفید",
"wine": "شراب",
"wink": "چشمک",
"wink-tongue": "چشمک و زبان",
"wolf": "گرگ",
"worried": "نگران",
"yawning": "خمخواب",
"yellow-book": "کتاب زرد",
"yellow-heart": "قلب زرد",
"yen": "ین",
"yummy": "خوشمزه",
"zany": "عجیب و غریب",
"zap": "برق"
};
class oe {
  container;
  searchInput;
  emojiGrid;
  onSelect;
  onClose;
  emojiList = [];
  theme;
  dark;
  constructor(e, t, i, n) {
    this.onSelect = e, this.onClose = t, this.theme = i, this.dark = n, this.container = this.createPickerElement(), this.searchInput = this.container.querySelector(".te-emoji-search"), this.emojiGrid = this.container.querySelector(".te-emoji-grid"), this.setupEvents(), this.loadEmojis();
  }
  async loadEmojis() {
    this.emojiGrid.textContent = "در حال بارگذاری…";
    try {
      const e = EMOJI_LIST;
      this.emojiList = e, this.renderEmojis(this.emojiList);
    } catch (e) {
      console.error("Failed to load emojis:", e), this.emojiGrid.textContent = "بارگذاری ناموفق";
    }
  }
  createPickerElement() {
    const e = document.createElement("div");
    return e.classList.add("te-emoji-picker"), this.theme && this.applyTheme(e, this.theme), this.dark && e.classList.add("te-dark"), e.innerHTML = `
      <div class="te-emoji-header">
        <input type="text" class="te-emoji-search" placeholder="جستجوی ایموجی">
      </div>
      <div class="te-emoji-body">
        <div class="te-emoji-grid"></div>
      </div>
    `, e;
  }
  setupEvents() {
    this.searchInput.addEventListener("mousedown", (t) => t.stopPropagation()), this.searchInput.addEventListener("click", (t) => t.stopPropagation()), this.searchInput.addEventListener("input", () => {
      const t = this.searchInput.value.toLowerCase(), i = this.emojiList.filter(
        (n) => n.name.toLowerCase().includes(t) || (EMOJI_NAMES_FA[n.name] || "").toLowerCase().includes(t) || n.category.toLowerCase().includes(t)
      );
      this.renderEmojis(i);
    });
    const e = (t) => {
      this.container.contains(t.target) || (this.close(), document.removeEventListener("mousedown", e));
    };
    setTimeout(() => document.addEventListener("mousedown", e), 0);
  }
  renderEmojis(e) {
    if (this.emojiGrid.innerHTML = "", e.length === 0) {
      this.emojiGrid.textContent = "ایموجی‌ای یافت نشد";
      return;
    }
    this.searchInput.value.length > 0 ? this.renderGridItems(e) : ["خنده و احساسات", "نمادها", "دست‌ها", "حیوانات", "غذا و نوشیدنی", "سفر و حمل‌ونقل", "اشیا", "فعالیت‌ها"].forEach((n) => {
      const o = e.filter((s) => s.category === n);
      if (o.length > 0) {
        const s = document.createElement("div");
        s.classList.add("te-emoji-category-title"), s.textContent = n, this.emojiGrid.appendChild(s), this.renderGridItems(o);
      }
    });
  }
  renderGridItems(e) {
    e.forEach((t) => {
      const i = document.createElement("button");
      i.type = "button", i.classList.add("te-emoji-item"), i.textContent = t.emoji, i.title = EMOJI_NAMES_FA[t.name] || t.name, i.addEventListener("click", () => {
        this.onSelect(t.emoji), this.close();
      }), this.emojiGrid.appendChild(i);
    });
  }
  applyTheme(e, t) {
    const i = {
      primaryColor: "--te-primary-color",
      primaryHover: "--te-primary-hover",
      bgApp: "--te-bg-app",
      bgEditor: "--te-bg-editor",
      toolbarBg: "--te-toolbar-bg",
      borderColor: "--te-border-color",
      borderFocus: "--te-border-focus",
      textMain: "--te-text-main",
      textMuted: "--te-text-muted",
      placeholder: "--te-placeholder",
      btnHover: "--te-btn-hover",
      btnActive: "--te-btn-active",
      radiusLg: "--te-radius-lg",
      radiusMd: "--te-radius-md",
      radiusSm: "--te-radius-sm",
      shadowSm: "--te-shadow-sm",
      shadowMd: "--te-shadow-md",
      shadowLg: "--te-shadow-lg"
    };
    for (const [n, o] of Object.entries(i)) {
      const s = t[n];
      s && e.style.setProperty(o, s);
    }
  }
  show(e) {
    document.body.appendChild(this.container);
    const t = e.getBoundingClientRect(), i = 280, n = t.bottom + window.scrollY + 5;
    let o = t.left + window.scrollX;
    o + i > window.innerWidth && (o = window.innerWidth - i - 10), this.container.style.top = `${n}px`, this.container.style.left = `${o}px`, this.searchInput.focus();
  }
  close() {
    this.container.parentElement && (this.container.remove(), this.onClose());
  }
  get el() {
    return this.container;
  }
}
class se {
  editor;
  container;
  savedRange = null;
  items = x;
  activePicker = null;
  activeModal = null;
  statusEl = null;
  charCountEl = null;
  saveStatusEl = null;
  boundUpdateActiveStates;
  itemElements = /* @__PURE__ */ new Map();
  constructor(e) {
    this.editor = e, this.container = this.createToolbarElement(), this.boundUpdateActiveStates = this.updateActiveStates.bind(this), this.render();
  }
  createToolbarElement() {
    const e = document.createElement("div");
    return e.classList.add("te-toolbar"), e.setAttribute("role", "toolbar"), e.setAttribute("aria-label", "نوار ابزار ویرایشگر"), this.statusEl = document.createElement("div"), this.statusEl.classList.add("te-toolbar-status"), this.statusEl.setAttribute("aria-live", "polite"), this.statusEl.setAttribute("aria-atomic", "true"), this.statusEl.style.marginLeft = "auto", this.statusEl.style.display = "flex", this.statusEl.style.alignItems = "center", this.statusEl.style.gap = "6px", this.statusEl.style.fontSize = "12px", this.statusEl.style.color = "var(--te-text-muted)", this.statusEl.style.paddingRight = "12px", this.saveStatusEl = document.createElement("span"), this.charCountEl = document.createElement("span"), this.charCountEl.style.fontWeight = "500", this.statusEl.appendChild(this.charCountEl), this.statusEl.appendChild(this.saveStatusEl), e;
  }
  render() {
    const e = this.editor.getOptions().toolbarItems, t = [];
    this.items.forEach((o) => {
      (o.type === "divider" || o.id && (!e || e.includes(o.id))) && t.push(o);
    });
    const i = [];
    t.forEach((o, s) => {
      if (o.type === "divider") {
        if (i.length === 0 || i[i.length - 1].type === "divider" || !t.slice(s + 1).some((l) => l.type !== "divider")) return;
        i.push(o);
      } else
        i.push(o);
    }), i.forEach((o) => {
      if (o.type === "button")
        this.renderButton(o);
      else if (o.type === "select")
        this.renderSelect(o);
      else if (o.type === "input")
        this.renderInput(o);
      else if (o.type === "color-picker")
        this.renderColorPicker(o);
      else if (o.type === "divider") {
        const s = document.createElement("div");
        s.classList.add("te-divider"), this.container.appendChild(s);
      }
    }), this.editor.getOptions().showStatus !== !1 && this.container.appendChild(this.statusEl), this.editor.el.addEventListener("keyup", this.boundUpdateActiveStates), this.editor.el.addEventListener("mouseup", this.boundUpdateActiveStates);
  }
  renderButton(e) {
    const t = document.createElement("button");
    t.classList.add("te-button"), t.setAttribute("aria-label", e.title), t.innerHTML = e.icon || "", t.title = e.title, this.itemElements.set(e, t), t.addEventListener("mousedown", (i) => {
      if (i.preventDefault(), e.command === "createLink" || e.command === "insertTable" || e.command === "insertImage" || e.command === "insertEmoji") {
        const n = window.getSelection();
        if (n && n.rangeCount > 0) {
          const o = n.getRangeAt(0);
          this.editor.el.contains(o.commonAncestorContainer) && (this.savedRange = o.cloneRange());
        }
      }
      if (e.command === "insertEmoji") {
        this.activePicker ? this.activePicker.close() : (this.activePicker = new oe(
          (n) => {
            if (this.savedRange) {
              const o = window.getSelection();
              o && (o.removeAllRanges(), o.addRange(this.savedRange));
            }
            this.editor.execute("insertText", n), this.savedRange = null;
          },
          () => {
            this.activePicker = null;
          },
          this.editor.getOptions().theme,
          this.editor.getOptions().dark
        ), this.activePicker.show(t));
        return;
      }
      if (e.command === "insertImage") {
        this.activeModal && this.activeModal.close(), this.activeModal = new E(
          "درج تصویر",
          [
            { id: "url", label: "آدرس تصویر", type: "text", placeholder: "https://example.com/image.jpg" },
            { id: "file", label: "یا آپلود فایل", type: "file" }
          ],
          (n) => {
            if (this.savedRange) {
              const o = window.getSelection();
              o && (o.removeAllRanges(), o.addRange(this.savedRange));
            }
            n.file ? this.editor.handleFiles([n.file]) : n.url && n.url.trim() !== "" && this.editor.insertImage(n.url), this.savedRange = null;
          },
          () => {
            this.activeModal = null, this.savedRange = null;
          },
          this.editor.getOptions().theme,
          this.editor.getOptions().dark
        ), this.activeModal.show(t);
        return;
      }
      if (["addRow", "deleteRow", "addColumn", "deleteColumn"].includes(e.command || "")) {
        const n = e.command;
        this.editor[n]();
        return;
      }
      if (e.command === "undo") {
        this.editor.undo();
        return;
      }
      if (e.command === "redo") {
        this.editor.redo();
        return;
      }
      if (e.command === "createLink") {
        this.activeModal && this.activeModal.close(), this.activeModal = new E(
          "درج پیوند",
          [{ id: "url", label: "آدرس", type: "text", placeholder: "https://example.com" }],
          (n) => {
            if (this.savedRange) {
              const o = window.getSelection();
              o && (o.removeAllRanges(), o.addRange(this.savedRange));
            }
            this.editor.createLink(n.url), this.savedRange = null;
          },
          () => {
            this.activeModal = null, this.savedRange = null;
          },
          this.editor.getOptions().theme,
          this.editor.getOptions().dark
        ), this.activeModal.show(t);
        return;
      }
      if (e.command === "insertTable") {
        this.activeModal && this.activeModal.close(), this.activeModal = new E(
          "درج جدول",
          [
            { id: "rows", label: "ردیف", type: "number", defaultValue: "3", min: "1" },
            { id: "cols", label: "ستون", type: "number", defaultValue: "3", min: "1" }
          ],
          (n) => {
            if (this.savedRange) {
              const r = window.getSelection();
              r && (r.removeAllRanges(), r.addRange(this.savedRange));
            }
            let o = parseInt(n.rows, 10), s = parseInt(n.cols, 10);
            (isNaN(o) || o < 1) && (o = 1), (isNaN(s) || s < 1) && (s = 1), this.editor.insertTable(o, s), this.savedRange = null;
          },
          () => {
            this.activeModal = null, this.savedRange = null;
          },
          this.editor.getOptions().theme,
          this.editor.getOptions().dark
        ), this.activeModal.show(t);
        return;
      }
      e.command && this.editor.execute(e.command, e.value || null), this.updateActiveStates();
    }), this.container.appendChild(t);
  }
  renderInput(e) {
    const t = document.createElement("input");
    t.type = "number", t.classList.add("te-input"), t.title = e.title, t.value = e.value || "", t.min = "1", t.max = "100";
    const i = () => {
      const o = window.getSelection();
      if (o && o.rangeCount > 0) {
        const s = o.getRangeAt(0);
        this.editor.el.contains(s.commonAncestorContainer) && !t.contains(s.commonAncestorContainer) && (this.savedRange = s.cloneRange());
      }
    };
    t.addEventListener("mousedown", i, !0), t.addEventListener("focus", i);
    const n = () => {
      let o = parseInt(t.value, 10);
      if (!isNaN(o) && (o = Math.max(1, Math.min(100, o)), t.value = o.toString(), e.command === "fontSize")) {
        if (this.savedRange) {
          const s = this.editor.setStyle("font-size", `${o}px`, this.savedRange);
          s && (this.savedRange = s);
        } else
          this.editor.setStyle("font-size", `${o}px`);
        t.focus();
      }
    };
    t.addEventListener("input", n), t.addEventListener("keydown", (o) => {
      o.key === "Enter" && (n(), this.editor.focus());
    }), this.itemElements.set(e, t), this.container.appendChild(t);
  }
  renderSelect(e) {
    const t = document.createElement("select");
    t.classList.add("te-select"), t.title = e.title, e.options && e.options.forEach((i) => {
      const n = document.createElement("option");
      n.value = i.value, n.textContent = i.label, t.appendChild(n);
    }), t.addEventListener("change", () => {
      const i = t.value;
      this.savedRange && this.editor.selection.restoreSelection(this.savedRange), e.command === "formatBlock" ? this.editor.execute(e.command, i) : e.command === "fontFamily" ? this.editor.setStyle("font-family", i) : e.command === "lineHeight" && this.editor.setStyle("line-height", i), this.editor.focus();
    }), t.addEventListener("mousedown", () => {
      this.savedRange = this.editor.selection.saveSelection();
    }), this.itemElements.set(e, t), this.container.appendChild(t);
  }
  renderColorPicker(e) {
    const t = document.createElement("div");
    if (t.classList.add("te-color-picker-wrapper"), t.title = e.title, e.icon) {
      const n = document.createElement("div");
      n.classList.add("te-button", "te-color-icon"), n.innerHTML = e.icon;
      const o = document.createElement("div");
      o.classList.add("te-color-indicator"), o.style.backgroundColor = e.value || "#000000", n.appendChild(o), this.itemElements.set(e, n), t.appendChild(n);
    }
    const i = document.createElement("input");
    i.type = "color", i.classList.add("te-color-picker-input"), e.icon || (i.classList.add("te-color-picker"), i.title = e.title), i.value = e.value || "#000000", i.addEventListener("mousedown", () => {
      this.savedRange = this.editor.selection.saveSelection();
    }), i.addEventListener("input", () => {
      if (e.icon) {
        const n = t.querySelector(".te-color-indicator");
        n && (n.style.backgroundColor = i.value);
      }
    }), i.addEventListener("change", () => {
      if (this.savedRange && this.editor.selection.restoreSelection(this.savedRange), e.command === "foreColor") {
        const n = this.savedRange || void 0;
        this.editor.setStyle("color", i.value, n);
      } else if (e.command === "backColor") {
        const n = this.savedRange || void 0;
        this.editor.setStyle("background-color", i.value, n);
      } else e.command && this.editor.execute(e.command, i.value);
      this.editor.focus();
    }), t.appendChild(i), this.container.appendChild(e.icon ? t : i);
  }
  get el() {
    return this.container;
  }
  updateActiveStates() {
    const t = window.getSelection()?.anchorNode, i = t?.nodeType === Node.ELEMENT_NODE ? t : t?.parentElement, n = i && this.editor.el.contains(i), o = ["P", "H1", "H2", "H3", "H4", "H5", "H6", "UL", "OL", "LI", "BLOCKQUOTE", "PRE", "TABLE", "DIV"];
    let s = i;
    for (; s && s !== this.editor.el && !o.includes(s.tagName); )
      s = s.parentElement;
    (!s || s === this.editor.el) && (s = this.editor.el.firstElementChild || this.editor.el), this.items.forEach((r) => {
      const l = this.itemElements.get(r);
      if (l) {
        if (r.type === "button")
          r.command && document.queryCommandState(r.command) ? l.classList.add("active") : l.classList.remove("active");
        else if (r.type === "select" && n) {
          const c = l;
          if (r.command === "formatBlock") {
            let a = document.queryCommandValue("formatBlock");
            a ? (a = a.toLowerCase(), (a === "div" || a === "" || a === "body" || a === "address" || a === "normal") && (a = "p"), c.value = a) : c.value = "p";
          } else if (r.command === "fontFamily") {
            const h = window.getComputedStyle(i).fontFamily.replace(/['"]/g, "").split(",")[0].trim();
            for (let d = 0; d < c.options.length; d++)
              if (c.options[d].value.toLowerCase().includes(h.toLowerCase())) {
                c.selectedIndex = d;
                break;
              }
          } else if (r.command === "lineHeight") {
            const a = window.getComputedStyle(s).lineHeight, h = window.getComputedStyle(s).fontSize;
            if (a && h && a !== "normal") {
              const d = (parseFloat(a) / parseFloat(h)).toFixed(1);
              let m = "normal", u = 100;
              for (let p = 0; p < c.options.length; p++) {
                const f = parseFloat(c.options[p].value);
                if (!isNaN(f)) {
                  const v = Math.abs(parseFloat(d) - f);
                  v < u && (u = v, m = c.options[p].value);
                }
              }
              u < 0.1 ? c.value = m : c.value = "normal";
            } else
              c.value = "normal";
          }
        } else if (r.type === "input" && r.command === "fontSize" && n) {
          const c = l, a = window.getComputedStyle(i).fontSize;
          a && (c.value = parseInt(a, 10).toString());
        }
      }
    });
  }
  updateStatus(e, t = !1) {
    if (!this.saveStatusEl || this.editor.getOptions().showStatus === !1) return;
    if (this.saveStatusEl.textContent = "", t) {
      const n = document.createElement("div");
      n.classList.add("te-toolbar-loader"), this.saveStatusEl.appendChild(n);
    }
    const i = document.createElement("span");
    i.textContent = e, this.saveStatusEl.appendChild(i);
  }
  updateMetrics() {
    const e = this.editor.getOptions();
    if (!this.charCountEl || e.showCharCount === !1) {
      this.charCountEl && (this.charCountEl.textContent = "");
      return;
    }
    const t = this.editor.getCharCount(), i = e.maxCharCount;
    i ? (this.charCountEl.textContent = `کاراکتر: ${t}/${i}`, t > i ? this.charCountEl.style.color = "#ef4444" : this.charCountEl.style.color = "inherit") : (this.charCountEl.textContent = `کاراکتر: ${t}`, this.charCountEl.style.color = "inherit"), this.charCountEl.textContent && this.saveStatusEl?.textContent ? (this.charCountEl.style.marginRight = "8px", this.charCountEl.style.borderRight = "1px solid var(--te-border-color)", this.charCountEl.style.paddingRight = "8px") : (this.charCountEl.style.marginRight = "0", this.charCountEl.style.borderRight = "none", this.charCountEl.style.paddingRight = "0");
  }
  destroy() {
    this.editor.el.removeEventListener("keyup", this.boundUpdateActiveStates), this.editor.el.removeEventListener("mouseup", this.boundUpdateActiveStates), this.activePicker && (this.activePicker.close(), this.activePicker = null), this.container.parentNode && this.container.parentNode.removeChild(this.container);
  }
}
class ae extends ne {
  toolbar;
  constructor(e, t = {}) {
    const i = {
      ...t,
      onSaving: () => {
        this.toolbar?.updateStatus("در حال ذخیره خودکار...", !0), t.onSaving && t.onSaving();
      },
      onSave: (n) => {
        const o = (/* @__PURE__ */ new Date()).toLocaleString("fa", {
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          hour12: !0
        });
        this.toolbar?.updateStatus(`ذخیره شد ${o}`, !1), t.onSave && t.onSave(n);
      }
    };
    super(e, i);
  }
  mount(e) {
    super.mount(e);
  }
  initializeUI() {
    super.initializeUI(), this.toolbar = new se(this);
    const e = this.options.toolbarPosition || "top";
    e === "top" ? this.container.insertBefore(this.toolbar.el, this.editableElement) : e === "bottom" ? (this.container.appendChild(this.toolbar.el), this.container.classList.add("te-toolbar-bottom")) : e === "left" ? (this.container.insertBefore(this.toolbar.el, this.editableElement), this.container.classList.add("te-toolbar-left")) : e === "right" ? (this.container.appendChild(this.toolbar.el), this.container.classList.add("te-toolbar-right")) : e === "floating" && this.container.classList.add("te-toolbar-floating"), this.options.showStatus !== !1 && this.toolbar && e !== "floating" && this.toolbar.updateStatus("همه تغییرات ذخیره شد", !1), this.options.showCharCount && this.toolbar.updateMetrics(), this.editableElement.addEventListener("input", () => {
      this.toolbar?.updateMetrics();
    }), this.triggerChange();
  }
  getToolbar() {
    return this.toolbar;
  }
  destroy() {
    this.toolbar && this.toolbar.destroy(), super.destroy();
  }
}
export {
  ne as CoreEditor,
  M as HistoryManager,
  ae as InkflowEditor,
  k as SelectionManager,
  se as Toolbar
};
