import React from 'react';

interface TagChipProps {
  name: string;
  color?: string;
  className?: string;
}

const DEFAULT_COLOR = '#3B82F6';

const hexToRgba = (hex: string, alpha: number) => {
  try {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  } catch {
    return `rgba(59, 130, 246, ${alpha})`;
  }
};

const TagChip: React.FC<TagChipProps> = ({ name, color, className }) => {
  const c = color || DEFAULT_COLOR;
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${className || ''}`}
      style={{ backgroundColor: hexToRgba(c, 0.12), color: c }}
    >
      {name}
    </span>
  );
};

export default TagChip;
