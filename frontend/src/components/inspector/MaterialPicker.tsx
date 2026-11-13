import React from 'react';

interface MaterialOption {
  id: string;
  name: string;
  colorPreview: string;
  type: string;
}

export const FLOOR_MATERIALS: MaterialOption[] = [
  { id: 'hardwood_oak', name: 'Oak Natural Hardwood', colorPreview: '#B5885C', type: 'wood' },
  { id: 'parquet_herringbone', name: 'Chevron Parquet', colorPreview: '#9A6B43', type: 'wood' },
  { id: 'tile_marble', name: 'Carrara Marble', colorPreview: '#F1F5F9', type: 'stone' },
  { id: 'tile_slate', name: 'Anthracite Slate Tile', colorPreview: '#334155', type: 'stone' },
  { id: 'concrete_polished', name: 'Polished Concrete', colorPreview: '#64748B', type: 'concrete' },
  { id: 'carpet_plush', name: 'Charcoal Carpet', colorPreview: '#475569', type: 'fabric' },
];

export const WALL_COLORS: MaterialOption[] = [
  { id: 'pure_white', name: 'Pure White', colorPreview: '#FFFFFF', type: 'paint' },
  { id: 'warm_white', name: 'Warm Off-White', colorPreview: '#F8FAFC', type: 'paint' },
  { id: 'soft_slate', name: 'Soft Slate', colorPreview: '#E2E8F0', type: 'paint' },
  { id: 'concrete_grey', name: 'Architectural Grey', colorPreview: '#94A3B8', type: 'paint' },
  { id: 'charcoal', name: 'Deep Charcoal', colorPreview: '#1E293B', type: 'paint' },
  { id: 'accent_cyan', name: 'CAD Cyan Glow', colorPreview: '#00F0FF', type: 'paint' },
];

interface MaterialPickerProps {
  type: 'floor' | 'wall';
  currentValue: string;
  onSelect: (value: string) => void;
}

export const MaterialPicker: React.FC<MaterialPickerProps> = ({
  type,
  currentValue,
  onSelect,
}) => {
  const options = type === 'floor' ? FLOOR_MATERIALS : WALL_COLORS;

  return (
    <div className="grid grid-cols-3 gap-2">
      {options.map((opt) => (
        <button
          key={opt.id}
          onClick={() => onSelect(opt.id)}
          className={`flex flex-col items-center gap-1.5 rounded-lg border p-2 text-center transition-all ${
            currentValue === opt.id
              ? 'border-[#00F0FF] bg-[#00F0FF]/10 text-[#F1F5F9]'
              : 'border-[#1F2942] bg-[#0A0D14] text-[#94A3B8] hover:border-[#94A3B8]'
          }`}
        >
          <span
            className="h-5 w-5 rounded-full border border-black/30 shadow-inner"
            style={{ backgroundColor: opt.colorPreview }}
          />
          <span className="text-[10px] font-medium leading-tight line-clamp-1">{opt.name}</span>
        </button>
      ))}
    </div>
  );
};
