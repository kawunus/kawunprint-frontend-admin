import React, { useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

interface InputProps {
  label?: string;
  error?: string;
  /** render a textarea instead of input */
  multiline?: boolean;
  /** number of rows when multiline */
  rows?: number;
  className?: string;
  // allow other native props (input/textarea) — use index signature to avoid type conflicts
  [key: string]: any;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  className = '',
  multiline = false,
  rows,
  ...props
}) => {
  const max = props.maxLength as number | undefined;
  const value = props.value ?? '';
  const length = typeof value === 'string' ? value.length : 0;
  const reached = typeof max === 'number' && length >= max;
  const { t } = useTranslation();

  const baseClasses = `w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${error ? 'border-red-500' : ''} ${className}`;

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!multiline) return;
    const el = textareaRef.current;
    if (!el) return;
    // adjust height to content
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
  }, [multiline, value]);

  const adjustHeight = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
  };

  return (
    <div className="mb-4">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      {multiline ? (
        <textarea
          ref={textareaRef}
          className={baseClasses + ' resize-vertical overflow-hidden'}
          rows={rows ?? 4}
          onInput={(e) => {
            adjustHeight();
            const orig = (props as any).onInput;
            if (typeof orig === 'function') orig(e);
          }}
          {...(props as React.TextareaHTMLAttributes<HTMLTextAreaElement>)}
        />
      ) : (
        <input className={baseClasses} {...(props as React.InputHTMLAttributes<HTMLInputElement>)} />
      )}

      <div className="flex items-center justify-between">
        {error ? (
          <p className="mt-1 text-sm text-red-600">{error}</p>
        ) : (
          <div />
        )}
        {typeof max === 'number' && (
          <p className={"mt-1 text-sm " + (reached ? 'text-red-600' : 'text-gray-500')}>
            {length} / {max}{reached ? ` — ${t('input.maximumReached')}` : ''}
          </p>
        )}
      </div>
    </div>
  );
};