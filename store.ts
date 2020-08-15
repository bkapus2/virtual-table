const targets = [];
let nextFlush = new Set<() => void>();
function flush() {
  nextFlush.forEach(action => {
    action();
    nextFlush.delete(action);
  });
}

class Dep {
  isDirty: boolean;
  providers: Dep[];
  subscribers: Dep[];
  dirtyHandlers: (() => void)[]

  constructor () {
    this.isDirty = false;
    this.providers = [];
    this.subscribers = [];
    this.dirtyHandlers = [];
  }

  depend() {
    const target = targets[0];
    if (target && !this.subscribers.includes(target)) {
      this.subscribers.push(target);
      target.providers.push(this);
    }
  }

  notify() {
    this.subscribers.forEach(sub => sub.triggerUpdate());
  }

  triggerUpdate() {
    this.isDirty = true;
    this.dirtyHandlers.forEach(handler => nextFlush.add(handler));
    this.notify();
  }

  onDirty(fn) {
    this.dirtyHandlers.push(fn);
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
  const proxiedGetters = { deps: {} };
  Object.keys(getters).forEach((key) => {
    let initialized = false;
    let value;
    const dep = new Dep();
    
    Object.defineProperty(proxiedGetters, key, {
      enumerable: true,
      get() {
        dep.depend();
        if (!initialized) {
          targets.unshift(dep);
          value = getters[key](state, proxiedGetters);
          initialized = true;
          targets.shift();
        }
        if (dep.isDirty) {
          value = getters[key](state, proxiedGetters);
          dep.isDirty = false;
        }
        return value;
      }
    })
    
    Object.defineProperty(proxiedGetters.deps, key, {
      enumerable: true,
      value: dep,
    });
  });
  return proxiedGetters;
}

export function watch(func) {
  const dep = new Dep();
  const updateValue = () => {
    targets.unshift(dep)
    func();
    dep.isDirty = false;
    targets.shift();
  }
  dep.onDirty(updateValue);
  updateValue();
}

export function Store<S extends {}, G extends { [key: string]: (S,G) => any }>({
  state: initialState,
  getters: getterDefs,
}: {
  state: S,
  getters: G
}): {
  state: S,
  getters: any,
  flush: () => void,
} {
  const state = createState(initialState);
  const getters = createGetters(state, getterDefs);
  return { state, getters, flush };
}
