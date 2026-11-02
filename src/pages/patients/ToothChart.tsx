import React from 'react'
import type { ToothConditionType } from '@/services/clinicStore'

// ─── FDI Tooth Definitions ────────────────────────────────────────────────────

type ToothType = 'molar' | 'premolar' | 'canine' | 'incisor'

interface ToothDef {
  num: number
  type: ToothType
  arch: 'upper' | 'lower'
}

function getToothType(num: number): ToothType {
  const n = num % 10
  if (n >= 6 && n <= 8) return 'molar'
  if (n === 4 || n === 5) return 'premolar'
  if (n === 3) return 'canine'
  return 'incisor' // 1, 2
}

// Adult dentition quadrant arrays (FDI numbering)
const ADULT_QUADRANTS = {
  upperRight: [18, 17, 16, 15, 14, 13, 12, 11] as number[],
  upperLeft:  [21, 22, 23, 24, 25, 26, 27, 28] as number[],
  lowerLeft:  [31, 32, 33, 34, 35, 36, 37, 38] as number[],
  lowerRight: [48, 47, 46, 45, 44, 43, 42, 41] as number[],
}

// Primary dentition quadrant arrays (FDI primary codes)
const PRIMARY_QUADRANTS = {
  upperRight: [55, 54, 53, 52, 51] as number[],
  upperLeft:  [61, 62, 63, 64, 65] as number[],
  lowerLeft:  [71, 72, 73, 74, 75] as number[],
  lowerRight: [85, 84, 83, 82, 81] as number[],
}

// ─── Condition Colors ─────────────────────────────────────────────────────────

const CONDITION_COLORS: Record<ToothConditionType | 'default', string> = {
  Healthy:  '#ffffff',
  Caries:   '#dc2626',
  Restored: '#2563eb',
  Missing:  '#94a3b8',
  Crown:    '#d97706',
  RCT:      '#7c3aed',
  default:  '#ffffff',
}

const CONDITION_STROKE: Record<ToothConditionType | 'default', string> = {
  Healthy:  '#cbd5e1',
  Caries:   '#b91c1c',
  Restored: '#1d4ed8',
  Missing:  '#64748b',
  Crown:    '#b45309',
  RCT:      '#5b21b6',
  default:  '#cbd5e1',
}

function getConditionFill(condition?: ToothConditionType): string {
  return condition ? CONDITION_COLORS[condition] : CONDITION_COLORS.default
}

function getConditionStroke(condition?: ToothConditionType): string {
  return condition ? CONDITION_STROKE[condition] : CONDITION_STROKE.default
}

// ─── SVG Tooth Shapes ─────────────────────────────────────────────────────────

interface ToothSVGProps {
  toothNum: number
  condition?: ToothConditionType
  isSelected: boolean
  isUpper: boolean
  isPrimary?: boolean
  onClick: () => void
}

/**
 * Dimensions per tooth type (crown W x H, root H)
 */
function getDimensions(type: ToothType, isPrimary: boolean) {
  const scale = isPrimary ? 0.8 : 1
  switch (type) {
    case 'molar':
      return { crownW: Math.round(32 * scale), crownH: Math.round(22 * scale), rootH: Math.round(26 * scale), rootW: Math.round(20 * scale) }
    case 'premolar':
      return { crownW: Math.round(24 * scale), crownH: Math.round(20 * scale), rootH: Math.round(26 * scale), rootW: Math.round(14 * scale) }
    case 'canine':
      return { crownW: Math.round(20 * scale), crownH: Math.round(18 * scale), rootH: Math.round(30 * scale), rootW: Math.round(10 * scale) }
    case 'incisor':
      return { crownW: Math.round(18 * scale), crownH: Math.round(16 * scale), rootH: Math.round(26 * scale), rootW: Math.round(10 * scale) }
  }
}

/**
 * Renders a single anatomical tooth as an inline SVG group within a clickable button.
 */
