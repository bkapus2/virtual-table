import { Store, watch } from "./store";

describe('store', () => {
  it('produces a state object without error', () => {
    const store = Store({
      state: {
        length: 1,
        width: 2,
        height: 3,
      },
      getters: {
        baseArea: (state) => {
          return state.length * state.width;
        },
        volume: (state, getters) => {
          return state.height * getters.baseArea;
        },
      },
    });
    expect(store).toBeTruthy();
    expect(store.state.length).toBe(1);
    expect(store.state.width).toBe(2);
    expect(store.state.height).toBe(3);
    expect(store.getters.baseArea).toBe(2);
    expect(store.getters.volume).toBe(6);
  });


  it('should handle cascading deps', () => {
    const baseArea = jest.fn().mockImplementation((state) => {
      return state.length * state.width;
    });
    const volume = jest.fn().mockImplementation((state, getters) => {
      return state.height * getters.baseArea;
    });
    const store = Store({ 
      state: {
        length: 1,
        width: 2,
        height: 3,
      },
      getters: {
        volume,
        baseArea,
      },
    });
    expect(baseArea).toHaveBeenCalledTimes(0);
    expect(volume).toHaveBeenCalledTimes(0);
    store.getters.volume;
    store.getters.volume;
    expect(baseArea).toHaveBeenCalledTimes(1);
    expect(volume).toHaveBeenCalledTimes(1);
    store.state.length = 2;
    store.flush();
    expect(store.getters.baseArea).toBe(4);
    expect(store.getters.volume).toBe(12);
    expect(baseArea).toHaveBeenCalledTimes(2);
    expect(volume).toHaveBeenCalledTimes(2);
  });

  it('should trigger a watch on getters', () => {
    const spy = jest.fn();
    const store = Store({
      state: {
        length: 1,
        width: 2,
        height: 3,
      },
      getters: {
        baseArea: (state) => {
          return state.length * state.width;
        },
        volume: (state, getters) => {
          return state.height * getters.baseArea;
        },
      },
    });
    watch(() => {
      spy(store.getters.volume)
    });
    store.state.length = 2;
    store.flush();
    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy).toHaveBeenCalledWith(6);
    expect(spy).toHaveBeenCalledWith(12);
  });
  
  it('multiple synchronous state updates should only trigger a watch once', () => {
    const spy = jest.fn();
    const store = Store({
      state: {
        length: 1,
        width: 2,
        height: 3,
      },
      getters: {
        baseArea: (state) => {
          return state.length * state.width;
        },
        volume: (state, getters) => {
          return state.height * getters.baseArea;
        },
      },
    });
    watch(() => {
      spy(store.getters.volume)
    });
    store.state.length = 2;
    store.state.height = 2;
    store.flush();
    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy).toHaveBeenCalledWith(6);
    expect(spy).toHaveBeenCalledWith(8);
  });
});