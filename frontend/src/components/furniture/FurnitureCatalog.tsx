import React, { useState } from 'react';
import {
  Armchair,
  Bed,
  Box,
  Columns,
  Table,
  Layers,
  Bath,
  Laptop,
  Flower2,
  Plus,
  Search,
  X
} from 'lucide-react';
import { FURNITURE_PRESETS, FurniturePreset } from './furniturePresets';
import { useFloorPlanStore } from '../../store/useFloorPlanStore';
import { FurnitureItem } from '../../types/architectural';

interface FurnitureCatalogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FurnitureCatalog: React.FC<FurnitureCatalogProps> = ({ isOpen, onClose }) => {
  const { addFurniture, model, selectedEntity } = useFloorPlanStore();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  if (!isOpen) return null;

  const categories = [
    { id: 'all', label: 'All Items' },
    { id: 'living', label: 'Living Room' },
    { id: 'bedroom', label: 'Bedroom' },
    { id: 'dining', label: 'Dining' },
    { id: 'kitchen', label: 'Kitchen' },
    { id: 'bathroom', label: 'Bathroom' },
    { id: 'office', label: 'Office' },
    { id: 'decor', label: 'Decor' },
  ];

  const filteredItems = FURNITURE_PRESETS.filter((item) => {
    const matchesCat = selectedCategory === 'all' || item.category === selectedCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const handleAddItem = (preset: FurniturePreset) => {
    // If a room is selected, place at room center; else default position
    const floor = model.floors[0];
    let posX = 4.0, posZ = 3.0;
    let targetRoomId: string | undefined = undefined;

    if (selectedEntity.type === 'room' && selectedEntity.id) {
      const room = floor.rooms.find((r) => r.id === selectedEntity.id);
      if (room && room.polygon.length > 0) {
        let sx = 0, sz = 0;
        room.polygon.forEach((p) => { sx += p.x; sz += p.z; });
        posX = sx / room.polygon.length;
        posZ = sz / room.polygon.length;
        targetRoomId = room.id;
      }
    }

    const newItem: FurnitureItem = {
      id: `furn_${Date.now()}`,
      floor_id: 'floor_0',
      room_id: targetRoomId,
      asset_id: preset.assetId,
      name: preset.name,
      category: preset.category,
      position: { x: posX, y: preset.dimensions.y / 2, z: posZ },
      rotation_y: 0,
      dimensions: { ...preset.dimensions },
      color: preset.defaultColor
    };

    addFurniture(newItem);
    onClose();
  };

  const renderIcon = (name: string) => {
    switch (name) {
      case 'Armchair': return <Armchair className="h-5 w-5" />;
      case 'Bed': return <Bed className="h-5 w-5" />;
      case 'Table': return <Table className="h-5 w-5" />;
      case 'Bath': return <Bath className="h-5 w-5" />;
      case 'Laptop': return <Laptop className="h-5 w-5" />;
      case 'Flower2': return <Flower2 className="h-5 w-5" />;
      default: return <Box className="h-5 w-5" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="flex h-[80vh] w-full max-w-4xl flex-col rounded-2xl border border-[#1F2942] bg-[#111726] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#1F2942] px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#00F0FF]/10 text-[#00F0FF]">
              <Armchair className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#F1F5F9]">Architectural Furniture Library</h2>
              <p className="text-xs text-[#94A3B8]">Parametric 3D interior assets & placement catalog</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-[#94A3B8] hover:bg-[#1F2942] hover:text-[#F1F5F9]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search & Category Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-3 border-b border-[#1F2942] bg-[#0A0D14]/50 px-6 py-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#94A3B8]" />
            <input
              type="text"
              placeholder="Search furniture (e.g. Sofa, Bed, Island)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-[#1F2942] bg-[#0A0D14] pl-9 pr-4 py-2 text-xs text-[#F1F5F9] focus:border-[#00F0FF] focus:outline-none"
            />
          </div>

          <div className="flex gap-1 overflow-x-auto py-1">
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedCategory(c.id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === c.id
                    ? 'bg-[#00F0FF] text-[#0A0D14] font-semibold'
                    : 'text-[#94A3B8] hover:bg-[#1F2942] hover:text-[#F1F5F9]'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* Furniture Cards Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredItems.map((item) => (
              <div
                key={item.assetId}
                className="group flex flex-col justify-between rounded-xl border border-[#1F2942] bg-[#161F33]/60 p-4 transition-all hover:border-[#00F0FF]/50 hover:bg-[#161F33]"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#1F2942] text-[#00F0FF] group-hover:scale-105 transition-transform">
                      {renderIcon(item.iconName)}
                    </div>
                    <span className="rounded bg-[#1F2942]/80 px-2 py-0.5 text-[10px] uppercase font-mono text-[#94A3B8]">
                      {item.category}
                    </span>
                  </div>
                  <h3 className="mt-3 text-sm font-semibold text-[#F1F5F9]">{item.name}</h3>
                  <div className="mt-1 font-mono text-[11px] text-[#94A3B8]">
                    {item.dimensions.x.toFixed(1)}m × {item.dimensions.z.toFixed(1)}m × {item.dimensions.y.toFixed(1)}m
                  </div>
                </div>

                <button
                  onClick={() => handleAddItem(item)}
                  className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-lg border border-[#1F2942] bg-[#0A0D14] py-2 text-xs font-semibold text-[#F1F5F9] transition-all group-hover:border-[#00F0FF] group-hover:bg-[#00F0FF] group-hover:text-[#0A0D14]"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Place in 3D Scene</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
