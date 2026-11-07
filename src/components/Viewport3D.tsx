import React, { useEffect, useRef, useState } from 'react';
import {
  Camera,
  ChevronDown,
  ChevronUp,
  Download,
  Eye,
  Minus,
  Moon,
  Orbit,
  Plus,
  RotateCcw,
  Sun,
  Trash2,
  Zap,
} from 'lucide-react';
import {
  MolecularStage,
  type CameraPreset,
  type MotionMode,
  type RepresentationMode,
  type StageTheme,
} from '../scene/MolecularStage';
import type { BondOrder, ElementSymbol, MoleculeGraph, MoleculeMetrics } from '../chem/types';

interface Viewport3DProps {
  molecule: MoleculeGraph;
  metrics: MoleculeMetrics;
  selectedAtomId: string | null;
  hoveredAtomId: string | null;
  selectedBondId: string | null;
  hoveredBondId: string | null;
  selectedLonePair: { atomId: string; lobeIndex: number } | null;
  show3DHydrogens: boolean;
  onToggle3DHydrogens: () => void;
  onSelectAtom: (atomId: string | null) => void;
  onHoverAtom: (atomId: string | null) => void;
  onSelectBond: (bondId: string | null) => void;
  onHoverBond: (bondId: string | null) => void;
  onSelectLonePair: (lp: { atomId: string; lobeIndex: number } | null) => void;
  onCycleBondOrder?: (bondId: string) => void;
  onDeleteBond?: (bondId: string) => void;
  onDeleteAtom?: (atomId: string) => void;
  onChangeAtomCharge?: (atomId: string, delta: number) => void;
  onSproutAtom?: (atomId: string, element?: ElementSymbol) => void;
  onTransmuteAtom?: (atomId: string, element: ElementSymbol) => void;
  onAddFragment?: (smiles: string, label: string) => void;
  onCaptureSnapshot: (dataUrl: string) => void;
}

