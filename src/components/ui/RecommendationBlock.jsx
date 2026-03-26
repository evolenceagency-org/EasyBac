import SectionBlock from './SectionBlock.jsx'
import { PrimaryButton } from './Button.jsx'

const RecommendationBlock = ({ title, reason, actionLabel, onAction, badge }) => {
  return (
    <SectionBlock eyebrow="Recommended for you" title={title} description={reason} badge={badge}>
      <div className="flex justify-end">
        <PrimaryButton className="px-3 py-1.5 text-xs" onClick={onAction}>
          {actionLabel}
        </PrimaryButton>
      </div>
    </SectionBlock>
  )
}

export default RecommendationBlock

