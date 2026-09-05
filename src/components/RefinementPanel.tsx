import { ArrowLeft, Layers3, SlidersHorizontal, Sparkles } from 'lucide-react'
import {
  REFINEMENT_OPTIONS,
  type RefinementPreset,
} from '../generation'

type RefinementPanelProps = {
  available: boolean
  unavailableMessage?: string
  busy: boolean
  customInstruction: string
  canUndo: boolean
  selected: RefinementPreset
  onCustomInstructionChange: (value: string) => void
  onOpenPack: () => void
  onRefine: () => void
  onSelectedChange: (preset: RefinementPreset) => void
  onUndo: () => void
}

export function RefinementPanel({
  available,
  unavailableMessage,
  busy,
  customInstruction,
  canUndo,
  selected,
  onCustomInstructionChange,
  onOpenPack,
  onRefine,
  onSelectedChange,
  onUndo,
}: RefinementPanelProps) {
  return (
    <section className="feature-panel" aria-labelledby="refine-heading">
      <div className="feature-heading">
        <span className="setting-icon"><SlidersHorizontal size={16} /></span>
        <div>
          <p className="eyebrow">Refine this portrait</p>
          <h3 id="refine-heading">Keep the character. Tune the details.</h3>
        </div>
      </div>

      <div className="refinement-grid" role="group" aria-label="Refinement options">
        {REFINEMENT_OPTIONS.map((option) => (
          <button
            key={option.id}
            className={`refinement-chip ${selected === option.id ? 'selected' : ''}`}
            type="button"
            aria-pressed={selected === option.id}
            onClick={() => onSelectedChange(option.id)}
            disabled={busy || !available}
          >
            {option.name}
          </button>
        ))}
      </div>

      {selected === 'custom' && (
        <div className="refinement-custom">
          <label htmlFor="refinement-instruction">What should change?</label>
          <textarea
            id="refinement-instruction"
            maxLength={280}
            rows={3}
            value={customInstruction}
            onChange={(event) => onCustomInstructionChange(event.target.value)}
            placeholder="For example: keep my face and use a sunset background."
            disabled={busy || !available}
          />
          <small>{customInstruction.length}/280</small>
        </div>
      )}

      {!available && (
        <p className="feature-hint">{unavailableMessage || 'Refinement needs a live AI result. Local previews always stay on your device.'}</p>
      )}

      <div className="feature-actions">
        <button
          className="button button-quiet feature-undo"
          type="button"
          onClick={onUndo}
          disabled={!canUndo || busy}
        >
          <ArrowLeft size={15} /> Undo
        </button>
        <button
          className="button button-dark feature-refine"
          type="button"
          onClick={onRefine}
          disabled={busy || !available || (selected === 'custom' && !customInstruction.trim())}
        >
          <Sparkles size={16} /> Refine
        </button>
      </div>

      <button
        className="pack-entry"
        type="button"
        onClick={onOpenPack}
        disabled={busy || !available}
      >
        <span className="pack-entry-icon"><Layers3 size={17} /></span>
        <span><strong>Make a character pack</strong><small>Four coordinated portraits</small></span>
        <span aria-hidden="true">→</span>
      </button>
    </section>
  )
}
