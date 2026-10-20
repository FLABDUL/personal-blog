import React, { useEffect, useRef } from "react"
export default function Modal({ children, labelId, onClose, className = "" }) {
  const dialog = useRef(null)
  const opener = useRef(
    typeof document === "undefined" ? null : document.activeElement,
  )
  const close = useRef(onClose)
  close.current = onClose
  useEffect(() => {
    const element = dialog.current
    const trigger = opener.current
    const overflow = document.body.style.overflow
    element.showModal()
    document.body.style.overflow = "hidden"
    return () => {
      element.close()
      document.body.style.overflow = overflow
      if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus()
    }
  }, [])
  return (
    <dialog
      ref={dialog}
      className={`detail-dialog ${className}`}
      aria-labelledby={labelId}
      aria-modal="true"
      onKeyDown={event => {
        if (event.key !== "Tab") return
        const controls = [
          ...dialog.current.querySelectorAll(
            'button, a[href], input, select, textarea, [tabindex="0"]',
          ),
        ].filter(
          element => !element.disabled && element.getClientRects().length,
        )
        const first = controls[0]
        const last = controls[controls.length - 1]
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last?.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first?.focus()
        }
      }}
      onCancel={event => {
        event.preventDefault()
        close.current()
      }}
      onClick={event => {
        if (event.target === event.currentTarget) close.current()
      }}
    >
      <div className="detail-dialog__inside">
        <button
          className="dialog-close"
          type="button"
          autoFocus
          onClick={onClose}
          aria-label="Close details"
        >
          Close <span aria-hidden="true">×</span>
        </button>
        {children}
      </div>
    </dialog>
  )
}
