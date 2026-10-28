import { escapeHtml, renderMarkdown } from "./markdown.js";
import type { DocumentMetadata } from "./storage.js";

type DocumentLinks = {
  publicUrl: string;
  rawUrl: string;
  downloadUrl: string;
};

const themes = [
  { id: "light", label: "Light" },
  { id: "dark", label: "Dark" },
  { id: "sepia", label: "Sepia" },
  { id: "forest", label: "Forest" },
  { id: "ocean", label: "Ocean" },
  { id: "rose", label: "Rose" },
  { id: "terminal", label: "Terminal" }
] as const;

const css = `
:root {
  color-scheme: light;
  --bg: #f7f8f5;
  --wash: rgba(15, 123, 99, 0.08);
  --ink: #171a16;
  --muted: #666d62;
  --line: #d9ded2;
  --panel: #ffffff;
  --panel-soft: #fbfcfa;
  --accent: #0f7b63;
  --accent-strong: #075746;
  --blue: #235a97;
  --warning: #8a5a08;
  --warning-bg: #fff8e5;
  --warning-line: #ead796;
  --code: #10130f;
  --code-ink: #eef2e7;
  --progress: #0f7b63;
}
:root[data-theme="dark"] {
  color-scheme: dark;
  --bg: #101214;
  --wash: rgba(76, 154, 143, 0.14);
  --ink: #eef1ec;
  --muted: #aeb7ad;
  --line: #333a35;
  --panel: #181c1a;
  --panel-soft: #141816;
  --accent: #58c2a7;
  --accent-strong: #86ddc8;
  --blue: #86bdf5;
  --warning: #f2c46d;
  --warning-bg: #2a2111;
  --warning-line: #5b4316;
  --code: #050706;
  --code-ink: #eaf7ee;
  --progress: #58c2a7;
}
:root[data-theme="sepia"] {
  --bg: #f3ead9;
  --wash: rgba(121, 83, 39, 0.13);
  --ink: #2b241b;
  --muted: #71604b;
  --line: #d3c1a5;
  --panel: #fff9ed;
  --panel-soft: #fbf0dd;
  --accent: #8a5b22;
  --accent-strong: #633d12;
  --blue: #2f6387;
  --warning: #77530b;
  --warning-bg: #fff3cc;
  --warning-line: #dcc174;
  --code: #241b12;
  --code-ink: #f8edd8;
  --progress: #8a5b22;
}
:root[data-theme="forest"] {
  --bg: #eef4ec;
  --wash: rgba(36, 99, 78, 0.14);
  --ink: #132118;
  --muted: #5c6d5f;
  --line: #c8d6c6;
  --panel: #fbfdfa;
  --panel-soft: #f4f9f2;
  --accent: #2d6b4f;
  --accent-strong: #194a36;
  --blue: #225d8b;
  --warning: #856008;
  --warning-bg: #fff9dd;
  --warning-line: #e0cb83;
  --code: #0a130d;
  --code-ink: #ecf7ee;
  --progress: #2d6b4f;
}
:root[data-theme="ocean"] {
  --bg: #edf6f8;
  --wash: rgba(36, 105, 145, 0.15);
  --ink: #10242d;
  --muted: #526d76;
  --line: #c5dce3;
  --panel: #fbfeff;
  --panel-soft: #f2f9fb;
  --accent: #19718d;
  --accent-strong: #0d5369;
  --blue: #215bb0;
  --warning: #7d590c;
  --warning-bg: #fff6d8;
  --warning-line: #dec77e;
  --code: #071116;
  --code-ink: #e9f8fb;
  --progress: #19718d;
}
:root[data-theme="rose"] {
  --bg: #fbf2f4;
  --wash: rgba(164, 64, 92, 0.13);
  --ink: #2a171c;
  --muted: #765e65;
  --line: #e1c7cf;
  --panel: #fffafb;
  --panel-soft: #fdf4f6;
  --accent: #a23f63;
  --accent-strong: #742a46;
  --blue: #375f9f;
  --warning: #815408;
  --warning-bg: #fff5d9;
  --warning-line: #ddc27a;
  --code: #1d0e13;
  --code-ink: #fff0f4;
  --progress: #a23f63;
}
:root[data-theme="terminal"] {
  color-scheme: dark;
  --bg: #070907;
  --wash: rgba(132, 255, 159, 0.08);
  --ink: #d5f7d8;
  --muted: #92bd97;
  --line: #254028;
  --panel: #0c110d;
  --panel-soft: #090d0a;
  --accent: #7ee787;
  --accent-strong: #b8f6be;
  --blue: #8bd9ff;
  --warning: #f0d36c;
  --warning-bg: #1c190a;
  --warning-line: #4f4316;
  --code: #020402;
  --code-ink: #d5f7d8;
  --progress: #7ee787;
}
* { box-sizing: border-box; }
html { min-height: 100%; background: var(--bg); }
body {
  margin: 0;
  min-height: 100%;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  color: var(--ink);
  background:
    linear-gradient(180deg, var(--wash), transparent 300px),
    var(--bg);
}
a { color: var(--blue); }
.shell {
  width: min(1680px, calc(100% - 28px));
  margin: 0 auto;
  padding: 24px 0 40px;
}
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 24px;
}
.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 800;
  letter-spacing: 0;
  color: var(--ink);
  text-decoration: none;
}
.brand-mark {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border-radius: 8px;
  background: var(--ink);
  color: var(--bg);
  font-size: 14px;
}
.nav {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
}
.nav a, button, .button, .theme-select {
  appearance: none;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--panel);
  color: var(--ink);
  min-height: 40px;
  padding: 0 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  text-decoration: none;
  font: inherit;
  font-weight: 700;
  cursor: pointer;
}
.theme-select { padding-right: 32px; }
button.primary, .button.primary {
  border-color: var(--accent);
  background: var(--accent);
  color: white;
}
button.primary:hover, .button.primary:hover { background: var(--accent-strong); }
button:disabled { opacity: 0.6; cursor: wait; }
.grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 340px;
  gap: 18px;
  align-items: start;
}
.panel {
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 20px;
}
h1, h2, h3 { margin: 0; line-height: 1.15; letter-spacing: 0; }
h1 { font-size: clamp(30px, 5vw, 58px); max-width: 920px; }
h2 { font-size: 20px; margin-bottom: 14px; }
p { color: var(--muted); line-height: 1.6; }
label { display: grid; gap: 8px; font-weight: 700; }
input[type="text"], input[type="password"], input[type="file"] {
  width: 100%;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--panel);
  color: var(--ink);
  min-height: 44px;
  padding: 10px 12px;
  font: inherit;
}
.drop {
  border: 1px dashed var(--line);
  border-radius: 8px;
  background: var(--panel-soft);
  padding: 18px;
}
.form {
  display: grid;
  gap: 14px;
}
.actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  align-items: center;
}
.status {
  min-height: 24px;
  color: var(--muted);
  font-weight: 700;
}
.status.error { color: #b02727; }
.status.ok { color: var(--accent-strong); }
.result {
  display: none;
  gap: 10px;
  margin-top: 14px;
}
.result.visible { display: grid; }
.copy-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
}
.progress {
  display: grid;
  gap: 8px;
}
.progress[hidden] { display: none; }
.progress-track {
  width: 100%;
  height: 10px;
  border-radius: 999px;
  overflow: hidden;
  background: color-mix(in srgb, var(--line), transparent 25%);
}
.progress-fill {
  width: 0%;
  height: 100%;
  border-radius: inherit;
  background: var(--progress);
  transition: width 180ms ease;
}
.progress-label {
  color: var(--muted);
  font-size: 13px;
  font-weight: 700;
}
.conversation-message {
  position: relative;
  border: 1px solid var(--line);
  border-radius: 8px;
  margin: 0 0 14px;
  padding: 30px 14px 14px;
  background: var(--panel);
}
.conversation-message::before {
  position: absolute;
  top: 8px;
  left: 12px;
  border-radius: 999px;
  padding: 3px 8px;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.conversation-message--user {
  border-color: color-mix(in srgb, var(--blue), var(--line) 58%);
  background: color-mix(in srgb, var(--blue), var(--panel) 93%);
}
.conversation-message--user::before {
  content: "User";
  color: white;
  background: var(--blue);
}
.conversation-message--codex {
  border-color: color-mix(in srgb, var(--accent), var(--line) 58%);
  background: color-mix(in srgb, var(--accent), var(--panel) 94%);
}
.conversation-message--codex::before {
  content: "Codex";
  color: white;
  background: var(--accent);
}
.conversation-message > :first-child { margin-top: 0; }
.conversation-message > :last-child { margin-bottom: 0; }
.transcript-marker { display: none; }
.markdown-body details .conversation-message {
  margin-bottom: 8px;
  padding: 24px 10px 10px;
}
.markdown-body details .conversation-message::before {
  top: 6px;
  left: 8px;
  padding: 2px 7px;
  font-size: 10px;
}
.docs-list {
  display: grid;
  gap: 10px;
}
.doc-row {
  border-top: 1px solid var(--line);
  padding-top: 10px;
}
.doc-row:first-child { border-top: 0; padding-top: 0; }
.doc-title {
  display: block;
  font-weight: 800;
  color: var(--ink);
  text-decoration: none;
  overflow-wrap: anywhere;
}
.meta {
  color: var(--muted);
  font-size: 13px;
  line-height: 1.5;
}
.document-head {
  display: grid;
  gap: 16px;
  padding: 16px 0 22px;
  border-bottom: 1px solid var(--line);
}
.document-title {
  font-size: clamp(34px, 5vw, 64px);
  overflow-wrap: anywhere;
}
.markdown-body {
  width: 100%;
  max-width: none;
  padding: 28px 0 60px;
  font-size: 17px;
  line-height: 1.72;
  transition: opacity 220ms ease;
}
.document-loading .markdown-body { opacity: 0.18; }
.document-ready .markdown-body { opacity: 1; }
.markdown-body h1,
.markdown-body h2,
.markdown-body h3,
.markdown-body h4 {
  margin: 1.45em 0 0.5em;
}
.markdown-body h1 { font-size: clamp(30px, 3vw, 46px); }
.markdown-body h2 { font-size: clamp(24px, 2.2vw, 34px); }
.markdown-body h3 { font-size: 22px; }
.markdown-body p,
.markdown-body ul,
.markdown-body ol,
.markdown-body blockquote,
.markdown-body pre,
.markdown-body table,
.markdown-body details,
.markdown-body figure { margin: 0 0 1em; }
.markdown-body details p,
.markdown-body details ul,
.markdown-body details ol,
.markdown-body details blockquote,
.markdown-body details pre,
.markdown-body details table,
.markdown-body details figure {
  margin-bottom: 0.45em;
}
.markdown-body details li { margin: 0.2em 0; }
.markdown-body details > :last-child { margin-bottom: 0; }
.markdown-body blockquote {
  border-left: 4px solid var(--line);
  padding-left: 16px;
  color: var(--muted);
}
.markdown-body pre,
.plain-markdown {
  overflow: auto;
  border-radius: 8px;
  background: var(--code);
  color: var(--code-ink);
  padding: 16px;
  font-size: 14px;
  line-height: 1.55;
}
.markdown-body code {
  border-radius: 6px;
  background: color-mix(in srgb, var(--line), transparent 45%);
  padding: 0.1em 0.35em;
  font-size: 0.92em;
}
.markdown-body pre code {
  background: transparent;
  padding: 0;
}
.markdown-body img {
  display: block;
  max-width: 100%;
  height: auto;
  border-radius: 8px;
}
.embedded-image {
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--panel);
  padding: 12px;
}
.embedded-image img {
  width: auto;
  max-height: 86vh;
  margin: 0 auto;
  object-fit: contain;
}
.embedded-image figcaption {
  margin-top: 8px;
  color: var(--muted);
  font-size: 13px;
  text-align: center;
}
.markdown-body details {
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--panel);
  padding: 8px 10px;
  line-height: 1.45;
}
.markdown-body summary {
  cursor: pointer;
  font-weight: 800;
  white-space: normal;
  margin: -8px -10px;
  padding: 8px 10px;
}
.markdown-body details[open] > summary {
  border-bottom: 1px solid var(--line);
  margin-bottom: 8px;
}
.markdown-body details.compact-details {
  margin-bottom: 0.5em;
  padding: 5px 8px;
  font-size: 15px;
}
.markdown-body details.compact-details > summary {
  line-height: 1.25;
  margin: -5px -8px;
  padding: 6px 8px;
}
.markdown-body details.compact-details[open] > summary {
  margin-bottom: 6px;
}
.markdown-body details.compact-details p {
  line-height: 1.45;
}
.markdown-body details.compact-details ul,
.markdown-body details.compact-details ol {
  padding-left: 1.25em;
}
.markdown-body details.compact-details li > p {
  margin: 0.15em 0;
}
.markdown-body details.compact-details pre {
  padding: 10px;
  line-height: 1.35;
}
.markdown-body details.history-details {
  background: color-mix(in srgb, var(--panel-soft), var(--panel) 45%);
}
.markdown-body details.tool-details {
  background: var(--panel-soft);
}
.markdown-body details.tool-details > summary {
  font-size: 14px;
}
.markdown-body table {
  width: 100%;
  border-collapse: collapse;
  display: block;
  overflow-x: auto;
}
.markdown-body th,
.markdown-body td {
  border: 1px solid var(--line);
  padding: 8px 10px;
}
.notice {
  color: var(--warning);
  background: var(--warning-bg);
  border: 1px solid var(--warning-line);
  border-radius: 8px;
  padding: 10px 12px;
}
.viewer-loader {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: grid;
  place-items: center;
  padding: 24px;
  background: color-mix(in srgb, var(--bg), transparent 4%);
  transition: opacity 240ms ease, visibility 240ms ease;
}
.viewer-loader-box {
  width: min(520px, 100%);
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--panel);
  padding: 20px;
  box-shadow: 0 18px 60px rgba(0, 0, 0, 0.16);
}
.viewer-loader-title {
  margin-bottom: 12px;
  font-weight: 900;
  font-size: 18px;
}
.document-ready .viewer-loader {
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
@media (max-width: 860px) {
  .grid { grid-template-columns: 1fr; }
  .topbar { align-items: flex-start; flex-direction: column; }
  .shell { width: min(100% - 18px, 1680px); padding-top: 16px; }
  .copy-row { grid-template-columns: 1fr; }
  .document-title { font-size: 34px; }
}
`;

