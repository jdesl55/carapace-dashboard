import type { ReactNode } from 'react';

interface FormLabelProps {
  children: ReactNode;
  htmlFor?: string;
}

export default function FormLabel({ children, htmlFor }: FormLabelProps) {
  return (
    <label
      htmlFor={htmlFor}
      className="block text-xs font-medium uppercase tracking-[0.05em] text-carapace-text-secondary mb-2"
    >
      {children}
    </label>
  );
}
