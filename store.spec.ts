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
});