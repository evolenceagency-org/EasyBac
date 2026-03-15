import { memo } from 'react'

const SubjectChart = ({ data }) => {
  return (
    <div className="glass rounded-2xl p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-400">
            Subject Focus
          </p>
          <h3 className="mt-2 text-lg font-semibold">Completed Tasks</h3>
        </div>
        <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs text-emerald-200">
          Focus Mix
        </span>
      </div>
      <div className="mt-6 text-sm text-zinc-300">
        {data ? 'Live task focus is available in Analytics.' : 'No data yet.'}
      </div>
    </div>
  )
}

export default memo(SubjectChart)
