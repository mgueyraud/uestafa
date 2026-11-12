import { useRef, type ReactNode } from "react";
import { BCP_PAYMENTS, INFO, SOURCES } from "../info";
import type { Lang } from "../i18n";

const LINK =
  "text-[#8fb2ff] underline underline-offset-[3px] outline-2 outline-offset-2 outline-transparent focus-visible:outline-[#3b82f6]";

function Section({
  heading,
  children,
}: {
  heading: string;
  children: ReactNode;
}) {
  return (
    <section className="mt-10">
      <h3 className="mb-3 text-xl font-bold tracking-tight text-[#f2f2f2]">
        {heading}
      </h3>
      {children}
    </section>
  );
}

function Note({ children }: { children: ReactNode }) {
  return (
    <p className="mt-4 border-l-4 border-[#ff5a70] bg-[rgb(255_255_255/0.05)] px-4 py-3">
      {children}
    </p>
  );
}

/**
 * The info button and the case summary it opens. A native modal dialog, so
 * focus is trapped, Escape closes it and the page behind is inert.
 */
export default function InfoDialog({ lang }: { lang: Lang }) {
  const t = INFO[lang];
  const ref = useRef<HTMLDialogElement>(null);

  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-label={t.open}
        title={t.open}
        onClick={() => {
          ref.current?.showModal();
          // Reopen at the top, not wherever the last read stopped.
          ref.current?.scrollTo(0, 0);
        }}
        className="fixed right-[max(1rem,env(safe-area-inset-right))] bottom-[max(1rem,env(safe-area-inset-bottom))] z-20 grid size-11 cursor-pointer place-items-center rounded-full bg-[#333333] text-[#d6d6d6] shadow-[0_0_0_1px_rgb(255_255_255/0.1),0_6px_20px_rgb(0_0_0/0.4)] outline-2 outline-offset-2 outline-transparent transition-[color,background-color,scale] duration-150 ease-out hover:bg-[#404040] hover:text-white focus-visible:outline-[#3b82f6] active:scale-[0.96]"
      >
        <svg width="20" height="20" viewBox="0 0 16 16" fill="none" aria-hidden>
          <circle
            cx="8"
            cy="8"
            r="6.75"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <path
            d="M8 7.25v4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <circle cx="8" cy="4.75" r="0.9" fill="currentColor" />
        </svg>
      </button>

      <dialog
        ref={ref}
        aria-labelledby="info-title"
        // A click on the backdrop lands on the dialog itself, not its content.
        onClick={(e) => e.target === e.currentTarget && e.currentTarget.close()}
        className="m-auto max-h-[min(88dvh,900px)] w-[min(680px,calc(100vw-24px))] overflow-y-auto overscroll-contain rounded-2xl bg-[#1a1a1a] text-[15px] leading-relaxed text-[#c4c4c4] shadow-[0_0_0_1px_rgb(255_255_255/0.08),0_24px_80px_rgb(0_0_0/0.6)] backdrop:bg-[rgb(0_0_0/0.65)]"
      >
        <div className="px-5 pt-5 pb-8 sm:px-8 sm:pt-7">
          <div className="sticky top-0 z-10 -mx-5 -mt-5 flex items-center justify-between gap-3 bg-[#1a1a1a] px-5 py-3 sm:-mx-8 sm:-mt-7 sm:px-8">
            <span className="font-mono text-[11px] tracking-wider text-[#8a8a8a] uppercase">
              {t.updated}
            </span>
            <button
              type="button"
              aria-label={t.close}
              onClick={() => ref.current?.close()}
              className="-mr-2 grid size-10 cursor-pointer place-items-center rounded-full text-[#a3a3a3] outline-2 outline-transparent transition-[color,background-color] duration-150 ease-out hover:bg-[rgb(128_128_128/0.2)] hover:text-[#f2f2f2] focus-visible:outline-[#3b82f6]"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                aria-hidden
              >
                <path
                  d="M3.5 3.5l9 9m0-9l-9 9"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>

          <h2
            id="info-title"
            className="mt-2 text-3xl leading-[1.05] font-bold tracking-tight text-balance text-[#f2f2f2] sm:text-4xl"
          >
            {t.title}
          </h2>
          <p className="mt-4 text-[17px] leading-snug text-pretty text-[#d6d6d6]">
            {t.lede}
          </p>

          <dl className="mt-7 grid grid-cols-2 gap-x-5 gap-y-5 border-y border-[rgb(255_255_255/0.1)] py-5 sm:grid-cols-4">
            {t.figures.map((f) => (
              <div
                key={f.value}
                className="flex flex-col-reverse justify-end gap-1"
              >
                <dt className="text-[13px] leading-snug text-[#8f8f8f]">
                  {f.label}
                </dt>
                <dd className="text-2xl leading-tight font-bold tracking-tight text-[#f2f2f2] tabular-nums">
                  {f.value}
                </dd>
              </div>
            ))}
          </dl>

          <Section heading={t.timeline.heading}>
            <ol className="border-t border-[rgb(255_255_255/0.1)]">
              {t.timeline.days.map((d) => (
                <li
                  key={d.date}
                  className="grid gap-x-4 gap-y-0.5 border-b border-[rgb(255_255_255/0.1)] py-3 sm:grid-cols-[72px_1fr]"
                >
                  <span className="pt-0.5 font-mono text-[12px] tracking-wide text-[#ff5a70] uppercase">
                    {d.date}
                  </span>
                  <p>
                    {d.lead && (
                      <strong className="font-semibold text-[#f2f2f2]">
                        {d.lead}{" "}
                      </strong>
                    )}
                    {d.text}
                  </p>
                </li>
              ))}
            </ol>
          </Section>

          <Section heading={t.why.heading}>
            <div className="flex flex-col gap-3">
              {t.why.paragraphs.map((p) => (
                <p key={p}>{p}</p>
              ))}
            </div>
          </Section>

          <Section heading={t.people.heading}>
            <ul className="border-t border-[rgb(255_255_255/0.1)]">
              {t.people.list.map((p) => (
                <li
                  key={p.name}
                  className="border-b border-[rgb(255_255_255/0.1)] py-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                    <div>
                      <h4 className="text-[16px] font-semibold text-[#f2f2f2]">
                        {p.name}
                      </h4>
                      <p className="text-[13px] text-[#8f8f8f]">{p.role}</p>
                    </div>
                    <span
                      className={`rounded-sm border px-2 py-1 font-mono text-[10.5px] tracking-wider uppercase ${
                        p.held
                          ? "border-[#ff5a70] bg-[rgb(255_90_112/0.12)] text-[#ff8494]"
                          : "border-[rgb(255_255_255/0.4)] text-[#e0e0e0]"
                      }`}
                    >
                      {p.status}
                    </span>
                  </div>
                  <p className="mt-2">{p.text}</p>
                </li>
              ))}
            </ul>
            <Note>
              <strong className="font-semibold text-[#f2f2f2]">
                {t.people.note.lead}
              </strong>{" "}
              {t.people.note.text}
            </Note>
          </Section>

          <Section heading={t.money.heading}>
            <p className="-mt-2 mb-4 text-[#8f8f8f]">{t.money.sub}</p>
            <dl className="rounded-xl bg-[rgb(255_255_255/0.05)] px-4">
              {t.money.rows.map((r) => (
                <div
                  key={r.amount}
                  className="grid gap-x-4 gap-y-0.5 border-b border-[rgb(255_255_255/0.1)] py-3 last:border-b-0 sm:grid-cols-[170px_1fr]"
                >
                  <dt className="font-mono text-[13px] text-[#f2f2f2] tabular-nums">
                    {r.amount}
                  </dt>
                  <dd>{r.text}</dd>
                </div>
              ))}
            </dl>
            <a
              href={BCP_PAYMENTS}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-block rounded-full bg-[#f2f2f2] px-5 py-3 font-semibold text-[#161616] outline-2 outline-offset-2 outline-transparent transition-[background-color] duration-150 ease-out hover:bg-white focus-visible:outline-[#3b82f6]"
            >
              {t.money.cta}
            </a>
            <Note>{t.money.note}</Note>
          </Section>

          <Section heading={t.response.heading}>
            <ul className="flex flex-col gap-2">
              {t.response.list.map((l) => (
                <li key={l.text}>
                  <strong className="font-semibold text-[#f2f2f2]">
                    {l.lead}
                  </strong>{" "}
                  {l.text}
                </li>
              ))}
            </ul>
          </Section>

          <Section heading={t.unknown.heading}>
            <ul className="flex list-disc flex-col gap-2 pl-5 marker:text-[#6e6e6e]">
              {t.unknown.list.map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
          </Section>

          <Section heading={t.sources}>
            <ol className="list-decimal gap-x-8 pl-5 text-[13px] marker:text-[#6e6e6e] sm:columns-2">
              {SOURCES.map((s) => (
                <li key={s.href} className="mb-1.5 break-inside-avoid">
                  <a
                    href={s.href}
                    target="_blank"
                    rel="noreferrer"
                    className={LINK}
                  >
                    {s.title}
                  </a>
                </li>
              ))}
            </ol>
          </Section>

          <p className="mt-10 border-t border-[rgb(255_255_255/0.1)] pt-5 text-[13px] text-[#8f8f8f]">
            {t.footer}
          </p>
        </div>
      </dialog>
    </>
  );
}
