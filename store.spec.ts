import { Store } from "./store";

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
  });

  it('should handle cascading deps', () => {
    const baseArea = jest.fn().mockImplementation((state) => {
      return state.length * state.width;
    });
    const volumn = jest.fn().mockImplementation((state, getters) => {
      return state.height * getters.baseArea;
    });
    const store = Store({
      state: {
        length: 1,
        width: 2,
        height: 3,
      },
      getters: {
        volumn,
        baseArea,
      },
    });
    expect(baseArea).toHaveBeenCalledTimes(1);
    expect(volumn).toHaveBeenCalledTimes(1);
    store.state.length = 2;
    expect(baseArea).toHaveBeenCalledTimes(2);
    expect(volumn).toHaveBeenCalledTimes(2);
  })
});