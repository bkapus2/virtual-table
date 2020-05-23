function queueRaf(cb) {
  let isQueued = false;
  let finalArgs = null;
  return function(...args) {
    finalArgs = args;
    if (!isQueued) {
      isQueued = true;
      window.requestAnimationFrame(() => {
        isQueued = false;
        cb(...finalArgs);
        finalArgs = null;
      })
    }
  }
}

function throttle(cb, ms=5) {
  let timeout;
  return function(...args) {
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => {
      cb(...args);
      timeout = null;
    }, ms);
  }
}

function ViewPort(store) {
  const viewPort = document.createElement('div');
  viewPort.style = `
    border: 1px solid black;
    overflow: auto;
    position: relative;
  `;

  const queueSizeUpdate = queueRaf((width, height) => {
    viewPort.style.height = `${height || 0}px`;
    viewPort.style.width = `${width || 0}px`;
  });

  watch(() => {
    queueSizeUpdate(store.state.width, store.state.height)
  });

  watch(() => {
    const el = store.state.el;
    if (el) {
      el.appendChild(viewPort);
    } else {
      const parent = viewPort.parentElement;
      if (parent) {
        parent.removeChild(viewPort);
      }
    }
  })

  const dispatchScoll = queueRaf(() => {
    // todo: add a commit step to any mutation to reduce churn in getters
    store.state.scrollLeft = viewPort.scrollLeft;
    store.state.scrollTop = viewPort.scrollTop;
  });
  viewPort.addEventListener('scroll', dispatchScoll);

  return viewPort;
};

function Row(store, yIdx) {
  const row = document.createElement('div');
  row.style = `
    height: ${store.getters.heights[yIdx]}px;
    display: flex;
    flex-direction: row;
  `;
  return row;
}

function Cell(store, yIdx, xIdx) {
  const cell = document.createElement('div');
  cell.style = `
    border: 1px solid #ccc;
    width: ${store.getters.widths[xIdx]}px;
    height: 100%;
  `
  return cell;
}

function BackDrop(store) {
  const backDrop = document.createElement('div');
  backDrop.style = `
    position: relative;
  `;

  const queueSizeUpdate = queueRaf((width, height) => {
    backDrop.style.width = `${width}px`;
    backDrop.style.height = `${height}px`;
  })

  watch(() => {
    queueSizeUpdate(store.getters.totalWidth, store.getters.totalHeight);
  })

  return backDrop;
}

function Canvas(store) {
  const canvas = document.createElement('div');
  canvas.style = `
    position: absolute;
  `;

  watch(() => {
    const { yMinIdx, xMinIdx, yMaxIdx, xMaxIdx, vOffsets, hOffsets } = store.getters;
    const vOffset = vOffsets[yMinIdx];
    const hOffset = hOffsets[xMinIdx];
    canvas.style.top = `${vOffset}px`;
    canvas.style.left = `${hOffset}px`;
    canvas.innerHTML = '';
    for(let y = yMinIdx; y <= yMaxIdx; y++) {
      const row = Row(store, y);
      for(let x = xMinIdx; x <= xMaxIdx; x++) {
        const cell = Cell(store, y, x);
        row.appendChild(cell);
      }
      canvas.appendChild(row);
    }
  })

  return canvas;
}

// function Cell(store) {
//   const element = document.createElement('div');
//   element.style = `
//     border: 1px solid #ccc;
//     box-sizing: border-box;
//     position: absolute;
//   `;
//   function attach(x, y) {
//     element.style.width = `${store.getters.widths[x]}px`;
//     element.style.height = `${store.getters.heights[y]}px`;
//     element.style.left = `${store.getters.hOffsets[x]}px`;
//     element.style.top = `${store.getters.vOffsets[y]}px`;
//     cell.isAttached = true;
//     cell.x = x;
//     cell.y = y;
//   }
//   function detach() {
//     cell.isAttached = false;
//     cell.x = null;
//     cell.y = null;
//   }
//   const cell = { element, attach, detach, isAttached: false, x: null, y: null }
//   return cell;
// }

// function CellPool(store) {
//   let freeCells = [];
//   const inUseCells = new Map();

//   function get(x, y) {
//     const key = `${x},${y}`;
//     let cell =inUseCells.get(key);
//     if (cell) {
//       cell = inUseCells.get(key);
//     } else if (!freeCells.length) {
//       cell = Cell(store);
//       inUseCells.set(key, cell);
//     } else {
//       cell = freeCells.shift();
//       inUseCells.set(`${x},${y}`, cell);
//     }
//     return cell;
//   }