function layout(title: string, body: string, bodyClass = ""): string {
  return `<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="shortcut icon" href="/favicon.ico">
  <meta name="theme-color" content="#0f7b63">
  ${themeHeadScript()}
  <style>${css}</style>
</head>
<body class="${escapeHtml(bodyClass)}">
  <main class="shell">
    ${body}
  </main>
  ${themeBodyScript()}
</body>
</html>`;
}

function topbar(extraNav = ""): string {
  return `<div class="topbar">
  <a class="brand" href="/">
    <span class="brand-mark">MD</span>
    <span>md.xedoc.ru</span>
  </a>
  <nav class="nav">${extraNav}${themeSelect()}</nav>
</div>`;
}

function themeSelect(): string {
  const options = themes
    .map((theme) => `<option value="${theme.id}">${escapeHtml(theme.label)}</option>`)
    .join("");

  return `<label><span class="sr-only">Theme</span><select id="theme-select" class="theme-select" aria-label="Theme">${options}</select></label>`;
}

function themeHeadScript(): string {
  const themeIds = JSON.stringify(themes.map((theme) => theme.id));
  return `<script>
(function () {
  var themes = ${themeIds};
  var params = new URLSearchParams(location.search);
  var requested = params.get("theme");
  var saved = localStorage.getItem("md-theme");
  var theme = themes.indexOf(requested) >= 0 ? requested : (themes.indexOf(saved) >= 0 ? saved : "light");
  document.documentElement.dataset.theme = theme;
})();
</script>`;
}

