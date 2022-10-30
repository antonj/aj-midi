import { describe, expect, test } from "@jest/globals";
import { AjScroller } from "./aj-scroller";

const sleep = (t: number) => new Promise((res) => setTimeout(res, t));
describe("aj-scroller", () => {
  test("adds 1 + 2 to equal 3", async () => {
    const flingY = 1.9272402106703728;
    const c = new AjScroller();
    c.fling(flingY);
    for (let i = 0; i < 100; i++) {
      console.log(c.computeOffset());
      await sleep(16);
    }
    expect(c.yFinal).toBe(607);
  });
});
