// A short in-app rules/controls explainer, shown from the start screen and from
// a '?' on the table — so a new player isn't reliant on the README.

interface HowToPlayProps {
  onClose: () => void
}

export default function HowToPlay({ onClose }: HowToPlayProps) {
  return (
    <div className="animate-fade-in space-y-3 rounded-lg border border-white/15 bg-green-950/90 p-4 text-sm text-green-50">
      <h2 className="text-base font-bold">How to play</h2>
      <ul className="list-disc space-y-1.5 pl-4 text-[0.8rem] text-green-100/90">
        <li>
          You are <b>P1</b>. The other five seats are bots, in three teams of
          two (your partner sits three seats away).
        </li>
        <li>
          On your turn, first <b>draw</b>: take the stock, or <b>take the pile</b>{' '}
          when offered. A <b>❄ frozen</b> pile needs two natural cards of the top
          card's rank from your hand.
        </li>
        <li>
          Then tap cards to select them and <b>meld</b> (3+ of a rank, ≤3 wilds)
          or <b>lay off</b> onto your team's melds. Your first meld must meet the
          minimum shown.
        </li>
        <li>
          Seven cards of a rank is a <b>canasta</b>. A team needs <b>two
          canastas</b> before it can <b>go out</b>.
        </li>
        <li>
          End your turn by selecting one card and tapping <b>Discard</b>. First
          team to <b>5000</b> points wins.
        </li>
      </ul>
      <button
        type="button"
        onClick={onClose}
        className="w-full rounded-md bg-white/15 px-3 py-1.5 text-sm font-semibold hover:bg-white/25"
      >
        Got it
      </button>
    </div>
  )
}
