'use client'

import { useState, useEffect, useCallback } from 'react'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

interface Toast {
  id: string
  message: string
  type: ToastType
}

interface ToastContextType {
  toasts: Toast[]
  showToast: (message: string, type?: ToastType) => void
  removeToast: (id: string) => void
}

// Toast Provider Component
export default function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }, [])

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9)
    setToasts((prev) => [...prev, { id, message, type }])
    
    // Auto remove after 3 seconds
    setTimeout(() => {
      removeToast(id)
    }, 3000)
  }, [removeToast])

  // Make showToast available globally
  useEffect(() => {
    if (typeof window !== 'undefined') {
      ;(window as any).showToast = showToast
    }
    return () => {
      if (typeof window !== 'undefined') {
        delete (window as any).showToast
      }
    }
  }, [showToast])

  return (
    <>
      {children}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto min-w-[300px] max-w-md px-4 py-3 rounded-lg shadow-lg border flex items-center space-x-3 animate-slide-in ${
              toast.type === 'success'
                ? 'bg-green-900/90 border-green-700 text-green-100'
                : toast.type === 'error'
                ? 'bg-red-900/90 border-red-700 text-red-100'
                : toast.type === 'warning'
                ? 'bg-amber-900/90 border-amber-700 text-amber-100'
                : 'bg-blue-900/90 border-blue-700 text-blue-100'
            }`}
          >
            <div className="flex-shrink-0">
              {toast.type === 'success' && (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
              {toast.type === 'error' && (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
              {toast.type === 'warning' && (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              )}
              {toast.type === 'info' && (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
            </div>
            <p className="flex-1 text-sm font-medium">{toast.message}</p>
            <button
              onClick={() => removeToast(toast.id)}
              className="flex-shrink-0 text-current opacity-70 hover:opacity-100"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </>
  )
}

// Hook to use toast
export function useToast() {
  const showToast = (message: string, type: ToastType = 'info') => {
    if (typeof window !== 'undefined' && (window as any).showToast) {
      ;(window as any).showToast(message, type)
    } else {
      // Fallback to alert if toast not available
      alert(message)
    }
  }

  return { showToast }
}

// Global function for easy access
export const showToast = (message: string, type: ToastType = 'info') => {
  if (typeof window !== 'undefined' && (window as any).showToast) {
    ;(window as any).showToast(message, type)
  } else {
    alert(message)
  }
}