function themeBodyScript(): string {
  const themeIds = JSON.stringify(themes.map((theme) => theme.id));
  return `<script>
(function () {
  var themes = ${themeIds};
  var select = document.querySelector("#theme-select");
  if (!select) return;
  var current = document.documentElement.dataset.theme || "light";
  select.value = current;
  select.addEventListener("change", function () {
    var value = select.value;
    if (themes.indexOf(value) < 0) return;
    document.documentElement.dataset.theme = value;
    localStorage.setItem("md-theme", value);
    var url = new URL(location.href);
    url.searchParams.set("theme", value);
    history.replaceState(null, "", url);
  });
})();
</script>`;
}

export function uploadPage(): string {
  return layout(
    "md.xedoc.ru",
    `${topbar()}
<section class="grid">
  <div>
    <h1>Markdown upload</h1>
    <div class="panel" style="margin-top: 22px;">
      <form id="upload-form" class="form">
        <label>
          Upload token
          <input id="token" name="token" type="password" autocomplete="current-password" required>
        </label>
        <label>
          Title
          <input id="title" name="title" type="text" maxlength="200" placeholder="Optional">
        </label>
        <label class="drop">
          Markdown file
          <input id="file" name="file" type="file" accept=".md,.markdown,text/markdown,text/plain" required>
        </label>
        <div class="actions">
          <button id="submit" class="primary" type="submit">Upload</button>
          <span id="status" class="status"></span>
        </div>
        <div id="upload-progress" class="progress" hidden>
          <div class="progress-track"><div id="upload-progress-fill" class="progress-fill"></div></div>
          <div id="upload-progress-label" class="progress-label">Waiting...</div>
        </div>
      </form>
      <div id="result" class="result">
        <div class="copy-row">
          <input id="public-url" type="text" readonly>
          <button id="copy" type="button">Copy</button>
        </div>
        <div class="actions">
          <a id="open-link" class="button primary" href="#">Open</a>
          <a id="raw-link" class="button" href="#">Raw</a>
        </div>
      </div>
    </div>
  </div>
  <aside class="panel">
    <h2>Recent uploads</h2>
    <div class="form">
      <button id="load-list" type="button">Load</button>
      <div id="docs-list" class="docs-list meta"></div>
    </div>
  </aside>
</section>
<script>
const form = document.querySelector("#upload-form");
const token = document.querySelector("#token");
const title = document.querySelector("#title");
const file = document.querySelector("#file");
const statusNode = document.querySelector("#status");
const submit = document.querySelector("#submit");
const result = document.querySelector("#result");
const publicUrl = document.querySelector("#public-url");
const openLink = document.querySelector("#open-link");
const rawLink = document.querySelector("#raw-link");
const copy = document.querySelector("#copy");
const loadList = document.querySelector("#load-list");
const docsList = document.querySelector("#docs-list");
const uploadProgress = document.querySelector("#upload-progress");
const uploadProgressFill = document.querySelector("#upload-progress-fill");
const uploadProgressLabel = document.querySelector("#upload-progress-label");

function setStatus(message, type) {
  statusNode.textContent = message;
  statusNode.className = "status" + (type ? " " + type : "");
}

function setUploadProgress(percent, label) {
  uploadProgress.hidden = false;
  uploadProgressFill.style.width = Math.max(0, Math.min(100, percent)) + "%";
  uploadProgressLabel.textContent = label;
}

function formatMegabytes(bytes) {
  const value = bytes / 1024 / 1024;
  return value.toFixed(value >= 10 ? 1 : 2) + " MB";
}

function uploadDocument(body, fileSize) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/documents");
    xhr.setRequestHeader("Authorization", "Bearer " + token.value);
    xhr.responseType = "json";
    xhr.upload.addEventListener("progress", (event) => {
      if (!event.lengthComputable) {
        setUploadProgress(12, "Uploading " + formatMegabytes(event.loaded || 0) + " of " + formatMegabytes(fileSize));
        return;
      }

      const totalBytes = Math.max(fileSize, event.total || 0);
      const uploadedBytes = Math.min(totalBytes, event.loaded || 0);
      const percent = totalBytes > 0 ? Math.round((uploadedBytes / totalBytes) * 100) : 0;
      setUploadProgress(
        percent,
        "Uploading " + formatMegabytes(uploadedBytes) + " of " + formatMegabytes(totalBytes) + " (" + percent + "%)"
      );
    });
    xhr.addEventListener("load", () => {
      const data = xhr.response;
      if (xhr.status < 200 || xhr.status >= 300) {
        reject(new Error(data?.error ?? "Request failed"));
        return;
      }
      resolve(data);
    });
    xhr.addEventListener("error", () => reject(new Error("Network error")));
    xhr.send(body);
  });
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const selected = file.files?.[0];
  if (!selected) return;

  const body = new FormData();
  if (title.value.trim()) body.append("title", title.value.trim());
  body.append("file", selected);

  submit.disabled = true;
  setStatus("Uploading...", "");
  setUploadProgress(0, "Preparing " + formatMegabytes(selected.size) + " upload...");
  result.classList.remove("visible");

  try {
    const data = await uploadDocument(body, selected.size);
    setUploadProgress(100, "Uploaded " + formatMegabytes(selected.size) + " of " + formatMegabytes(selected.size));
    publicUrl.value = data.links.publicUrl;
    openLink.href = data.links.publicUrl;
    rawLink.href = data.links.rawUrl;
    result.classList.add("visible");
    setStatus("Uploaded", "ok");
  } catch (error) {
    setStatus(error.message, "error");
  } finally {
    submit.disabled = false;
  }
});

copy.addEventListener("click", async () => {
  await navigator.clipboard.writeText(publicUrl.value);
  setStatus("Copied", "ok");
});

async function parseResponse(response) {
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.error ?? "Request failed");
  }
  return data;
}

loadList.addEventListener("click", async () => {
  docsList.textContent = "Loading...";
  try {
    const response = await fetch("/api/documents", {
      headers: { Authorization: "Bearer " + token.value }
    });
    const data = await parseResponse(response);
    docsList.innerHTML = data.documents.map((doc) => {
      const href = "/s/" + encodeURIComponent(doc.slug);
      const created = new Date(doc.createdAt).toLocaleString();
      const size = new Intl.NumberFormat().format(doc.bytes);
      return '<div class="doc-row"><a class="doc-title" href="' + href + '">' +
        escapeHtmlClient(doc.title) + '</a><div>' + created + ' &middot; ' + size + ' bytes</div></div>';
    }).join("") || "No uploads yet";
  } catch (error) {
    docsList.textContent = error.message;
  }
});

function escapeHtmlClient(value) {
  return value.replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[char]));
}
</script>`
  );
}

