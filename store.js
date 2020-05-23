let target;
class Dep {
  constructor () {
    this.subscribers = [] 
  }
  depend() {  
    if (target && !this.subscribers.includes(target)) {
      this.subscribers.push(target)
    } 
  }
  notify() {
    this.subscribers.forEach(sub => sub())
  }
}

function createState(state) {
  Object.keys(state).forEach(key => {
    let internalValue = state[key]
    const dep = new Dep()
    
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
      }
    });
  });
  return state;
}

function createGetters(state, getters) {
  const keys = Object.keys(getters);
  const proxiedGetters = createState(keys.reduce((acc, key) => {
    acc[key] = null;
    return acc;
  }, {}))
  keys.forEach(key => {
    watch(() => {
      proxiedGetters[key] = getters[key](state, proxiedGetters)
    });
  })
  return proxiedGetters;
}

function watch(myFunc) {
  target = myFunc;
  const value = target();
  target = null;
  return value;
}

function Store({
  state: initialState,
  getters: getterDefs
}) {
  const state = createState(initialState);
  const getters = createGetters(state, getterDefs)
  return { state, getters }
}

const store = Store({
  state: {
    length: 1,
    width: 2,
    height: 3,
  },
  getters: {
    baseArea: (state) => {
      return state.length * state.width
    },
    volume: (state, getters) => {
      return state.height * getters.baseArea;
    }
  }
})

console.log(store);