const ToothSVG: React.FC<ToothSVGProps> = ({
  toothNum,
  condition,
  isSelected,
  isUpper,
  isPrimary = false,
  onClick,
}) => {
  const type = getToothType(toothNum)
  const { crownW, crownH, rootH, rootW } = getDimensions(type, isPrimary)

  const fill   = getConditionFill(condition)
  const stroke = getConditionStroke(condition)
  const selectedStroke = '#0b8185'
  const selectedGlow   = 'rgba(11,129,133,0.22)'

  // Total SVG height: crown + root + gap
  const gap    = 2
  const svgW   = crownW + 4  // a little padding
  const svgH   = crownH + rootH + gap + 4

  // Crown y-start: upper teeth crown is on top, root hangs down; lower teeth root is above crown
  const crownY = isUpper ? 2 : rootH + gap + 2
  const rootY  = isUpper ? crownH + gap + 2 : 2

  // Root x-center aligned with crown center
  const crownX = (svgW - crownW) / 2
  const rootX  = (svgW - rootW) / 2

  // For missing teeth: overlay X mark
  const isMissing = condition === 'Missing'

  // Inner detail color (cusp lines / root lines)
  const detailColor = isMissing ? '#94a3b8' : (condition ? '#00000020' : '#00000018')

  return (
    <button
      type="button"
      className={`odo-tooth-btn${isSelected ? ' is-selected' : ''}`}
      onClick={onClick}
      aria-label={`Tooth ${toothNum}${condition ? `, ${condition}` : ''}`}
      aria-pressed={isSelected}
    >
      {/* FDI number — above tooth for upper arch, below for lower */}
      {isUpper && <span className="odo-tooth-fdi">{toothNum}</span>}

      <svg
        width={svgW}
        height={svgH}
        viewBox={`0 0 ${svgW} ${svgH}`}
        xmlns="http://www.w3.org/2000/svg"
        style={{ display: 'block', overflow: 'visible' }}
      >
        {/* Glow for selected tooth */}
        {isSelected && (
          <rect
            x={crownX - 2}
            y={crownY - 2}
            width={crownW + 4}
            height={crownH + 4}
            rx={5}
            fill={selectedGlow}
            stroke={selectedStroke}
            strokeWidth={2}
          />
        )}

        {/* Root(s) */}
        {!isMissing && (
          <rect
            x={rootX}
            y={rootY}
            width={rootW}
            height={rootH}
            rx={type === 'canine' ? 5 : 3}
            fill="#f1f5f9"
            stroke={isSelected ? selectedStroke : '#cbd5e1'}
            strokeWidth={isSelected ? 1.5 : 1}
          />
        )}

        {/* Crown shape */}
        {type === 'molar' && (
          <rect
            x={crownX}
            y={crownY}
            width={crownW}
            height={crownH}
            rx={4}
            fill={fill}
            stroke={isSelected ? selectedStroke : stroke}
            strokeWidth={isSelected ? 2 : 1.2}
          />
        )}

        {type === 'premolar' && (
          <rect
            x={crownX}
            y={crownY}
            width={crownW}
            height={crownH}
            rx={4}
            fill={fill}
            stroke={isSelected ? selectedStroke : stroke}
            strokeWidth={isSelected ? 2 : 1.2}
          />
        )}

        {type === 'canine' && (
          // Pointed bottom (upper) or pointed top (lower) using polygon
          isUpper ? (
            <polygon
              points={`
                ${crownX},${crownY}
                ${crownX + crownW},${crownY}
                ${crownX + crownW},${crownY + crownH - 6}
                ${crownX + crownW / 2},${crownY + crownH}
                ${crownX},${crownY + crownH - 6}
              `}
              fill={fill}
              stroke={isSelected ? selectedStroke : stroke}
              strokeWidth={isSelected ? 2 : 1.2}
              strokeLinejoin="round"
            />
          ) : (
            <polygon
              points={`
                ${crownX},${crownY + 6}
                ${crownX + crownW / 2},${crownY}
                ${crownX + crownW},${crownY + 6}
                ${crownX + crownW},${crownY + crownH}
                ${crownX},${crownY + crownH}
              `}
              fill={fill}
              stroke={isSelected ? selectedStroke : stroke}
              strokeWidth={isSelected ? 2 : 1.2}
              strokeLinejoin="round"
            />
          )
        )}

        {type === 'incisor' && (
          // Rounded rectangle, slightly tapered at the biting edge
          <rect
            x={crownX}
            y={crownY}
            width={crownW}
            height={crownH}
            rx={3}
            fill={fill}
            stroke={isSelected ? selectedStroke : stroke}
            strokeWidth={isSelected ? 2 : 1.2}
          />
        )}

        {/* ── Inner cusp / detail lines ── */}
        {!isMissing && type === 'molar' && (
          <>
            {/* Cross cusp lines */}
            <line
              x1={crownX + crownW / 2} y1={crownY + 3}
              x2={crownX + crownW / 2} y2={crownY + crownH - 3}
              stroke={detailColor} strokeWidth={1}
            />
            <line
              x1={crownX + 3} y1={crownY + crownH / 2}
              x2={crownX + crownW - 3} y2={crownY + crownH / 2}
              stroke={detailColor} strokeWidth={1}
            />
          </>
        )}

        {!isMissing && type === 'premolar' && (
          // Single vertical fissure line
          <line
            x1={crownX + crownW / 2} y1={crownY + 3}
            x2={crownX + crownW / 2} y2={crownY + crownH - 3}
            stroke={detailColor} strokeWidth={1}
          />
        )}

        {!isMissing && type === 'incisor' && (
          // Mamelons: three small bumps represented as dots
          <>
            <circle cx={crownX + crownW * 0.3} cy={crownY + crownH - 4} r={1.5} fill={detailColor} />
            <circle cx={crownX + crownW * 0.5} cy={crownY + crownH - 4} r={1.5} fill={detailColor} />
            <circle cx={crownX + crownW * 0.7} cy={crownY + crownH - 4} r={1.5} fill={detailColor} />
          </>
        )}

        {/* Root canal marker (purple dot in pulp) */}
        {condition === 'RCT' && !isMissing && (
          <circle
            cx={svgW / 2}
            cy={isUpper ? crownY + crownH + rootH / 2 : rootY + rootH / 2}
            r={2.5}
            fill="#7c3aed"
          />
        )}

        {/* Crown overlay ring (amber band at cervical) */}
        {condition === 'Crown' && !isMissing && (
          <rect
            x={crownX + 1}
            y={crownY + crownH - 5}
            width={crownW - 2}
            height={4}
            rx={1}
            fill="#fbbf24"
            opacity={0.7}
          />
        )}

        {/* Missing: X mark */}
        {isMissing && (
          <>
            <line
              x1={crownX} y1={crownY}
              x2={crownX + crownW} y2={crownY + crownH}
              stroke="#94a3b8" strokeWidth={2} strokeLinecap="round"
            />
            <line
              x1={crownX + crownW} y1={crownY}
              x2={crownX} y2={crownY + crownH}
              stroke="#94a3b8" strokeWidth={2} strokeLinecap="round"
            />
          </>
        )}
      </svg>

      {/* FDI number — below tooth for lower arch */}
      {!isUpper && <span className="odo-tooth-fdi">{toothNum}</span>}
    </button>
  )
}

