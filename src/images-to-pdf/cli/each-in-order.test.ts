import { describe, expect, it } from "vitest";
import { eachInOrder } from "./each-in-order";

const later = <T>(value: T, ms: number) => new Promise<T>((resolve) => setTimeout(() => resolve(value), ms));

describe("eachInOrder", () => {
  it("hands results over in input order even when later items finish first", async () => {
    const consumed: string[] = [];
    await eachInOrder(
      [30, 5, 15, 1],
      2,
      (ms) => later(`done ${ms}`, ms),
      (result, index) => {
        consumed.push(`${index}:${result}`);
      },
    );
    expect(consumed).toEqual(["0:done 30", "1:done 5", "2:done 15", "3:done 1"]);
  });

  it("never runs more than the limit at once", async () => {
    let running = 0;
    let peak = 0;
    await eachInOrder(
      Array.from({ length: 10 }, (_, i) => i),
      3,
      async (i) => {
        running++;
        peak = Math.max(peak, running);
        await later(null, (i % 3) + 1);
        running--;
      },
      () => {},
    );
    expect(peak).toBe(3);
  });

  it("waits for each result to be consumed before handing over the next", async () => {
    const events: string[] = [];
    await eachInOrder(
      ["a", "b"],
      2,
      async (item) => item,
      async (item) => {
        events.push(`start ${item}`);
        await later(null, 5);
        events.push(`end ${item}`);
      },
    );
    expect(events).toEqual(["start a", "end a", "start b", "end b"]);
  });

  it("rejects with the first failure and starts no more work", async () => {
    const started: number[] = [];
    const run = eachInOrder(
      [1, 2, 3, 4, 5],
      2,
      async (item) => {
        started.push(item);
        if (item === 2) throw new Error("boom");
        return later(item, 5);
      },
      () => {},
    );
    await expect(run).rejects.toThrow("boom");
    expect(started).toEqual([1, 2, 3]);
  });
});
