import React, { createContext, useContext, useState, useCallback } from 'react';

export type ToastType = 'success' | 'warning' | 'danger' | 'info';

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast deve ser usado dentro de um ToastProvider');
  return context;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    
    // Auto-remover após 4.5 segundos
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="toast-container">
        {toasts.map(toast => {
          let icon = 'ℹ️';
          if (toast.type === 'success') icon = '✅';
          if (toast.type === 'warning') icon = '⚠️';
          if (toast.type === 'danger') icon = '❌';

          return (
            <div key={toast.id} className={`toast ${toast.type}`}>
              <div>{icon}</div>
              <div dangerouslySetInnerHTML={{ __html: toast.message }} />
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};
