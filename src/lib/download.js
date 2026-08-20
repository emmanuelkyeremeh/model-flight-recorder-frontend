/** Hand a string to the browser as a file, without touching the network. */
export function downloadText(filename, text, type = "text/plain") {
  const safeName = sanitizeFilename(filename);
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = safeName;
  anchor.rel = "noopener";
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

/** Strip path separators and control characters so a run_id cannot escape the download name. */
export function sanitizeFilename(filename) {
  const base = String(filename ?? "download")
    .replace(/[/\\?%*:|"<>]/g, "-")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .trim();
  return base.length > 0 ? base.slice(0, 180) : "download";
}
