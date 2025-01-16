import { useState } from "react";

type ColorPickerProps = {
  colors: string[];
  selectedColor: string;
  onSelect: (color: string) => void;
};

export const ColorPicker = ({
  colors,
  selectedColor,
  onSelect,
}: ColorPickerProps) => {
  const [isHovering, setIsHovering] = useState(false);

  return (
    <div
      className="flex flex-row gap-1 py-2 flex-wrap"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {colors.map((color) => {
        const isSelected = color === selectedColor;
        return (
          <div
            key={color}
            className="rounded-md p-1 border-2 cursor-pointer transition-all duration-200 hover:scale-105"
            style={{
              borderColor: isSelected ? '#1F2937' : 'transparent',
              opacity: !isHovering && !isSelected ? 0.2 : 1,
              filter: !isHovering && !isSelected ? 'saturate(0.25)' : 'none'
            }}
            onClick={() => onSelect(color)}
          >
            <div 
              className="w-5 h-5 rounded-sm"
              style={{ backgroundColor: color }}
            />
          </div>
        );
      })}
    </div>
  );
};
