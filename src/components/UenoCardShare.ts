/*
 * The card front as a 1080x1920 story image for Instagram and WhatsApp.
 *
 * The card on the page is built from CSS blend modes and masks, which page
 * screenshot libraries reproduce unreliably (worst on iPhone), so the story is
 * redrawn on a canvas from the same values: the card at rest, without tilt.
 * The logo and marks are the page's own SVGs, serialized and drawn as images.
 */

const STORY = { width: 1080, height: 1920 };
// The page's typeface. A canvas only draws a web font once it has loaded.
const FONT = "'Inter Variable', 'Helvetica Neue', Helvetica, Arial, sans-serif";
const CARD = { width: 340, height: 540 };
// Card px to story px, and the card's top edge: clear of the stories UI.
const SCALE = 2.2;
const CARD_TOP = 300;

export type StoryCard = {
  /** The front card's element, for its logo and marks. */
  element: HTMLElement;
  base: string;
  sheen: string;
  angle: number;
  position: number;
  softness: number;
  radius: number;
  ink: string;
  stripes?: string;
  grain: number;
  grainSize: number;
  /** Data URL of the grain tile, and its size in card px. */
  grainUrl: string;
  grainTile: number;
  /** The drawing's mask image and the color it prints in. */
  drawing?: { src: string; color: string };
  /** A line under the card. */
  caption?: string;
};

