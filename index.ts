import { VirtualTable } from "./src/VirtualTable";

const el = document.getElementById('table');
let rows = Array(100000).fill(null).map(() => ({}));
let cols = Array(10000).fill(null).map(() => ({}));
const vt = VirtualTable({
  el,
  rows,
  cols,
  width: 1000,
  height: 800,
});

let observer = new MutationObserver(mutations => {
  vt.update({ width: el.clientWidth - 40, height: el.clientHeight - 40 })
});
observer.observe(el, { attributes: true });