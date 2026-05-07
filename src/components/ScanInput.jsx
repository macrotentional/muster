import { useState, useRef, useEffect } from 'react'

export default function ScanInput({ onScan, placeholder = 'Scan or type asset tag…', autoFocus = true }) {
  const [value, setValue] = useState('')
  const [feedback, setFeedback] = useState(null)
  const inputRef = useRef(null)
  const feedbackTimer = useRef(null)

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus()
    return () => clearTimeout(feedbackTimer.current)
  }, [autoFocus])

  function showFeedback(fb) {
    clearTimeout(feedbackTimer.current)
    setFeedback(fb)
    feedbackTimer.current = setTimeout(() => setFeedback(null), 2500)
  }

  function handleKeyDown(e) {
    if (e.key !== 'Enter') return
    e.preventDefault()
    const code = value.trim()
    setValue('')
    if (!code) return
    const result = onScan(code)
    if (result) showFeedback(result)
    inputRef.current?.focus()
  }

  return (
    <div className="scan-input">
      <div className="scan-field-wrap">
        <span className="scan-icon" aria-hidden="true">▌▍</span>
        <input
          ref={inputRef}
          className="scan-field"
          type="text"
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          spellCheck={false}
        />
      </div>
      {feedback && (
        <div className={`scan-feedback ${feedback.ok ? 'success' : 'error'}`}>
          {feedback.text}
        </div>
      )}
    </div>
  )
}