type Stop = [position: number, color: string];

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Could not load ${src}`));
    image.src = src;
  });
}

function rgb(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  return [n >> 16, (n >> 8) & 255, n & 255];
}

function mix(a: string, b: string, share: number) {
  const [x, y] = [rgb(a), rgb(b)];
  return `rgb(${x.map((v, i) => Math.round(v * share + y[i] * (1 - share))).join(" ")})`;
}

function alpha(hex: string, a: number) {
  return `rgb(${rgb(hex).join(" ")} / ${a})`;
}

/**
 * A CSS `linear-gradient(<angle>deg, ...)` over a box. Stops are shares of the
 * gradient line and may fall outside 0..1, which canvas stops cannot.
 */
function cssGradient(
  ctx: CanvasRenderingContext2D,
  box: { x: number; y: number; w: number; h: number },
  angle: number,
  stops: Stop[],
) {
  const rad = (angle * Math.PI) / 180;
  const [dx, dy] = [Math.sin(rad), -Math.cos(rad)];
  const half = (Math.abs(box.w * dx) + Math.abs(box.h * dy)) / 2;
  const [cx, cy] = [box.x + box.w / 2, box.y + box.h / 2];
  const lo = Math.min(0, ...stops.map(([p]) => p));
  const hi = Math.max(1, ...stops.map(([p]) => p));
  const at = (p: number) => (p * 2 - 1) * half;
  const gradient = ctx.createLinearGradient(
    cx + dx * at(lo),
    cy + dy * at(lo),
    cx + dx * at(hi),
    cy + dy * at(hi),
  );
  for (const [p, color] of stops)
    gradient.addColorStop((p - lo) / (hi - lo), color);
  return gradient;
}

function layer(width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return { canvas, ctx: canvas.getContext("2d")! };
}

/** One of the card's own SVGs as an image, with where it sits on the card. */
async function mark(svg: SVGSVGElement, ink: string) {
  const box = svg.viewBox.baseVal;
  const px = (v: string) => (v ? parseFloat(v) : undefined);
  const s = svg.style;
  const w = px(s.width)!;
  const h = px(s.height) ?? (w * box.height) / box.width;
  const x = px(s.left) ?? CARD.width - px(s.right)! - w;
  const y = px(s.top) ?? CARD.height - px(s.bottom)! - h;
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.removeAttribute("class");
  clone.removeAttribute("style");
  clone.setAttribute("width", String(w * SCALE));
  clone.setAttribute("height", String(h * SCALE));
  clone.style.color = ink;
  // A data URL, not a blob URL: Safari treats an SVG loaded from a blob as
  // foreign, and then refuses to export the canvas it was drawn on.
  const url = `data:image/svg+xml,${encodeURIComponent(new XMLSerializer().serializeToString(clone))}`;
  const opacity = s.opacity ? parseFloat(s.opacity) : 1;
  return { image: await loadImage(url), x, y, w, h, opacity };
}

function chip(ctx: CanvasRenderingContext2D) {
  const box = { x: 158, y: 56, w: 62, h: 72 };
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(box.x, box.y, box.w, box.h, 10);
  ctx.clip();
  ctx.fillStyle = cssGradient(ctx, box, 140, [
    [0, "#f6f6f3"],
    [0.38, "#cfd1cd"],
    [0.58, "#ecece8"],
    [1, "#b4b7b3"],
  ]);
  ctx.fillRect(box.x, box.y, box.w, box.h);
  ctx.fillStyle = cssGradient(ctx, box, 112, [
    [-0.1, "rgb(255 255 255 / 0)"],
    [0.5, "rgb(255 255 255 / 0.95)"],
    [1.1, "rgb(255 255 255 / 0)"],
  ]);
  ctx.fillRect(box.x, box.y, box.w, box.h);
  // Contact pads: a lit lower lip under a dark cut.
  ctx.translate(box.x, box.y);
  ctx.scale(box.w / 60, box.h / 70);
  ctx.lineWidth = 1;
  ctx.lineCap = "round";
  const pads = new Path2D(
    "M20 0v18q0 5 5 5h10q5 0 5-5V0M20 70V52q0-5 5-5h10q5 0 5 5v18M0 35h20M40 35h20",
  );
  pads.roundRect(20, 23, 20, 24, 5);
  for (const [stroke, dy] of [
    ["rgb(255 255 255 / 0.75)", 0.7],
    ["rgb(60 64 60 / 0.55)", 0],
  ] as const) {
    ctx.save();
    ctx.translate(0, dy);
    ctx.strokeStyle = stroke;
    ctx.stroke(pads);
    ctx.restore();
  }
  ctx.restore();
  ctx.strokeStyle = "rgb(0 0 0 / 0.3)";
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.roundRect(box.x, box.y, box.w, box.h, 10);
  ctx.stroke();
}

export async function renderStory(card: StoryCard) {
  const { canvas, ctx } = layer(STORY.width, STORY.height);
  const cardX = (STORY.width - CARD.width * SCALE) / 2;
  const full = { x: 0, y: 0, w: CARD.width, h: CARD.height };

  // Backdrop: near black, with the card's color glowing behind it.
  ctx.fillStyle = "#0e0e10";
  ctx.fillRect(0, 0, STORY.width, STORY.height);
  const cy = CARD_TOP + (CARD.height * SCALE) / 2;
  const glow = ctx.createRadialGradient(540, cy, 0, 540, cy, 1000);
  glow.addColorStop(0, alpha(card.stripes ?? card.sheen, 0.34));
  glow.addColorStop(1, alpha(card.stripes ?? card.sheen, 0));
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, STORY.width, STORY.height);

  await Promise.all(
    ["500 7.5px", "700 84px"].map((f) => document.fonts.load(`${f} ${FONT}`)),
  );
  const [marks, grain, drawing] = await Promise.all([
    Promise.all(
      Array.from(
        card.element.querySelectorAll<SVGSVGElement>(":scope > svg"),
      ).map((svg) => mark(svg, card.ink)),
    ),
    loadImage(card.grainUrl),
    card.drawing ? loadImage(card.drawing.src) : undefined,
  ]);

  ctx.save();
  ctx.translate(cardX, CARD_TOP);
  ctx.scale(SCALE, SCALE);
  const outline = () => {
    ctx.beginPath();
    ctx.roundRect(0, 0, CARD.width, CARD.height, card.radius);
  };

  // The card's shadow, then everything else clipped to its outline.
  ctx.save();
  ctx.shadowColor = "rgb(0 0 0 / 0.45)";
  ctx.shadowBlur = 60 * SCALE;
  ctx.shadowOffsetY = 28 * SCALE;
  outline();
  ctx.fillStyle = card.base;
  ctx.fill();
  ctx.restore();
  ctx.save();
  outline();
  ctx.clip();

  ctx.fillStyle = cssGradient(ctx, full, card.angle, [
    [(card.position - card.softness) / 100, card.base],
    [(card.position + card.softness) / 100, card.sheen],
    [1, mix(card.sheen, card.base, 0.62)],
  ]);
  ctx.fillRect(0, 0, CARD.width, CARD.height);

  if (card.stripes) {
    // Three bands down the long edge, fading out before the logo.
    const bands = layer(CARD.width * SCALE, CARD.height * SCALE);
    bands.ctx.scale(SCALE, SCALE);
    bands.ctx.fillStyle = card.stripes;
    for (const from of [0.05, 0.41, 0.77])
      bands.ctx.fillRect(from * CARD.width, 0, 0.18 * CARD.width, CARD.height);
    bands.ctx.globalCompositeOperation = "destination-in";
    bands.ctx.fillStyle = cssGradient(bands.ctx, full, 0, [
      [0.24, "rgb(0 0 0 / 0)"],
      [0.66, "#000"],
    ]);
    bands.ctx.fillRect(0, 0, CARD.width, CARD.height);
    ctx.drawImage(bands.canvas, 0, 0, CARD.width, CARD.height);
  }

  if (drawing && card.drawing) {
    // The PNG is a mask: fit it in its window, then flood it with the color.
    const box = { x: 56, y: 158, w: 228, h: 290 };
    const fit = Math.min(box.w / drawing.width, box.h / drawing.height);
    const [w, h] = [drawing.width * fit, drawing.height * fit];
    const print = layer(box.w * SCALE, box.h * SCALE);
    print.ctx.scale(SCALE, SCALE);
    print.ctx.drawImage(drawing, (box.w - w) / 2, (box.h - h) / 2, w, h);
    print.ctx.globalCompositeOperation = "source-in";
    print.ctx.fillStyle = card.drawing.color;
    print.ctx.fillRect(0, 0, box.w, box.h);
    ctx.drawImage(print.canvas, box.x, box.y, box.w, box.h);
  }

  for (const m of marks) {
    ctx.globalAlpha = m.opacity;
    ctx.drawImage(m.image, m.x, m.y, m.w, m.h);
  }
  ctx.globalAlpha = 0.8;
  ctx.fillStyle = card.ink;
  ctx.font = `500 7.5px ${FONT}`;
  ctx.letterSpacing = "0.3px";
  ctx.textAlign = "right";
  ctx.textBaseline = "alphabetic";
  ctx.fillText("débito", CARD.width - 28, CARD.height - 84);
  ctx.letterSpacing = "0px";
  ctx.globalAlpha = 1;

  // The laminate's relief, over the print but under the bare metal chip.
  const tile = card.grainTile * card.grainSize;
  // Rasterized first: Safari will not export a canvas that was filled with a
  // pattern made straight from an SVG image.
  const raster = layer(grain.width, grain.height);
  raster.ctx.drawImage(grain, 0, 0);
  const relief = ctx.createPattern(raster.canvas, "repeat")!;
  relief.setTransform(new DOMMatrix().scale(tile / grain.width));
  ctx.globalCompositeOperation = "soft-light";
  ctx.globalAlpha = card.grain;
  ctx.fillStyle = relief;
  ctx.fillRect(0, 0, CARD.width, CARD.height);
  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = 1;

  chip(ctx);
  ctx.restore();

  // The lit rim of the plastic.
  ctx.strokeStyle = "rgb(255 255 255 / 0.2)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(0.5, 0.5, CARD.width - 1, CARD.height - 1, card.radius);
  ctx.stroke();
  ctx.restore();

  if (card.caption) {
    // The headline: big enough to read at a glance in a story.
    ctx.fillStyle = "rgb(255 255 255 / 0.94)";
    ctx.font = `700 84px ${FONT}`;
    ctx.letterSpacing = "-1.5px";
    ctx.textAlign = "center";
    ctx.fillText(
      card.caption,
      STORY.width / 2,
      CARD_TOP + CARD.height * SCALE + 150,
    );
  }

  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error("Could not encode image")),
      "image/png",
    ),
  );
}

/**
 * On a phone, hand the story to the system share sheet, where Instagram and
 * WhatsApp stories are picked; anywhere else, save it as a file.
 */
export async function shareStory(blob: Blob, filename: string) {
  const file = new File([blob], filename, { type: "image/png" });
  // Only on phones and tablets: a desktop share sheet has neither app.
  const touch = window.matchMedia("(pointer: coarse)").matches;
  if (touch && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] });
      return "shared" as const;
    } catch (error) {
      // Closing the sheet is not a failure.
      if (error instanceof DOMException && error.name === "AbortError")
        return "cancelled" as const;
      // The browser no longer counts this as a tap: the next one will work.
      if (error instanceof DOMException && error.name === "NotAllowedError")
        return "blocked" as const;
      throw error;
    }
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return "saved" as const;
}
