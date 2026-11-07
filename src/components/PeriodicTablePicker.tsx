import React, { useMemo, useState } from 'react';
import { Grid, List, Search, X } from 'lucide-react';
import { ELEMENTS, PERIODIC_TABLE_LIST } from '../chem/elements';
import type {
  ElementCategory,
  ElementSpec,
  ElementSymbol,
} from '../chem/types';

interface PeriodicTablePickerProps {
  activeElement: ElementSymbol;
  onSelectElement: (element: ElementSymbol) => void;
  onClose: () => void;
}

const CATEGORY_META: Record<
  ElementCategory,
  { label: string; badgeBg: string; badgeText: string; accentBorder: string }
> = {
  nonmetal: {
    label: 'Reactive Nonmetal',
    badgeBg: 'bg-sky-50 border-sky-200',
    badgeText: 'text-sky-800',
    accentBorder: 'border-l-sky-600',
  },
  noble_gas: {
    label: 'Noble Gas',
    badgeBg: 'bg-indigo-50 border-indigo-200',
    badgeText: 'text-indigo-800',
    accentBorder: 'border-l-indigo-600',
  },
  alkali_metal: {
    label: 'Alkali Metal',
    badgeBg: 'bg-rose-50 border-rose-200',
    badgeText: 'text-rose-800',
    accentBorder: 'border-l-rose-600',
  },
  alkaline_earth: {
    label: 'Alkaline Earth Metal',
    badgeBg: 'bg-amber-50 border-amber-200',
    badgeText: 'text-amber-900',
    accentBorder: 'border-l-amber-600',
  },
  metalloid: {
    label: 'Metalloid',
    badgeBg: 'bg-teal-50 border-teal-200',
    badgeText: 'text-teal-800',
    accentBorder: 'border-l-teal-600',
  },
  halogen: {
    label: 'Halogen',
    badgeBg: 'bg-emerald-50 border-emerald-200',
    badgeText: 'text-emerald-800',
    accentBorder: 'border-l-emerald-600',
  },
  post_transition: {
    label: 'Post-Transition Metal',
    badgeBg: 'bg-slate-100 border-slate-300',
    badgeText: 'text-slate-800',
    accentBorder: 'border-l-slate-600',
  },
  transition_metal: {
    label: 'Transition Metal',
    badgeBg: 'bg-orange-50 border-orange-200',
    badgeText: 'text-orange-900',
    accentBorder: 'border-l-orange-600',
  },
  lanthanide: {
    label: 'Lanthanide',
    badgeBg: 'bg-purple-50 border-purple-200',
    badgeText: 'text-purple-900',
    accentBorder: 'border-l-purple-600',
  },
  actinide: {
    label: 'Actinide',
    badgeBg: 'bg-fuchsia-50 border-fuchsia-200',
    badgeText: 'text-fuchsia-900',
    accentBorder: 'border-l-fuchsia-600',
  },
};

const CATEGORY_FILTER_OPTIONS: Array<{
  value: 'all' | ElementCategory;
  label: string;
}> = [
  { value: 'all', label: 'All Categories (118)' },
  { value: 'nonmetal', label: 'Reactive Nonmetals' },
  { value: 'halogen', label: 'Halogens' },
  { value: 'noble_gas', label: 'Noble Gases' },
  { value: 'metalloid', label: 'Metalloids' },
  { value: 'alkali_metal', label: 'Alkali Metals' },
  { value: 'alkaline_earth', label: 'Alkaline Earth Metals' },
  { value: 'transition_metal', label: 'Transition Metals' },
  { value: 'post_transition', label: 'Post-Transition Metals' },
  { value: 'lanthanide', label: 'Lanthanides (57–71)' },
  { value: 'actinide', label: 'Actinides (89–103)' },
];