export function documentPage(metadata: DocumentMetadata, content: string, links: DocumentLinks): string {
  return layout(
    metadata.title,
    `${topbar(`<a href="${escapeHtml(links.rawUrl)}">Raw</a><a href="${escapeHtml(links.downloadUrl)}">Download</a>`)}
<header class="document-head">
  <h1 class="document-title">${escapeHtml(metadata.title)}</h1>
  <div class="meta">${escapeHtml(metadata.originalName)} &middot; ${formatBytes(metadata.bytes)} &middot; ${escapeHtml(new Date(metadata.createdAt).toLocaleString("ru-RU"))}</div>
  <div class="actions">
    <button type="button" id="copy-link">Copy link</button>
    <a class="button primary" href="${escapeHtml(links.rawUrl)}">Raw</a>
  </div>
</header>
<div id="viewer-loader" class="viewer-loader" role="status" aria-live="polite">
  <div class="viewer-loader-box">
    <div class="viewer-loader-title">Loading document</div>
    <div class="progress-track"><div id="viewer-progress-fill" class="progress-fill" style="width: 8%;"></div></div>
    <div id="viewer-progress-label" class="progress-label" style="margin-top: 10px;">Preparing content...</div>
  </div>
</div>
<article class="markdown-body">
${renderMarkdown(content, metadata)}
</article>
<script>
document.querySelector("#copy-link")?.addEventListener("click", async () => {
  await navigator.clipboard.writeText(location.href);
});

(function () {
  const article = document.querySelector(".markdown-body");
  if (!article) return;

  function text(element) {
    return (element.textContent || "").trim();
  }

  function summaryText(element) {
    if (element.tagName !== "DETAILS") return "";
    const summary = element.querySelector(":scope > summary");
    return summary ? text(summary) : "";
  }

  function isHeading(element) {
    return /^H[1-6]$/.test(element.tagName);
  }

  function isUserContext(element) {
    return element.tagName === "P" && /^User context$/i.test(text(element));
  }

  function isHistoryDetails(element) {
    return element.tagName === "DETAILS" && /^\\d+\\s+previous messages$/i.test(summaryText(element));
  }

  function isToolDetails(element) {
    return element.tagName === "DETAILS" && /^(Ran \\d+ commands?|Edited \\d+ files?|Created \\d+ files?)$/i.test(summaryText(element));
  }

  function isBoundary(element) {
    return element.tagName === "SUMMARY" || isHeading(element) || isHistoryDetails(element);
  }

  function wrap(nodes, className) {
    if (nodes.length === 0) return;
    const section = document.createElement("section");
    section.className = "conversation-message " + className;
    nodes[0].before(section);
    nodes.forEach((node) => section.appendChild(node));
  }

  article.querySelectorAll("details").forEach((details) => {
    details.classList.add("compact-details");
    if (isHistoryDetails(details)) details.classList.add("history-details");
    if (isToolDetails(details)) details.classList.add("tool-details");
  });

  function enhanceContainer(container) {
    const userNodes = new Set();
    Array.from(container.children).forEach((child) => {
      if (!isUserContext(child)) return;
      child.classList.add("transcript-marker");

      const block = [];
      const previous = child.previousElementSibling;
      if (previous && !isBoundary(previous) && !previous.classList.contains("conversation-message")) {
        block.push(previous);
      }

      block.push(child);

      let cursor = child.nextElementSibling;
      while (
        cursor &&
        !isBoundary(cursor) &&
        !isUserContext(cursor) &&
        !cursor.classList.contains("conversation-message")
      ) {
        block.push(cursor);
        cursor = cursor.nextElementSibling;
      }

      block.forEach((node) => userNodes.add(node));
    });

    let userRun = [];
    Array.from(container.children).forEach((child) => {
      if (userNodes.has(child)) {
        userRun.push(child);
        return;
      }
      wrap(userRun, "conversation-message--user");
      userRun = [];
    });
    wrap(userRun, "conversation-message--user");

    let codexRun = [];
    Array.from(container.children).forEach((child) => {
      if (
        child.tagName === "SUMMARY" ||
        child.classList.contains("conversation-message") ||
        isHeading(child) ||
        isHistoryDetails(child) ||
        (child.matches && child.matches("script,style"))
      ) {
        wrap(codexRun, "conversation-message--codex");
        codexRun = [];
        return;
      }

      if (text(child) === "" && child.children.length === 0) return;
      codexRun.push(child);
    });
    wrap(codexRun, "conversation-message--codex");
  }

  enhanceContainer(article);
  article.querySelectorAll("details.history-details").forEach(enhanceContainer);
})();

(function () {
  const loader = document.querySelector("#viewer-loader");
  if (!loader) return;
  const fill = document.querySelector("#viewer-progress-fill");
  const label = document.querySelector("#viewer-progress-label");
  const images = Array.from(document.querySelectorAll(".markdown-body img"));
  const imageBytes = new Map(images.map((image) => [image, estimateImageBytes(image)]));
  const totalImageBytes = images.reduce((sum, image) => sum + (imageBytes.get(image) || 0), 0);
  const initialImages = images.filter(shouldWaitForImage);
  const initialImageSet = new Set(initialImages);
  const markedImages = new WeakSet();
  let loaded = 0;
  let loadedBytes = 0;
  let initialLoaded = 0;
  let finished = false;

  function setProgress(percent, text) {
    fill.style.width = Math.max(0, Math.min(100, percent)) + "%";
    label.textContent = text;
  }

  function formatMegabytes(bytes) {
    const value = bytes / 1024 / 1024;
    return value.toFixed(value >= 10 ? 1 : 2) + " MB";
  }

  function estimateImageBytes(image) {
    const source = image.getAttribute("src") || "";
    const match = source.match(/^data:image\\/[^;]+;base64,([A-Za-z0-9+/=]+)$/);
    if (!match) return 0;

    const base64 = match[1];
    const padding = base64.endsWith("==") ? 2 : (base64.endsWith("=") ? 1 : 0);
    return Math.max(0, Math.floor((base64.length * 3) / 4) - padding);
  }

  function shouldWaitForImage(image) {
    if (image.closest("details:not([open])")) return false;

    const rect = image.getBoundingClientRect();
    return rect.top < window.innerHeight * 1.8;
  }

  function wakeImage(image, priority) {
    image.loading = "eager";
    image.decoding = "async";
    if ("fetchPriority" in image) {
      image.fetchPriority = priority ? "high" : "auto";
    }

    if (image.dataset.wakeStarted === "1") return;
    image.dataset.wakeStarted = "1";

    if (typeof image.decode === "function") {
      image.decode().then(() => markLoaded(image)).catch(() => {
        if (image.complete) markLoaded(image);
      });
    }
  }

  function progressLabel() {
    const imagePart = loaded + " of " + images.length + " images";
    if (totalImageBytes > 0) {
      return "Loaded " + formatMegabytes(loadedBytes) + " of " + formatMegabytes(totalImageBytes) + " (" + imagePart + ")";
    }
    return "Loaded " + imagePart;
  }

  function finish() {
    if (finished) return;
    finished = true;
    setProgress(100, "Ready");
    document.body.classList.remove("document-loading");
    document.body.classList.add("document-ready");
    setTimeout(() => {
      loader.setAttribute("hidden", "");
    }, 280);
  }

  if (images.length === 0) {
    requestAnimationFrame(finish);
    return;
  }

  if (initialImages.length === 0) {
    requestAnimationFrame(finish);
  }

  function markLoaded(image) {
    if (markedImages.has(image)) return;
    markedImages.add(image);

    loaded += 1;
    loadedBytes += imageBytes.get(image) || 0;
    if (initialImageSet.has(image)) {
      initialLoaded += 1;
    }

    const percent = Math.round((loaded / images.length) * 100);
    setProgress(percent, progressLabel());
    if (initialLoaded >= initialImages.length) {
      finish();
    }
  }

  images.forEach((image) => {
    if (image.complete) {
      markLoaded(image);
      return;
    }
    image.addEventListener("load", () => markLoaded(image), { once: true });
    image.addEventListener("error", () => markLoaded(image), { once: true });
  });

  initialImages.forEach((image) => wakeImage(image, true));

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        observer.unobserve(entry.target);
        wakeImage(entry.target, false);
      });
    }, { rootMargin: "1200px 0px" });

    images.forEach((image) => {
      if (!initialImageSet.has(image) && !image.closest("details:not([open])")) {
        observer.observe(image);
      }
    });
  }

  document.querySelectorAll(".markdown-body details").forEach((details) => {
    details.addEventListener("toggle", () => {
      if (!details.open) return;
      details.querySelectorAll("img").forEach((image) => wakeImage(image, false));
    });
  });

  setTimeout(finish, 5000);
})();
</script>`,
    "document-loading"
  );
}

export function notFoundPage(): string {
  return layout("Not found", `${topbar()}<section class="panel"><h1>Not found</h1><p>Document link is missing or expired.</p></section>`);
}

export function errorPage(message: string): string {
  return layout("Error", `${topbar()}<section class="panel"><h1>Error</h1><p>${escapeHtml(message)}</p></section>`);
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
