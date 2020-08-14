const targets = [];
const nextFlush = new Set<() => void>();
function flush() {
  nextFlush.forEach(action => action());
}

class Dep {
  subscribers: (() => void)[];
  constructor () {
    this.subscribers = []; 
  }
  depend() {
    targets.forEach(target => {
      if (target && !this.subscribers.includes(target)) {
        this.subscribers.push(target);
      } 
    })
  }
  notify() {
    this.subscribers.forEach(sub => nextFlush.add(sub));
  }
}

function createState(state) {
  Object.keys(state).forEach(key => {
    let internalValue = state[key];
    const dep = new Dep();
    
    Object.defineProperty(state, key, {
      get() {
        dep.depend();
        return internalValue;
      },
      set(newVal) {
        if (newVal !== internalValue) {
          internalValue = newVal;
          dep.notify();
        }
      },
    });
  });
  return state;
}

function createGetters(state, getters) {
  const properties = Object.entries(getters).reduce((acc, [key, getter]) => {
    let initialized = false;
    let dirty = false;
    let value;
    acc[key] = {
      get() {
        if (!initialized) {
          watch(() => {
            if (initialized) {
              dirty = true;
            } else {
              value = getters[key](state, proxiedGetters);
              initialized = true;
            }
          })
        }
        if (dirty) {
          value = getters[key](state, proxiedGetters);
          dirty = false;
        }
        return value;
      }
    }
    return acc;
  }, {})
  const proxiedGetters = Object.defineProperties({}, properties);
  return proxiedGetters;
}

export function watch(myFunc) {
  targets.unshift(myFunc);
  const value = myFunc();
  targets.shift();
  return value;
}

export function Store({
  state: initialState,
  getters: getterDefs,
}) {
  const state = createState(initialState);
  const getters = createGetters(state, getterDefs);
  return { state, getters, flush };
}


// const store = Store({
//   state: {
//     length: 1,
//     width: 2,
//     height: 3,
//   },
//   getters: {
//     baseArea: (state) => {
//       return state.length * state.width;
//     },
//     volume: (state, getters) => {
//       return state.height * getters.baseArea;
//     },
//   },
// });
// store.getters.volume