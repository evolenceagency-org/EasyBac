import { GhostButton, PrimaryButton, SecondaryButton } from './ui/Button.jsx'

const LiquidButton = ({
  children,
  variant = 'primary',
  onClick,
  className,
  type = 'button',
  ...props
}) => {
  const Component =
    variant === 'secondary' ? SecondaryButton : variant === 'ghost' ? GhostButton : PrimaryButton

  return (
    <Component
      type={type}
      onClick={onClick}
      className={className}
      {...props}
    >
      {children}
    </Component>
  )
}

export default LiquidButton
