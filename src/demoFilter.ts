export type CartoonStyle = 'soft-3d' | 'anime' | 'comic' | 'clay'

const clamp = (value: number) => Math.max(0, Math.min(255, value))

const quantize = (value: number, levels: number) =>
  Math.round(value / levels) * levels

export async function createLocalPreview(file: File, style: CartoonStyle): Promise<string> {
  const bitmap = await createImageBitmap(file)
  const longestSide = Math.max(bitmap.width, bitmap.height)
  const scale = Math.min(1, 1200 / longestSide)
  const width = Math.max(1, Math.round(bitmap.width * scale))
  const height = Math.max(1, Math.round(bitmap.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d', { willReadFrequently: true })

  if (!context) throw new Error('Your browser could not create a local preview.')

  const filters: Record<CartoonStyle, string> = {
    'soft-3d': 'saturate(1.18) contrast(1.06) brightness(1.05)',
    anime: 'saturate(1.38) contrast(1.12) brightness(1.04)',
    comic: 'saturate(0.92) contrast(1.32)',
    clay: 'sepia(.12) saturate(1.12) contrast(1.04) brightness(1.04)',
  }

  context.filter = filters[style]
  context.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()
  context.filter = 'none'

  const image = context.getImageData(0, 0, width, height)
  const source = new Uint8ClampedArray(image.data)
  const step = style === 'anime' ? 34 : style === 'comic' ? 46 : 28

  for (let index = 0; index < image.data.length; index += 4) {
    let red = source[index]
    let green = source[index + 1]
    let blue = source[index + 2]

    if (style === 'clay') {
      red = clamp(red * 1.05 + 7)
      green = clamp(green * 0.99 + 3)
      blue = clamp(blue * 0.91)
    }

    if (style === 'comic') {
      const pixel = index / 4
      const x = pixel % width
      const y = Math.floor(pixel / width)
      if (x < width - 1 && y < height - 1) {
        const right = index + 4
        const below = index + width * 4
        const luminance = red * 0.299 + green * 0.587 + blue * 0.114
        const rightLum = source[right] * 0.299 + source[right + 1] * 0.587 + source[right + 2] * 0.114
        const belowLum = source[below] * 0.299 + source[below + 1] * 0.587 + source[below + 2] * 0.114
        if (Math.abs(luminance - rightLum) + Math.abs(luminance - belowLum) > 54) {
          red *= 0.28
          green *= 0.28
          blue *= 0.28
        }
      }
    }

    image.data[index] = clamp(quantize(red, step))
    image.data[index + 1] = clamp(quantize(green, step))
    image.data[index + 2] = clamp(quantize(blue, step))
  }

  context.putImageData(image, 0, 0)
  return canvas.toDataURL('image/jpeg', 0.92)
}
