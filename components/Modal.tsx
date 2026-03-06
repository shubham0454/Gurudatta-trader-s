'use client'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  /** Set to 'wide' for forms with many fields (e.g. Create Bill) */
  size?: 'default' | 'wide'
}

export default function Modal({ isOpen, onClose, title, children, size = 'default' }: ModalProps) {
  if (!isOpen) return null

  const maxWidthClass = size === 'wide' ? 'sm:max-w-2xl lg:max-w-4xl' : 'sm:max-w-lg'

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto" aria-modal="true" role="dialog">
      {/* Backdrop with blur */}
      <div
        className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Centered container - same as ConfirmModal for consistent centering */}
      <div className="flex min-h-full items-center justify-center p-3 sm:p-4">
        <div
          className={`relative z-10 w-full ${maxWidthClass} max-h-[90vh] sm:max-h-[85vh] flex flex-col rounded-lg bg-slate-800 text-left shadow-xl border border-slate-700 overflow-hidden`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-slate-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4 flex-shrink-0">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-base sm:text-lg font-medium text-white truncate pr-2">{title}</h3>
              <button
                type="button"
                onClick={onClose}
                className="text-slate-400 hover:text-slate-200 p-1 min-w-[2.5rem] min-h-[2.5rem] flex items-center justify-center rounded shrink-0"
                aria-label="Close"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          <div className="overflow-y-auto flex-1 min-h-0 px-4 pb-4 sm:px-6 sm:pb-6">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}

