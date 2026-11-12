import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type PointerEvent,
  type ReactNode,
} from "react";
import { useDialKitController, type DialConfig } from "dialkit";
import {
  DEFAULT_HREF,
  PEOPLE,
  type Drawing,
  type Person,
} from "./UenoCardDrawings";
import { QR_MODULES, QR_SIZE } from "./UenoCardQr";
import { renderStory, shareStory } from "./UenoCardShare";
import { useStrings } from "../i18n";
import FlipCard from "./FlipCard";

/*
 * The ueno debit card, front and back, drawn in portrait the way the card is
 * printed (ISO ID-1, 54 x 85.6mm at 6.3px/mm). Everything is DOM + inline
 * SVG, so each part can be picked up and animated on its own. Surface, sheen
 * and pose sit on DialKit controls. Hovering a card tilts it toward the
 * pointer.
 */
const W = 340;
const H = 540;

// The six cards ueno issues, colors sampled from its own renders. `ink` is
// the logo and print color; `stripes` is the Albirroja's red bands.
type Variant = {
  id: string;
  base: string;
  sheen: string;
  ink: string;
  stripes?: string;
};

const VARIANTS: Variant[] = [
  {
    id: "green",
    base: "#00c194",
    sheen: "#89dcc3",
    ink: "#ffffff",
  },
  {
    id: "blue",
    base: "#1856d1",
    sheen: "#749be6",
    ink: "#ffffff",
  },
  {
    id: "orange",
    base: "#ea6356",
    sheen: "#f7a39c",
    ink: "#ffffff",
  },
  {
    id: "violet",
    base: "#432846",
    sheen: "#8d7a92",
    ink: "#ffffff",
  },
  {
    id: "black",
    base: "#404049",
    sheen: "#5c5c65",
    ink: "#e6e8ed",
  },
  {
    id: "albirroja",
    base: "#e3e5e9",
    sheen: "#f3f4f7",
    ink: "#17257e",
    stripes: "#e34e54",
  },
];

// The card the page opens on.
const DEFAULT_VARIANT = VARIANTS.find((v) => v.id === "albirroja")!;

const CONFIG = {
  surface: {
    base: { type: "color", default: DEFAULT_VARIANT.base },
    sheen: { type: "color", default: DEFAULT_VARIANT.sheen },
    // grain: relief of the laminate. grainSize: its scale. flecks: the pearl
    // specks that light up under the glare.
    grain: [0.12, 0, 1, 0.01],
    grainSize: [0.65, 0.3, 3, 0.05],
    flecks: [0, 0, 1, 0.01],
    radius: [20, 0, 40, 1],
  },
  sheen: {
    // angle: 0 runs bottom to top. position: where base turns into sheen.
    angle: [24, -180, 180, 1],
    position: [40, 0, 100, 1],
    softness: [17, 1, 50, 1],
    // How far the band slides as the card tilts; negative runs it the other way.
    travel: [36, -100, 100, 1],
    // The soft hot spot under the pointer.
    glare: [0.4, 0, 1, 0.01],
  },
  tilt: {
    // max: degrees at the card's edge. lift: scale while hovered.
    max: [9, 0, 30, 0.5],
    lift: [1.03, 1, 1.2, 0.005],
  },
  // The foil sticker on the back. It is silver until the light catches it.
  hologram: {
    // rainbow: strength of the spectral patches. spread: how far their hues
    // turn across a full tilt, in degrees.
    rainbow: [0.8, 0, 1, 0.01],
    spread: [555, 0, 720, 5],
    // rays: the sunburst fanning out of the upper circle.
    rays: [0.12, 0, 1, 0.01],
    // mark: contrast of the two circles, which trade places as the card tilts.
    mark: [0.3, 0, 1, 0.01],
    // flash: the mirror blow-out when the light passes over the foil.
    flash: [0.9, 0, 1, 0.01],
    // pattern: the fine line texture embossed in the foil.
    pattern: [0.15, 0, 1, 0.01],
  },
  pose: {
    rotateX: [0, -70, 70, 1],
    rotateY: [0, -70, 70, 1],
    rotateZ: [0, -180, 180, 1],
    perspective: [1400, 300, 3000, 10],
    gap: [56, 0, 240, 1],
  },
  // Turning the single card over on a narrow screen.
  flip: {
    // Which layout to show: by screen width, or forced either way.
    view: {
      type: "select",
      options: [
        { value: "auto", label: "Auto (by width)" },
        { value: "one", label: "One card, flipping" },
        { value: "two", label: "Two cards" },
      ],
      default: "auto",
    },
    // Degrees the card leans under a finger before it is let go.
    lean: [38, 0, 90, 1],
    // A swipe this long (px) or this fast (px/ms) turns it over.
    swipe: [36, 10, 200, 1],
    flick: [0.3, 0.05, 2, 0.05],
    // The spring that carries the turn, or settles the card back.
    stiffness: [245, 20, 600, 5],
    damping: [23, 1, 60, 1],
    mass: [2.3, 0.2, 5, 0.1],
  },
} satisfies DialConfig;

const svgUrl = (svg: string) =>
  `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;

// The laminate's orange-peel: noise read as a height map and lit from the top
// left, then centered on mid-grey so soft-light only adds relief, not tint.
// Tiled, so one small render covers the card.
const GRAIN_TILE = 200;
const GRAIN = svgUrl(
  `<svg xmlns='http://www.w3.org/2000/svg' width='${GRAIN_TILE}' height='${GRAIN_TILE}'><filter id='g' x='0' y='0' width='100%' height='100%' color-interpolation-filters='sRGB'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' seed='4' stitchTiles='stitch'/><feDiffuseLighting surfaceScale='2.2' diffuseConstant='1' lighting-color='#fff'><feDistantLight azimuth='225' elevation='50'/></feDiffuseLighting><feColorMatrix values='2.4 0 0 0 -1.34  2.4 0 0 0 -1.34  2.4 0 0 0 -1.34  0 0 0 0 1'/></filter><rect width='100%' height='100%' filter='url(#g)'/></svg>`,
);

