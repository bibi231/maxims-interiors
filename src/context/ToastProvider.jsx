import { useState, useCallback } from 'react'
import { toastContext as ToastContext } from './ToastContext'

let _id = 0

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const removeToast = useCallback((id) => {
    setToasts((t) => t.filter((x) => x.id !== id))
  }, [])

  const addToast = useCallback((toast) => {
    const id = ++_id
    setToasts((t) => [...t, { id, duration: 5000, ...toast }])
    if (toast.duration !== 0) {
      setTimeout(() => removeToast(id), toast.duration ?? 5000)
    }
    return id
  }, [removeToast])

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
    </ToastContext.Provider>
  )
}