export const PeriodicTablePicker: React.FC<PeriodicTablePickerProps> = ({
  activeElement,
  onSelectElement,
  onClose,
}) => {
  const [viewMode, setViewMode] = useState<'list' | 'table'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | ElementCategory>(
    'all'
  );
  const [hoveredElement, setHoveredElement] = useState<ElementSymbol | null>(
    null
  );

  const inspectedSpec: ElementSpec =
    ELEMENTS[hoveredElement ?? activeElement] ?? ELEMENTS.C;
  const inspectedCat = CATEGORY_META[inspectedSpec.category];

  const normalizedQuery = searchQuery.trim().toLowerCase();

  const matchesFilter = (spec: ElementSpec): boolean => {
    if (categoryFilter !== 'all' && spec.category !== categoryFilter) {
      return false;
    }
    if (!normalizedQuery) return true;
    return (
      spec.symbol.toLowerCase().includes(normalizedQuery) ||
      spec.name.toLowerCase().includes(normalizedQuery) ||
      String(spec.atomicNumber) === normalizedQuery
    );
  };

  const filteredList = useMemo(
    () => PERIODIC_TABLE_LIST.filter(matchesFilter),
    [normalizedQuery, categoryFilter]
  );

  // Build lookup for 18-column classic periodic table grid (rows 1..7, plus 9=La, 10=Ac)
  const gridCells = useMemo(() => {
    const map = new Map<string, ElementSpec>();
    for (const el of PERIODIC_TABLE_LIST) {
      map.set(`${el.gridRow}:${el.gridCol}`, el);
    }
    return map;
  }, []);

  const hasActiveFilter = normalizedQuery.length > 0 || categoryFilter !== 'all';

  return (
    <div
      role="dialog"
      aria-label="Periodic Table Element List and Picker"
      data-testid="periodic-table-picker"
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.stopPropagation();
          onClose();
        }
      }}
      className="absolute inset-0 z-20 bg-white flex flex-col overflow-hidden"
    >
      {/* Top Bar: Title, View Toggle (List vs Table), and Close */}
      <div className="px-3 py-2 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
            Periodic Table Elements
          </h3>
          <span className="text-[11px] font-mono text-slate-500">
            ({filteredList.length}/118)
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* View Mode Toggle: List vs 18-Column Table */}
          <div
            role="group"
            aria-label="Periodic table layout mode"
            className="inline-flex rounded-md border border-slate-200 bg-white p-0.5"
          >
            <button
              type="button"
              onClick={() => setViewMode('list')}
              aria-label="Periodic Table List View"
              aria-pressed={viewMode === 'list'}
              className={`h-6 px-2 rounded text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors ${
                viewMode === 'list'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <List className="w-3 h-3" />
              <span>List</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              aria-label="Periodic Table Grid View"
              aria-pressed={viewMode === 'table'}
              className={`h-6 px-2 rounded text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors ${
                viewMode === 'table'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Grid className="w-3 h-3" />
              <span>Table</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close Periodic Table"
            title="Return to 2D Drafting Sheet (Esc)"
            className="h-7 w-7 rounded-md border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filter & Search Bar + Live Inspected Element Strip */}
      <div className="px-2.5 py-2 border-b border-slate-200 bg-white flex flex-col gap-1.5 shrink-0">
        <div className="flex items-center gap-1.5 w-full">
          <div className="relative flex-1 min-w-0">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <label htmlFor="pt-search-input" className="sr-only">
              Search periodic table elements
            </label>
            <input
              id="pt-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search name, symbol, or Z (e.g. Iron, Pt, 79)..."
              className="w-full h-7 pl-8 pr-7 text-xs bg-slate-50 border border-slate-200 rounded-md text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-blue-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Clear element search"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <label htmlFor="pt-category-select" className="sr-only">
            Filter elements by category
          </label>
          <select
            id="pt-category-select"
            value={categoryFilter}
            onChange={(e) =>
              setCategoryFilter(e.target.value as 'all' | ElementCategory)
            }
            className="h-7 px-2 text-xs bg-slate-50 border border-slate-200 rounded-md text-slate-800 focus:outline-none focus:border-blue-50 w-40 shrink-0"
          >
            {CATEGORY_FILTER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Live Inspected Element Readout */}
        <div className="flex items-center justify-between gap-2 px-2.5 py-1 rounded-md border border-slate-200 bg-slate-50/90">
          <div className="flex items-baseline gap-1.5 min-w-0">
            <span className="text-[10.5px] font-mono font-semibold text-slate-500 shrink-0">
              #{inspectedSpec.atomicNumber}
            </span>
            <span className="text-xs font-bold font-mono text-slate-950 shrink-0">
              {inspectedSpec.symbol}
            </span>
            <span className="text-xs font-semibold text-slate-800 truncate">
              {inspectedSpec.name}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[11px] font-mono text-slate-600">
              {inspectedSpec.atomicMass} u
            </span>
            <span className="hidden sm:inline-block text-[10.5px] font-mono text-slate-500 border-l border-slate-200 pl-2">
              Val: {inspectedSpec.standardValences.join(',')}
            </span>
            <span
              className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${inspectedCat.badgeBg} ${inspectedCat.badgeText}`}
            >
              {inspectedCat.label}
            </span>
          </div>
        </div>
      </div>

      {/* Main Content Area: Either Periodic Table List OR Classic 18-Column Periodic Table */}
      <div className="flex-1 overflow-y-auto overflow-x-auto bg-white">
        {viewMode === 'list' ? (
          filteredList.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center p-6 text-center">
              <p className="text-xs font-medium text-slate-600">
                No elements match &ldquo;{searchQuery}&rdquo;.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setCategoryFilter('all');
                }}
                className="mt-2 h-7 px-3 rounded border border-slate-200 bg-slate-50 text-xs font-medium text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                Reset Filter
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {/* Sticky Column Headers */}
              <div className="sticky top-0 z-10 grid grid-cols-12 gap-2 px-3 py-1.5 bg-slate-50 border-b border-slate-200 text-[10.5px] font-bold uppercase tracking-wider text-slate-500">
                <div className="col-span-2 sm:col-span-1">Z</div>
                <div className="col-span-2 sm:col-span-1">Sym</div>
                <div className="col-span-4 sm:col-span-3">Element</div>
                <div className="hidden sm:block sm:col-span-3">Category</div>
                <div className="col-span-4 sm:col-span-2 text-right">
                  Mass (u)
                </div>
                <div className="hidden sm:block sm:col-span-2 text-right">
                  Valence
                </div>
              </div>

              {filteredList.map((el) => {
                const isSelected = el.symbol === activeElement;
                const cat = CATEGORY_META[el.category];
                return (
                  <button
                    key={el.symbol}
                    type="button"
                    onClick={() => onSelectElement(el.symbol)}
                    onMouseEnter={() => setHoveredElement(el.symbol)}
                    aria-label={`Select ${el.name} (${el.symbol}, Z=${el.atomicNumber})`}
                    aria-pressed={isSelected}
                    className={`w-full grid grid-cols-12 gap-2 px-3 py-1.5 text-left items-center border-l-4 transition-colors cursor-pointer ${
                      cat.accentBorder
                    } ${
                      isSelected
                        ? 'bg-blue-50/90 text-slate-950 font-semibold'
                        : 'hover:bg-slate-50 text-slate-800'
                    }`}
                  >
                    <div className="col-span-2 sm:col-span-1 font-mono text-xs text-slate-500 tabular-nums">
                      {el.atomicNumber}
                    </div>
                    <div className="col-span-2 sm:col-span-1 font-mono text-xs font-bold text-slate-950">
                      {el.symbol}
                    </div>
                    <div className="col-span-4 sm:col-span-3 text-xs font-medium truncate">
                      {el.name}
                    </div>
                    <div className="hidden sm:block sm:col-span-3 text-[11px] text-slate-600 truncate">
                      {cat.label}
                    </div>
                    <div className="col-span-4 sm:col-span-2 font-mono text-xs text-slate-600 text-right tabular-nums">
                      {el.atomicMass.toFixed(2)}
                    </div>
                    <div className="hidden sm:block sm:col-span-2 font-mono text-[11px] text-slate-500 text-right">
                      {el.standardValences.join(', ')}
                    </div>
                  </button>
                );
              })}
            </div>
          )
        ) : (
          /* Classic 18-Column IUPAC Periodic Table Grid */
          <div className="p-2 min-w-[430px]">
            <div className="grid grid-cols-18 gap-[2px]">
              {[1, 2, 3, 4, 5, 6, 7].map((row) =>
                Array.from({ length: 18 }, (_, cIdx) => {
                  const col = cIdx + 1;
                  const el = gridCells.get(`${row}:${col}`);
                  if (!el) {
                    if (row === 6 && col === 3) {
                      return (
                        <div
                          key={`marker-${row}-${col}`}
                          className="h-8 rounded border border-dashed border-purple-200 bg-purple-50/40 flex flex-col items-center justify-center text-[7.5px] font-mono text-purple-800 select-none leading-none"
                          title="Lanthanides (57–71) shown below"
                        >
                          <span>57–71</span>
                          <span className="font-bold">La–Lu</span>
                        </div>
                      );
                    }
                    if (row === 7 && col === 3) {
                      return (
                        <div
                          key={`marker-${row}-${col}`}
                          className="h-8 rounded border border-dashed border-fuchsia-200 bg-fuchsia-50/40 flex flex-col items-center justify-center text-[7.5px] font-mono text-fuchsia-800 select-none leading-none"
                          title="Actinides (89–103) shown below"
                        >
                          <span>89–103</span>
                          <span className="font-bold">Ac–Lr</span>
                        </div>
                      );
                    }
                    return <div key={`empty-${row}-${col}`} className="h-8" />;
                  }

                  const visible = matchesFilter(el);
                  const isSelected = el.symbol === activeElement;
                  const cat = CATEGORY_META[el.category];
                  return (
                    <button
                      key={el.symbol}
                      type="button"
                      onClick={() => onSelectElement(el.symbol)}
                      onMouseEnter={() => setHoveredElement(el.symbol)}
                      aria-label={`Select ${el.name} (${el.symbol}, Z=${el.atomicNumber})`}
                      aria-pressed={isSelected}
                      title={`${el.atomicNumber} ${el.name} (${el.symbol}) · ${el.atomicMass} u`}
                      className={`h-8 rounded border flex flex-col items-center justify-center transition-all cursor-pointer overflow-hidden ${
                        isSelected
                          ? 'bg-slate-900 border-slate-900 text-white shadow-xs ring-2 ring-blue-500/40'
                          : `${cat.badgeBg} ${cat.badgeText} hover:border-slate-500`
                      } ${hasActiveFilter && !visible ? 'opacity-20' : ''}`}
                    >
                      <span
                        className={`text-[7px] font-mono leading-none ${
                          isSelected ? 'text-slate-300' : 'opacity-75'
                        }`}
                      >
                        {el.atomicNumber}
                      </span>
                      <span className="text-[10px] font-bold font-mono leading-tight">
                        {el.symbol}
                      </span>
                    </button>
                  );
                })
              )}
            </div>

            {/* f-Block Rows: Lanthanides (Row 9) & Actinides (Row 10) */}
            <div className="mt-1.5 pt-1.5 border-t border-slate-100 space-y-[2px]">
              {[
                { row: 9, label: 'Lanthanides' },
                { row: 10, label: 'Actinides' },
              ].map(({ row, label }) => (
                <div key={row} className="grid grid-cols-18 gap-[2px] items-center">
                  <div className="col-span-3 text-[9px] font-semibold text-slate-500 pr-1 text-right truncate">
                    {label}
                  </div>
                  {Array.from({ length: 15 }, (_, idx) => {
                    const col = idx + 4;
                    const el = gridCells.get(`${row}:${col}`);
                    if (!el) return <div key={`f-empty-${row}-${col}`} />;
                    const visible = matchesFilter(el);
                    const isSelected = el.symbol === activeElement;
                    const cat = CATEGORY_META[el.category];
                    return (
                      <button
                        key={el.symbol}
                        type="button"
                        onClick={() => onSelectElement(el.symbol)}
                        onMouseEnter={() => setHoveredElement(el.symbol)}
                        aria-label={`Select ${el.name} (${el.symbol}, Z=${el.atomicNumber})`}
                        aria-pressed={isSelected}
                        title={`${el.atomicNumber} ${el.name} (${el.symbol}) · ${el.atomicMass} u`}
                        className={`h-8 rounded border flex flex-col items-center justify-center transition-all cursor-pointer overflow-hidden ${
                          isSelected
                            ? 'bg-slate-900 border-slate-900 text-white shadow-xs ring-2 ring-blue-500/40'
                            : `${cat.badgeBg} ${cat.badgeText} hover:border-slate-500`
                        } ${hasActiveFilter && !visible ? 'opacity-20' : ''}`}
                      >
                        <span
                          className={`text-[7px] font-mono leading-none ${
                            isSelected ? 'text-slate-300' : 'opacity-75'
                          }`}
                        >
                          {el.atomicNumber}
                        </span>
                        <span className="text-[10px] font-bold font-mono leading-tight">
                          {el.symbol}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
