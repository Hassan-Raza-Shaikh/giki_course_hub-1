import React from 'react';
import { TerminalSquare, CircuitBoard, Landmark, Beaker, Cog, HardHat, Dna, BookOpenText } from 'lucide-react';

const emojiToIcon = {
  '💻': TerminalSquare,   // FCSE - Computer Science
  '⚡': CircuitBoard,     // FEE - Electrical Engineering
  '📈': Landmark,         // MGS - Management Sciences
  '⚗️': Beaker,           // FMCE - Chemical/Materials
  '⚙️': Cog,              // FME - Mechanical Engineering
  '🏗️': HardHat,          // Civil Engineering
  '🧪': Dna,              // FBS - Basic Sciences
  '📘': BookOpenText      // General / Default
};

const IconMapper = ({ emoji, size = 24, strokeWidth = 1.5, className, style, color }) => {
  const Icon = emojiToIcon[emoji] || BookOpenText;
  return <Icon size={size} strokeWidth={strokeWidth} className={className} style={style} color={color} />;
};

export default IconMapper;
