export async function copyTextToClipboard(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
}

export function setCopyFeedback(
  button: HTMLElement | null,
  message: string,
  durationMs = 1500
): void {
  if (!button) return;
  const originalText = button.textContent ?? '';
  button.textContent = message;
  button.classList.add('copied');
  window.setTimeout(() => {
    button.textContent = originalText;
    button.classList.remove('copied');
  }, durationMs);
}

export function toggleFullscreenMode(): void {
  if (document.fullscreenElement) {
    void document.exitFullscreen();
    return;
  }
  void document.documentElement.requestFullscreen();
}
