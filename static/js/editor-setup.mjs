import { InkflowEditor } from "/static/js/inkflow-editor.mjs";
import { enhanceModalImageInputs } from "/static/js/modal-dropzone.mjs";

const container = document.getElementById("editor");
const form = document.querySelector(".write-form");
const bodyField = document.getElementById("body");
const initialHTML = bodyField.value;

const editor = new InkflowEditor(container, {
  dark: false,
  showCharCount: true,
  maxCharCount: 20000,
  placeholder: "اینجا شروع به نوشتن کن…",
  onChange: (html) => { bodyField.value = html || ""; },
  onSave: (html) => { bodyField.value = html || ""; },
});

if (initialHTML) editor.setHTML(initialHTML);

enhanceModalImageInputs(document);

form.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !editor.container.contains(e.target)) {
    e.preventDefault();
    editor.focus();
  }
});

form.addEventListener("submit", (e) => {
  const submitBtn = form.querySelector("button[type=submit]");
  if (e.submitter && e.submitter !== submitBtn) {
    e.preventDefault();
    return;
  }
  e.preventDefault();
  bodyField.value = editor.getHTML() || "";
  form.submit();
});
