import { createContext, useContext, useState, useCallback } from 'react'

const ToastCtx = createContext({ notify: () => {} })

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const notify = useCallback((msg, type = 'info', ttl = 3500) => {
    const id = Date.now() + Math.random()
    setToasts(prev => [...prev, { id, msg, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), ttl)
  }, [])
  return (
    <ToastCtx.Provider value={{ notify }}>
      {children}
      <div className="fixed top-4 right-4 space-y-2 z-50">
        {toasts.map(t => (
          <div key={t.id} className={
            `px-4 py-2 rounded shadow text-sm text-white ${t.type==='error'?'bg-red-600':t.type==='success'?'bg-green-600':'bg-gray-800'}`
          }>
            {t.msg}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}

export function useToast() {
  return useContext(ToastCtx)
}

