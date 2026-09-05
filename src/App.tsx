import {
  ArrowDownToLine,
  ArrowRight,
  Check,
  ChevronDown,
  CircleHelp,
  ImagePlus,
  Layers3,
  Menu,
  Moon,
  PanelLeftClose,
  Plus,
  RefreshCw,
  SlidersHorizontal,
  Sparkles,
  Sun,
  Upload,
  WandSparkles,
  X,
  Zap,
} from 'lucide-react'
import JSZip from 'jszip'
import { useEffect, useRef, useState } from 'react'
import { CharacterPackGallery } from './components/CharacterPackGallery'
import { RefinementPanel } from './components/RefinementPanel'
import { createLocalPreview, type CartoonStyle } from './demoFilter'
import {
  createQueuedPack,
  dataUrlToBlob,
  type GenerationOperation,
  type PackItem,
  type PackPreset,
  type RefinementPreset,
  type ResultMetadata,
  type ResultSnapshot,
} from './generation'

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

type GenerationResponse = {
  image: string
  mode: 'live'
  model: string
  operation: GenerationOperation
  preset?: string | null
}

class GenerationError extends Error {
  code: string

  constructor(message: string, code = 'GENERATION_FAILED') {
    super(message)
    this.code = code
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
const THEME_STORAGE_KEY = 'toonly-theme'

type Theme = 'light' | 'dark'

const getInitialTheme = (): Theme => {
  const documentTheme = document.documentElement.dataset.theme
  if (documentTheme === 'light' || documentTheme === 'dark') return documentTheme
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function App() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme)
  const [portrait, setPortrait] = useState<File | null>(null)
  const [sourceUrl, setSourceUrl] = useState('')
  const [resultUrl, setResultUrl] = useState('')
  const [style, setStyle] = useState<CartoonStyle>('soft-3d')
  const [instruction, setInstruction] = useState('')
  const [activeTask, setActiveTask] = useState<GenerationOperation | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [comparison, setComparison] = useState(50)
  const [outputMode, setOutputMode] = useState<'live' | 'local' | null>(null)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [mobileMenu, setMobileMenu] = useState(false)
  const [resultMetadata, setResultMetadata] = useState<ResultMetadata | null>(null)
  const [resultHistory, setResultHistory] = useState<ResultSnapshot[]>([])
  const [refinement, setRefinement] = useState<RefinementPreset>('likeness')
  const [refinementInstruction, setRefinementInstruction] = useState('')
  const [packItems, setPackItems] = useState<PackItem[]>([])
  const [isPackConfirmOpen, setIsPackConfirmOpen] = useState(false)
  const [status, setStatus] = useState<ApiStatus>({
    available: false,
    provider: 'Together AI',
    model: 'black-forest-labs/FLUX.2-pro',
    mode: 'demo',
    output: { width: 1408, height: 1408, label: '2MP' },
  })
  const fileInput = useRef<HTMLInputElement>(null)

  const activeStyle = STYLES.find((item) => item.id === style) ?? STYLES[0]
  const resultStyleName = STYLES.find((item) => item.id === resultMetadata?.style)?.name ?? activeStyle.name
  const isGenerating = activeTask !== null
  const resultIsLive = outputMode === 'live'
  const resultIsStale = Boolean(
    resultMetadata && (
      resultMetadata.style !== style
      || (resultMetadata.operation === 'create' && resultMetadata.instruction !== instruction)
    ),
  )

  useEffect(() => {
    fetch('/api/status')
      .then((response) => response.json())
      .then((data: ApiStatus) => setStatus(data))
      .catch(() => setStatus((current) => ({ ...current, available: false, mode: 'demo' })))
  }, [])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.documentElement.style.colorScheme = theme
    document.querySelector('meta[name="theme-color"]')?.setAttribute(
      'content',
      theme === 'dark' ? '#151612' : '#f3f3ee',
    )
  }, [theme])

  useEffect(() => {
    if (window.localStorage.getItem(THEME_STORAGE_KEY)) return

    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const syncWithSystem = (event: MediaQueryListEvent) => {
      if (!window.localStorage.getItem(THEME_STORAGE_KEY)) {
        setTheme(event.matches ? 'dark' : 'light')
      }
    }
    media.addEventListener('change', syncWithSystem)
    return () => media.removeEventListener('change', syncWithSystem)
  }, [])

  useEffect(() => () => {
    if (sourceUrl.startsWith('blob:')) URL.revokeObjectURL(sourceUrl)
  }, [sourceUrl])

  const chooseFile = () => fileInput.current?.click()

  const toggleTheme = () => {
    const nextTheme: Theme = theme === 'light' ? 'dark' : 'light'
    window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme)
    setTheme(nextTheme)
  }

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
    setResultMetadata(null)
    setResultHistory([])
    setPackItems([])
    setIsPackConfirmOpen(false)
    setOutputMode(null)
    setComparison(50)
  }

  const clearPortrait = () => {
    if (sourceUrl.startsWith('blob:')) URL.revokeObjectURL(sourceUrl)
    setPortrait(null)
    setSourceUrl('')
    setResultUrl('')
    setResultMetadata(null)
    setResultHistory([])
    setPackItems([])
    setIsPackConfirmOpen(false)
    setOutputMode(null)
    setError('')
    setNotice('')
    if (fileInput.current) fileInput.current.value = ''
  }

  const makeLocalResult = async (reason?: string) => {
    if (!portrait) return
    const localImage = await createLocalPreview(portrait, style)
    setResultUrl(localImage)
    setResultMetadata({ style, instruction, operation: 'create' })
    setResultHistory([])
    setPackItems([])
    setOutputMode('local')
    setNotice(reason || 'Local preview created. Add a Together AI key for full AI transformation.')
  }

  const requestGeneration = async ({
    image,
    filename,
    operation,
    requestStyle,
    preset,
    requestInstruction = '',
  }: {
    image: Blob
    filename: string
    operation: GenerationOperation
    requestStyle: CartoonStyle
    preset?: string
    requestInstruction?: string
  }): Promise<GenerationResponse> => {
    const form = new FormData()
    form.append('portrait', image, filename)
    form.append('style', requestStyle)
    form.append('operation', operation)
    form.append('instruction', requestInstruction)
    if (preset) form.append('preset', preset)

    const response = await fetch('/api/generate', { method: 'POST', body: form })
    const payload = await response.json().catch(() => ({}))

    if (!response.ok) {
      throw new GenerationError(
        typeof payload.error === 'string' ? payload.error : 'The portrait could not be generated.',
        typeof payload.code === 'string' ? payload.code : undefined,
      )
    }

    return payload as GenerationResponse
  }

  const generate = async () => {
    if (!portrait || isGenerating) return
    setActiveTask('create')
    setError('')
    setNotice('')

    try {
      if (!status.available) {
        await new Promise((resolve) => window.setTimeout(resolve, 850))
        await makeLocalResult()
        return
      }

      const payload = await requestGeneration({
        image: portrait,
        filename: portrait.name,
        operation: 'create',
        requestStyle: style,
        requestInstruction: instruction,
      })

      setResultUrl(payload.image)
      setResultMetadata({ style, instruction, operation: 'create' })
      setResultHistory([])
      setPackItems([])
      setOutputMode('live')
      setComparison(50)
    } catch (caught) {
      const fallbackCodes = new Set(['CREDITS_EXHAUSTED', 'RATE_LIMITED', 'PROVIDER_TIMEOUT', 'DEMO_MODE'])
      if (caught instanceof GenerationError && fallbackCodes.has(caught.code)) {
        await makeLocalResult(`${caught.message} A local preview was created instead.`)
      } else {
        setError(caught instanceof Error ? caught.message : 'Something went wrong. Please try again.')
      }
    } finally {
      setActiveTask(null)
    }
  }

  const refineResult = async () => {
    if (!resultUrl || !resultMetadata || !resultIsLive || resultIsStale || isGenerating) return
    setActiveTask('refine')
    setError('')
    setNotice('')

    try {
      const source = await dataUrlToBlob(resultUrl)
      const payload = await requestGeneration({
        image: source,
        filename: 'toonly-master.png',
        operation: 'refine',
        requestStyle: resultMetadata.style,
        preset: refinement,
        requestInstruction: refinement === 'custom' ? refinementInstruction.trim() : '',
      })

      setResultHistory((current) => [...current, { image: resultUrl, metadata: resultMetadata }])
      setResultUrl(payload.image)
      setResultMetadata({
        style: resultMetadata.style,
        instruction: refinement === 'custom' ? refinementInstruction.trim() : '',
        operation: 'refine',
        preset: refinement,
      })
      setPackItems([])
      setIsPackConfirmOpen(false)
      setComparison(50)
      setNotice('Refinement complete. You can undo it or keep refining this version.')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The portrait could not be refined.')
    } finally {
      setActiveTask(null)
    }
  }

  const undoRefinement = () => {
    const previous = resultHistory[resultHistory.length - 1]
    if (!previous || isGenerating) return
    setResultUrl(previous.image)
    setResultMetadata(previous.metadata)
    setResultHistory((current) => current.slice(0, -1))
    setPackItems([])
    setIsPackConfirmOpen(false)
    setComparison(50)
    setNotice('Returned to the previous portrait version.')
  }

  const generateCharacterPack = async () => {
    if (!resultUrl || !resultMetadata || !resultIsLive || resultIsStale || isGenerating) return
    const queuedPack = createQueuedPack()
    setPackItems(queuedPack)
    setIsPackConfirmOpen(false)
    setActiveTask('pack')
    setError('')
    setNotice('')

    try {
      const master = await dataUrlToBlob(resultUrl)
      for (const item of queuedPack) {
        setPackItems((current) => current.map((candidate) => (
          candidate.id === item.id ? { ...candidate, status: 'generating', error: undefined } : candidate
        )))

        try {
          const payload = await requestGeneration({
            image: master,
            filename: 'toonly-master.png',
            operation: 'pack',
            requestStyle: resultMetadata.style,
            preset: item.id,
          })
          setPackItems((current) => current.map((candidate) => (
            candidate.id === item.id
              ? { ...candidate, status: 'complete', image: payload.image, error: undefined }
              : candidate
          )))
        } catch (caught) {
          const message = caught instanceof Error ? caught.message : 'This portrait could not be generated.'
          setPackItems((current) => current.map((candidate) => {
            if (candidate.id === item.id) return { ...candidate, status: 'error', error: message }
            if (candidate.status === 'queued') {
              return { ...candidate, status: 'error', error: 'Not generated. Retry when ready.' }
            }
            return candidate
          }))
          throw caught
        }
      }
      setNotice('Your four-image character pack is ready to download.')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The character pack could not be completed.')
    } finally {
      setActiveTask(null)
    }
  }

  const retryPackItem = async (preset: PackPreset) => {
    if (!resultUrl || !resultMetadata || !resultIsLive || isGenerating) return
    setActiveTask('pack')
    setError('')
    setPackItems((current) => current.map((item) => (
      item.id === preset ? { ...item, status: 'generating', error: undefined } : item
    )))

    try {
      const master = await dataUrlToBlob(resultUrl)
      const payload = await requestGeneration({
        image: master,
        filename: 'toonly-master.png',
        operation: 'pack',
        requestStyle: resultMetadata.style,
        preset,
      })
      setPackItems((current) => current.map((item) => (
        item.id === preset ? { ...item, status: 'complete', image: payload.image } : item
      )))
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'This portrait could not be generated.'
      setPackItems((current) => current.map((item) => (
        item.id === preset ? { ...item, status: 'error', error: message } : item
      )))
      setError(message)
    } finally {
      setActiveTask(null)
    }
  }

  const triggerDownload = (href: string, filename: string) => {
    const link = document.createElement('a')
    link.href = href
    link.download = filename
    link.click()
  }

  const download = () => {
    if (!resultUrl || !resultMetadata) return
    const extension = resultUrl.startsWith('data:image/png') ? 'png' : 'jpg'
    triggerDownload(resultUrl, `toonly-${resultMetadata.style}-${Date.now()}.${extension}`)
  }

  const downloadPackItem = (item: PackItem) => {
    if (!item.image) return
    const extension = item.image.startsWith('data:image/png') ? 'png' : 'jpg'
    triggerDownload(item.image, `toonly-${item.id}.${extension}`)
  }

  const downloadPack = async () => {
    const completed = packItems.filter((item): item is PackItem & { image: string } => Boolean(item.image))
    if (completed.length !== packItems.length || !completed.length) return

    try {
      const zip = new JSZip()
      await Promise.all(completed.map(async (item, index) => {
        const image = await dataUrlToBlob(item.image)
        const extension = image.type === 'image/png' ? 'png' : 'jpg'
        zip.file(`${index + 1}-${item.id}.${extension}`, image)
      }))
      const archive = await zip.generateAsync({ type: 'blob' })
      const archiveUrl = URL.createObjectURL(archive)
      triggerDownload(archiveUrl, `toonly-character-pack-${Date.now()}.zip`)
      window.setTimeout(() => URL.revokeObjectURL(archiveUrl), 0)
    } catch {
      setError('The character pack could not be prepared for download.')
    }
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
            {status.available ? 'Together AI configured' : 'Local preview mode'}
          </div>
          <button
            className="icon-button theme-toggle"
            type="button"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            aria-pressed={theme === 'dark'}
            title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          >
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>
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
                      <span className={`result-mode ${outputMode === 'live' ? 'result-live' : ''} ${resultIsStale ? 'result-stale' : ''}`}>
                        <span /> {resultIsStale ? 'Settings changed' : outputMode === 'live' ? 'AI result' : 'Local preview'}
                      </span>
                    )}
                    <button className="icon-button" onClick={chooseFile} aria-label="Replace portrait"><RefreshCw size={17} /></button>
                    <button className="icon-button" onClick={clearPortrait} aria-label="Remove portrait"><X size={18} /></button>
                  </div>
                </div>

                <div className="portrait-frame">
                  {resultUrl ? (
                    <div className="comparison-view">
                      <img src={resultUrl} alt={`Portrait transformed in ${resultStyleName} style`} className="result-image" />
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
                      <strong>
                        {activeTask === 'refine'
                          ? 'Refining your character'
                          : activeTask === 'pack'
                            ? 'Building your character pack'
                            : `Drawing your ${activeStyle.name.toLowerCase()} portrait`}
                      </strong>
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

          {packItems.length > 0 && (
            <CharacterPackGallery
              busy={isGenerating}
              items={packItems}
              onDownloadAll={downloadPack}
              onDownloadItem={downloadPackItem}
              onRetry={retryPackItem}
            />
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

          {resultUrl && (
            <>
              {resultIsStale && resultIsLive && (
                <p className="stale-note">These controls changed after the current result. Regenerate before refining or creating a pack.</p>
              )}
              <RefinementPanel
                available={resultIsLive && !resultIsStale}
                unavailableMessage={resultIsLive && resultIsStale ? 'Regenerate with the selected settings before refining this result.' : undefined}
                busy={isGenerating}
                customInstruction={refinementInstruction}
                canUndo={resultHistory.length > 0}
                selected={refinement}
                onCustomInstructionChange={setRefinementInstruction}
                onOpenPack={() => setIsPackConfirmOpen(true)}
                onRefine={refineResult}
                onSelectedChange={setRefinement}
                onUndo={undoRefinement}
              />
            </>
          )}

          {isPackConfirmOpen && (
            <section className="pack-confirmation" aria-labelledby="pack-confirmation-heading">
              <span className="pack-confirmation-icon"><Layers3 size={19} /></span>
              <div>
                <p className="eyebrow">Four AI generations</p>
                <h3 id="pack-confirmation-heading">Create this character pack?</h3>
                <p>Toonly will use the current portrait as the master for four coordinated images.</p>
                <div className="confirmation-actions">
                  <button className="button button-quiet" type="button" onClick={() => setIsPackConfirmOpen(false)}>Cancel</button>
                  <button className="button button-dark" type="button" onClick={generateCharacterPack}>Create 4 images</button>
                </div>
              </div>
            </section>
          )}

          <div className="inspector-spacer" />
          <div className="cost-card">
            <div className="cost-icon"><Zap size={18} /></div>
            <div><strong>{status.available ? 'Ready for FLUX.2 Pro' : 'Preview mode is free'}</strong><p>{status.available ? 'A 2MP result uses more credit than the base resolution.' : 'Add your key when you want the full AI result.'}</p></div>
          </div>

          <button className="button button-dark inspector-generate" onClick={portrait ? generate : chooseFile} disabled={isGenerating}>
            {portrait ? <WandSparkles size={18} /> : <Upload size={18} />}
            {portrait ? (isGenerating ? 'Working…' : resultUrl ? 'Regenerate portrait' : 'Create portrait') : 'Add a portrait'}
          </button>
        </aside>
      </main>
    </div>
  )
}

export default App
