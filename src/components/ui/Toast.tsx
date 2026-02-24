import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';

interface ToastProps {
  message: string;
  visible: boolean;
  onClose: () => void;
}

export default function Toast({ message, visible, onClose }: ToastProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (visible) {
      setShow(true);
      const timer = setTimeout(() => {
        setShow(false);
        setTimeout(onClose, 200);
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [visible, onClose]);

  if (!visible && !show) return null;

  return (
    <div
      className={`fixed top-6 right-6 z-[100] flex items-center gap-2 px-4 py-3 rounded-lg bg-carapace-bg-raised border border-carapace-border shadow-lg transition-all duration-200 ${
        show ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
      }`}
    >
      <div className="w-5 h-5 rounded-full bg-[rgba(34,197,94,0.15)] flex items-center justify-center">
        <Check className="w-3 h-3 text-carapace-green" />
      </div>
      <span className="text-sm text-carapace-text-primary">{message}</span>
    </div>
  );
}
