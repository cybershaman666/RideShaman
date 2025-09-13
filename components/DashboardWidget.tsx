import React from 'react';
import type { LayoutItem } from '../types';

interface DashboardWidgetProps {
  layoutItem: LayoutItem;
  isEditMode: boolean;
  onLayoutChange: (updatedItem: LayoutItem) => void;
  children: React.ReactNode;
}

const NumberInput: React.FC<{
    label: string;
    value: number;
    onChange: (value: number) => void;
}> = ({ label, value, onChange }) => (
    <div className="flex flex-col">
        <label className="text-xs text-gray-400 mb-1">{label}</label>
        <input 
            type="number"
            value={value}
            onChange={(e) => onChange(parseInt(e.target.value, 10) || 1)}
            min={1}
            max={6} // Grid is 6 wide/high, max start/span is 6.
            className="w-16 bg-slate-900 border border-slate-600 rounded-md py-1 px-2 text-white"
        />
    </div>
)

export const DashboardWidget: React.FC<DashboardWidgetProps> = ({ layoutItem, isEditMode, onLayoutChange, children }) => {
  const { colStart, colSpan, rowStart, rowSpan } = layoutItem;

  const style: React.CSSProperties = {
    gridColumn: `${colStart} / span ${colSpan}`,
    gridRow: `${rowStart} / span ${rowSpan}`,
    minHeight: 0, // Prevents flexbox overflow issues inside grid items
  };
  
  const handleItemChange = (field: keyof LayoutItem, value: number) => {
    // Basic validation to keep grid sane
    const sanitizedValue = Math.max(1, Math.min(6, value));
    onLayoutChange({ ...layoutItem, [field]: sanitizedValue });
  }

  return (
    <div style={style} className="relative transition-all duration-300 ease-in-out">
        {isEditMode && (
            <div className="absolute inset-0 bg-black/80 z-10 border-2 border-dashed border-amber-500 rounded-lg flex flex-col justify-center items-center">
                <div className="p-4 bg-slate-800 rounded-lg shadow-lg">
                    <h4 className="text-lg font-bold mb-4 text-center">Upravit Widget</h4>
                     <div className="grid grid-cols-2 gap-4">
                        <NumberInput label="Sloupec Od" value={colStart} onChange={(v) => handleItemChange('colStart', v)} />
                        <NumberInput label="Šířka (sl.)" value={colSpan} onChange={(v) => handleItemChange('colSpan', v)} />
                        <NumberInput label="Řádek Od" value={rowStart} onChange={(v) => handleItemChange('rowStart', v)} />
                        <NumberInput label="Výška (ř.)" value={rowSpan} onChange={(v) => handleItemChange('rowSpan', v)} />
                    </div>
                </div>
            </div>
        )}
      {/* Ensure children stretch to fill the widget container */}
      <div className="h-full w-full">
         {children}
      </div>
    </div>
  );
};