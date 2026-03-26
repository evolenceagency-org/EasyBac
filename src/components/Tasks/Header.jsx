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

  return (
    <section className="space-y-3">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.24em] text-[#8B96A8]">Tasks</p>
          <h1 className="mt-1 text-[24px] font-semibold tracking-tight text-[#F8FAFC] md:text-[28px]">
            Tasks
          </h1>
        </div>

        <div className="flex items-center gap-2 md:shrink-0">
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

      <div className="flex items-center justify-between gap-3">
        <p className="min-w-0 text-xs leading-5 text-[#8B96A8]">
          Keep the list short, start the right session, and let the AI surface the next step.
        </p>

        {hasFilters ? (
          <GhostButton onClick={onClearFilters} className="px-2.5 py-1 text-[11px]">
            Clear filters
          </GhostButton>
        ) : null}
      </div>
    </section>
  )
}

export default Header
