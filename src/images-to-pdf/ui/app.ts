import { adjustImage } from "../application/adjust-image";
import { buildPdf, type PageSize } from "../application/build-pdf";
import { loadImage, UnsupportedImageError } from "../application/load-image";
import { NEUTRAL, toCssFilter, type Adjustments } from "../domain/adjustments";
import { addImages, moveImage, removeImage, sortByDate, type BatchImage } from "../domain/batch";
import { canvasCodec } from "../infrastructure/browser/canvas-codec";
import { mountAdjustmentsPanel } from "./adjustments-panel";

const MIME = { png: "image/png", jpg: "image/jpeg" } as const;
const readImage = async (file: File) =>
  loadImage(
    {
      name: file.name,
      bytes: new Uint8Array(await file.arrayBuffer()),
      lastModified: file.lastModified,
      type: file.type,
    },
    canvasCodec,
  );

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });

export const mountApp = (doc: Document) => {
  const $ = <T extends HTMLElement>(id: string) => doc.getElementById(id) as T;
  const dropzone = $<HTMLLabelElement>("dropzone");
  const fileInput = $<HTMLInputElement>("file-input");
  const pages = $<HTMLOListElement>("pages");
  const notice = $<HTMLParagraphElement>("notice");
  const actions = $<HTMLElement>("actions");
  const count = $<HTMLSpanElement>("count");
  const filename = $<HTMLInputElement>("filename");
  const download = $<HTMLButtonElement>("download");
  const clear = $<HTMLButtonElement>("clear");
  const sortDate = $<HTMLButtonElement>("sort-by-date");
  const pageSize = $<HTMLSelectElement>("page-size");
  const adjustPanel = $<HTMLElement>("adjust");

  let batch: BatchImage[] = [];
  const previews = new Map<string, string>();
  let draggedId: string | null = null;
  let adjustments: Adjustments = NEUTRAL;

  mountAdjustmentsPanel(doc, (next) => {
    adjustments = next;
    pages.style.setProperty("--adjust", toCssFilter(adjustments));
  });

  const previewFor = (image: BatchImage) => {
    let url = previews.get(image.id);
    if (!url) {
      url = URL.createObjectURL(new Blob([image.bytes], { type: MIME[image.format] }));
      previews.set(image.id, url);
    }
    return url;
  };

  const showNotice = (message: string | null) => {
    notice.hidden = !message;
    notice.textContent = message ?? "";
  };

  const setBatch = (next: BatchImage[]) => {
    const kept = new Set(next.map((image) => image.id));
    for (const [id, url] of previews) {
      if (!kept.has(id)) {
        URL.revokeObjectURL(url);
        previews.delete(id);
      }
    }
    batch = next;
    render();
  };

  const pageButton = (label: string, action: string, disabled = false) => {
    const button = doc.createElement("button");
    button.type = "button";
    button.dataset.action = action;
    button.setAttribute("aria-label", label);
    button.title = label;
    button.disabled = disabled;
    return button;
  };

  const render = () => {
    pages.replaceChildren(
      ...batch.map((image, index) => {
        const item = doc.createElement("li");
        item.className = "page";
        item.draggable = true;
        item.dataset.id = image.id;

        const sheet = doc.createElement("div");
        sheet.className = "sheet";
        const img = doc.createElement("img");
        img.src = previewFor(image);
        img.alt = image.name;
        sheet.append(img);

        const meta = doc.createElement("div");
        meta.className = "meta";
        const number = doc.createElement("span");
        number.className = "number";
        number.textContent = String(index + 1);
        const name = doc.createElement("span");
        name.className = "name";
        name.textContent = image.name;
        name.title = `${image.name}\n${dateFormat.format(image.takenAt)}`;

        const tools = doc.createElement("div");
        tools.className = "tools";
        const earlier = pageButton(`Move ${image.name} earlier`, "earlier", index === 0);
        earlier.textContent = "‹";
        const later = pageButton(`Move ${image.name} later`, "later", index === batch.length - 1);
        later.textContent = "›";
        const remove = pageButton(`Remove ${image.name}`, "remove");
        remove.textContent = "×";
        remove.classList.add("remove");
        tools.append(earlier, later, remove);

        meta.append(number, name, tools);
        item.append(sheet, meta);
        return item;
      }),
    );

    const empty = batch.length === 0;
    actions.hidden = empty;
    adjustPanel.hidden = empty;
    dropzone.classList.toggle("compact", !empty);
    count.textContent = `${batch.length} ${batch.length === 1 ? "page" : "pages"}`;
  };

  const addFiles = async (files: Iterable<File>) => {
    const images: BatchImage[] = [];
    const skipped: string[] = [];
    for (const file of files) {
      try {
        images.push(await readImage(file));
      } catch (error) {
        if (!(error instanceof UnsupportedImageError)) throw error;
        skipped.push(error.fileName);
      }
    }
    showNotice(
      skipped.length
        ? `Skipped ${skipped.join(", ")}: this browser can't open that format. Convert it to JPG or PNG and add it again.`
        : null,
    );
    setBatch(addImages(batch, images));
  };

  // File input + drag and drop of new files.
  fileInput.addEventListener("change", () => {
    if (fileInput.files) void addFiles(fileInput.files);
    fileInput.value = "";
  });
  for (const target of [dropzone, pages] as HTMLElement[]) {
    target.addEventListener("dragover", (event) => {
      if (event.dataTransfer?.types.includes("Files")) {
        event.preventDefault();
        dropzone.classList.add("over");
      }
    });
  }
  dropzone.addEventListener("dragleave", () => dropzone.classList.remove("over"));
  doc.addEventListener("drop", (event) => {
    dropzone.classList.remove("over");
    if (!event.dataTransfer?.files.length) return;
    event.preventDefault();
    void addFiles(event.dataTransfer.files);
  });

  // Reordering pages by dragging them.
  pages.addEventListener("dragstart", (event) => {
    const item = (event.target as HTMLElement).closest<HTMLLIElement>(".page");
    if (!item) return;
    draggedId = item.dataset.id ?? null;
    item.classList.add("dragging");
    event.dataTransfer?.setData("text/plain", draggedId ?? "");
  });
  pages.addEventListener("dragover", (event) => {
    if (!draggedId) return;
    event.preventDefault();
    const over = (event.target as HTMLElement).closest<HTMLLIElement>(".page");
    if (!over || over.dataset.id === draggedId) return;
    setBatch(moveImage(batch, draggedId, [...pages.children].indexOf(over)));
    pages.querySelector(`[data-id="${draggedId}"]`)?.classList.add("dragging");
  });
  pages.addEventListener("dragend", () => {
    draggedId = null;
    pages.querySelector(".dragging")?.classList.remove("dragging");
  });

  // Keyboard-friendly page tools.
  pages.addEventListener("click", (event) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>("button[data-action]");
    const id = button?.closest<HTMLLIElement>(".page")?.dataset.id;
    if (!button || !id) return;
    const index = batch.findIndex((image) => image.id === id);
    const action = button.dataset.action;
    if (action === "remove") setBatch(removeImage(batch, id));
    if (action === "earlier") setBatch(moveImage(batch, id, index - 1));
    if (action === "later") setBatch(moveImage(batch, id, index + 1));
    if (action !== "remove") {
      pages.querySelector<HTMLButtonElement>(`[data-id="${id}"] [data-action="${action}"]:not(:disabled)`)?.focus();
    }
  });

  sortDate.addEventListener("click", () => setBatch(sortByDate(batch)));

  clear.addEventListener("click", () => {
    showNotice(null);
    setBatch([]);
  });

  download.addEventListener("click", async () => {
    download.disabled = true;
    download.textContent = "Building PDF…";
    try {
      const adjusted = await Promise.all(batch.map((image) => adjustImage(image, adjustments, canvasCodec)));
      const bytes = await buildPdf(adjusted, { pageSize: pageSize.value as PageSize });
      const url = URL.createObjectURL(
        new Blob([bytes as Uint8Array<ArrayBuffer>], { type: "application/pdf" }),
      );
      const link = doc.createElement("a");
      link.href = url;
      link.download = `${filename.value.trim().replace(/\.pdf$/i, "") || "images"}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
      showNotice(null);
    } catch (error) {
      showNotice(`The PDF couldn't be built: ${(error as Error).message}`);
    } finally {
      download.disabled = false;
      download.textContent = "Download PDF";
    }
  });

  render();
};
