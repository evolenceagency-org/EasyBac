import { memo } from 'react'

const SubjectChart = ({ data }) => {
  return (
    <div className="glass rounded-2xl p-6 transition-all duration-300 ease-out hover:border-purple-400/30 hover:shadow-[0_0_20px_rgba(139,92,246,0.2)]">
      <div className="flex items-center justify-between">
        <div>
          <p className="mb-4 text-xs uppercase tracking-wide text-white/70">
            Subject Focus
          </p>
          <h3 className="text-lg font-semibold text-white">Completed Tasks</h3>
        </div>
        <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-200">
          Focus Mix
        </span>
      </div>
      <div className="mt-6 text-sm text-white/70">
        {data ? 'Live task focus is available in Analytics.' : 'No data yet.'}
      </div>
    </div>
  )
}

export default memo(SubjectChart)