export const Viewport3D: React.FC<Viewport3DProps> = ({
  molecule,
  metrics,
  selectedAtomId,
  hoveredAtomId,
  selectedBondId,
  hoveredBondId,
  selectedLonePair,
  show3DHydrogens,
  onToggle3DHydrogens,
  onSelectAtom,
  onHoverAtom,
  onSelectBond,
  onHoverBond,
  onSelectLonePair,
  onCycleBondOrder,
  onDeleteBond,
  onDeleteAtom,
  onChangeAtomCharge,
  onSproutAtom,
  onTransmuteAtom,
  onAddFragment,
  onCaptureSnapshot,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<MolecularStage | null>(null);

  // Store latest callbacks in refs so WebGL stage never unmounts on React re-renders
  const onSelectAtomRef = useRef(onSelectAtom);
  const onHoverAtomRef = useRef(onHoverAtom);
  const onSelectBondRef = useRef(onSelectBond);
  const onHoverBondRef = useRef(onHoverBond);
  const onSelectLonePairRef = useRef(onSelectLonePair);

  onSelectAtomRef.current = onSelectAtom;
  onHoverAtomRef.current = onHoverAtom;
  onSelectBondRef.current = onSelectBond;
  onHoverBondRef.current = onHoverBond;
  onSelectLonePairRef.current = onSelectLonePair;

  const [representation, setRepresentation] =
    useState<RepresentationMode>('ball_stick');
  const [explodedFactor, setExplodedFactor] = useState<number>(1.0);
  const [motionMode, setMotionMode] = useState<MotionMode>('static');
  const [showOrbitals, setShowOrbitals] = useState<boolean>(false);
  const [showElectronShell, setShowElectronShell] = useState<boolean>(false);
  const [stageTheme, setStageTheme] = useState<StageTheme>('light');
  const [dockCollapsed, setDockCollapsed] = useState<boolean>(false);
  const [captureNotice, setCaptureNotice] = useState<string | null>(null);
  const [showAddMenu, setShowAddMenu] = useState<boolean>(false);

  // Mount Three.js WebGLRenderer once in dedicated empty div
  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    const stage = new MolecularStage(el, {
      onSelectAtom: (id) => onSelectAtomRef.current(id),
      onHoverAtom: (id) => onHoverAtomRef.current(id),
      onSelectBond: (id) => onSelectBondRef.current(id),
      onHoverBond: (id) => onHoverBondRef.current(id),
      onSelectLonePair: (lp) => onSelectLonePairRef.current(lp),
    });
    stageRef.current = stage;

    return () => {
      stage.dispose();
      stageRef.current = null;
    };
  }, []);

  // Keyboard shortcut 'H' to toggle Zen / Cinema dock collapse
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }
      if (e.key === 'h' || e.key === 'H') {
        setDockCollapsed((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Sync molecule & metrics to Three.js stage
  useEffect(() => {
    stageRef.current?.setMolecule(molecule, metrics);
  }, [molecule, metrics]);

  // Sync visual options & selections to Three.js stage
  useEffect(() => {
    stageRef.current?.setOptions({
      representation,
      explodedFactor,
      motionMode,
      showOrbitals,
      showElectronShell,
      stageTheme,
      selectedAtomId,
      hoveredAtomId,
      selectedBondId,
      hoveredBondId,
      selectedLonePair,
    });
  }, [
    representation,
    explodedFactor,
    motionMode,
    showOrbitals,
    showElectronShell,
    stageTheme,
    selectedAtomId,
    hoveredAtomId,
    selectedBondId,
    hoveredBondId,
    selectedLonePair,
  ]);

  const handleCameraPreset = (preset: CameraPreset) => {
    stageRef.current?.setCameraPreset(preset);
  };

  const handleCapture = () => {
    if (!stageRef.current) return;
    const dataUrl = stageRef.current.captureSnapshotDataUrl();
    onCaptureSnapshot(dataUrl);
    setCaptureNotice('3D Snapshot saved to Studio');
    window.setTimeout(() => setCaptureNotice(null), 2400);
  };

  const handleSaveImage = (format: 'png' | 'jpeg') => {
    if (!stageRef.current) return;
    const dataUrl = stageRef.current.exportImage(format, 0.95);
    const link = document.createElement('a');
    link.href = dataUrl;
    const safeName = (molecule.name || 'molecule')
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '_');
    const ext = format === 'jpeg' ? 'jpg' : 'png';
    link.download = `${safeName}-3D.${ext}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setCaptureNotice(`Saved 3D as .${ext.toUpperCase()}`);
    window.setTimeout(() => setCaptureNotice(null), 2400);
  };

  const isDark = stageTheme === 'dark';

  // Details for currently selected 3D entities
  const selectedAtom = selectedAtomId
    ? molecule.atoms.find((a) => a.id === selectedAtomId) ?? null
    : null;
  const selectedBond = selectedBondId
    ? molecule.bonds.find((b) => b.id === selectedBondId) ?? null
    : null;
  const bondAtomA = selectedBond
    ? molecule.atoms.find((a) => a.id === selectedBond.from)
    : null;
  const bondAtomB = selectedBond
    ? molecule.atoms.find((a) => a.id === selectedBond.to)
    : null;
  const bondDist =
    bondAtomA && bondAtomB
      ? Math.hypot(
          bondAtomA.x3d - bondAtomB.x3d,
          bondAtomA.y3d - bondAtomB.y3d,
          bondAtomA.z3d - bondAtomB.z3d
        ).toFixed(2)
      : null;

  const COMMON_FRAGMENTS: Array<{ label: string; smiles: string }> = [
    { label: 'Methyl (-CH₃)', smiles: 'C' },
    { label: 'Hydroxyl (-OH)', smiles: 'O' },
    { label: 'Amino (-NH₂)', smiles: 'N' },
    { label: 'Carboxyl (-COOH)', smiles: 'C(=O)O' },
    { label: 'Phenyl (-Ph)', smiles: 'c1ccccc1' },
    { label: 'Benzene', smiles: 'c1ccccc1' },
    { label: 'Water (H₂O)', smiles: 'O' },
    { label: 'Methane (CH₄)', smiles: 'C' },
  ];

  return (
    <div
      className={`relative w-full h-full overflow-hidden rounded-xl border shadow-xs ${
        isDark
          ? 'bg-[#0B1120] border-slate-800'
          : 'bg-[#EEF3F8] border-slate-200'
      }`}
    >
      {/* Dedicated Isolated WebGL Container (no sibling nodes inside) */}
      <div ref={mountRef} className="w-full h-full touch-none" />

      {/* Top-Left Minimal Title & Formula Badge */}
      <div
        className={`absolute top-3 left-4 pointer-events-none select-none ${
          isDark ? 'text-slate-100' : 'text-slate-900'
        }`}
      >
        <div className="text-sm font-semibold tracking-tight">
          {molecule.name || 'Theoretical Structure'}
        </div>
        <div
          className={`text-xs font-mono tabular-nums flex items-center gap-2 ${
            isDark ? 'text-slate-300' : 'text-slate-600'
          }`}
        >
          <span>{metrics.formula}</span>
          <span aria-hidden="true">·</span>
          <span>{metrics.molecularWeight.toFixed(2)} g/mol</span>
          <span aria-hidden="true">·</span>
          <span>{metrics.totalAtomCountWithH} atoms</span>
        </div>
      </div>

      {/* Top-Right Save PNG/JPG & 3D Actions */}
      <div className="absolute top-3 right-4 flex items-center gap-1.5 flex-wrap justify-end">
        {captureNotice && (
          <span className="text-xs font-medium px-2.5 py-1 rounded-md bg-emerald-600 text-white shadow-xs">
            {captureNotice}
          </span>
        )}

        {/* Save as PNG Button */}
        <button
          type="button"
          onClick={() => handleSaveImage('png')}
          title="Save 3D structure as PNG image"
          className={`h-8 px-2.5 rounded-lg text-xs font-medium flex items-center gap-1.5 border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            isDark
              ? 'bg-slate-900/95 text-slate-100 border-slate-700 hover:bg-slate-800'
              : 'bg-white/95 text-slate-800 border-slate-200 hover:bg-slate-50 shadow-xs'
          }`}
        >
          <Download className="w-3.5 h-3.5 text-blue-600" />
          <span>PNG</span>
        </button>

        {/* Save as JPG Button */}
        <button
          type="button"
          onClick={() => handleSaveImage('jpeg')}
          title="Save 3D structure as JPG image"
          className={`h-8 px-2.5 rounded-lg text-xs font-medium flex items-center gap-1.5 border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            isDark
              ? 'bg-slate-900/95 text-slate-100 border-slate-700 hover:bg-slate-800'
              : 'bg-white/95 text-slate-800 border-slate-200 hover:bg-slate-50 shadow-xs'
          }`}
        >
          <Download className="w-3.5 h-3.5 text-emerald-600" />
          <span>JPG</span>
        </button>

        {/* Capture Snapshot Action */}
        <button
          type="button"
          onClick={handleCapture}
          aria-label="Capture 3D viewport snapshot"
          className={`h-8 px-2.5 rounded-lg text-xs font-medium flex items-center gap-1.5 border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            isDark
              ? 'bg-slate-900/95 text-slate-100 border-slate-700 hover:bg-slate-800'
              : 'bg-white/95 text-slate-800 border-slate-200 hover:bg-slate-50 shadow-xs'
          }`}
        >
          <Camera className="w-3.5 h-3.5 text-purple-600" />
          <span>Capture</span>
        </button>

        {/* Add Molecule / Fragment in 3D Button */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowAddMenu((v) => !v)}
            aria-label="Add Molecule or Fragment in 3D"
            title="Add functional group or fragment directly in 3D"
            className={`h-8 px-2.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              showAddMenu
                ? 'bg-blue-600 text-white border-blue-600'
                : isDark
                ? 'bg-slate-900/95 text-blue-400 border-slate-700 hover:bg-slate-800'
                : 'bg-white/95 text-blue-700 border-slate-200 hover:bg-slate-50 shadow-xs'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add in 3D</span>
          </button>

          {showAddMenu && (
            <div
              className={`absolute right-0 top-9 w-48 rounded-lg shadow-lg border p-1 z-30 ${
                isDark
                  ? 'bg-slate-900 border-slate-700 text-slate-200'
                  : 'bg-white border-slate-200 text-slate-800'
              }`}
            >
              <div className="text-[10.5px] font-semibold px-2 py-1 text-slate-400 border-b border-slate-200/50 mb-1">
                {selectedAtom ? 'Attach to 3D Atom' : 'Add Fragment in 3D'}
              </div>
              {COMMON_FRAGMENTS.map((f) => (
                <button
                  key={f.label}
                  type="button"
                  onClick={() => {
                    onAddFragment?.(f.smiles, f.label);
                    setShowAddMenu(false);
                  }}
                  className={`w-full text-left px-2 py-1.5 text-xs rounded-md transition-colors flex items-center justify-between cursor-pointer ${
                    isDark
                      ? 'hover:bg-slate-800 hover:text-white'
                      : 'hover:bg-blue-50 hover:text-blue-700'
                  }`}
                >
                  <span>{f.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Contextual 3D Floating Action Card: Active when Bond, Atom, or Lone Pair is selected in 3D */}
      {(selectedBond || selectedAtom || selectedLonePair) && (
        <div
          className={`absolute top-14 left-4 z-20 p-2.5 rounded-xl border shadow-md flex flex-col gap-2 max-w-xs animate-in fade-in slide-in-from-top-1 duration-150 ${
            isDark
              ? 'bg-slate-900/95 border-cyan-800/60 text-slate-100'
              : 'bg-white/95 border-cyan-300 text-slate-900'
          }`}
        >
          {/* Selected Bond Controls */}
          {selectedBond && bondAtomA && bondAtomB && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-bold text-cyan-600 flex items-center gap-1">
                  <span>Bond:</span>
                  <span className="font-mono text-slate-800 dark:text-slate-100">
                    {bondAtomA.element}
                    {selectedBond.order === 3
                      ? '≡'
                      : selectedBond.order === 2
                      ? '='
                      : '—'}
                    {bondAtomB.element}
                  </span>
                </span>
                <span className="text-[11px] font-mono text-slate-500 tabular-nums">
                  {bondDist} Å
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => onCycleBondOrder?.(selectedBond.id)}
                  title="Cycle bond order: Single ↔ Double ↔ Triple"
                  className="flex-1 py-1 px-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                >
                  <span>Cycle Order ({selectedBond.order}x)</span>
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteBond?.(selectedBond.id)}
                  title="Delete bond in 3D"
                  className="py-1 px-2 rounded-md bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold flex items-center justify-center gap-1 transition-colors border border-rose-200 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
                <button
                  type="button"
                  onClick={() => onSelectBond(null)}
                  className="text-[11px] text-slate-400 hover:text-slate-600 px-1"
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          {/* Selected Atom Controls */}
          {selectedAtom && !selectedBond && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-bold text-blue-600 flex items-center gap-1">
                  <span>3D Atom:</span>
                  <span className="font-mono text-slate-800 dark:text-slate-100">
                    {selectedAtom.element}
                  </span>
                </span>
                <span className="text-[11px] font-mono text-slate-500 tabular-nums">
                  Charge: {selectedAtom.formalCharge ?? 0}
                </span>
              </div>
              <div className="flex items-center gap-1 flex-wrap">
                <button
                  type="button"
                  onClick={() => onChangeAtomCharge?.(selectedAtom.id, 1)}
                  title="Add +1 Formal Charge in 3D"
                  className="h-6 px-2 rounded font-mono text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 cursor-pointer"
                >
                  +1
                </button>
                <button
                  type="button"
                  onClick={() => onChangeAtomCharge?.(selectedAtom.id, -1)}
                  title="Add -1 Formal Charge in 3D"
                  className="h-6 px-2 rounded font-mono text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 cursor-pointer"
                >
                  -1
                </button>
                <button
                  type="button"
                  onClick={() => onSproutAtom?.(selectedAtom.id, 'C')}
                  title="Sprout Carbon along open 3D VSEPR angle"
                  className="h-6 px-2 rounded text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>Sprout C</span>
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteAtom?.(selectedAtom.id)}
                  title="Delete atom in 3D"
                  className="h-6 px-1.5 rounded text-xs font-medium bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => onSelectAtom(null)}
                  className="text-[11px] text-slate-400 hover:text-slate-600 px-1"
                >
                  ✕
                </button>
              </div>
              {/* Quick element transmutation row */}
              <div className="flex items-center gap-1 pt-0.5">
                <span className="text-[10px] text-slate-400">Mutate:</span>
                {(['C', 'N', 'O', 'S', 'P', 'F', 'Cl', 'Br'] as const).map((el) => (
                  <button
                    key={el}
                    type="button"
                    onClick={() => onTransmuteAtom?.(selectedAtom.id, el)}
                    className={`h-5 w-5 rounded text-[10px] font-mono font-bold flex items-center justify-center cursor-pointer transition-colors ${
                      selectedAtom.element === el
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-blue-100'
                    }`}
                  >
                    {el}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Selected Lone Pair Controls */}
          {selectedLonePair && (
            <div className="space-y-1">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-bold text-indigo-500 flex items-center gap-1">
                  <Orbit className="w-3.5 h-3.5" />
                  <span>Lone Pair #{selectedLonePair.lobeIndex + 1}</span>
                </span>
                <span className="text-[10.5px] font-mono text-indigo-400">2e⁻ Non-bonding</span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-snug">
                Localized valence electron pair lobe. Acts as hydrogen-bond acceptor &amp; Lewis base center.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Collapsible Bottom Control Dock */}
      <div
        className="absolute left-2 right-2 bottom-2.5 z-10 flex flex-col items-center pointer-events-none transition-transform duration-200 ease-out"
        style={{
          transform: dockCollapsed
            ? 'translateY(calc(100% - 26px))'
            : 'translateY(0)',
        }}
      >
        {/* Collapse / Expand Toggle Handle */}
        <button
          type="button"
          onClick={() => setDockCollapsed((c) => !c)}
          aria-expanded={!dockCollapsed}
          aria-label={dockCollapsed ? 'Show 3D Controls' : 'Hide 3D Controls'}
          className={`h-6 px-2.5 rounded-t-lg border border-b-0 text-[10.5px] font-medium flex items-center gap-1 cursor-pointer pointer-events-auto ${
            isDark
              ? 'bg-slate-900/95 text-slate-300 border-slate-700 hover:text-white'
              : 'bg-white/95 text-slate-600 border-slate-200 hover:text-slate-900'
          }`}
        >
          {dockCollapsed ? (
            <>
              <ChevronUp className="w-3 h-3" />
              <span>Show Controls</span>
            </>
          ) : (
            <>
              <ChevronDown className="w-3 h-3" />
              <span>Hide Controls</span>
            </>
          )}
        </button>

        {/* Solid/RGBA 2-Row Compact Control Bar */}
        <div
          className={`px-2.5 py-1.5 rounded-xl border shadow-sm flex flex-col items-center gap-1.5 pointer-events-auto max-w-full ${
            isDark
              ? 'bg-slate-900/96 border-slate-700 text-slate-100'
              : 'bg-white/96 border-slate-200 text-slate-800'
          }`}
        >
          {/* Row 1: Representation Modes & Quantum Overlays */}
          <div className="flex flex-wrap items-center justify-center gap-1.5">
            <div
              className={`flex items-center p-0.5 rounded-md ${
                isDark ? 'bg-slate-800' : 'bg-slate-100'
              }`}
            >
              {(
                [
                  { id: 'ball_stick', label: 'Ball & Stick' },
                  { id: 'space_filling', label: 'Space-Fill' },
                  { id: 'wireframe', label: 'Wire' },
                ] as const
              ).map((item) => {
                const active = representation === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setRepresentation(item.id)}
                    className={`h-6 px-2 rounded text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      active
                        ? isDark
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-slate-900 shadow-2xs'
                        : isDark
                        ? 'text-slate-300 hover:text-white'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={onToggle3DHydrogens}
                aria-pressed={show3DHydrogens}
                title="Toggle explicit 3D hydrogens on spectrometer"
                className={`h-6 px-2 rounded text-[11px] font-medium border whitespace-nowrap shrink-0 cursor-pointer ${
                  show3DHydrogens
                    ? 'bg-blue-600 text-white border-blue-600'
                    : isDark
                    ? 'border-slate-700 text-slate-300 hover:bg-slate-800'
                    : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                3D H
              </button>
              <button
                type="button"
                onClick={() => setShowOrbitals((v) => !v)}
                aria-pressed={showOrbitals}
                title="Toggle lone pair orbital lobes (clickable in 3D)"
                className={`h-6 px-2 rounded text-[11px] font-medium border flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer ${
                  showOrbitals
                    ? 'bg-blue-600 text-white border-blue-600'
                    : isDark
                    ? 'border-slate-700 text-slate-300 hover:bg-slate-800'
                    : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Orbit className="w-3 h-3" />
                <span>Lone Pairs</span>
              </button>
              <button
                type="button"
                onClick={() => setShowElectronShell((v) => !v)}
                aria-pressed={showElectronShell}
                className={`h-6 px-2 rounded text-[11px] font-medium border flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer ${
                  showElectronShell
                    ? 'bg-blue-600 text-white border-blue-600'
                    : isDark
                    ? 'border-slate-700 text-slate-300 hover:bg-slate-800'
                    : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Eye className="w-3 h-3" />
                <span>VDW</span>
              </button>
            </div>
          </div>

          {/* Row 2: Bond Stretch, Motion Mode & Camera Presets */}
          <div className="flex flex-wrap items-center justify-center gap-1.5">
            <div className="flex items-center gap-1">
              <label
                htmlFor="exploded-bond-slider"
                className={`text-[10.5px] font-medium whitespace-nowrap ${
                  isDark ? 'text-slate-300' : 'text-slate-600'
                }`}
              >
                Stretch
              </label>
              <input
                id="exploded-bond-slider"
                type="range"
                min="1.0"
                max="1.75"
                step="0.05"
                value={explodedFactor}
                onChange={(e) => setExplodedFactor(parseFloat(e.target.value))}
                className="w-12 accent-blue-600 cursor-pointer"
              />
              <span className="text-[10.5px] font-mono tabular-nums w-7">
                {explodedFactor.toFixed(1)}x
              </span>
            </div>

            <div
              className={`flex items-center p-0.5 rounded-md ${
                isDark ? 'bg-slate-800' : 'bg-slate-100'
              }`}
            >
              {(
                [
                  { id: 'static', label: 'Static' },
                  { id: 'spin', label: 'Spin' },
                  { id: 'vibrate', label: 'Vibrate' },
                ] as const
              ).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMotionMode(m.id)}
                  className={`h-6 px-1.5 rounded text-[11px] font-medium whitespace-nowrap shrink-0 cursor-pointer ${
                    motionMode === m.id
                      ? isDark
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-slate-900 shadow-2xs'
                      : isDark
                      ? 'text-slate-300 hover:text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1">
              {(
                [
                  { id: 'iso', label: 'Iso' },
                  { id: 'top', label: 'Top' },
                  { id: 'front', label: 'Front' },
                ] as const
              ).map((cam) => (
                <button
                  key={cam.id}
                  type="button"
                  onClick={() => handleCameraPreset(cam.id)}
                  className={`h-6 px-1.5 rounded text-[11px] font-medium border whitespace-nowrap shrink-0 cursor-pointer ${
                    isDark
                      ? 'border-slate-700 text-slate-300 hover:bg-slate-800'
                      : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {cam.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => handleCameraPreset('reset')}
                aria-label="Reset camera view"
                className={`h-6 w-6 rounded border flex items-center justify-center cursor-pointer ${
                  isDark
                    ? 'border-slate-700 text-slate-300 hover:bg-slate-800'
                    : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <RotateCcw className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() =>
                  setStageTheme((t) => (t === 'light' ? 'dark' : 'light'))
                }
                aria-label="Toggle Light Lab or Dark Optical Chamber backdrop"
                className={`h-6 w-6 rounded border flex items-center justify-center cursor-pointer ${
                  isDark
                    ? 'border-slate-700 text-amber-300 hover:bg-slate-800'
                    : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                {isDark ? (
                  <Sun className="w-3 h-3" />
                ) : (
                  <Moon className="w-3 h-3" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
