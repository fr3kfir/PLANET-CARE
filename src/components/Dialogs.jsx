import { useEffect, useState } from 'react'

// In-app replacements for confirm()/prompt()/alert(), which some hosts (the Claude
// artifact viewer) silently block. Usage: `if (await askConfirm({...})) ...`.
let show = null

function open(dialog) {
  return new Promise(resolve => {
    if (!show) return resolve(dialog.input !== undefined ? null : false)
    show({ ...dialog, resolve })
  })
}

export const askConfirm = ({ title, message, confirmText = 'אישור', danger = false }) =>
  open({ title, message, confirmText, danger })

export const askText = ({ title, message, value = '', placeholder = '', confirmText = 'שמירה' }) =>
  open({ title, message, input: value, placeholder, confirmText })

export const notify = ({ title, message }) => open({ title, message, confirmText: 'הבנתי', alertOnly: true })

export function DialogHost() {
  const [dialog, setDialog] = useState(null)
  const [value, setValue] = useState('')

  useEffect(() => {
    show = d => {
      setValue(d.input ?? '')
      setDialog(d)
    }
    return () => { show = null }
  }, [])

  if (!dialog) return null
  const isPrompt = dialog.input !== undefined
  const close = result => {
    dialog.resolve(result)
    setDialog(null)
  }
  const ok = () => close(isPrompt ? (value.trim() || null) : true)
  const cancel = () => close(isPrompt ? null : false)

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/40 p-4" onClick={cancel}>
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        className="w-full max-w-sm rounded-3xl bg-white p-5 space-y-4 shadow-2xl mb-[env(safe-area-inset-bottom)]"
        onClick={e => e.stopPropagation()}
        onSubmit={e => { e.preventDefault(); ok() }}
      >
        <div className="space-y-1">
          <h2 id="dialog-title" className="text-lg font-extrabold text-stone-900">{dialog.title}</h2>
          {dialog.message && <p className="text-sm text-stone-600">{dialog.message}</p>}
        </div>
        {isPrompt && (
          <input
            id="dialog-input"
            autoFocus
            value={value}
            placeholder={dialog.placeholder}
            onChange={e => setValue(e.target.value)}
            className="w-full rounded-2xl border border-stone-200 px-4 py-3 text-[15px] focus:outline-mint-500"
          />
        )}
        <div className={`grid gap-2 ${dialog.alertOnly ? '' : 'grid-cols-2'}`}>
          <button type="submit" autoFocus={!isPrompt} className={`btn ${dialog.danger ? 'bg-red-600 text-white' : 'bg-mint-500 text-white'}`}>
            {dialog.confirmText}
          </button>
          {!dialog.alertOnly && <button type="button" className="btn-ghost" onClick={cancel}>ביטול</button>}
        </div>
      </form>
    </div>
  )
}
