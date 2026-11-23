import React from 'react';
import { DivideIcon as LucideIcon } from 'lucide-react';

interface SystemStatusCardProps {
  title: string;
  value: string;
  change: string;
  icon: LucideIcon;
  color: 'green' | 'blue' | 'red' | 'yellow';
}

export const SystemStatusCard: React.FC<SystemStatusCardProps> = ({
  title,
  value,
  change,
  icon: Icon,
  color,
}) => {
  const colorClasses = {
    green: 'text-green-400 bg-green-400/10 border-green-400/20',
    blue: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
    red: 'text-red-400 bg-red-400/10 border-red-400/20',
    yellow: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
  };

  const isPositive = change.startsWith('+');
  const changeColor = isPositive ? 'text-green-400' : 'text-red-400';

  return (
    <div className={`bg-gray-800 border border-gray-700 rounded-lg p-6 hover:border-${color}-400/30 transition-all duration-200 group`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-400 mb-1">{title}</p>
          <div className="flex items-center space-x-2">
            <p className="text-2xl font-bold text-white">{value}</p>
            <span className={`text-sm ${changeColor}`}>{change}</span>
          </div>
        </div>
        <div className={`p-3 rounded-lg ${colorClasses[color]} group-hover:scale-110 transition-transform`}>
          <Icon size={24} />
        </div>
      </div>
    </div>
  );
};