export type GenerationOperation = 'create' | 'refine' | 'pack'

export type RefinementPreset =
  | 'likeness'
  | 'expression'
  | 'outfit'
  | 'background'
  | 'more-stylized'
  | 'less-stylized'
  | 'custom'

export type PackPreset = 'avatar' | 'smile' | 'wave' | 'celebrate'

export type ResultMetadata = {
  style: CartoonStyle
  instruction: string
  operation: GenerationOperation
  preset?: string
}

export type ResultSnapshot = {
  image: string
  metadata: ResultMetadata
}

export type PackItem = {
  id: PackPreset
  name: string
  note: string
  status: 'queued' | 'generating' | 'complete' | 'error'
  image?: string
  error?: string
}

export const REFINEMENT_OPTIONS: Array<{
  id: RefinementPreset
  name: string
}> = [
  { id: 'likeness', name: 'Stronger likeness' },
  { id: 'expression', name: 'Warmer smile' },
  { id: 'outfit', name: 'Smart outfit' },
  { id: 'background', name: 'Studio background' },
  { id: 'more-stylized', name: 'More stylized' },
  { id: 'less-stylized', name: 'More natural' },
  { id: 'custom', name: 'Custom request' },
]

export const PACK_DEFINITIONS: Array<Pick<PackItem, 'id' | 'name' | 'note'>> = [
  { id: 'avatar', name: 'Profile avatar', note: 'Calm and confident' },
  { id: 'smile', name: 'Warm smile', note: 'Friendly portrait' },
  { id: 'wave', name: 'Friendly wave', note: 'Welcoming pose' },
  { id: 'celebrate', name: 'Celebration', note: 'Upbeat and expressive' },
]

export const createQueuedPack = (): PackItem[] =>
  PACK_DEFINITIONS.map((item) => ({ ...item, status: 'queued' }))

export async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const response = await fetch(dataUrl)
  if (!response.ok) throw new Error('The current portrait could not be prepared for generation.')
  return response.blob()
}
import type { CartoonStyle } from './demoFilter'
