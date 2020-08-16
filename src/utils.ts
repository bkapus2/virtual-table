export function queueRaf<A extends unknown[]>(cb: (...args: A) => any) {
  let isQueued = false;
  let finalArgs = null;
  return function(...args: A) {
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

export function throttle<A extends unknown[]>(cb: (...args: A) => any, ms=5) {
  let timeout;
  return function(...args: A) {
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => {
      cb(...args);
      timeout = null;
    }, ms);
  }
}