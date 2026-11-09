/**
 * Utility to reliably trigger clean, immediate file downloads in modern browsers
 * without popup blockers or navigating away from the page.
 */
export function triggerFileDownload(url: string, filename?: string) {
  const link = document.createElement('a');
  link.href = url;
  if (filename) {
    link.download = filename;
  }
  link.setAttribute('target', '_self');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.setAttribute('target', '_self');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

