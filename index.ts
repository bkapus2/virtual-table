import { VirtualTable } from "./VirtualTable";

const el = document.getElementById('table');
let rows = Array(100000).fill(null).map(() => ({}));
let cols = Array(100).fill(null).map(() => ({}));
const vt = VirtualTable({
  el,
  rows,
  cols,
  width: 400,
  height: 300,
});
// const interval = setInterval(() => {
//   if (rows.length < 100) {
//     rows = [ ...rows, {} ]
//     vt.update({ rows })
//   } else {
//     clearInterval(interval);
//   }
// }, 100);

let observer = new MutationObserver(mutations => {
  vt.update({ width: el.clientWidth - 40, height: el.clientHeight - 40 })
});
observer.observe(el, { attributes: true });