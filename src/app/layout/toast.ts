export function showToastMessage(message: string): void {
  document.querySelector('.toast-notification')?.remove();
  const element = document.createElement('div');
  element.className = 'toast-notification';
  element.textContent = message;
  document.body.appendChild(element);

  requestAnimationFrame(() => element.classList.add('visible'));
  setTimeout(() => {
    element.classList.remove('visible');
    setTimeout(() => element.remove(), 300);
  }, 3000);
}
