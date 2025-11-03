import React from 'react';
import { useTranslation } from 'react-i18next';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  className = '',
  ...props
}) => {
  const max = props.maxLength;
  const value = props.value ?? '';
  const length = typeof value === 'string' ? value.length : 0;
  const reached = typeof max === 'number' && length >= max;
  const { t } = useTranslation();

  return (
    <div className="mb-4">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      <input
        className={`
          w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm 
          focus:outline-none focus:ring-blue-500 focus:border-blue-500
          ${error ? 'border-red-500' : ''}
          ${className}
        `}
        {...props}
      />
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