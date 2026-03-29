import { motion } from 'framer-motion'
import { Plus, Search, SlidersHorizontal } from 'lucide-react'
import { GhostButton, IconButton, PrimaryButton, SegmentedControl } from '../ui/index.js'

const viewOptions = [
  { label: 'List', value: 'list' },
  { label: 'Calendar', value: 'calendar' }
]

const Header = ({
  viewMode,
  setViewMode,
  onOpenPalette,
  onOpenAiControl,
  onToggleCreate,
  createOpen = false,
  searchTerm,
  subjectFilterLabel,
  statusFilterLabel,
  dueFilterLabel,
  sortLabel,
  onClearFilters
}) => {
  const hasFilters = Boolean(searchTerm || subjectFilterLabel || statusFilterLabel || dueFilterLabel || sortLabel)
  const filterSummary = [subjectFilterLabel, statusFilterLabel, dueFilterLabel, sortLabel].filter(Boolean)

  return (
    <section className="rounded-3xl border border-white/[0.08] bg-[#0b0b0f] p-5 shadow-[0_10px_30px_rgba(0,0,0,0.25)] md:p-6">
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.24em] text-white/45">Tasks</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white">Keep today clear and focused</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/65">
              Capture the next task, keep priorities visible, and start the right session without leaving the page.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 md:max-w-[360px] md:justify-end">
            <SegmentedControl
              value={viewMode}
              onChange={setViewMode}
              options={viewOptions}
              className="shrink-0"
            />

            <IconButton onClick={onOpenPalette} aria-label="Search tasks">
              <Search className="h-4 w-4" />
            </IconButton>

            <IconButton onClick={onOpenAiControl} aria-label="Open AI control center">
              <SlidersHorizontal className="h-4 w-4" />
            </IconButton>

            <PrimaryButton onClick={onToggleCreate} className="px-3.5 py-2 text-xs">
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              {createOpen ? 'Close' : 'Add Task'}
            </PrimaryButton>
          </div>
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex min-h-[28px] flex-wrap items-center gap-2">
            {filterSummary.length > 0 ? (
              filterSummary.map((label) => (
                <motion.span
                  key={label}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1 text-[11px] text-white/70"
                >
                  {label}
                </motion.span>
              ))
            ) : (
              <p className="text-xs text-white/45">No filters applied. You’re seeing the full plan.</p>
            )}
          </div>

          {hasFilters ? (
            <GhostButton onClick={onClearFilters} className="self-start px-2.5 py-1 text-[11px] md:self-auto">
              Clear filters
            </GhostButton>
          ) : null}
        </div>
      </div>
    </section>
  )
}

export default Header
