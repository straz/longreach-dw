import { useEffect, useRef, useState } from 'react'
import { formatDate } from '../../domain/format.ts'

// Fields edited where they are shown: text that becomes an input when chosen, enums as a select, days as a date
// input. Enter keeps the change and Escape drops it; nothing is written until then.

export function InlineText({ value, placeholder, label, onSave, open, onOpen, onClose, disabled, multiline = false, className = '' }: {
  value: string | undefined
  placeholder: string
  label: string
  onSave: (next: string) => void
  open?: boolean
  onOpen?: () => void
  onClose?: () => void
  disabled?: boolean
  multiline?: boolean
  className?: string
}) {
  const [own, setOwn] = useState(false)
  const editing = open ?? own
  const [text, setText] = useState(value ?? '')
  const ref = useRef<HTMLTextAreaElement & HTMLInputElement>(null)
  useEffect(() => {
    if (editing) {
      setText(value ?? '')
      ref.current?.focus()
      ref.current?.select()
    }
  }, [editing, value])
  const close = () => (onClose ? onClose() : setOwn(false))
  const keep = () => {
    const next = text.trim()
    close()
    if (next !== (value ?? '').trim()) onSave(next)
  }
  if (!editing) {
    return (
      <button
        type="button"
        className={`inline-text ${value ? '' : 'is-empty'} ${className}`}
        aria-label={`${label}: ${value || 'none yet'}. Change it`}
        disabled={disabled}
        onClick={() => (onOpen ? onOpen() : setOwn(true))}
      >
        {value || placeholder}
      </button>
    )
  }
  const props = {
    ref,
    value: text,
    'aria-label': label,
    placeholder,
    className: `inline-input ${className}`,
    onChange: (e: { target: { value: string } }) => setText(e.target.value),
    onBlur: keep,
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        keep()
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        close()
      }
    },
  }
  return multiline ? <textarea rows={2} {...props} /> : <input {...props} />
}

export function InlineSelect({ value, values, label, onSave, disabled, empty = 'not set' }: {
  value: string | undefined
  values: readonly string[]
  label: string
  onSave: (next: string | null) => void
  disabled?: boolean
  empty?: string
}) {
  return (
    <select className={`inline-select ${value ? '' : 'is-empty'}`} aria-label={label} value={value ?? ''} disabled={disabled} onChange={(e) => onSave(e.target.value || null)}>
      <option value="">{empty}</option>
      {values.map((v) => (
        <option key={v} value={v}>
          {v.replaceAll('_', ' ')}
        </option>
      ))}
    </select>
  )
}

/** A day, shown back as words ("Sep 30, 2027") once kept. */
export function InlineDay({ value, label, onSave, disabled, placeholder = 'add a date' }: { value: string | undefined; label: string; onSave: (day: string | null) => void; disabled?: boolean; placeholder?: string }) {
  const [editing, setEditing] = useState(false)
  const day = value?.slice(0, 10)
  if (!editing) {
    return (
      <button type="button" className={`inline-text ${day ? '' : 'is-empty'}`} aria-label={`${label}: ${day ? formatDate(day, { long: true }) : 'none yet'}. Change it`} disabled={disabled} onClick={() => setEditing(true)}>
        {day ? formatDate(day, { long: true }) : placeholder}
      </button>
    )
  }
  return (
    <input
      type="date"
      className="inline-input is-date"
      aria-label={label}
      autoFocus
      defaultValue={day}
      onBlur={(e) => {
        setEditing(false)
        if ((e.target.value || null) !== (day ?? null)) onSave(e.target.value || null)
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
        if (e.key === 'Escape') setEditing(false)
      }}
    />
  )
}
