// A short, scrolling feed of what each seat just did, rendered with real card
// images. Display-only; fed by `summarizePlay` diffs held in GameView state.

import Card from './Card'
import { teamColors } from './theme'
import type { PlayEntry } from './playLog'

export default function PlayFeed({ entries }: { entries: PlayEntry[] }) {
  if (entries.length === 0) return null

  return (
    <section className="rounded-md border border-white/10 bg-black/20 p-2">
      <h3 className="mb-1 text-[0.6rem] font-semibold uppercase tracking-wide text-white/40">
        Recent plays
      </h3>
      <ul className="space-y-1">
        {entries.map((e, i) => {
          const c = teamColors(e.teamId)
          return (
            <li
              key={i}
              className={`flex flex-wrap items-center gap-1.5 text-[0.7rem] ${
                i === 0 ? 'text-white' : 'text-white/60'
              }`}
            >
              <span className={`shrink-0 font-semibold ${c.text}`}>
                P{e.seat + 1}
              </span>
              {e.parts.map((part, j) => (
                <span key={j} className="flex items-center gap-1">
                  <span>{part.text}</span>
                  {part.cards?.map((card) => (
                    <Card key={card.id} card={card} size="sm" />
                  ))}
                  {j < e.parts.length - 1 && (
                    <span className="text-white/30">·</span>
                  )}
                </span>
              ))}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
