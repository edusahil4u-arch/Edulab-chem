import type { ElementCategory, ElementSpec, ElementSymbol } from './types';

type ElementSeed = [
  atomicNumber: number,
  symbol: ElementSymbol,
  name: string,
  atomicMass: number,
  period: number,
  group: number,
  gridRow: number,
  gridCol: number,
  category: ElementCategory,
  cpkColor: string,
  cpkTextColor: string,
  covalentRadius: number,
  vdwRadius: number,
  standardValences: number[],
  defaultValence: number,
  electronegativity: number,
  lonePairs: number,
];

const RAW_ELEMENTS: ElementSeed[] = [
  // Period 1
  [1, 'H', 'Hydrogen', 1.008, 1, 1, 1, 1, 'nonmetal', '#F8FAFC', '#0F172A', 0.31, 1.2, [1], 1, 2.2, 0],
  [2, 'He', 'Helium', 4.0026, 1, 18, 1, 18, 'noble_gas', '#06B6D4', '#FFFFFF', 0.28, 1.4, [0], 0, 0, 1],

  // Period 2
  [3, 'Li', 'Lithium', 6.94, 2, 1, 2, 1, 'alkali_metal', '#A855F7', '#FFFFFF', 1.28, 1.82, [1], 1, 0.98, 0],
  [4, 'Be', 'Beryllium', 9.0122, 2, 2, 2, 2, 'alkaline_earth', '#65A30D', '#FFFFFF', 0.96, 1.53, [2], 2, 1.57, 0],
  [5, 'B', 'Boron', 10.81, 2, 13, 2, 13, 'metalloid', '#F4A261', '#0F172A', 0.84, 1.92, [3], 3, 2.04, 0],
  [6, 'C', 'Carbon', 12.011, 2, 14, 2, 14, 'nonmetal', '#334155', '#F8FAFC', 0.76, 1.7, [4], 4, 2.55, 0],
  [7, 'N', 'Nitrogen', 14.007, 2, 15, 2, 15, 'nonmetal', '#2563EB', '#FFFFFF', 0.71, 1.55, [3, 4], 3, 3.04, 1],
  [8, 'O', 'Oxygen', 15.999, 2, 16, 2, 16, 'nonmetal', '#DC2626', '#FFFFFF', 0.66, 1.52, [2], 2, 3.44, 2],
  [9, 'F', 'Fluorine', 18.998, 2, 17, 2, 17, 'halogen', '#10B981', '#FFFFFF', 0.57, 1.47, [1], 1, 3.98, 3],
  [10, 'Ne', 'Neon', 20.18, 2, 18, 2, 18, 'noble_gas', '#0891B2', '#FFFFFF', 0.58, 1.54, [0], 0, 0, 4],

  // Period 3
  [11, 'Na', 'Sodium', 22.99, 3, 1, 3, 1, 'alkali_metal', '#7C3AED', '#FFFFFF', 1.66, 2.27, [1], 1, 0.93, 0],
  [12, 'Mg', 'Magnesium', 24.305, 3, 2, 3, 2, 'alkaline_earth', '#16A34A', '#FFFFFF', 1.41, 1.73, [2], 2, 1.31, 0],
  [13, 'Al', 'Aluminum', 26.982, 3, 13, 3, 13, 'post_transition', '#64748B', '#FFFFFF', 1.21, 1.84, [3], 3, 1.61, 0],
  [14, 'Si', 'Silicon', 28.085, 3, 14, 3, 14, 'metalloid', '#D97706', '#FFFFFF', 1.11, 2.1, [4], 4, 1.9, 0],
  [15, 'P', 'Phosphorus', 30.974, 3, 15, 3, 15, 'nonmetal', '#EA580C', '#FFFFFF', 1.07, 1.8, [3, 5], 3, 2.19, 1],
  [16, 'S', 'Sulfur', 32.06, 3, 16, 3, 16, 'nonmetal', '#EAB308', '#0F172A', 1.05, 1.8, [2, 4, 6], 2, 2.58, 2],
  [17, 'Cl', 'Chlorine', 35.45, 3, 17, 3, 17, 'halogen', '#059669', '#FFFFFF', 1.02, 1.75, [1], 1, 3.16, 3],
  [18, 'Ar', 'Argon', 39.948, 3, 18, 3, 18, 'noble_gas', '#0E7490', '#FFFFFF', 1.06, 1.88, [0], 0, 0, 4],

  // Period 4
  [19, 'K', 'Potassium', 39.098, 4, 1, 4, 1, 'alkali_metal', '#6D28D9', '#FFFFFF', 2.03, 2.75, [1], 1, 0.82, 0],
  [20, 'Ca', 'Calcium', 40.078, 4, 2, 4, 2, 'alkaline_earth', '#15803D', '#FFFFFF', 1.76, 2.31, [2], 2, 1.0, 0],
  [21, 'Sc', 'Scandium', 44.956, 4, 3, 4, 3, 'transition_metal', '#475569', '#FFFFFF', 1.7, 2.11, [3], 3, 1.36, 0],
  [22, 'Ti', 'Titanium', 47.867, 4, 4, 4, 4, 'transition_metal', '#64748B', '#FFFFFF', 1.6, 2.0, [2, 3, 4], 4, 1.54, 0],
  [23, 'V', 'Vanadium', 50.942, 4, 5, 4, 5, 'transition_metal', '#52525B', '#FFFFFF', 1.53, 2.0, [2, 3, 4, 5], 5, 1.63, 0],
  [24, 'Cr', 'Chromium', 51.996, 4, 6, 4, 6, 'transition_metal', '#4F46E5', '#FFFFFF', 1.39, 2.0, [2, 3, 6], 3, 1.66, 0],
  [25, 'Mn', 'Manganese', 54.938, 4, 7, 4, 7, 'transition_metal', '#7E22CE', '#FFFFFF', 1.39, 2.0, [2, 3, 4, 7], 2, 1.55, 0],
  [26, 'Fe', 'Iron', 55.845, 4, 8, 4, 8, 'transition_metal', '#C2410C', '#FFFFFF', 1.32, 2.0, [2, 3, 4, 6], 3, 1.83, 0],
  [27, 'Co', 'Cobalt', 58.933, 4, 9, 4, 9, 'transition_metal', '#1D4ED8', '#FFFFFF', 1.26, 2.0, [2, 3, 4], 2, 1.88, 0],
  [28, 'Ni', 'Nickel', 58.693, 4, 10, 4, 10, 'transition_metal', '#15803D', '#FFFFFF', 1.24, 1.63, [2, 3, 4], 2, 1.91, 0],
  [29, 'Cu', 'Copper', 63.546, 4, 11, 4, 11, 'transition_metal', '#B45309', '#FFFFFF', 1.32, 1.4, [1, 2, 4], 2, 1.9, 0],
  [30, 'Zn', 'Zinc', 65.38, 4, 12, 4, 12, 'transition_metal', '#4338CA', '#FFFFFF', 1.22, 1.39, [2, 4], 2, 1.65, 0],
  [31, 'Ga', 'Gallium', 69.723, 4, 13, 4, 13, 'post_transition', '#9F1239', '#FFFFFF', 1.22, 1.87, [3], 3, 1.81, 0],
  [32, 'Ge', 'Germanium', 72.63, 4, 14, 4, 14, 'metalloid', '#0F766E', '#FFFFFF', 1.2, 2.11, [2, 4], 4, 2.01, 0],
  [33, 'As', 'Arsenic', 74.922, 4, 15, 4, 15, 'metalloid', '#9333EA', '#FFFFFF', 1.19, 1.85, [3, 5], 3, 2.18, 1],
  [34, 'Se', 'Selenium', 78.971, 4, 16, 4, 16, 'nonmetal', '#D97706', '#FFFFFF', 1.2, 1.9, [2, 4, 6], 2, 2.55, 2],
  [35, 'Br', 'Bromine', 79.904, 4, 17, 4, 17, 'halogen', '#991B1B', '#FFFFFF', 1.2, 1.85, [1], 1, 2.96, 3],
  [36, 'Kr', 'Krypton', 83.798, 4, 18, 4, 18, 'noble_gas', '#0284C7', '#FFFFFF', 1.16, 2.02, [0, 2], 0, 3.0, 4],

  // Period 5
  [37, 'Rb', 'Rubidium', 85.468, 5, 1, 5, 1, 'alkali_metal', '#5B21B6', '#FFFFFF', 2.2, 3.03, [1], 1, 0.82, 0],
  [38, 'Sr', 'Strontium', 87.62, 5, 2, 5, 2, 'alkaline_earth', '#047857', '#FFFFFF', 1.95, 2.49, [2], 2, 0.95, 0],
  [39, 'Y', 'Yttrium', 88.906, 5, 3, 5, 3, 'transition_metal', '#334155', '#FFFFFF', 1.9, 2.3, [3], 3, 1.22, 0],
  [40, 'Zr', 'Zirconium', 91.224, 5, 4, 5, 4, 'transition_metal', '#0284C7', '#FFFFFF', 1.75, 2.2, [4], 4, 1.33, 0],
  [41, 'Nb', 'Niobium', 92.906, 5, 5, 5, 5, 'transition_metal', '#0369A1', '#FFFFFF', 1.64, 2.1, [3, 5], 5, 1.6, 0],
  [42, 'Mo', 'Molybdenum', 95.95, 5, 6, 5, 6, 'transition_metal', '#0D9488', '#FFFFFF', 1.54, 2.1, [2, 3, 4, 6], 6, 2.16, 0],
  [43, 'Tc', 'Technetium', 98.0, 5, 7, 5, 7, 'transition_metal', '#0F766E', '#FFFFFF', 1.47, 2.05, [4, 7], 4, 1.9, 0],
  [44, 'Ru', 'Ruthenium', 101.07, 5, 8, 5, 8, 'transition_metal', '#115E59', '#FFFFFF', 1.46, 2.05, [2, 3, 4, 6, 8], 3, 2.2, 0],
  [45, 'Rh', 'Rhodium', 102.91, 5, 9, 5, 9, 'transition_metal', '#0E7490', '#FFFFFF', 1.42, 2.0, [1, 3, 4], 3, 2.28, 0],
  [46, 'Pd', 'Palladium', 106.42, 5, 10, 5, 10, 'transition_metal', '#1E3A8A', '#FFFFFF', 1.39, 1.63, [2, 4], 2, 2.2, 0],
  [47, 'Ag', 'Silver', 107.87, 5, 11, 5, 11, 'transition_metal', '#94A3B8', '#0F172A', 1.45, 1.72, [1, 2], 1, 1.93, 0],
  [48, 'Cd', 'Cadmium', 112.41, 5, 12, 5, 12, 'transition_metal', '#B45309', '#FFFFFF', 1.44, 1.58, [2], 2, 1.69, 0],
  [49, 'In', 'Indium', 114.82, 5, 13, 5, 13, 'post_transition', '#881337', '#FFFFFF', 1.42, 1.93, [3], 3, 1.78, 0],
  [50, 'Sn', 'Tin', 118.71, 5, 14, 5, 14, 'post_transition', '#475569', '#FFFFFF', 1.39, 2.17, [2, 4], 4, 1.96, 0],
  [51, 'Sb', 'Antimony', 121.76, 5, 15, 5, 15, 'metalloid', '#6D28D9', '#FFFFFF', 1.39, 2.06, [3, 5], 3, 2.05, 1],
  [52, 'Te', 'Tellurium', 127.6, 5, 16, 5, 16, 'metalloid', '#B45309', '#FFFFFF', 1.38, 2.06, [2, 4, 6], 2, 2.1, 2],
  [53, 'I', 'Iodine', 126.9, 5, 17, 5, 17, 'halogen', '#7C3AED', '#FFFFFF', 1.39, 1.98, [1, 3, 5, 7], 1, 2.66, 3],
  [54, 'Xe', 'Xenon', 131.29, 5, 18, 5, 18, 'noble_gas', '#1D4ED8', '#FFFFFF', 1.4, 2.16, [0, 2, 4, 6], 0, 2.6, 4],

  // Period 6 (Main + d-block)
  [55, 'Cs', 'Cesium', 132.91, 6, 1, 6, 1, 'alkali_metal', '#4C1D95', '#FFFFFF', 2.44, 3.43, [1], 1, 0.79, 0],
  [56, 'Ba', 'Barium', 137.33, 6, 2, 6, 2, 'alkaline_earth', '#065F46', '#FFFFFF', 2.15, 2.68, [2], 2, 0.89, 0],

  // Lanthanides (Period 6, gridRow 9)
  [57, 'La', 'Lanthanum', 138.91, 6, 3, 9, 4, 'lanthanide', '#0284C7', '#FFFFFF', 2.07, 2.4, [3], 3, 1.1, 0],
  [58, 'Ce', 'Cerium', 140.12, 6, 3, 9, 5, 'lanthanide', '#0369A1', '#FFFFFF', 2.04, 2.35, [3, 4], 3, 1.12, 0],
  [59, 'Pr', 'Praseodymium', 140.91, 6, 3, 9, 6, 'lanthanide', '#0D9488', '#FFFFFF', 2.03, 2.35, [3], 3, 1.13, 0],
  [60, 'Nd', 'Neodymium', 144.24, 6, 3, 9, 7, 'lanthanide', '#059669', '#FFFFFF', 2.01, 2.3, [3], 3, 1.14, 0],
  [61, 'Pm', 'Promethium', 145.0, 6, 3, 9, 8, 'lanthanide', '#10B981', '#FFFFFF', 1.99, 2.3, [3], 3, 1.13, 0],
  [62, 'Sm', 'Samarium', 150.36, 6, 3, 9, 9, 'lanthanide', '#16A34A', '#FFFFFF', 1.98, 2.3, [2, 3], 3, 1.17, 0],
  [63, 'Eu', 'Europium', 151.96, 6, 3, 9, 10, 'lanthanide', '#15803D', '#FFFFFF', 1.98, 2.3, [2, 3], 3, 1.2, 0],
  [64, 'Gd', 'Gadolinium', 157.25, 6, 3, 9, 11, 'lanthanide', '#047857', '#FFFFFF', 1.96, 2.3, [3], 3, 1.2, 0],
  [65, 'Tb', 'Terbium', 158.93, 6, 3, 9, 12, 'lanthanide', '#065F46', '#FFFFFF', 1.94, 2.25, [3], 3, 1.1, 0],
  [66, 'Dy', 'Dysprosium', 162.5, 6, 3, 9, 13, 'lanthanide', '#0F766E', '#FFFFFF', 1.92, 2.25, [3], 3, 1.22, 0],
  [67, 'Ho', 'Holmium', 164.93, 6, 3, 9, 14, 'lanthanide', '#115E59', '#FFFFFF', 1.92, 2.25, [3], 3, 1.23, 0],
  [68, 'Er', 'Erbium', 167.26, 6, 3, 9, 15, 'lanthanide', '#134E4A', '#FFFFFF', 1.89, 2.25, [3], 3, 1.24, 0],
  [69, 'Tm', 'Thulium', 168.93, 6, 3, 9, 16, 'lanthanide', '#0E7490', '#FFFFFF', 1.9, 2.25, [3], 3, 1.25, 0],
  [70, 'Yb', 'Ytterbium', 173.05, 6, 3, 9, 17, 'lanthanide', '#155E75', '#FFFFFF', 1.87, 2.25, [2, 3], 3, 1.1, 0],
  [71, 'Lu', 'Lutetium', 174.97, 6, 3, 9, 18, 'lanthanide', '#1E40AF', '#FFFFFF', 1.87, 2.2, [3], 3, 1.27, 0],

  // Period 6 (5d & 6p block)
  [72, 'Hf', 'Hafnium', 178.49, 6, 4, 6, 4, 'transition_metal', '#0284C7', '#FFFFFF', 1.75, 2.15, [4], 4, 1.3, 0],
  [73, 'Ta', 'Tantalum', 180.95, 6, 5, 6, 5, 'transition_metal', '#1D4ED8', '#FFFFFF', 1.7, 2.1, [5], 5, 1.5, 0],
  [74, 'W', 'Tungsten', 183.84, 6, 6, 6, 6, 'transition_metal', '#1E40AF', '#FFFFFF', 1.62, 2.1, [2, 4, 6], 6, 2.36, 0],
  [75, 'Re', 'Rhenium', 186.21, 6, 7, 6, 7, 'transition_metal', '#1E3A8A', '#FFFFFF', 1.51, 2.05, [4, 7], 4, 1.9, 0],
  [76, 'Os', 'Osmium', 190.23, 6, 8, 6, 8, 'transition_metal', '#1E293B', '#FFFFFF', 1.44, 2.0, [2, 3, 4, 8], 4, 2.2, 0],
  [77, 'Ir', 'Iridium', 192.22, 6, 9, 6, 9, 'transition_metal', '#0F172A', '#FFFFFF', 1.41, 2.0, [1, 3, 4], 3, 2.2, 0],
  [78, 'Pt', 'Platinum', 195.08, 6, 10, 6, 10, 'transition_metal', '#94A3B8', '#0F172A', 1.36, 1.75, [2, 4], 2, 2.28, 0],
  [79, 'Au', 'Gold', 196.97, 6, 11, 6, 11, 'transition_metal', '#CA8A04', '#FFFFFF', 1.36, 1.66, [1, 3], 1, 2.54, 0],
  [80, 'Hg', 'Mercury', 200.59, 6, 12, 6, 12, 'transition_metal', '#64748B', '#FFFFFF', 1.32, 1.55, [1, 2], 2, 2.0, 0],
  [81, 'Tl', 'Thallium', 204.38, 6, 13, 6, 13, 'post_transition', '#7F1D1D', '#FFFFFF', 1.45, 1.96, [1, 3], 1, 1.62, 0],
  [82, 'Pb', 'Lead', 207.2, 6, 14, 6, 14, 'post_transition', '#334155', '#FFFFFF', 1.46, 2.02, [2, 4], 2, 2.33, 0],
  [83, 'Bi', 'Bismuth', 208.98, 6, 15, 6, 15, 'post_transition', '#7E22CE', '#FFFFFF', 1.48, 2.07, [3, 5], 3, 2.02, 1],
  [84, 'Po', 'Polonium', 209.0, 6, 16, 6, 16, 'post_transition', '#92400E', '#FFFFFF', 1.4, 1.97, [2, 4], 2, 2.0, 2],
  [85, 'At', 'Astatine', 210.0, 6, 17, 6, 17, 'halogen', '#581C87', '#FFFFFF', 1.5, 2.02, [1], 1, 2.2, 3],
  [86, 'Rn', 'Radon', 222.0, 6, 18, 6, 18, 'noble_gas', '#1E3A8A', '#FFFFFF', 1.5, 2.2, [0, 2], 0, 2.2, 4],

  // Period 7 (Main)
  [87, 'Fr', 'Francium', 223.0, 7, 1, 7, 1, 'alkali_metal', '#3B0764', '#FFFFFF', 2.6, 3.48, [1], 1, 0.7, 0],
  [88, 'Ra', 'Radium', 226.0, 7, 2, 7, 2, 'alkaline_earth', '#064E3B', '#FFFFFF', 2.21, 2.83, [2], 2, 0.9, 0],

  // Actinides (Period 7, gridRow 10)
  [89, 'Ac', 'Actinium', 227.0, 7, 3, 10, 4, 'actinide', '#2563EB', '#FFFFFF', 2.15, 2.45, [3], 3, 1.1, 0],
  [90, 'Th', 'Thorium', 232.04, 7, 3, 10, 5, 'actinide', '#1D4ED8', '#FFFFFF', 2.06, 2.4, [4], 4, 1.3, 0],
  [91, 'Pa', 'Protactinium', 231.04, 7, 3, 10, 6, 'actinide', '#1E40AF', '#FFFFFF', 2.0, 2.35, [4, 5], 5, 1.5, 0],
  [92, 'U', 'Uranium', 238.03, 7, 3, 10, 7, 'actinide', '#047857', '#FFFFFF', 1.96, 1.86, [3, 4, 5, 6], 6, 1.38, 0],
  [93, 'Np', 'Neptunium', 237.0, 7, 3, 10, 8, 'actinide', '#0369A1', '#FFFFFF', 1.9, 2.3, [3, 4, 5, 6], 5, 1.36, 0],
  [94, 'Pu', 'Plutonium', 244.0, 7, 3, 10, 9, 'actinide', '#0284C7', '#FFFFFF', 1.87, 2.3, [3, 4, 5, 6], 4, 1.28, 0],
  [95, 'Am', 'Americium', 243.0, 7, 3, 10, 10, 'actinide', '#4F46E5', '#FFFFFF', 1.8, 2.25, [3, 4], 3, 1.3, 0],
  [96, 'Cm', 'Curium', 247.0, 7, 3, 10, 11, 'actinide', '#6D28D9', '#FFFFFF', 1.69, 2.25, [3], 3, 1.3, 0],
  [97, 'Bk', 'Berkelium', 247.0, 7, 3, 10, 12, 'actinide', '#7C3AED', '#FFFFFF', 1.68, 2.25, [3, 4], 3, 1.3, 0],
  [98, 'Cf', 'Californium', 251.0, 7, 3, 10, 13, 'actinide', '#9333EA', '#FFFFFF', 1.68, 2.25, [3], 3, 1.3, 0],
  [99, 'Es', 'Einsteinium', 252.0, 7, 3, 10, 14, 'actinide', '#A855F7', '#FFFFFF', 1.65, 2.25, [3], 3, 1.3, 0],
  [100, 'Fm', 'Fermium', 257.0, 7, 3, 10, 15, 'actinide', '#C026D3', '#FFFFFF', 1.67, 2.25, [3], 3, 1.3, 0],
  [101, 'Md', 'Mendelevium', 258.0, 7, 3, 10, 16, 'actinide', '#DB2777', '#FFFFFF', 1.73, 2.25, [2, 3], 3, 1.3, 0],
  [102, 'No', 'Nobelium', 259.0, 7, 3, 10, 17, 'actinide', '#E11D48', '#FFFFFF', 1.76, 2.25, [2, 3], 2, 1.3, 0],
  [103, 'Lr', 'Lawrencium', 266.0, 7, 3, 10, 18, 'actinide', '#BE123C', '#FFFFFF', 1.61, 2.2, [3], 3, 1.3, 0],

  // Period 7 (6d & 7p superheavy block)
  [104, 'Rf', 'Rutherfordium', 267.0, 7, 4, 7, 4, 'transition_metal', '#991B1B', '#FFFFFF', 1.57, 2.15, [4], 4, 1.3, 0],
  [105, 'Db', 'Dubnium', 268.0, 7, 5, 7, 5, 'transition_metal', '#B91C1C', '#FFFFFF', 1.49, 2.1, [5], 5, 1.5, 0],
  [106, 'Sg', 'Seaborgium', 269.0, 7, 6, 7, 6, 'transition_metal', '#C2410C', '#FFFFFF', 1.43, 2.1, [6], 6, 1.9, 0],
  [107, 'Bh', 'Bohrium', 270.0, 7, 7, 7, 7, 'transition_metal', '#D97706', '#FFFFFF', 1.41, 2.05, [7], 7, 2.0, 0],
  [108, 'Hs', 'Hassium', 277.0, 7, 8, 7, 8, 'transition_metal', '#B45309', '#FFFFFF', 1.34, 2.0, [8], 8, 2.1, 0],
  [109, 'Mt', 'Meitnerium', 278.0, 7, 9, 7, 9, 'transition_metal', '#9A3412', '#FFFFFF', 1.29, 2.0, [3], 3, 2.1, 0],
  [110, 'Ds', 'Darmstadtium', 281.0, 7, 10, 7, 10, 'transition_metal', '#7C2D12', '#FFFFFF', 1.28, 2.0, [2], 2, 2.2, 0],
  [111, 'Rg', 'Roentgenium', 282.0, 7, 11, 7, 11, 'transition_metal', '#854D0E', '#FFFFFF', 1.21, 2.0, [1, 3], 3, 2.2, 0],
  [112, 'Cn', 'Copernicium', 285.0, 7, 12, 7, 12, 'transition_metal', '#713F12', '#FFFFFF', 1.22, 2.0, [2], 2, 2.0, 0],
  [113, 'Nh', 'Nihonium', 286.0, 7, 13, 7, 13, 'post_transition', '#475569', '#FFFFFF', 1.36, 2.0, [1, 3], 1, 1.8, 0],
  [114, 'Fl', 'Flerovium', 289.0, 7, 14, 7, 14, 'post_transition', '#334155', '#FFFFFF', 1.43, 2.0, [2, 4], 2, 1.9, 0],
  [115, 'Mc', 'Moscovium', 290.0, 7, 15, 7, 15, 'post_transition', '#1E293B', '#FFFFFF', 1.62, 2.0, [1, 3], 1, 1.8, 1],
  [116, 'Lv', 'Livermorium', 293.0, 7, 16, 7, 16, 'post_transition', '#0F172A', '#FFFFFF', 1.75, 2.0, [2], 2, 2.0, 2],
  [117, 'Ts', 'Tennessine', 294.0, 7, 17, 7, 17, 'halogen', '#4C1D95', '#FFFFFF', 1.65, 2.0, [1], 1, 2.2, 3],
  [118, 'Og', 'Oganesson', 294.0, 7, 18, 7, 18, 'noble_gas', '#1E3A8A', '#FFFFFF', 1.57, 2.0, [0], 0, 0, 4],
];

