# uestafa

Una tarjeta de débito para decirlo en voz alta: casi tres millones de
paraguayos se quedaron sin acceso a su plata cuando cerró ueno bank. Elegí el
color, a quién poner tras las rejas, y compartila en tus historias.

## Desarrollo

```sh
pnpm install
pnpm dev      # http://localhost:5173, con el panel de DialKit para ajustar la tarjeta
pnpm build    # tsc + vite build, salida en dist/
```

## Dónde está cada cosa

- `src/components/UenoCard.tsx` — la tarjeta (frente y dorso), los selectores y el botón de compartir.
- `src/components/UenoCardDrawings.tsx` — las personas, sus dibujos y la noticia detrás de cada uno.
- `src/components/ueno-drawings/` — los dibujos (PNG usados como máscara) y `trace.swift`, el trazador que los generó a partir de las fotos.
- `src/components/UenoCardQr.ts` — el código QR del dorso.
- `src/components/UenoCardShare.ts` — dibuja la imagen 1080×1920 para historias.

El panel de DialKit solo aparece en desarrollo; los valores por defecto de
`CONFIG` en `UenoCard.tsx` son los que ve el público.