// Pearl flecks: only the noise peaks survive, as white specks that catch the
// light where the glare lands.
const FLECKS = svgUrl(
  `<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='f' x='0' y='0' width='100%' height='100%' color-interpolation-filters='sRGB'><feTurbulence type='fractalNoise' baseFrequency='1.6' numOctaves='2' seed='11' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  7 0 0 0 -4.1'/></filter><rect width='100%' height='100%' filter='url(#f)'/></svg>`,
);
const POINTER_SPOT =
  "radial-gradient(circle at calc(50% + var(--px) * 100%) calc(50% + var(--py) * 100%), #000 0%, rgba(0, 0, 0, 0.45) 30%, transparent 68%)";

type Surface = {
  base: string;
  sheen: string;
  grain: number;
  grainSize: number;
  flecks: number;
  radius: number;
  angle: number;
  position: number;
  softness: number;
  ink: string;
  stripes?: string;
  travel: number;
  glare: number;
  perspective: number;
  tiltMax: number;
  lift: number;
};

// Registered as numbers so the pointer position itself can transition: the
// tilt, the sheen and the glare all read it, and so all ease together.
const POINTER_PROPS = ["--px", "--py"]
  .map(
    (name) =>
      `@property ${name} { syntax: "<number>"; inherits: true; initial-value: 0; }`,
  )
  .join("\n");

// Report the pointer as -0.5..0.5 across the card; CSS does the rest.
function track(e: PointerEvent<HTMLDivElement>) {
  const el = e.currentTarget;
  const box = el.getBoundingClientRect();
  el.style.setProperty(
    "--px",
    String((e.clientX - box.left) / box.width - 0.5),
  );
  el.style.setProperty(
    "--py",
    String((e.clientY - box.top) / box.height - 0.5),
  );
}

function release(e: PointerEvent<HTMLDivElement>) {
  e.currentTarget.style.setProperty("--px", "0");
  e.currentTarget.style.setProperty("--py", "0");
}

