// One laid-down meld: its cards overlapped, with a canasta badge when complete.

import { canastaType } from '../engine/melds'
import type { Meld } from '../engine/types'
import Card from './Card'

export default function MeldView({ meld }: { meld: Meld }) {
  const type = canastaType(meld)
  return (
    <div className="flex items-center gap-1">
      <div className="flex">
        {meld.cards.map((c, i) => (
          <div key={c.id} className={i === 0 ? '' : '-ml-4'}>
            <Card card={c} size="sm" />
          </div>
        ))}
      </div>
      {type && (
        <span
          className={`rounded px-1 text-[0.55rem] font-bold uppercase ${
            type === 'natural'
              ? 'bg-yellow-300 text-yellow-900'
              : 'bg-slate-200 text-slate-700'
          }`}
          title={`${type} canasta`}
        >
          {type === 'natural' ? '500' : '300'}
        </span>
      )}
    </div>
  )
}
