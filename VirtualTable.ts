import { Store, watch } from './store';

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
  viewPort.style.border = '1px solid black';
  viewPort.style.overflow = 'auto';
  viewPort.style.position = 'relative';

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
    // todo: add a commit step to any mutation to reduce churn in getters if ever these both update at the same time
    if (store.state.scrollLeft !== viewPort.scrollLeft) {
      store.state.scrollLeft = viewPort.scrollLeft;
    }
    console.log('scrolltop', viewPort.scrollTop);
    if (store.state.scrollTop !== viewPort.scrollTop) {
      store.state.scrollTop = viewPort.scrollTop;
    }
  });
  viewPort.addEventListener('scroll', dispatchScoll);

  return viewPort;
};

function Cell(store) {
  const cell = {
    x: null,
    y: null,
    el: document.createElement('div'),
    update:function update({ x, y }) {
      cell.el.style.position = 'absolute';
      cell.el.style.border = '1px solid #ccc';
      cell.el.style.boxSizing = ': border-box';
      cell.el.style.width = `${store.getters.widths[x]}px`;
      cell.el.style.height = `${store.getters.heights[y]}px`;
      cell.el.style.left = `${store.getters.hOffsets[x]}px`;
      cell.el.style.top = `${store.getters.vOffsets[y]}px`;
      cell.el.textContent = `${y}, ${x}`;
      cell.y = y;
      cell.x = x;
    }
  };
  return cell;
}

function BackDrop(store) {
  const backDrop = document.createElement('div');
  backDrop.style.position = 'relative';

  const queueSizeUpdate = queueRaf((width, height) => {
    backDrop.style.width = `${width}px`;
    backDrop.style.height = `${height}px`;
  })

  watch(() => {
    queueSizeUpdate(store.getters.totalWidth, store.getters.totalHeight);
  })

  return backDrop;
}

class Pool {
  private available: Set<any>;
  private taken: Set<any>;
  private makeResource: () => any;

  constructor(makeResource) {
    this.available = new Set();
    this.taken = new Set();
    this.makeResource = makeResource;
  }

  release(resource) {
    this.available.add(resource);
    this.taken.delete(resource);
  }

  reserve() {
    if (this.available.size) {
      const { value: resource } = this.available.values().next();
      this.available.delete(resource);
      this.taken.add(resource);
      return resource;
    }
    const resource = this.makeResource();
    this.taken.add(resource);
    return resource;
  }

  forEach(fn) {
    let i = 0;
    for (let resource of this.taken.values()) {
      fn(resource, i++);
    }
  }
}

export function VirtualTable({ width, height, el, cols, rows }) {
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
        return getters.vOffsets.length - 1 - getters.vOffsets.slice().reverse().findIndex(offset => offset <= maxPx)
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
        return getters.hOffsets.length - 1 - getters.hOffsets.slice().reverse().findIndex(offset => offset <= maxPx)
      },
    }
  });

  function update({ width, height, el, cols, rows }: { width?: number, height?: number, el?: any, cols?: any[], rows?: any[] }) {
    Array.isArray(rows) && (store.state.rows = rows);
    Array.isArray(cols) && (store.state.cols = cols);
    width !== undefined && (store.state.width = width);
    height !== undefined && (store.state.height = height);
    el !== undefined && (store.state.el = el);
  }

  update({ width, height, el, cols, rows });
  
  const viewPort = ViewPort(store);
  const backDrop = BackDrop(store);
  viewPort.appendChild(backDrop);

  const cellMap = new Map();
  const cellPool = new Pool(() => {
    const cell = Cell(store);
    viewPort.appendChild(cell.el);
    return cell;
  });

  watch(() => {
    const { yMinIdx, xMinIdx, yMaxIdx, xMaxIdx } = store.getters;
    // need to figure out how to properly map dependency updates
    const yDiff = yMaxIdx - yMinIdx;
    if (yDiff < 0 || yDiff > 10) {
      return;
    }
    cellPool.forEach(cell => {
      if (cell.x < xMinIdx || cell.x > xMaxIdx || cell.y < yMinIdx || cell.y > yMaxIdx) {
        cellPool.release(cell);
        cellMap.delete(`${cell.x},${cell.y}`);
      }
    })
    for (let y = yMinIdx; y <= yMaxIdx; y++) {
      for (let x = xMinIdx; x <= xMaxIdx; x++) {
        const key = `${x},${y}`
        if (!cellMap.has(key)) {
          const cell = cellPool.reserve();
          cell.update({ x, y });
          cellMap.set(key, cell);
        }
      }
    }
    // console.log(cellMap.size);
    // queue some sort of job to go back and remove unused cells from the table eventually...
    // will have to do bean counting of if a cell is in or out of the dom then though
  })

  return { update }
}
