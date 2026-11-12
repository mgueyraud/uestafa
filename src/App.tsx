import { useEffect, useState } from 'react'
import { DialRoot } from 'dialkit'
import 'dialkit/styles.css'
import InfoDialog from './components/InfoDialog'
import UenoCard from './components/UenoCard'
import { STRINGS, StringsContext, storeLang, storedLang, type Lang } from './i18n'

const LANGS: { id: Lang; label: string; name: string }[] = [
  { id: 'es', label: 'ES', name: 'Español' },
  { id: 'en', label: 'EN', name: 'English' },
]

export default function App() {
  const [lang, setLang] = useState<Lang>(storedLang)
  const t = STRINGS[lang]
  useEffect(() => {
    document.documentElement.lang = lang
    storeLang(lang)
  }, [lang])

  return (
    <StringsContext.Provider value={t}>
      <main className="flex min-h-dvh flex-col items-center font-sans antialiased">
        <div className="flex w-full flex-wrap items-center gap-2 p-4">
          <InfoDialog lang={lang} />
          <div
            role="radiogroup"
            aria-label={t.language}
            className="flex gap-0.5 rounded-full bg-[rgb(128_128_128/0.16)] p-0.5 font-mono text-[11px] text-[#8a8a8a]"
          >
            {LANGS.map((l) => (
              <label key={l.id} className="cursor-pointer">
                <input
                  type="radio"
                  name="uestafa-lang"
                  className="peer sr-only"
                  checked={l.id === lang}
                  onChange={() => setLang(l.id)}
                />
                <span className="sr-only">{l.name}</span>
                <span
                  aria-hidden
                  className="block rounded-full px-3 py-2 outline-2 outline-transparent transition-[color,background-color] duration-150 ease-out peer-checked:bg-[rgb(128_128_128/0.3)] peer-checked:text-[#f2f2f2] peer-focus-visible:outline-[#3b82f6] hover:text-[#f2f2f2]"
                >
                  {l.label}
                </span>
              </label>
            ))}
          </div>
        </div>
        <header className="flex max-w-md flex-col items-center gap-3 px-6 pt-6 text-center sm:pt-10">
          <h1 className="text-4xl font-bold tracking-tight">uestafa</h1>
          <p className="text-[15px] leading-snug text-pretty text-[#a3a3a3]">
            {t.description}
          </p>
        </header>
        <UenoCard />
        {/* The tuning panel is a development tool; visitors get the defaults. */}
        {import.meta.env.DEV && <DialRoot theme="dark" />}
      </main>
    </StringsContext.Provider>
  )
}
