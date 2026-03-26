import { PrimaryButton, SectionBlock } from '../ui/index.js'

const RecommendationBlock = ({ title, reason, buttonLabel, onAction }) => {
  return (
    <SectionBlock eyebrow="Recommended for you" className="bg-white/[0.025]">
      <div className="space-y-3">
        <div className="space-y-1">
          <p className="text-[15px] font-medium text-[#F8FAFC]">{title}</p>
          <p className="max-w-2xl text-sm leading-6 text-[#C7D0DC]">{reason}</p>
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