// ─── ToothChart Props ─────────────────────────────────────────────────────────

export interface ToothChartProps {
  conditions: Record<number, { condition: ToothConditionType; notes?: string }>
  selectedTooth: number | null
  onToothSelect: (num: number) => void
  dentitionMode: 'adult' | 'primary'
  onDentitionChange: (mode: 'adult' | 'primary') => void
}

// ─── Main ToothChart Component ────────────────────────────────────────────────

export const ToothChart: React.FC<ToothChartProps> = ({
  conditions,
  selectedTooth,
  onToothSelect,
  dentitionMode,
  onDentitionChange,
}) => {
  const Q = dentitionMode === 'primary' ? PRIMARY_QUADRANTS : ADULT_QUADRANTS

  const renderTooth = (num: number, isUpper: boolean) => (
    <ToothSVG
      key={num}
      toothNum={num}
      condition={conditions[num]?.condition}
      isSelected={selectedTooth === num}
      isUpper={isUpper}
      isPrimary={dentitionMode === 'primary'}
      onClick={() => onToothSelect(num)}
    />
  )

  return (
    <div className="odo-wrap">
      {/* Dentition toggle */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
        <span style={{ fontSize: '12px', color: 'var(--text-muted, #64748b)', fontWeight: 600 }}>
          Dentition Mode
        </span>
        <div className="odo-dentition-toggle">
          <button
            className={dentitionMode === 'adult' ? 'is-active' : ''}
            onClick={() => onDentitionChange('adult')}
            type="button"
          >
            Adult (32)
          </button>
          <button
            className={dentitionMode === 'primary' ? 'is-active' : ''}
            onClick={() => onDentitionChange('primary')}
            type="button"
          >
            Primary (20)
          </button>
        </div>
      </div>

      {/* Maxillary (Upper) Arch */}
      <div className="odo-arch-label">Maxillary Arch (Upper)</div>
      <div className="odo-arch-row">
        {/* Q1: Upper Right — displayed right-to-left from patient's perspective, so 18→11 = leftmost to midline */}
        <div className="odo-quadrant">
          {Q.upperRight.map((n) => renderTooth(n, true))}
        </div>
        <div className="odo-midline" style={{ height: '72px' }} />
        {/* Q2: Upper Left — 21→28 from midline outward */}
        <div className="odo-quadrant">
          {Q.upperLeft.map((n) => renderTooth(n, true))}
        </div>
      </div>

      {/* Arch divider */}
      <hr className="odo-arch-divider" />

      {/* Mandibular (Lower) Arch */}
      <div className="odo-arch-row is-lower">
        {/* Q4: Lower Right — 48→41, mirroring upper right */}
        <div className="odo-quadrant">
          {Q.lowerRight.map((n) => renderTooth(n, false))}
        </div>
        <div className="odo-midline" style={{ height: '72px' }} />
        {/* Q3: Lower Left — 31→38 */}
        <div className="odo-quadrant">
          {Q.lowerLeft.map((n) => renderTooth(n, false))}
        </div>
      </div>
      <div className="odo-arch-label" style={{ marginTop: '4px' }}>Mandibular Arch (Lower)</div>
    </div>
  )
}

export default ToothChart
