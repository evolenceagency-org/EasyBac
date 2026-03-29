import { Sparkles } from 'lucide-react'
import { PrimaryButton, SectionBlock } from '../ui/index.js'

const RecommendationBlock = ({ title, reason, buttonLabel, onAction }) => {
  return (
    <SectionBlock eyebrow="Assistant recommendation" className="border-[#8b5cf6]/18 bg-[#8b5cf6]/[0.07]">
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/[0.05] text-[#d8b4fe]">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="space-y-1">
            <p className="text-[15px] font-medium text-[#F8FAFC]">{title}</p>
            <p className="max-w-2xl text-sm leading-6 text-[#C7D0DC]">{reason}</p>
          </div>
        </div>

        <div className="flex justify-end">
          <PrimaryButton className="px-3.5 py-2 text-xs" onClick={onAction}>
            {buttonLabel}
          </PrimaryButton>
        </div>
      </div>
    </SectionBlock>
  )
}

export default RecommendationBlock
