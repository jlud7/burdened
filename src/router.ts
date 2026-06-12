/** tiny indirection so screens can trigger a re-render without importing main */
let renderFn: () => void = () => {};

export function setRender(fn: () => void) {
  renderFn = fn;
}

export function rerender() {
  renderFn();
}
