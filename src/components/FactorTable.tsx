export interface ExplainedFactor {
  key: string
  label: string
  weight: number
  value: number
  contribution: number
  reason: string
}

/** Every factor with its weight, value and reason; the score is the sum of the points (MATCH-6). */
export function FactorTable({ factors, score }: { factors: ExplainedFactor[]; score: number }) {
  return (
    <table className="stack w-full text-left text-sm">
      <caption className="mb-2 text-left text-sm text-muted">
        The score is the sum of each factor’s weight × value (0 to 1), rounded.
      </caption>
      <thead className="text-xs tracking-wide text-muted uppercase">
        <tr>
          <th scope="col" className="py-2 pr-3">Factor</th>
          <th scope="col" className="py-2 pr-3">Reason</th>
          <th scope="col" className="py-2 pr-3 text-right">Value</th>
          <th scope="col" className="py-2 pr-3 text-right">Weight</th>
          <th scope="col" className="py-2 text-right">Points</th>
        </tr>
      </thead>
      <tbody>
        {factors.map((f) => (
          <tr key={f.key}>
            <th scope="row" className="border-t border-line py-2 pr-3 font-semibold">
              {f.label}
            </th>
            <td data-label="Reason" className="border-t border-line py-2 pr-3">
              {f.reason}
            </td>
            <td data-label="Value" className="border-t border-line py-2 pr-3 font-mono md:text-right">
              {f.value.toFixed(2)}
            </td>
            <td data-label="Weight" className="border-t border-line py-2 pr-3 font-mono md:text-right">
              × {f.weight}
            </td>
            <td data-label="Points" className="border-t border-line py-2 font-mono font-bold md:text-right">
              {f.contribution}
            </td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr>
          <th scope="row" colSpan={4} className="border-t-2 border-line-strong/60 py-2 text-right max-md:text-left">
            Score
          </th>
          <td className="border-t-2 border-line-strong/60 py-2 font-mono font-bold md:text-right">{score} / 100</td>
        </tr>
      </tfoot>
    </table>
  )
}
