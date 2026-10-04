import { createContext, useContext } from 'react'

export const toastContext = createContext(null)

export function useToast() {
  const ctx = useContext(toastContext)
  if (!ctx) throw new Error('useToast must be used inside ToastProvider')
  return ctx
}