const METAL_CATEGORIES = new Set<ElementCategory>([
  'alkali_metal',
  'alkaline_earth',
  'transition_metal',
  'post_transition',
  'lanthanide',
  'actinide',
]);

export const ELEMENTS: Record<ElementSymbol, ElementSpec> = RAW_ELEMENTS.reduce(
  (acc, item) => {
    const [
      atomicNumber,
      symbol,
      name,
      atomicMass,
      period,
      group,
      gridRow,
      gridCol,
      category,
      cpkColor,
      cpkTextColor,
      covalentRadius,
      vdwRadius,
      standardValences,
      defaultValence,
      electronegativity,
      lonePairs,
    ] = item;

    const isMetal = METAL_CATEGORIES.has(category);
    acc[symbol] = {
      symbol,
      name,
      atomicNumber,
      atomicMass,
      period,
      group,
      gridRow,
      gridCol,
      category,
      isMetal,
      cpkColor,
      cpkTextColor,
      covalentRadius,
      vdwRadius,
      standardValences,
      defaultValence,
      electronegativity,
      lonePairs,
      roughness: isMetal ? 0.22 : 0.28,
      metalness: isMetal ? 0.78 : 0.08,
    };
    return acc;
  },
  {} as Record<ElementSymbol, ElementSpec>
);

export const PERIODIC_TABLE_LIST: ElementSpec[] = RAW_ELEMENTS.map(
  (item) => ELEMENTS[item[1]]
);

export const ELEMENT_PALETTE_ORDER: ElementSymbol[] = [
  'C',
  'H',
  'N',
  'O',
  'S',
  'P',
  'F',
  'Cl',
  'Br',
  'I',
  'B',
  'Si',
];
