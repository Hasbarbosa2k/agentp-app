import React from 'react';

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  color?: 'green' | 'blue' | 'purple' | 'pink' | 'orange';
}

export const Toggle: React.FC<ToggleProps> = ({
  checked,
  onChange,
  disabled = false,
  size = 'md',
  color = 'green'
}) => {
  const sizeClasses = {
    sm: {
      track: 'w-8 h-4',
      thumb: 'w-3 h-3',
      translate: checked ? 'translate-x-4' : 'translate-x-0.5'
    },
    md: {
      track: 'w-11 h-6',
      thumb: 'w-5 h-5',
      translate: checked ? 'translate-x-5' : 'translate-x-0.5'
    },
    lg: {
      track: 'w-14 h-7',
      thumb: 'w-6 h-6',
      translate: checked ? 'translate-x-7' : 'translate-x-0.5'
    }
  };

  const colorClasses = {
    green: checked ? 'bg-green-400' : 'bg-gray-600',
    blue: checked ? 'bg-blue-400' : 'bg-gray-600',
    purple: checked ? 'bg-purple-400' : 'bg-gray-600',
    pink: checked ? 'bg-pink-400' : 'bg-gray-600',
    orange: checked ? 'bg-orange-400' : 'bg-gray-600'
  };

  const currentSize = sizeClasses[size];
  const currentColor = colorClasses[color];

  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={`
        relative inline-flex items-center
        ${currentSize.track}
        ${currentColor}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        rounded-full border-2 border-transparent
        transition-colors duration-200 ease-in-out
        focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800
        ${color === 'green' ? 'focus:ring-green-400' : 
          color === 'blue' ? 'focus:ring-blue-400' :
          color === 'purple' ? 'focus:ring-purple-400' : 
          color === 'pink' ? 'focus:ring-pink-400' : 'focus:ring-orange-400'}
        hover:shadow-lg hover:scale-105
        active:scale-95
      `}
      role="switch"
      aria-checked={checked}
    >
      <span className="sr-only">Toggle switch</span>
      <span
        className={`
          ${currentSize.thumb}
          bg-white rounded-full shadow-lg
          transform transition-transform duration-200 ease-in-out
          ${currentSize.translate}
          ${checked ? 'shadow-lg' : 'shadow-md'}
          flex items-center justify-center
        `}
      >
        {/* Optional checkmark icon when checked */}
        {checked && (
          <svg
            className="w-3 h-3 text-gray-600"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
        )}
      </span>
    </button>
  );
}; 