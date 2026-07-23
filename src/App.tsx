import {
  ArrowDownToLine,
  ArrowRight,
  Check,
  ChevronDown,
  CircleHelp,
  ImagePlus,
  Layers3,
  Menu,
  PanelLeftClose,
  Plus,
  RefreshCw,
  SlidersHorizontal,
  Sparkles,
  Upload,
  WandSparkles,
  X,
  Zap,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { createLocalPreview, type CartoonStyle } from './demoFilter'

type ApiStatus = {
  available: boolean
  provider: string
  model: string
  mode: 'live' | 'demo'
  output?: {
    width: number
    height: number
    label: string
  }
}

type StyleOption = {
  id: CartoonStyle
  name: string
  note: string
  className: string
}

const STYLES: StyleOption[] = [
  { id: 'soft-3d', name: 'Soft 3D', note: 'Polished & tactile', className: 'preset-soft' },
  { id: 'anime', name: 'Anime', note: 'Clean cel shading', className: 'preset-anime' },
  { id: 'comic', name: 'Comic ink', note: 'Bold & graphic', className: 'preset-comic' },
  { id: 'clay', name: 'Clay', note: 'Warm & handmade', className: 'preset-clay' },
]

const MAX_SIZE = 10 * 1024 * 1024
const ACCEPTED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

function App() {
  const [portrait, setPortrait] = useState<File | null>(null)
  const [sourceUrl, setSourceUrl] = useState('')
  const [resultUrl, setResultUrl] = useState('')
  const [style, setStyle] = useState<CartoonStyle>('soft-3d')
  const [instruction, setInstruction] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [comparison, setComparison] = useState(50)
  const [outputMode, setOutputMode] = useState<'live' | 'local' | null>(null)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [mobileMenu, setMobileMenu] = useState(false)
  const [status, setStatus] = useState<ApiStatus>({
    available: false,
    provider: 'Together AI',
    model: 'black-forest-labs/FLUX.2-pro',
    mode: 'demo',
    output: { width: 1408, height: 1408, label: '2MP' },
  })
  const fileInput = useRef<HTMLInputElement>(null)

  const activeStyle = STYLES.find((item) => item.id === style) ?? STYLES[0]

  useEffect(() => {
    fetch('/api/status')
      .then((response) => response.json())
      .then((data: ApiStatus) => setStatus(data))
      .catch(() => setStatus((current) => ({ ...current, available: false, mode: 'demo' })))
  }, [])

  useEffect(() => () => {
    if (sourceUrl.startsWith('blob:')) URL.revokeObjectURL(sourceUrl)
  }, [sourceUrl])

  const chooseFile = () => fileInput.current?.click()

  const acceptFile = (file?: File) => {
    setError('')
    setNotice('')
    if (!file) return
    if (!ACCEPTED_TYPES.has(file.type)) {
      setError('Please choose a JPEG, PNG, or WebP portrait.')
      return
    }
    if (file.size > MAX_SIZE) {
      setError('That portrait is larger than 10 MB. Choose a smaller file.')
      return
    }
    if (sourceUrl.startsWith('blob:')) URL.revokeObjectURL(sourceUrl)
    setPortrait(file)
    setSourceUrl(URL.createObjectURL(file))
    setResultUrl('')
    setOutputMode(null)
    setComparison(50)
  }

  const clearPortrait = () => {
    if (sourceUrl.startsWith('blob:')) URL.revokeObjectURL(sourceUrl)
    setPortrait(null)
    setSourceUrl('')
    setResultUrl('')
    setOutputMode(null)
    setError('')
    setNotice('')
    if (fileInput.current) fileInput.current.value = ''
  }

  const makeLocalResult = async (reason?: string) => {
    if (!portrait) return
    const localImage = await createLocalPreview(portrait, style)
    setResultUrl(localImage)
    setOutputMode('local')
    setNotice(reason || 'Local preview created. Add a Together AI key for full AI transformation.')
  }

  const generate = async () => {
    if (!portrait || isGenerating) return
    setIsGenerating(true)
    setError('')
    setNotice('')

    try {
      if (!status.available) {
        await new Promise((resolve) => window.setTimeout(resolve, 850))
        await makeLocalResult()
        return
      }

      const form = new FormData()
      form.append('portrait', portrait)
      form.append('style', style)
      form.append('instruction', instruction)
      const response = await fetch('/api/generate', { method: 'POST', body: form })
      const payload = await response.json()

      if (!response.ok) {
        const fallbackCodes = new Set(['CREDITS_EXHAUSTED', 'RATE_LIMITED', 'PROVIDER_TIMEOUT', 'DEMO_MODE'])
        if (fallbackCodes.has(payload.code)) {
          await makeLocalResult(`${payload.error} A local preview was created instead.`)
          return
        }
        throw new Error(payload.error || 'The portrait could not be generated.')
      }

      setResultUrl(payload.image)
      setOutputMode('live')
      setComparison(50)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Something went wrong. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  const download = () => {
    if (!resultUrl) return
    const link = document.createElement('a')
    link.href = resultUrl
    const extension = resultUrl.startsWith('data:image/png') ? 'png' : 'jpg'
    link.download = `toonly-${style}-${Date.now()}.${extension}`
    link.click()
  }

  return (
    <div className="app-shell">
      <input
        ref={fileInput}
        className="visually-hidden"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={(event) => acceptFile(event.target.files?.[0])}
      />

      <aside className={`sidebar ${mobileMenu ? 'sidebar-open' : ''}`}>
        <div className="brand-row">
          <a className="brand" href="#top" aria-label="Toonly home">
            <span className="brand-mark"><Sparkles size={18} strokeWidth={2.4} /></span>
            <span>Toonly</span>
          </a>
          <button className="icon-button sidebar-close" onClick={() => setMobileMenu(false)} aria-label="Close navigation">
            <PanelLeftClose size={18} />
          </button>
        </div>

        <nav className="primary-nav" aria-label="Primary navigation">
          <button className="nav-item active"><WandSparkles size={18} /> Create <span className="nav-pill">AI</span></button>
          <button className="nav-item" disabled><Layers3 size={18} /> My portraits <span className="soon-label">Soon</span></button>
        </nav>

        <div className="workflow-block">
          <p className="eyebrow">Your workflow</p>
          <ol className="step-list">
            <li className={portrait ? 'complete' : 'current'}>
              <span className="step-dot">{portrait ? <Check size={12} /> : '1'}</span>
              <span><strong>Add portrait</strong><small>JPG, PNG or WebP</small></span>
            </li>
            <li className={portrait && !resultUrl ? 'current' : resultUrl ? 'complete' : ''}>
              <span className="step-dot">{resultUrl ? <Check size={12} /> : '2'}</span>
              <span><strong>Choose a look</strong><small>Four art directions</small></span>
            </li>
            <li className={resultUrl ? 'current' : ''}>
              <span className="step-dot">3</span>
              <span><strong>Export</strong><small>Download at 2MP</small></span>
            </li>
          </ol>
        </div>

        <div className="sidebar-spacer" />
        <div className="privacy-note">
          <span><Zap size={15} /></span>
          <div><strong>Private by design</strong><p>Toonly never stores your image.</p></div>
        </div>
        <button className="help-link"><CircleHelp size={17} /> How it works</button>
      </aside>

      <main className="workspace" id="top">
        <header className="topbar">
          <div className="topbar-left">
            <button className="icon-button mobile-menu" onClick={() => setMobileMenu(true)} aria-label="Open navigation">
              <Menu size={20} />
            </button>
            <div>
              <p className="breadcrumb">Create <span>/</span> New portrait</p>
              <h1>Cartoon portrait studio</h1>
            </div>
          </div>
          <div className={`status-badge ${status.available ? 'status-live' : ''}`}>
            <span className="status-dot" />
            {status.available ? 'Together AI connected' : 'Local preview mode'}
          </div>
          {resultUrl ? (
            <button className="button button-dark top-download" onClick={download}>
              <ArrowDownToLine size={17} /> Download
            </button>
          ) : (
            <button className="button button-quiet top-upload" onClick={chooseFile}>
              <Plus size={17} /> Add portrait
            </button>
          )}
        </header>

        <section className="canvas-column" aria-label="Portrait workspace">
          <div
            className={`canvas-stage ${!portrait ? 'canvas-empty' : ''} ${isDragging ? 'dragging' : ''}`}
            onDragOver={(event) => { event.preventDefault(); setIsDragging(true) }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(event) => {
              event.preventDefault()
              setIsDragging(false)
              acceptFile(event.dataTransfer.files?.[0])
            }}
          >
            {!portrait ? (
              <div className="upload-state">
                <div className="upload-art" aria-hidden="true">
                  <span className="portrait-shape" />
                  <span className="spark spark-one" />
                  <span className="spark spark-two" />
                  <span className="upload-orbit"><ImagePlus size={22} /></span>
                </div>
                <p className="eyebrow accent-eyebrow">Start with one great photo</p>
                <h2>Turn your portrait into<br />a character worth keeping.</h2>
                <p className="upload-copy">Choose a clear, front-facing portrait. We’ll keep what makes you recognizable and redraw the rest.</p>
                <button className="button button-dark button-large" onClick={chooseFile}>
                  <Upload size={18} /> Choose portrait
                </button>
                <p className="file-note">or drop it anywhere here · up to 10 MB</p>
              </div>
            ) : (
              <div className="editor-stage">
                <div className="canvas-toolbar">
                  <div className="file-chip"><span className="file-thumb" /> <span>{portrait.name}</span></div>
                  <div className="toolbar-actions">
                    {resultUrl && (
                      <span className={`result-mode ${outputMode === 'live' ? 'result-live' : ''}`}>
                        <span /> {outputMode === 'live' ? 'AI result' : 'Local preview'}
                      </span>
                    )}
                    <button className="icon-button" onClick={chooseFile} aria-label="Replace portrait"><RefreshCw size={17} /></button>
                    <button className="icon-button" onClick={clearPortrait} aria-label="Remove portrait"><X size={18} /></button>
                  </div>
                </div>

                <div className="portrait-frame">
                  {resultUrl ? (
                    <div className="comparison-view">
                      <img src={resultUrl} alt={`Portrait transformed in ${activeStyle.name} style`} className="result-image" />
                      <div className="source-overlay" style={{ width: `${comparison}%` }}>
                        <img src={sourceUrl} alt="Original portrait" className="source-image" />
                      </div>
                      <div className="compare-line" style={{ left: `${comparison}%` }}>
                        <span className="compare-handle"><ChevronDown size={15} /><ChevronDown size={15} /></span>
                      </div>
                      <span className="image-label label-before">Before</span>
                      <span className="image-label label-after">After</span>
                      <input
                        className="compare-input"
                        type="range"
                        min="0"
                        max="100"
                        value={comparison}
                        onChange={(event) => setComparison(Number(event.target.value))}
                        aria-label="Compare original and generated portrait"
                      />
                    </div>
                  ) : (
                    <img src={sourceUrl} alt="Portrait ready to transform" className="single-image" />
                  )}
                  {isGenerating && (
                    <div className="generating-overlay" aria-live="polite">
                      <span className="loader-orbit"><Sparkles size={24} /></span>
                      <strong>Drawing your {activeStyle.name.toLowerCase()} portrait</strong>
                      <p>{status.available ? 'FLUX.2 Pro is preserving the details that make you, you.' : 'Creating a private local style preview.'}</p>
                    </div>
                  )}
                </div>

                <div className="floating-composer">
                  <button className="composer-style" onClick={() => document.getElementById('styles-panel')?.scrollIntoView({ behavior: 'smooth' })}>
                    <span className={`mini-preset ${activeStyle.className}`} />
                    <span><small>Style</small><strong>{activeStyle.name}</strong></span>
                    <ChevronDown size={15} />
                  </button>
                  <div className="composer-field">
                    <label htmlFor="instruction">Optional detail</label>
                    <input
                      id="instruction"
                      value={instruction}
                      onChange={(event) => setInstruction(event.target.value)}
                      maxLength={280}
                      placeholder="Keep my glasses, use a warm background…"
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') generate()
                      }}
                    />
                  </div>
                  <button className="generate-button" onClick={generate} disabled={isGenerating}>
                    {isGenerating ? <RefreshCw className="spin" size={19} /> : <ArrowRight size={20} />}
                    <span className="visually-hidden">Generate portrait</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {(error || notice) && (
            <div className={`message-bar ${error ? 'message-error' : ''}`} role={error ? 'alert' : 'status'}>
              <span>{error || notice}</span>
              <button onClick={() => { setError(''); setNotice('') }} aria-label="Dismiss message"><X size={16} /></button>
            </div>
          )}
        </section>

        <aside className="inspector" aria-label="Portrait controls">
          <div className="inspector-heading">
            <div><p className="eyebrow">Art direction</p><h2>Choose your look</h2></div>
            <SlidersHorizontal size={19} />
          </div>

          <div className="preset-grid" id="styles-panel">
            {STYLES.map((option) => (
              <button
                key={option.id}
                className={`preset-card ${style === option.id ? 'selected' : ''}`}
                onClick={() => setStyle(option.id)}
                aria-pressed={style === option.id}
              >
                <span className={`preset-visual ${option.className}`}><span className="preset-head" /></span>
                <span className="preset-copy"><strong>{option.name}</strong><small>{option.note}</small></span>
                <span className="check-badge"><Check size={12} /></span>
              </button>
            ))}
          </div>

          <div className="inspector-divider" />

          <div className="setting-row">
            <div><span className="setting-icon"><Sparkles size={16} /></span><span><strong>Preserve identity</strong><small>Face, hair and details</small></span></div>
            <span className="locked-toggle"><span /></span>
          </div>
          <div className="setting-row">
            <div><span className="setting-icon"><ImagePlus size={16} /></span><span><strong>Output size</strong><small>Square-friendly portrait</small></span></div>
            <span className="quality-chip">2MP</span>
          </div>

          <div className="inspector-spacer" />
          <div className="cost-card">
            <div className="cost-icon"><Zap size={18} /></div>
            <div><strong>{status.available ? 'Ready for FLUX.2 Pro' : 'Preview mode is free'}</strong><p>{status.available ? 'A 2MP result uses more credit than the base resolution.' : 'Add your key when you want the full AI result.'}</p></div>
          </div>

          <button className="button button-dark inspector-generate" onClick={portrait ? generate : chooseFile} disabled={isGenerating}>
            {portrait ? <WandSparkles size={18} /> : <Upload size={18} />}
            {portrait ? (isGenerating ? 'Creating portrait…' : 'Create portrait') : 'Add a portrait'}
          </button>
        </aside>
      </main>
    </div>
  )
}

export default App
