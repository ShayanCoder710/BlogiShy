import { InkflowEditor } from "/static/js/inkflow-editor.mjs";

const container = document.getElementById("editor");
const form = document.querySelector(".write-form");
const bodyField = document.getElementById("body");
const initialHTML = bodyField.value;

const editor = new InkflowEditor(container, {
  dark: true,
  showCharCount: true,
  maxCharCount: 20000,
  placeholder: "اینجا شروع به نوشتن کن…",
  onChange: (html) => { bodyField.value = html || ""; },
  onSave: (html) => { bodyField.value = html || ""; },
});

if (initialHTML) editor.setHTML(initialHTML);

form.addEventListener("submit", (e) => {
  e.preventDefault();
  bodyField.value = editor.getHTML() || "";
  form.submit();
});