function Face({
  surface: s,
  transform,
  label,
  href,
  inlay,
  children,
}: {
  surface: Surface;
  transform: string;
  label: string;
  /** Where a click on the card goes, if anywhere. */
  href?: string;
  /** Parts set into the card rather than printed under its laminate. */
  inlay?: ReactNode;
  children: ReactNode;
}) {
  const t = useStrings();
  const from = s.position - s.softness;
  const to = s.position + s.softness;
  // Slide the band along its own axis by however far the pointer sits on it.
  const axis = (s.angle * Math.PI) / 180;
  const slide = `(var(--px) * ${s.travel * Math.sin(axis)} + var(--py) * ${-s.travel * Math.cos(axis)}) * 1%`;
  return (
    // The hit area stays flat so the card can't tilt out from under the pointer.
    <div
      className="group relative shrink-0 transition-[--px,--py] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:duration-150 hover:ease-out"
      style={
        {
          perspective: s.perspective,
          "--px": 0,
          "--py": 0,
          "--max": s.tiltMax,
          "--lift": s.lift,
          "--glare": s.glare,
          "--flecks": s.flecks,
          "--ink": s.ink,
        } as CSSProperties
      }
      onPointerMove={track}
      onPointerLeave={release}
    >
      <div
        role="img"
        aria-label={label}
        className="relative overflow-hidden font-sans antialiased transition-[scale] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] select-none group-hover:scale-(--lift)"
        style={{
          width: W,
          height: H,
          borderRadius: s.radius,
          transform: `${transform} rotateX(calc(var(--py) * var(--max) * -2deg)) rotateY(calc(var(--px) * var(--max) * 2deg))`,
          background: `linear-gradient(${s.angle}deg, ${s.base} calc(${from}% + ${slide}), ${s.sheen} calc(${to}% + ${slide}), color-mix(in oklab, ${s.sheen} 62%, ${s.base}) 100%)`,
          boxShadow:
            "0 1px 1px rgba(0, 0, 0, 0.18), 0 12px 24px -8px rgba(0, 0, 0, 0.26), 0 36px 64px -24px rgba(0, 0, 0, 0.3)",
        }}
      >
        {children}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-0 mix-blend-soft-light transition-opacity duration-500 group-hover:opacity-(--glare)"
          style={{
            background:
              "radial-gradient(circle at calc(50% + var(--px) * 100%) calc(50% + var(--py) * 100%), #fff 0%, rgba(255, 255, 255, 0.5) 22%, transparent 62%)",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 mix-blend-soft-light"
          style={{
            backgroundImage: GRAIN,
            backgroundSize: GRAIN_TILE * s.grainSize,
            opacity: s.grain,
          }}
        />
        {/* Flecks: a faint dusting everywhere, bright where the light lands. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 mix-blend-plus-lighter"
          style={{ backgroundImage: FLECKS, opacity: s.flecks * 0.18 }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-0 mix-blend-plus-lighter transition-opacity duration-500 group-hover:opacity-(--flecks)"
          style={{ backgroundImage: FLECKS, maskImage: POINTER_SPOT }}
        />
        {inlay}
        {/* The lit rim of the plastic. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            borderRadius: s.radius,
            boxShadow:
              "inset 0 0 0 1px rgba(255, 255, 255, 0.16), inset 0 1.5px 0 rgba(255, 255, 255, 0.32), inset 0 -1.5px 0 rgba(0, 0, 0, 0.12)",
          }}
        />
      </div>
      {href && (
        // Over the flat hit area, not inside the tilting card, so it is as easy
        // to hit as the card is to hover.
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          aria-label={`${label}: ${t.readStory}`}
          className="absolute inset-0 outline-offset-4 focus-visible:outline-2 focus-visible:outline-[#3b82f6]"
          style={{ borderRadius: s.radius }}
        />
      )}
    </div>
  );
}

/**
 * The drawing, printed with the logo in the same ink, between the chip and the
 * marks. The PNG is only a mask, so it prints in the card's ink unless a
 * `color` is picked for it.
 */
function Print({
  drawing,
  ink,
  color,
}: {
  drawing: Drawing;
  ink: string;
  color?: string;
}) {
  const image = isLight(color ?? ink) ? drawing.lightInk : drawing.image;
  return (
    <div
      aria-hidden
      className="absolute bg-(--ink)"
      style={{
        backgroundColor: color,
        left: 56,
        top: 158,
        width: 228,
        height: 290,
        mask: `url(${image}) center / contain no-repeat`,
      }}
    />
  );
}

/** Whether a `#rrggbb` ink is light enough to need the light-ink drawing. */
function isLight(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  return 0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255) > 140;
}

function UenoLogo({
  className,
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <svg
      viewBox="0 7.6 88.2 20.5"
      fill="currentColor"
      className={className}
      style={style}
      aria-hidden
    >
      <path d="M18.2062 8.43469C17.783 8.31217 17.3018 8.24981 16.7761 8.24981C15.9541 8.24981 15.2858 8.44138 14.7913 8.81561C14.2522 9.22326 13.9804 9.85813 13.9804 10.7024V18.6995C13.9804 20.1964 13.6263 21.3348 12.9268 22.0855C12.2429 22.8206 11.1492 23.1926 9.67449 23.1926C8.19981 23.1926 7.10606 22.8206 6.42218 22.0855C5.72272 21.3348 5.36853 20.1964 5.36853 18.6995V8.81784L5.01879 8.68418C4.874 8.62849 4.6156 8.54607 4.22577 8.43469C3.80252 8.31217 3.33472 8.24981 2.83351 8.24981C1.98702 8.24981 1.30538 8.44138 0.810848 8.81561C0.271768 9.22326 0 9.85813 0 10.7024V19.6039C0 20.9048 0.242808 22.0921 0.719515 23.1324C1.20068 24.1772 1.87564 25.0749 2.73104 25.7966C3.58199 26.5184 4.6156 27.0708 5.80514 27.4428C6.97686 27.8082 8.28001 27.9931 9.67672 27.9931C11.0734 27.9931 12.3743 27.8082 13.5483 27.4428C14.7356 27.0731 15.7737 26.5206 16.638 25.8011C17.509 25.0749 18.1862 24.1772 18.654 23.128C19.1173 22.0877 19.3534 20.9026 19.3534 19.6039V8.81784L19.0037 8.68418C18.8544 8.62849 18.5938 8.5483 18.2062 8.43469Z" />
      <path d="M41.2713 24.3582C41.1822 24.0129 41.0218 23.6543 40.799 23.2912C40.4493 22.7231 40.0238 22.3422 39.5337 22.1595C39.0503 21.9791 38.5202 22.0326 37.9566 22.3177L37.9544 22.3155C37.6737 22.458 37.4242 22.5739 37.0165 22.7343C36.6156 22.8924 36.1545 23.035 35.6443 23.1553C35.1387 23.2734 34.5706 23.3535 33.9603 23.3892C32.176 23.4917 30.7792 23.2266 29.8102 22.5984C29.0439 22.1039 28.516 21.4779 28.2086 20.6982C28.4447 20.6938 28.6719 20.6893 28.8902 20.6827C29.3313 20.6693 29.8036 20.6492 30.307 20.6203C32.4722 20.4955 34.2855 20.246 35.6911 19.8829C37.1235 19.5109 38.2774 19.032 39.1172 18.4573C39.9948 17.858 40.6008 17.1474 40.9215 16.3455C41.2312 15.5725 41.3581 14.7171 41.3024 13.8016C41.2468 12.9083 41.0017 12.0685 40.5718 11.3C40.1396 10.5314 39.5248 9.86317 38.7429 9.31518C37.9744 8.77833 37.041 8.36177 35.9651 8.07886C34.8959 7.79818 33.6707 7.69348 32.323 7.77145C30.7926 7.86055 29.3781 8.19246 28.1173 8.75828C26.8542 9.32632 25.756 10.0971 24.8538 11.0527C23.9516 12.0083 23.2611 13.1444 22.8022 14.4275C22.3433 15.7084 22.1584 17.1229 22.252 18.631C22.35 20.2126 22.7175 21.6227 23.3435 22.8189C23.9695 24.0174 24.8026 25.0309 25.8161 25.8284C26.8275 26.6237 27.9992 27.2095 29.2979 27.5682C30.5832 27.9224 31.971 28.0605 33.419 27.9758C34.4414 27.9179 35.3926 27.7865 36.2458 27.586C37.0901 27.39 37.843 27.1694 38.4823 26.9333C39.1328 26.695 39.683 26.4432 40.1218 26.1848C40.5495 25.9331 40.8569 25.7415 41.0574 25.6057L41.474 25.3183L41.425 25.0198C41.4049 24.8884 41.3537 24.6745 41.2713 24.3582ZM27.9435 15.4433C28.1418 14.8196 28.4447 14.256 28.8412 13.7659C29.2333 13.2825 29.739 12.8771 30.3449 12.5608C30.9485 12.2467 31.677 12.064 32.5123 12.015C33.5214 11.9571 34.3835 12.1108 35.0741 12.4739C35.6956 12.8014 36.0052 13.2937 36.0498 14.0266C36.0676 14.3162 36.0253 14.5946 35.9228 14.8731C35.8359 15.1047 35.6131 15.3386 35.2612 15.5636C34.858 15.822 34.261 16.0559 33.4858 16.2564C32.6928 16.4636 31.6168 16.6061 30.2914 16.6819L28.7232 16.7732C28.3846 16.7932 28.0348 16.8088 27.6784 16.8177C27.7096 16.3566 27.7987 15.8978 27.9435 15.4433Z" />
      <path d="M60.9689 9.93653C60.1068 9.21701 59.0665 8.66455 57.8792 8.29477C56.7075 7.92944 55.4043 7.74456 54.0076 7.74456C52.6109 7.74456 51.31 7.92944 50.1361 8.29477C48.9465 8.66455 47.9129 9.21923 47.062 9.94098C46.2088 10.6627 45.5316 11.5604 45.0527 12.6052C44.5737 13.6455 44.3331 14.8328 44.3331 16.1337V25.0352C44.3331 25.8817 44.6071 26.5166 45.144 26.922C45.6407 27.2985 46.3202 27.4878 47.1667 27.4878C47.6679 27.4878 48.1357 27.4254 48.5589 27.3029C48.9487 27.1893 49.2071 27.1069 49.3519 27.0534L49.7017 26.9198V17.0381C49.7017 15.5412 50.0559 14.4029 50.7553 13.6522C51.4392 12.9171 52.533 12.545 54.0076 12.545C55.4801 12.545 56.5761 12.9171 57.2599 13.6522C57.9594 14.4029 58.3136 15.5412 58.3136 17.0381V25.0352C58.3136 25.8817 58.5854 26.5166 59.1244 26.922C59.6212 27.2985 60.2895 27.4878 61.1092 27.4878C61.6349 27.4878 62.1161 27.4254 62.5394 27.3029C62.9292 27.1893 63.1876 27.1069 63.3324 27.0534L63.6821 26.9198V16.1337C63.6821 14.8372 63.446 13.6522 62.9826 12.6097C62.5171 11.5605 61.8399 10.6605 60.9689 9.93653Z" />
      <path d="M85.0232 10.6249C84.0542 9.7249 82.8936 9.01206 81.5726 8.5064C80.2539 8.00073 78.8215 7.74456 77.3135 7.74456C75.8054 7.74456 74.3708 8.00073 73.0543 8.5064C71.7355 9.01206 70.5727 9.7249 69.6037 10.6249C68.6325 11.527 67.8617 12.6074 67.3115 13.8393C66.7613 15.0734 66.4806 16.4278 66.4806 17.869C66.4806 19.288 66.7591 20.6313 67.3115 21.8631C67.8617 23.095 68.6347 24.1754 69.6037 25.0775C70.5727 25.9775 71.7311 26.697 73.0498 27.2138C74.3708 27.7329 75.8054 27.9957 77.3135 27.9957C78.8215 27.9957 80.2561 27.7329 81.5771 27.2138C82.8958 26.697 84.0542 25.9775 85.0232 25.0775C85.9944 24.1754 86.7674 23.095 87.3176 21.8631C87.8679 20.6313 88.1485 19.288 88.1485 17.869C88.1485 16.4278 87.8701 15.0711 87.3176 13.8393C86.7674 12.6074 85.9944 11.527 85.0232 10.6249ZM82.2008 20.0075C81.9402 20.6535 81.5749 21.2305 81.1115 21.7228C80.6571 22.2062 80.098 22.5893 79.4497 22.8589C78.7993 23.1306 78.082 23.2665 77.3135 23.2665C76.5227 23.2665 75.7987 23.1284 75.1616 22.8589C74.5267 22.5893 73.9721 22.2062 73.5176 21.7228C73.0543 21.2305 72.689 20.6535 72.4283 20.0075C72.1677 19.3615 72.0363 18.642 72.0363 17.869C72.0363 17.0938 72.1677 16.3609 72.4306 15.6882C72.689 15.0221 73.0543 14.443 73.5132 13.964C73.9698 13.4895 74.5245 13.1131 75.1616 12.8413C75.7987 12.5718 76.5227 12.4337 77.3135 12.4337C78.0798 12.4337 78.7993 12.5718 79.4497 12.8413C80.098 13.1131 80.6593 13.4895 81.1138 13.9618C81.5726 14.4407 81.938 15.0199 82.1964 15.686C82.4592 16.3587 82.5907 17.0938 82.5907 17.8668C82.5929 18.6398 82.4592 19.3615 82.2008 20.0075Z" />
    </svg>
  );
}

function Mastercard({
  className,
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <svg viewBox="0 0 1000 618" className={className} style={style} aria-hidden>
      <circle cx="309" cy="309" r="309" fill="#eb001b" />
      <circle cx="691" cy="309" r="309" fill="#f79e1b" />
      <path
        fill="#ff5f00"
        d="M500 66a309 309 0 0 0 0 486 309 309 0 0 0 0-486"
      />
    </svg>
  );
}

// How far the chip's streak runs off-center for a given pointer position.
const CHIP_SWEEP = "(var(--px) * -150 + var(--py) * -110) * 1%";

// Bare metal, so it sits above the laminate's grain and has its own light:
// a brushed face, and a hard streak that sweeps across as the card tilts.
function Chip({ style }: { style?: CSSProperties }) {
  return (
    <div
      aria-hidden
      className="absolute overflow-hidden"
      style={{
        ...style,
        borderRadius: 10,
        background: [
          // The streak moves by shifting its stops, not the layer, so the layer
          // always covers the chip and never shows an edge.
          `linear-gradient(112deg, transparent calc(-10% + ${CHIP_SWEEP}), rgba(255, 255, 255, 0.95) calc(50% + ${CHIP_SWEEP}), transparent calc(110% + ${CHIP_SWEEP}))`,
          "repeating-linear-gradient(90deg, rgba(255, 255, 255, 0.1) 0 0.5px, rgba(0, 0, 0, 0.05) 0.5px 1.5px)",
          "linear-gradient(140deg, #f6f6f3 0%, #cfd1cd 38%, #ecece8 58%, #b4b7b3 100%)",
        ].join(", "),
        boxShadow:
          "inset 0 0 0 0.5px rgba(0, 0, 0, 0.3), inset 0 1px 0.5px rgba(255, 255, 255, 0.8), 0 0.5px 0 rgba(255, 255, 255, 0.35), 0 0 0 0.5px rgba(0, 0, 0, 0.12)",
      }}
    >
      {/* Contact pads: a dark cut with a lit lower lip, so they read engraved. */}
      <svg
        viewBox="0 0 60 70"
        className="block size-full"
        fill="none"
        strokeLinecap="round"
      >
        {[
          { stroke: "rgba(255, 255, 255, 0.75)", dy: 0.7 },
          { stroke: "rgba(60, 64, 60, 0.55)", dy: 0 },
        ].map(({ stroke, dy }) => (
          <g
            key={dy}
            stroke={stroke}
            strokeWidth="1"
            transform={`translate(0 ${dy})`}
          >
            <path d="M20 0v18q0 5 5 5h10q5 0 5-5V0" />
            <path d="M20 70V52q0-5 5-5h10q5 0 5 5v18" />
            <path d="M0 35h20M40 35h20" />
            <rect x="20" y="23" width="20" height="24" rx="5" />
          </g>
        ))}
      </svg>
    </div>
  );
}

function Contactless({ style }: { style?: CSSProperties }) {
  const spread = (40 * Math.PI) / 180;
  return (
    <svg
      viewBox="0 0 26 36"
      className="absolute"
      style={style}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      aria-hidden
    >
      {[5, 11, 17, 23].map((r) => {
        const x = 1 + r * Math.cos(spread);
        const dy = r * Math.sin(spread);
        return (
          <path
            key={r}
            d={`M${x} ${18 - dy}A${r} ${r} 0 0 1 ${x} ${18 + dy}`}
          />
        );
      })}
    </svg>
  );
}

function Front({
  surface,
  transform,
  drawing,
  drawingColor,
  href,
}: {
  surface: Surface;
  transform: string;
  drawing?: Drawing;
  drawingColor?: string;
  href?: string;
}) {
  const t = useStrings();
  return (
    <Face
      surface={surface}
      transform={transform}
      label={t.front}
      href={href}

      inlay={<Chip style={{ left: 158, top: 56, width: 62, height: 72 }} />}
    >
      {surface.stripes && (
        // Three bands down the long edge, fading out before the logo.
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background: `linear-gradient(90deg, transparent 5%, ${surface.stripes} 5% 23%, transparent 23% 41%, ${surface.stripes} 41% 59%, transparent 59% 77%, ${surface.stripes} 77% 95%, transparent 95%)`,
            maskImage: "linear-gradient(to top, transparent 24%, #000 66%)",
          }}
        />
      )}
      {drawing && (
        <Print drawing={drawing} ink={surface.ink} color={drawingColor} />
      )}
      <Contactless
        style={{
          left: 246,
          top: 72,
          width: 29,
          height: 40,
          color: "var(--ink)",
          opacity: 0.9,
        }}
      />
      <UenoLogo
        className="absolute text-(--ink)"
        style={{ left: 26, bottom: 30, width: 104 }}
      />
      <span
        className="absolute text-right text-(--ink) opacity-80"
        style={{
          right: 28,
          bottom: 82,
          fontSize: 7.5,
          fontWeight: 500,
          letterSpacing: "0.04em",
        }}
      >
        débito
      </span>
      <Mastercard
        className="absolute"
        style={{ right: 26, bottom: 24, width: 80 }}
      />
    </Face>
  );
}

// What the card's two numbers count (BBC Mundo and El País, Nov 2026): the
// deposits the bank said it held days before the intervention, and the close
// to three million clients who lost access to their money when it closed.
const FIGURES = [
  { id: "deposits", value: 2_800_000_000 },
  { id: "affected", value: 3_000_000 },
];

/** A figure written as a 16-digit card number, zero-filled from the left. */
function cardNumber(value: number) {
  return String(value).padStart(16, "0").match(/.{4}/g)!.join(" ");
}

type Foil = {
  rainbow: number;
  spread: number;
  rays: number;
  mark: number;
  flash: number;
  pattern: number;
};

// The sticker's box on the card, and the center of its upper circle.
const HOLO = { left: 232, top: 344, width: 60, height: 88, eye: 30 };

/**
 * The hologram: silver foil with the two-circle mark, a sunburst of rays, and
 * spectral patches near its top edge that slide and turn hue with the tilt.
 * The pointer stands in for the light, so passing over the foil flashes it
 * white. Everything reads `--px`/`--py`, so it eases with the tilt.
 */
function Hologram({ foil: f }: { foil: Foil }) {
  const eye = `50% ${HOLO.eye}px`;
  // The pointer in the sticker's own px.
  const lightX = `calc(${HOLO.width / 2}px + (var(--px) - ${(HOLO.left + HOLO.width / 2) / W - 0.5}) * ${W}px)`;
  const lightY = `calc(${HOLO.height / 2}px + (var(--py) - ${(HOLO.top + HOLO.height / 2) / H - 0.5}) * ${H}px)`;
  const circle = HOLO.width - 6;
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute isolate overflow-hidden rounded-full"
      style={{
        left: HOLO.left,
        top: HOLO.top,
        width: HOLO.width,
        height: HOLO.height,
        background:
          "linear-gradient(calc(150deg + (var(--px) + var(--py)) * 80deg), #c9cdce 0%, #9da1a3 42%, #d3d6d7 68%, #93979a 100%)",
        boxShadow: "0 0 0 0.5px rgba(0, 0, 0, 0.18)",
      }}
    >
      {/* The mark: whichever circle faces the light is the brighter one. */}
      <div
        className="absolute rounded-full bg-white"
        style={{
          left: 3,
          top: HOLO.eye - circle / 2,
          width: circle,
          height: circle,
          opacity: `calc(${f.mark} * (0.5 + var(--px) + var(--py)))`,
        }}
      />
      <div
        className="absolute rounded-full bg-white"
        style={{
          left: 3,
          top: HOLO.height - HOLO.eye - circle / 2,
          width: circle,
          height: circle,
          opacity: `calc(${f.mark} * (0.5 - var(--px) - var(--py)))`,
          boxShadow: "0 0 0 0.5px rgba(0, 0, 0, 0.12)",
        }}
      />
      <div
        className="absolute inset-0 mix-blend-overlay"
        style={{
          background:
            "repeating-linear-gradient(62deg, rgba(255, 255, 255, 0.7) 0 0.5px, transparent 0.5px 2.5px)",
          opacity: f.pattern * 0.6,
        }}
      />
      <div
        className="absolute inset-0 mix-blend-plus-lighter"
        style={{
          background: `repeating-conic-gradient(from calc((var(--px) + var(--py)) * 90deg) at ${eye}, rgba(255, 255, 255, 0.9) 0 2deg, transparent 2deg 7deg, rgba(255, 255, 255, 0.5) 7deg 8deg, transparent 8deg 13deg)`,
          maskImage: `radial-gradient(circle at ${eye}, transparent 8px, #000 20px, transparent 36px)`,
          opacity: f.rays * 0.3,
        }}
      />
      {/* Rainbow: a ring around the upper circle, lit only where the light
          grazes it, and split by the rays. */}
      <div
        className="absolute inset-0"
        style={{
          background: `conic-gradient(from calc((var(--px) - var(--py)) * ${f.spread}deg) at ${eye}, #ff3b30, #ff9f0a, #ffe600, #30d158, #32d4e6, #0a84ff, #bf5af2, #ff3b30)`,
          maskImage: `radial-gradient(circle at ${eye}, transparent 12px, #000 22px, #000 30px, transparent 44px), radial-gradient(circle 30px at calc(50% - var(--px) * 160%) calc(6% - var(--py) * 120%), #000 0%, transparent 100%)`,
          maskComposite: "intersect",
          filter: "blur(0.6px) saturate(1.35)",
          opacity: f.rainbow,
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(circle at ${lightX} ${lightY}, #fff 0px, rgba(255, 255, 255, 0.85) 16px, rgba(160, 225, 255, 0.5) 34px, transparent 64px)`,
          opacity: f.flash,
        }}
      />
      <div
        className="absolute inset-0 rounded-full"
        style={{
          boxShadow:
            "inset 0 0 0 1px rgba(255, 255, 255, 0.45), inset 0 -1px 1px rgba(0, 0, 0, 0.12)",
        }}
      />
    </div>
  );
}

function Back({
  surface,
  transform,
  foil,
  href,
}: {
  surface: Surface;
  transform: string;
  foil: Foil;
  href?: string;
}) {
  const t = useStrings();
  return (
    <Face
      surface={surface}
      transform={transform}
      label={t.back}
      href={href}
      inlay={<Hologram foil={foil} />}
    >
      {/* Magnetic stripe, running the long edge. */}
      <div
        className="absolute inset-y-0"
        style={{
          left: 20,
          width: 58,
          background:
            "linear-gradient(180deg, #141416 0%, #1f2022 55%, #303235 100%)",
        }}
      />

      {/* The numbers, labelled the way the real card labels its two lines. */}
      <dl
        className="absolute flex flex-col text-(--ink)"
        style={{ left: 104, right: 24, top: 150, gap: 26 }}
      >
        {FIGURES.map((f) => (
          <div key={f.id}>
            <dt
              className="opacity-80"
              style={{
                fontSize: 7.5,
                fontWeight: 500,
                letterSpacing: "0.04em",
              }}
            >
              {t.figures[f.id]}
            </dt>
            <dd
              className="font-mono tabular-nums opacity-90"
              style={{
                marginTop: 5,
                fontSize: 15,
                lineHeight: "20px",
                letterSpacing: "0.06em",
                whiteSpace: "nowrap",
              }}
            >
              {cardNumber(f.value)}
            </dd>
          </div>
        ))}
      </dl>

      <div
        className="absolute rounded-lg bg-white"
        // 2px modules, and the four-module quiet zone a scanner needs.
        style={{ left: 96, bottom: 24, width: 92, height: 92, padding: 9 }}
      >
        <svg
          viewBox={`0 0 ${QR_SIZE} ${QR_SIZE}`}
          shapeRendering="crispEdges"
          aria-hidden
        >
          <path d={QR_MODULES} fill="#1c1d20" />
        </svg>
      </div>

      <p
        className="absolute text-(--ink) opacity-85"
        style={{
          left: 204,
          right: 24,
          bottom: 24,
          fontSize: 5,
          lineHeight: "7px",
        }}
      >
        Esta tarjeta es personal e intransferible y es propiedad de ueno bank
        S.A. Su uso implica la aceptación de las condiciones del contrato. Si la
        encontrás, devolvela a cualquier sucursal.
        <span className="mt-[5px] block">
          Atención al cliente *5000 · ueno.com.py
        </span>
      </p>
    </Face>
  );
}

function VariantPicker({
  value,
  onChange,
}: {
  value: Variant;
  onChange: (variant: Variant) => void;
}) {
  const t = useStrings();
  return (
    <div className="flex flex-col items-center gap-2 font-mono text-[11px] text-[#8a8a8a]">
      <div role="radiogroup" aria-label={t.cardColor} className="flex">
        {VARIANTS.map((v) => (
          <label
            key={v.id}
            className="group/swatch relative grid size-10 cursor-pointer place-items-center"
          >
            <input
              type="radio"
              name="ueno-variant"
              className="peer sr-only"
              checked={v.id === value.id}
              onChange={() => onChange(v)}
            />
            <span className="sr-only">{t.variants[v.id]}</span>
            {/* Mid-grey ring and hairline read on both canvas themes. */}
            <span
              aria-hidden
              className="size-7 rounded-full outline-2 outline-offset-2 outline-transparent transition-[scale,outline-color] duration-150 ease-out group-hover/swatch:scale-110 group-active/swatch:scale-95 peer-checked:outline-[#8a8a8a] peer-focus-visible:outline-[#3b82f6]"
              style={{
                background: v.stripes
                  ? `linear-gradient(90deg, ${v.sheen} 20%, ${v.stripes} 20% 40%, ${v.sheen} 40% 60%, ${v.stripes} 60% 80%, ${v.sheen} 80%)`
                  : `linear-gradient(135deg, ${v.base} 35%, ${v.sheen})`,
                boxShadow: "inset 0 0 0 1px rgba(128, 128, 128, 0.35)",
              }}
            />
          </label>
        ))}
      </div>
      <span aria-hidden>{t.variants[value.id]}</span>
    </div>
  );
}

type DrawingColor = { id: string; value: string };

const DRAWING_COLORS: DrawingColor[] = [
  { id: "white", value: "#ffffff" },
  { id: "blue", value: "#17257e" },
  { id: "black", value: "#16171a" },
];

/** WCAG relative luminance of a `#rrggbb` color. */
function luminance(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [n >> 16, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string) {
  const [lo, hi] = [luminance(a), luminance(b)].sort((x, y) => x - y);
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * The drawing colors that read on a card: the one matching the card's own ink
 * (`own`, the default), plus any other with at least 3:1 against the card.
 */
function drawingColors(ink: string, base: string) {
  const ownId = isLight(ink) ? "white" : "blue";
  const options = DRAWING_COLORS.filter(
    (c) => c.id === ownId || contrast(c.value, base) >= 3,
  );
  return { options, own: options.find((c) => c.id === ownId)! };
}

function DrawingColorPicker({
  options,
  value,
  onChange,
}: {
  options: DrawingColor[];
  value: DrawingColor;
  onChange: (color: DrawingColor) => void;
}) {
  const t = useStrings();
  return (
    <div className="flex flex-col items-center gap-1 font-mono text-[11px] text-[#8a8a8a]">
      <div role="radiogroup" aria-label={t.drawingColor} className="flex">
        {options.map((c) => (
          <label
            key={c.id}
            className="group/swatch relative grid size-8 cursor-pointer place-items-center"
          >
            <input
              type="radio"
              name="ueno-drawing-color"
              className="peer sr-only"
              checked={c.id === value.id}
              onChange={() => onChange(c)}
            />
            <span className="sr-only">{t.colors[c.id]}</span>
            <span
              aria-hidden
              className="size-5 rounded-full outline-2 outline-offset-2 outline-transparent transition-[scale,outline-color] duration-150 ease-out group-hover/swatch:scale-110 group-active/swatch:scale-95 peer-checked:outline-[#8a8a8a] peer-focus-visible:outline-[#3b82f6]"
              style={{
                background: c.value,
                boxShadow: "inset 0 0 0 1px rgba(128, 128, 128, 0.35)",
              }}
            />
          </label>
        ))}
      </div>
      <span aria-hidden>
        {t.drawing}: {t.colors[value.id]}
      </span>
    </div>
  );
}

type Option = { id: string };

/** A row of pill radios; `undefined` is the "None" pill when `none` is set. */
function PillPicker<T extends Option>({
  label,
  name,
  options,
  names,
  none = false,
  value,
  onChange,
}: {
  label: string;
  name: string;
  options: T[];
  /** What to call each option, by id. */
  names: Record<string, string>;
  none?: boolean;
  value: T | undefined;
  onChange: (option: T | undefined) => void;
}) {
  const t = useStrings();
  const all: (T | undefined)[] = none ? [undefined, ...options] : options;
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="flex flex-wrap justify-center gap-1 font-mono text-[11px] text-[#8a8a8a]"
    >
      {all.map((o) => (
        <label key={o?.id ?? "none"} className="cursor-pointer">
          <input
            type="radio"
            name={name}
            className="peer sr-only"
            checked={o?.id === value?.id}
            onChange={() => onChange(o)}
          />
          {/* Grey on grey so it reads on both canvas themes. */}
          <span className="block rounded-full px-3 py-2 opacity-60 outline-2 outline-transparent transition-[opacity,background-color] duration-150 ease-out peer-checked:bg-[rgb(128_128_128/0.2)] peer-checked:opacity-100 peer-focus-visible:outline-[#3b82f6] hover:opacity-100 active:scale-[0.97]">
            {o ? names[o.id] : t.none}
          </span>
        </label>
      ))}
    </div>
  );
}

/** Whether a media query matches, kept current as the window changes. */
function useMediaQuery(query: string) {
  return useSyncExternalStore(
    (onChange) => {
      const media = window.matchMedia(query);
      media.addEventListener("change", onChange);
      return () => media.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
  );
}

export default function UenoCard() {
  const t = useStrings();
  const dial = useDialKitController("ueno card", CONFIG);
  const p = dial.values;
  const [variant, setVariant] = useState(DEFAULT_VARIANT);
  const [person, setPerson] = useState<Person>();
  const [drawing, setDrawing] = useState<Drawing>();
  const [drawingColorId, setDrawingColorId] = useState<string>();
  const choose = (next: Person | undefined) => {
    setPerson(next);
    setDrawing(next?.drawings[0]);
  };
  // Picking a variant writes its colors into the dials, so they stay tweakable.
  const pick = (v: Variant) => {
    setVariant(v);
    dial.setValues({ surface: { base: v.base, sheen: v.sheen } });
  };
  const surface: Surface = {
    ...p.surface,
    ...p.sheen,
    ink: variant.ink,
    stripes: variant.stripes,
    perspective: p.pose.perspective,
    tiltMax: p.tilt.max,
    lift: p.tilt.lift,
  };
  // A color picked on one card is dropped on a card it would not read on.
  const colors = drawingColors(surface.ink, surface.base);
  const drawingColor =
    colors.options.find((c) => c.id === drawingColorId) ?? colors.own;
  // The story image is drawn from the same values as the card on the page.
  const cards = useRef<HTMLDivElement>(null);
  // Too narrow for both sides: one card, turned over with a swipe.
  const narrow = useMediaQuery(`(max-width: ${2 * W + 160}px)`);
  const single = p.flip.view === "auto" ? narrow : p.flip.view === "one";
  const [sharing, setSharing] = useState<
    "idle" | "busy" | "ready" | "saved" | "failed"
  >("idle");
  const storyColor =
    drawingColor === colors.own ? surface.ink : drawingColor.value;
  const storyInput = {
    ...surface,
    grainUrl: GRAIN.slice(5, -2),
    grainTile: GRAIN_TILE,
    drawing: drawing && {
      src: isLight(storyColor) ? drawing.lightInk : drawing.image,
      color: storyColor,
    },
    caption: t.headline,
  };
  const storyKey = JSON.stringify(storyInput);
  /*
   * The story is drawn ahead of the tap. Safari only opens the share sheet
   * straight from a tap, and drawing the image first takes long enough for it
   * to stop counting as one; with the image already made, the sheet opens in
   * the same breath.
   */
  const story = useRef<{ key: string; blob: Promise<Blob> } | null>(null);
  const prepare = () => {
    if (story.current?.key === storyKey) return story.current.blob;
    const element = cards.current?.querySelector<HTMLElement>("[role=img]");
    if (!element) return Promise.reject(new Error("No card to draw"));
    const blob = renderStory({ element, ...storyInput });
    const entry = { key: storyKey, blob };
    story.current = entry;
    // A failed drawing is not kept: the next tap tries again.
    blob.catch(() => {
      if (story.current === entry) story.current = null;
    });
    return blob;
  };
  const prepareRef = useRef(prepare);
  useEffect(() => {
    prepareRef.current = prepare;
  });
  useEffect(() => {
    // Wait for the choice to settle, and for the card to show it.
    const id = setTimeout(() => prepareRef.current().catch(() => {}), 300);
    return () => clearTimeout(id);
  }, [storyKey]);
  const share = async () => {
    setSharing("busy");
    try {
      const result = await shareStory(
        await prepare(),
        `ueno-${person ? t.people[person.id].toLowerCase() : t.filename}-${variant.id}.png`,
      );
      setSharing(
        result === "saved" ? "saved" : result === "blocked" ? "ready" : "idle",
      );
    } catch (error) {
      console.error(error);
      setSharing("failed");
    }
  };
  const pose = (flip: 1 | -1) =>
    `rotateX(${p.pose.rotateX}deg) rotateY(${flip * p.pose.rotateY}deg) rotateZ(${flip * p.pose.rotateZ}deg)`;

  // The single card turns by swipe, so it holds still under the pointer: the
  // light still follows, the card does not tilt or lift.
  const face = single ? { ...surface, tiltMax: 0, lift: 1 } : surface;
  // A tap on the single card is too easy to make while swiping, so only the
  // side-by-side cards open the story.
  const href = single ? undefined : (person?.href ?? DEFAULT_HREF);
  const front = (
    <Front
      surface={face}
      transform={pose(1)}
      drawing={drawing}
      // The card's own ink already is the matching color.
      drawingColor={
        drawingColor === colors.own ? undefined : drawingColor.value
      }
      href={href}
    />
  );
  // The back is the same sheet seen from behind, so its sheen mirrors.
  const back = (
    <Back
      surface={{ ...face, angle: -face.angle }}
      transform={pose(-1)}
      foil={p.hologram}
      href={href}
    />
  );

  return (
    <div className="flex flex-col items-center gap-10 px-2.5 py-10 sm:p-12">
      <style>{POINTER_PROPS}</style>
      <div ref={cards}>
        {single ? (
          <FlipCard
            width={W}
            height={H}
            perspective={p.pose.perspective}
            motion={p.flip}
            front={front}
            back={back}
          />
        ) : (
          <div
            // Forced on a narrow screen, the pair stacks rather than overflowing.
            className="flex flex-wrap items-center justify-center"
            style={{ gap: p.pose.gap }}
          >
            {front}
            {back}
          </div>
        )}
      </div>
      <div className="flex flex-col items-center gap-5">
        <VariantPicker value={variant} onChange={pick} />
        <PillPicker
          label={t.person}
          names={t.people}
          name="ueno-person"
          options={PEOPLE}
          none
          value={person}
          onChange={choose}
        />
        {person && person.drawings.length > 1 && (
          <PillPicker
            label={t.drawingOf(t.people[person.id])}
            names={t.drawings}
            name="ueno-drawing"
            options={person.drawings}
            value={drawing}
            onChange={setDrawing}
          />
        )}
        {drawing && (
          <DrawingColorPicker
            options={colors.options}
            value={drawingColor}
            onChange={(c) => setDrawingColorId(c.id)}
          />
        )}
        <div className="flex flex-col items-center gap-2 font-mono text-[11px] text-[#8a8a8a]">
          <button
            type="button"
            onClick={share}
            disabled={sharing === "busy"}
            className="cursor-pointer rounded-full bg-[rgb(128_128_128/0.2)] px-4 py-2.5 outline-2 outline-transparent transition-[opacity,scale] duration-150 ease-out hover:bg-[rgb(128_128_128/0.3)] focus-visible:outline-[#3b82f6] active:scale-[0.97] disabled:cursor-default disabled:opacity-50"
          >
            {sharing === "busy" ? t.preparing : t.share}
          </button>
          <span
            role="status"
            className="min-h-[1lh] px-4 text-center text-balance"
          >
            {sharing === "saved" && t.saved}
            {sharing === "ready" && t.ready}
            {sharing === "failed" && t.failed}
          </span>
        </div>
      </div>
    </div>
  );
}
