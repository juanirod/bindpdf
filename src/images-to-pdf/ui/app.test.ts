// @vitest-environment happy-dom
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PDFDocument } from "pdf-lib";
import sharp from "sharp";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { makePdfFixture } from "../application/pdf-fixture";
import { mountApp } from "./app";

// The real page markup, without its module script: the test mounts the app itself.
const BODY = readFileSync(join(process.cwd(), "index.html"), "utf8")
  .split(/<body>|<\/body>/)[1]
  .replace(/<script[^>]*><\/script>/, "");

let wide: Uint8Array<ArrayBuffer>;
let tall: Uint8Array<ArrayBuffer>;
let contract: Uint8Array<ArrayBuffer>;
let secret: Uint8Array<ArrayBuffer>;

const png = async (width: number, height: number) =>
  new Uint8Array(await sharp({ create: { width, height, channels: 3, background: "#c84" } }).png().toBuffer());

beforeAll(async () => {
  wide = await png(40, 20);
  tall = await png(20, 40);
  contract = await makePdfFixture([[300, 400], [500, 200]]);
  secret = await makePdfFixture([[100, 100]], { encrypted: true });
});

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const cards = () => [...document.querySelectorAll<HTMLLIElement>("#pages .page")];
const names = () => cards().map((card) => card.querySelector(".name")!.textContent);
const button = (name: string, action: string) =>
  cards()
    .find((card) => card.querySelector(".name")!.textContent === name)!
    .querySelector<HTMLButtonElement>(`[data-action="${action}"]`)!;

/** Picks files through the file input, the way the file dialog does, and waits until `expectedCards` cards show. */
const pick = async (files: File[], expectedCards = files.length) => {
  const input = $<HTMLInputElement>("file-input");
  Object.defineProperty(input, "files", { value: files, configurable: true });
  input.dispatchEvent(new Event("change"));
  await vi.waitFor(() => expect(cards()).toHaveLength(expectedCards));
};

const file = (bytes: Uint8Array<ArrayBuffer>, name: string, type: string, lastModified = 0) =>
  new File([bytes], name, { type, lastModified });

/** Clicks Download and returns the PDF the page hands to the browser. */
const download = async () => {
  const blobs: Blob[] = [];
  const create = vi.spyOn(URL, "createObjectURL").mockImplementation((blob) => {
    blobs.push(blob as Blob);
    return "blob:test";
  });
  vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
  const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
  $<HTMLButtonElement>("download").click();
  await vi.waitFor(() => expect(click).toHaveBeenCalled());
  create.mockRestore();
  const pdf = blobs.find((blob) => blob.type === "application/pdf")!;
  return PDFDocument.load(new Uint8Array(await pdf.arrayBuffer()));
};

beforeEach(() => {
  document.body.innerHTML = BODY;
  mountApp(document);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("web app", () => {
  it("shows images and PDFs as cards, counting every page of each PDF", async () => {
    await pick([file(wide, "cover.png", "image/png"), file(contract, "contract.pdf", "application/pdf")]);

    expect(names()).toEqual(["cover.png", "contract.pdf"]);
    expect(cards()[0].querySelector("img")).not.toBeNull();
    expect(cards()[1].querySelector(".pdf-cover span")!.textContent).toBe("PDF · 2 pages");
    expect($("count").textContent).toBe("3 pages");
    expect($("actions").hidden).toBe(false);
  });

  it("skips protected PDFs and files it can't open, naming each one", async () => {
    await pick(
      [
        file(wide, "cover.png", "image/png"),
        file(secret, "secret.pdf", "application/pdf"),
        file(new Uint8Array([1, 2, 3]), "notes.txt", "text/plain"),
      ],
      1,
    );

    expect(names()).toEqual(["cover.png"]);
    expect($("notice").hidden).toBe(false);
    expect($("notice").textContent).toBe(
      "Skipped notes.txt: this browser can't open that format. Convert it to JPG or PNG and add it again. " +
        "Skipped secret.pdf: it is password-protected.",
    );
  });

  it("reorders, sorts by date and removes cards with their buttons", async () => {
    await pick([file(wide, "a.png", "image/png", 300), file(tall, "b.png", "image/png", 100)]);

    button("a.png", "later").click();
    expect(names()).toEqual(["b.png", "a.png"]);
    button("a.png", "earlier").click();
    expect(names()).toEqual(["a.png", "b.png"]);
    $<HTMLButtonElement>("sort-by-date").click();
    expect(names()).toEqual(["b.png", "a.png"]);
    button("b.png", "remove").click();
    expect(names()).toEqual(["a.png"]);
    expect($("count").textContent).toBe("1 page");
  });

  it("turns a card a quarter at a time and downloads the pages turned", async () => {
    await pick([file(wide, "cover.png", "image/png"), file(contract, "contract.pdf", "application/pdf")]);

    button("contract.pdf", "rotate").click();
    const sheet = cards()[1].querySelector<HTMLElement>(".sheet")!;
    expect(sheet.style.getPropertyValue("--rotation")).toBe("90deg");
    expect(sheet.classList.contains("quarter-turn")).toBe(true);
    button("contract.pdf", "rotate").click();
    expect(cards()[1].querySelector<HTMLElement>(".sheet")!.classList.contains("quarter-turn")).toBe(false);

    const pdf = await download();
    expect(pdf.getPages().map((page) => page.getRotation().angle)).toEqual([0, 180, 180]);
    expect(pdf.getPages().map((page) => page.getWidth())).toEqual([40, 300, 500]);
  });

  it("downloads the cards in their current order", async () => {
    await pick([file(wide, "a.png", "image/png"), file(tall, "b.png", "image/png")]);
    button("b.png", "earlier").click();

    const pdf = await download();
    expect(pdf.getPages().map((page) => page.getWidth())).toEqual([20, 40]);
  });
});