//   function releaseRange(xMin, xMax, yMin, yMax) {
//     inUseCells.forEach((cell, key)=> {
//       const [xStr, yStr] = key.split(',');
//       const x = parseInt(xStr);
//       const y = parseInt(yStr);
//       if ((x < xMin || x > xMax || y < yMin || y > yMax) && cell.isAttached) {
//         cell.element.parentElement.removeChild(cell.element);
//         cell.detach();
//         inUseCells.delete(key);
//         freeCells.push(cell);
//       }
//     })
//   }

//   return { get, releaseRange }
// }

function VirtualTable({ width, height, el, cols, rows }) {
  const store = Store({
    state: {
      vBuffer: 20,
      hBuffer: 20,
      scrollTop: 0,
      scrollLeft: 0,
      width: 0,
      height: 0,
      el: null,
      cols: [],
      rows: [],
    },
    getters: {
      heights: (state) => state.rows.map(() => 50),
      widths: (state) => state.cols.map(() => 100),
      vOffsets: (state, getters) => getters.heights.reduce((acc, val) => {
        acc.vOffsets.push(acc.vOffset);
        acc.vOffset += val;
        return acc;
      }, { vOffsets: [], vOffset: 0 }).vOffsets,
      hOffsets: (state, getters) => getters.widths.reduce((acc, val) => {
        acc.hOffsets.push(acc.hOffset);
        acc.hOffset += val;
        return acc;
      }, { hOffsets: [], hOffset: 0 }).hOffsets,
      totalHeight: (state, getters) => getters.heights.reduce((acc, val) => acc + val, 0),
      totalWidth: (state, getters) => getters.widths.reduce((acc, val) => acc + val, 0),
      yMinIdx: (state, getters) => {
        const minPx = Math.max(0, state.scrollTop - state.vBuffer);
        // todo: binary search, these are ordered
        return Math.max(getters.vOffsets.findIndex(height => height > minPx) - 1, 0);
      },
      yMaxIdx: (state, getters) => {
        // todo: account for scroll bar height
        const maxPx = Math.min(getters.totalHeight, state.height + state.scrollTop + state.vBuffer);
        // todo: binary search, these are ordered
        return getters.vOffsets.length - getters.vOffsets.slice().reverse().findIndex(offset => offset <= maxPx)
      },
      xMinIdx: (state, getters) => {
        const minPx = Math.max(0, state.scrollLeft - state.hBuffer);
        // todo: binary search, these are ordered
        return Math.max(getters.hOffsets.findIndex(height => height > minPx) - 1, 0);
      },
      xMaxIdx: (state, getters) => {
        // todo: account for scroll bar height
        const maxPx = Math.min(getters.totalWidth, state.width + state.scrollLeft + state.hBuffer);
        // todo: binary search, these are ordered
        return getters.hOffsets.length - getters.hOffsets.slice().reverse().findIndex(offset => offset <= maxPx)
      },
    }
  });

  function update({ width, height, el, cols, rows }) {
    Array.isArray(rows) && (store.state.rows = rows);
    Array.isArray(cols) && (store.state.cols = cols);
    width !== undefined && (store.state.width = width);
    height !== undefined && (store.state.height = height);
    el !== undefined && (store.state.el = el);
  }

  update({ width, height, el, cols, rows });
  
  const viewPort = ViewPort(store);
  const backDrop = BackDrop(store);
  const canvas = Canvas(store);
  viewPort.appendChild(backDrop);
  viewPort.appendChild(canvas);

  

  // const cellPool = CellPool(store);

  // watch(() => {
  //   console.log('repaint');
  //   const { yMinIdx, yMaxIdx, xMinIdx, xMaxIdx } = store.getters
  //   for(let y = yMinIdx; y <= yMaxIdx; y++) {
  //     for(let x = xMinIdx; x <= xMaxIdx; x++) {
  //       const cell = cellPool.get(x, y);
  //       if (!cell.isAttached) {
  //         cell.attach(x,y);
  //         cellContainer.appendChild(cell.element);
  //         // cell.element.innerHTML = `<span style="padding: 3px;">x: ${x},y: ${y}</span>`
  //       }
  //       // const input = document.createElement('input');
  //       // input.style = `
  //       //   position: absolute;
  //       //   width: ${store.getters.widths[x]}px;
  //       //   height: ${store.getters.heights[y]}px;
  //       //   left: ${store.getters.hOffsets[x]}px;
  //       //   top: ${store.getters.vOffsets[y]}px;
  //       // `;
  //       // backDrop.appendChild(input);
  //     }
  //   }
  //   cellPool.releaseRange(xMinIdx, xMaxIdx, yMinIdx, yMaxIdx);
  // })

  return { update }
}
