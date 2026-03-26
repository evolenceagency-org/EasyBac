import { motion } from 'framer-motion'

const SessionConflictModal = ({
  currentModeLabel,
  onContinue,
  onSaveAndSwitch,
  onDiscardAndSwitch
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md rounded-3xl border border-white/[0.12] bg-[#0b0b0f] p-6 shadow-[0_10px_30px_rgba(0,0,0,0.25)]"
      >
        <h4 className="text-xl font-semibold">
          You already have an active study session
        </h4>
        <p className="mt-2 text-sm text-zinc-300">
          Active session: {currentModeLabel}. What would you like to do?
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onContinue}
            className="rounded-full border border-white/[0.06] bg-white/[0.03] px-5 py-2.5 text-sm font-semibold text-white"
          >
            Continue
          </button>
          <button
            type="button"
            onClick={onSaveAndSwitch}
            className="rounded-full bg-[#5B8CFF] px-5 py-2.5 text-sm font-semibold text-white"
          >
            Save & Switch
          </button>
          <button
            type="button"
            onClick={onDiscardAndSwitch}
            className="rounded-full border border-white/[0.06] bg-white/[0.03] px-5 py-2.5 text-sm font-semibold text-white"
          >
            Discard & Switch
          </button>
        </div>
      </motion.div>
    </div>
  )
}

export default SessionConflictModal
