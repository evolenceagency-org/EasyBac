import { useEffect, useMemo, useRef } from 'react'

const clampIndex = (value, length) => Math.min(Math.max(value, 0), length - 1)

const OtpCodeInput = ({
  value = '',
  length = 6,
  disabled = false,
  invalid = false,
  onChange
}) => {
  const inputRefs = useRef([])
  const normalizedValue = useMemo(
    () => value.replace(/\D/g, '').slice(0, length),
    [length, value]
  )
  const digits = useMemo(
    () => Array.from({ length }, (_, index) => normalizedValue[index] || ''),
    [length, normalizedValue]
  )

  useEffect(() => {
    if (disabled) return
    const firstEmptyIndex = digits.findIndex((digit) => !digit)
    const nextIndex = firstEmptyIndex === -1 ? length - 1 : firstEmptyIndex
    const nextInput = inputRefs.current[nextIndex]
    nextInput?.focus()
    nextInput?.select()
  }, [digits, disabled, length])

  const emitValue = (nextDigits) => {
    onChange?.(nextDigits.join('').replace(/\D/g, '').slice(0, length))
  }

  const focusIndex = (index) => {
    const safeIndex = clampIndex(index, length)
    const nextInput = inputRefs.current[safeIndex]
    nextInput?.focus()
    nextInput?.select()
  }

  const fillFrom = (startIndex, raw) => {
    const sanitized = raw.replace(/\D/g, '').slice(0, length)
    if (!sanitized) return

    const nextDigits = [...digits]
    sanitized.split('').forEach((char, offset) => {
      const targetIndex = startIndex + offset
      if (targetIndex < length) {
        nextDigits[targetIndex] = char
      }
    })
    emitValue(nextDigits)

    const nextFocusIndex = Math.min(startIndex + sanitized.length, length - 1)
    requestAnimationFrame(() => focusIndex(nextFocusIndex))
  }

  const handleChange = (index, nextValue) => {
    const sanitized = nextValue.replace(/\D/g, '')
    if (!sanitized) {
      const nextDigits = [...digits]
      nextDigits[index] = ''
      emitValue(nextDigits)
      return
    }

    if (sanitized.length > 1) {
      fillFrom(index, sanitized)
      return
    }

    const nextDigits = [...digits]
    nextDigits[index] = sanitized
    emitValue(nextDigits)

    if (index < length - 1) {
      requestAnimationFrame(() => focusIndex(index + 1))
    }
  }

  const handleKeyDown = (index, event) => {
    if (event.key === 'Backspace') {
      event.preventDefault()
      const nextDigits = [...digits]

      if (nextDigits[index]) {
        nextDigits[index] = ''
        emitValue(nextDigits)
        return
      }

      if (index > 0) {
        nextDigits[index - 1] = ''
        emitValue(nextDigits)
        requestAnimationFrame(() => focusIndex(index - 1))
      }
      return
    }

    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      focusIndex(index - 1)
      return
    }

    if (event.key === 'ArrowRight') {
      event.preventDefault()
      focusIndex(index + 1)
    }
  }

  const handlePaste = (event) => {
    event.preventDefault()
    const pasted = event.clipboardData.getData('text')
    fillFrom(0, pasted)
  }

  return (
    <div
      className="flex items-center justify-between gap-2 sm:gap-3"
      onPaste={handlePaste}
    >
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(node) => {
            inputRefs.current[index] = node
          }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete={index === 0 ? 'one-time-code' : 'off'}
          enterKeyHint="done"
          value={digit}
          disabled={disabled}
          onChange={(event) => handleChange(index, event.target.value)}
          onKeyDown={(event) => handleKeyDown(index, event)}
          onFocus={(event) => event.target.select()}
          className={`h-14 w-11 rounded-2xl border text-center text-xl font-semibold tracking-tight text-white transition duration-200 ease-out outline-none sm:h-16 sm:w-12 sm:text-2xl ${
            invalid
              ? 'border-red-400/70 bg-red-500/[0.08] shadow-[0_0_0_1px_rgba(248,113,113,0.18)]'
              : 'border-white/[0.08] bg-white/[0.04] focus:border-[#8b5cf6]/60 focus:bg-white/[0.055] focus:shadow-[0_0_0_1px_rgba(139,92,246,0.22)]'
          } ${disabled ? 'cursor-not-allowed opacity-70' : 'focus:scale-[1.03]'}`}
          aria-label={`Verification digit ${index + 1}`}
        />
      ))}
    </div>
  )
}

export default OtpCodeInput
