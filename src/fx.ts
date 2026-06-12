/** code-driven juice: floating numbers, shakes, flashes — per the GDD, no frame animation */

const layer = () => document.getElementById('fx-layer')!;

export function floatText(target: Element | null, text: string, cls = '') {
  if (!target) return;
  const r = target.getBoundingClientRect();
  const el = document.createElement('div');
  el.className = `float-text ${cls}`;
  el.textContent = text;
  el.style.left = `${r.left + r.width / 2 + (Math.random() * 40 - 20)}px`;
  el.style.top = `${r.top + r.height * 0.3}px`;
  layer().appendChild(el);
  setTimeout(() => el.remove(), 1100);
}

export function shake(target: Element | null, hard = false) {
  if (!target) return;
  const cls = hard ? 'shake-hard' : 'shake';
  target.classList.remove('shake', 'shake-hard');
  void (target as HTMLElement).offsetWidth; // restart animation
  target.classList.add(cls);
  setTimeout(() => target.classList.remove(cls), 450);
}

export function flash(target: Element | null) {
  if (!target) return;
  target.classList.remove('hit-flash');
  void (target as HTMLElement).offsetWidth;
  target.classList.add('hit-flash');
  setTimeout(() => target.classList.remove('hit-flash'), 350);
}

export function screenShake() {
  shake(document.getElementById('app'), true);
}
