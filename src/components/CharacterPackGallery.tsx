import { ArrowDownToLine, RefreshCw, Sparkles } from 'lucide-react'
import type { PackItem, PackPreset } from '../generation'

type CharacterPackGalleryProps = {
  busy: boolean
  items: PackItem[]
  onDownloadAll: () => void
  onDownloadItem: (item: PackItem) => void
  onRetry: (preset: PackPreset) => void
}

export function CharacterPackGallery({
  busy,
  items,
  onDownloadAll,
  onDownloadItem,
  onRetry,
}: CharacterPackGalleryProps) {
  const completeCount = items.filter((item) => item.status === 'complete').length
  const isComplete = completeCount === items.length
  const hasError = items.some((item) => item.status === 'error')

  return (
    <section className="pack-gallery" aria-labelledby="pack-gallery-heading">
      <div className="pack-gallery-heading">
        <div>
          <p className="eyebrow">Your character pack</p>
          <h2 id="pack-gallery-heading">
            {isComplete
              ? 'Four moments. One character.'
              : hasError && !busy
                ? 'Pack paused. Retry when ready.'
                : `Creating ${Math.min(completeCount + 1, items.length)} of ${items.length}`}
          </h2>
        </div>
        <button
          className="button button-dark"
          type="button"
          onClick={onDownloadAll}
          disabled={!isComplete || busy}
        >
          <ArrowDownToLine size={16} /> Download ZIP
        </button>
      </div>

      <div className="pack-progress" aria-label={`${completeCount} of ${items.length} portraits complete`}>
        <span style={{ width: `${(completeCount / items.length) * 100}%` }} />
      </div>

      <div className="pack-grid">
        {items.map((item) => (
          <article className={`pack-card pack-${item.status}`} key={item.id}>
            <div className="pack-image">
              {item.image ? (
                <img src={item.image} alt={`${item.name} character portrait`} />
              ) : item.status === 'error' ? (
                <button type="button" onClick={() => onRetry(item.id)} disabled={busy}>
                  <RefreshCw size={19} /> Retry
                </button>
              ) : (
                <span className={item.status === 'generating' ? 'pack-loader' : ''}>
                  <Sparkles size={21} />
                </span>
              )}
            </div>
            <div className="pack-card-copy">
              <span><strong>{item.name}</strong><small>{item.status === 'error' ? item.error : item.note}</small></span>
              {item.image && (
                <button type="button" onClick={() => onDownloadItem(item)} aria-label={`Download ${item.name}`}>
                  <ArrowDownToLine size={15} />
                </button>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
