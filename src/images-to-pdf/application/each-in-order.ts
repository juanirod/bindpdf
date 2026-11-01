/**
 * Runs `work` on up to `limit` items at once and hands each result to `consume` in input order,
 * one at a time. A result is released once consumed, so at most `limit + 1` results are held at once
 * (the next item starts while the current result is consumed).
 * Rejects with the first failure, of either `work` or `consume`, without starting more work.
 */
export const eachInOrder = async <T, R>(
  items: readonly T[],
  limit: number,
  work: (item: T, index: number) => Promise<R>,
  consume: (result: R, index: number) => void | Promise<void>,
): Promise<void> => {
  const inFlight: Promise<R>[] = [];
  let next = 0;
  const start = () => {
    const index = next++;
    const task = (async () => work(items[index], index))();
    // Failures surface when this task's turn comes; until then, don't report them as unhandled.
    task.catch(() => {});
    inFlight.push(task);
  };

  while (next < items.length && inFlight.length < limit) start();
  for (let index = 0; index < items.length; index++) {
    const result = await inFlight.shift()!;
    if (next < items.length) start();
    await consume(result, index);
  }
};
