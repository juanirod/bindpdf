import {
  createPrompt,
  isDownKey,
  isEnterKey,
  isSpaceKey,
  isUpKey,
  useKeypress,
  usePagination,
  usePrefix,
  useState,
} from "@inquirer/core";
import { styleText } from "node:util";
import { moveImage, pageCount, removeImage, sortByDate, type BatchImage } from "../domain/batch";

export interface ReorderState {
  readonly pages: readonly BatchImage[];
  readonly cursor: number;
  /** When grabbed, the page under the cursor moves with it. */
  readonly grabbed: boolean;
}

export type ReorderAction = "up" | "down" | "grab" | "remove" | "sort";

export const reorder = (state: ReorderState, action: ReorderAction): ReorderState => {
  const { pages, cursor, grabbed } = state;
  const current = pages[cursor];

  if (action === "grab") return { ...state, grabbed: !grabbed };
  if (action === "remove") {
    if (pages.length === 1) return state;
    const next = removeImage(pages, current.id);
    return { pages: next, cursor: Math.min(cursor, next.length - 1), grabbed: false };
  }
  if (action === "sort") {
    const next = sortByDate(pages);
    return { pages: next, cursor: next.indexOf(current), grabbed: false };
  }

  const step = action === "up" ? -1 : 1;
  if (grabbed) {
    const target = Math.min(Math.max(cursor + step, 0), pages.length - 1);
    return { ...state, pages: moveImage(pages, current.id, target), cursor: target };
  }
  return { ...state, cursor: (cursor + step + pages.length) % pages.length };
};

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });

const HELP = "↑↓ move · space grab/drop · s sort by date · d remove · enter done";

/** Lists the pages and lets the user reorder them with the keyboard. Resolves with the final order. */
export const reorderPrompt = createPrompt<readonly BatchImage[], { message: string; pages: readonly BatchImage[] }>(
  (config, done) => {
    const [state, setState] = useState<ReorderState>({ pages: config.pages, cursor: 0, grabbed: false });
    const [finished, setFinished] = useState(false);
    const prefix = usePrefix({ status: finished ? "done" : "idle" });

    useKeypress((key) => {
      if (isEnterKey(key)) {
        setFinished(true);
        done(state.pages);
        return;
      }
      const action: ReorderAction | null = isUpKey(key)
        ? "up"
        : isDownKey(key)
          ? "down"
          : isSpaceKey(key)
            ? "grab"
            : key.name === "d" || key.name === "delete"
              ? "remove"
              : key.name === "s"
                ? "sort"
                : null;
      if (action) setState(reorder(state, action));
    });

    const pages = pageCount(state.pages);
    const count = `${pages} ${pages === 1 ? "page" : "pages"}`;
    if (finished) return `${prefix} ${styleText("bold", config.message)} ${styleText("cyan", count)}`;

    const numberWidth = String(state.pages.length).length;
    const list = usePagination({
      items: state.pages,
      active: state.cursor,
      pageSize: 12,
      loop: false,
      renderItem: ({ item, index, isActive }) => {
        const marker = isActive ? (state.grabbed ? "≡" : "❯") : " ";
        const pdf = item.format === "pdf" ? `PDF, ${item.pages} ${item.pages === 1 ? "page" : "pages"} · ` : "";
        const line = `${marker} ${String(index + 1).padStart(numberWidth)}. ${item.name}  ${styleText("dim", pdf + dateFormat.format(item.takenAt))}`;
        return isActive ? styleText(state.grabbed ? "yellow" : "cyan", line) : line;
      },
    });
    return `${prefix} ${styleText("bold", config.message)} ${styleText("dim", `(${count})`)}\n${list}\n${styleText("dim", HELP)}`;
  },
);
