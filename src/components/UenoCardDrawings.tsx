import bcp from "./ueno-drawings/bcp.png";
import bcpLightInk from "./ueno-drawings/bcp-light-ink.png";
import presidente from "./ueno-drawings/presidente.png";
import presidenteLightInk from "./ueno-drawings/presidente-light-ink.png";
import vazquez from "./ueno-drawings/vazquez.png";
import vazquezLightInk from "./ueno-drawings/vazquez-light-ink.png";

/*
 * Line drawings for the card front, one photo per person. Each PNG is white
 * ink on transparent: the figure is cut from the backdrop, then a line of
 * even weight is laid wherever the photo's tone crosses a few fixed levels
 * (hair, collar, tie), plus a pen stroke on whatever is darker than its
 * surroundings (brows, eyes, nostrils, mouth, beard).
 *
 * Each import is the PNG's URL. They are used as masks, so they print in whatever ink the card has. Solid
 * strokes on brows and beard only read in dark ink; in white they glow and the
 * face turns into a negative. So each drawing has a second tracing for light
 * ink, with those strokes drawn as outlines instead.
 * `ueno-drawings/trace.swift` is the tracer that made them.
 */
export type Drawing = {
  id: string;
  /** For dark ink on a light card. */
  image: string;
  /** For light ink on a dark card. */
  lightInk: string;
};

export type Person = {
  id: string;
  drawings: Drawing[];
  /** The story behind the drawing; clicking the card opens it. */
  href?: string;
};

/** The story the card opens when nobody is on it. */
export const DEFAULT_HREF = "https://www.bbc.com/mundo/articles/cqx28zrgd0yxo";

export const PEOPLE: Person[] = [
  {
    id: "vazquez",
    href: "https://www.hoy.com.py/nacionales/2026/11/10/confirman-prision-de-miguel-vazquez-y-amplian-imputacion-por-lavado-de-activos",
    drawings: [
      {
        id: "waist-up",
        image: vazquez,
        lightInk: vazquezLightInk,
      },
    ],
  },
  {
    id: "presidente",
    href: "https://www.ultimahora.com/santiago-pena-se-expone-a-una-pena-de-hasta-15-anos-de-carcel-por-el-desfalco-de-ueno-bank",
    drawings: [
      {
        id: "detailed",
        image: presidente,
        lightInk: presidenteLightInk,
      },
    ],
  },
  {
    id: "bcp",
    href: "https://www.abc.com.py/policiales/2026/11/07/ueno-bank-expresidente-del-bcp-se-entrego-y-quedo-detenido/",
    drawings: [
      {
        id: "waist-up",
        image: bcp,
        lightInk: bcpLightInk,
      },
    ],
  },
];
