import { createContext, useContext } from "react";

/*
 * Every string a visitor reads or a screen reader announces, in Spanish and
 * English. The card's own print ("débito", the small print on the back) stays
 * in Spanish in both: that is what the real card says.
 */
export type Lang = "es" | "en";

const es = {
  description:
    "Casi tres millones de paraguayos se quedaron sin acceso a su plata. Nunca más.",
  headline: "Nunca más",
  language: "Idioma",
  front: "Tarjeta de débito ueno, frente",
  back: "Tarjeta de débito ueno, dorso",
  readStory: "leer la noticia (se abre en una pestaña nueva)",
  cardColor: "Color de la tarjeta",
  person: "Persona en la tarjeta",
  none: "Ninguno",
  drawingOf: (name: string) => `Dibujo de ${name}`,
  drawingColor: "Color del dibujo",
  drawing: "Dibujo",
  share: "Compartir",
  preparing: "Preparando…",
  ready: "Imagen lista. Tocá Compartir otra vez.",
  saved: "Imagen guardada. Subila a tu historia de Instagram o WhatsApp.",
  failed: "No se pudo crear la imagen. Probá de nuevo.",
  filename: "tarjeta",
  variants: {
    green: "Verde",
    blue: "Azul",
    orange: "Naranja",
    violet: "Violeta",
    black: "Negra",
    albirroja: "Albirroja",
  } as Record<string, string>,
  people: {
    vazquez: "CEO",
    presidente: "Presidente",
    bcp: "BCP",
  } as Record<string, string>,
  drawings: {
    "waist-up": "Medio cuerpo",
    detailed: "Detallado",
  } as Record<string, string>,
  colors: {
    white: "Blanco",
    blue: "Azul",
    black: "Negro",
  } as Record<string, string>,
  figures: {
    deposits: "dólares en depósitos",
    affected: "paraguayos afectados",
  } as Record<string, string>,
};

export type Strings = typeof es;

const en: Strings = {
  description:
    "Nearly three million Paraguayans lost access to their money. Never again.",
  headline: "Never again",
  language: "Language",
  front: "ueno debit card, front",
  back: "ueno debit card, back",
  readStory: "read the news story (opens in a new tab)",
  cardColor: "Card color",
  person: "Person on the card",
  none: "None",
  drawingOf: (name) => `${name} drawing`,
  drawingColor: "Drawing color",
  drawing: "Drawing",
  share: "Share",
  preparing: "Preparing…",
  ready: "Image ready. Tap Share again.",
  saved: "Image saved. Add it to your Instagram or WhatsApp story.",
  failed: "Could not make the image. Try again.",
  filename: "card",
  variants: {
    green: "Green",
    blue: "Blue",
    orange: "Orange",
    violet: "Violet",
    black: "Black",
    albirroja: "Albirroja",
  },
  people: {
    vazquez: "CEO",
    presidente: "President",
    bcp: "BCP",
  },
  drawings: {
    "waist-up": "Waist-up",
    detailed: "Detailed",
  },
  colors: {
    white: "White",
    blue: "Blue",
    black: "Black",
  },
  figures: {
    deposits: "dollars in deposits",
    affected: "Paraguayans affected",
  },
};

export const STRINGS: Record<Lang, Strings> = { es, en };

export const StringsContext = createContext<Strings>(es);

export const useStrings = () => useContext(StringsContext);

const STORAGE_KEY = "uestafa-lang";

/** The language picked on an earlier visit; Spanish otherwise. */
export function storedLang(): Lang {
  try {
    return localStorage.getItem(STORAGE_KEY) === "en" ? "en" : "es";
  } catch {
    return "es";
  }
}

export function storeLang(lang: Lang) {
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // Private windows can refuse storage; the toggle still works for the visit.
  }
}
