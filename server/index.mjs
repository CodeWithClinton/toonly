import 'dotenv/config'
import express from 'express'
import multer from 'multer'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const app = express()
const port = Number(process.env.PORT || 8787)
const apiKey = process.env.TOGETHER_API_KEY?.trim()
const model = 'black-forest-labs/FLUX.2-pro'
const outputSize = 1408
const togetherEndpoint = 'https://api.together.xyz/v1/images/generations'
const providerTimeoutMs = 120_000

const STYLE_PROMPTS = {
  'soft-3d': `Transform this portrait into a premium soft 3D animated character portrait. Use tactile materials, softly rounded facial forms, warm studio lighting, subtle depth of field, and a clean neutral background. Preserve the subject's identity, facial structure, skin tone, hairstyle, expression, accessories, and clothing details. Keep the same crop and pose. The result should feel polished and cinematic, not childish.`,
  anime: `Transform this portrait into a refined modern anime character illustration. Use confident clean linework, expressive but anatomically faithful features, controlled cel shading, and a calm editorial color palette. Preserve the subject's identity, facial structure, skin tone, hairstyle, expression, accessories, clothing, crop, and pose. Avoid exaggerated eyes or changing the person's age.`,
  comic: `Transform this portrait into a sophisticated graphic-novel illustration. Use crisp ink contours, restrained halftone texture, bold but natural shadows, and a limited contemporary color palette. Preserve the subject's identity, facial structure, skin tone, hairstyle, expression, accessories, clothing, crop, and pose. Keep the background minimal and do not add text.`,
  clay: `Transform this portrait into a handcrafted clay character portrait with matte clay textures, gently simplified forms, soft studio lighting, and subtle handcrafted imperfections. Preserve the subject's identity, facial structure, skin tone, hairstyle, expression, accessories, clothing, crop, and pose. Keep proportions appealing but recognizable and use a simple warm background.`,
}

const REFINEMENT_PROMPTS = {
  likeness: `Increase the likeness to the reference subject. Correct facial structure, skin tone, hairstyle, expression, accessories, and distinctive details while keeping the current art direction, crop, clothing, and background unchanged.`,
  expression: `Give the character a warmer, natural smile. Preserve identity, hairstyle, accessories, clothing, art direction, crop, and background. Do not exaggerate facial proportions.`,
  outfit: `Change the character's outfit to a polished smart-casual look that suits the existing color palette. Preserve identity, facial expression, hairstyle, accessories, art direction, crop, pose, and background.`,
  background: `Replace the background with a warm, minimal studio backdrop with subtle depth. Preserve the character's identity, expression, hairstyle, accessories, clothing, art direction, crop, and pose.`,
  'more-stylized': `Make the current art direction more expressive and stylized while keeping the subject clearly recognizable. Preserve identity, skin tone, hairstyle, accessories, clothing, crop, pose, and background.`,
  'less-stylized': `Make the portrait slightly more natural and anatomically faithful while retaining the current illustrated art direction. Preserve identity, skin tone, hairstyle, accessories, clothing, crop, pose, and background.`,
}

const PACK_PROMPTS = {
  avatar: `Create a clean, centered profile avatar of this exact character. Use a close head-and-shoulders crop, a calm confident expression, and a simple studio background. Preserve the character's identity, skin tone, hairstyle, accessories, clothing design, and art direction.`,
  smile: `Create a friendly portrait of this exact character with a warm natural smile. Keep the same identity, skin tone, hairstyle, accessories, clothing design, and art direction. Use a simple complementary background and a centered head-and-shoulders composition.`,
  wave: `Create a portrait of this exact character giving a friendly wave, with one hand clearly visible and anatomically correct. Preserve the character's identity, skin tone, hairstyle, accessories, clothing design, and art direction. Use a simple complementary background.`,
  celebrate: `Create a lively portrait of this exact character celebrating with an upbeat, confident pose. Preserve the character's identity, skin tone, hairstyle, accessories, clothing design, and art direction. Keep the composition clean and suitable for a social-media character pack.`,
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter: (_request, file, callback) => {
    const allowed = new Set(['image/jpeg', 'image/png', 'image/webp'])
    callback(allowed.has(file.mimetype) ? null : new Error('Only JPEG, PNG, and WebP portraits are supported.'), allowed.has(file.mimetype))
  },
})

app.disable('x-powered-by')
app.use(express.json({ limit: '1mb' }))

app.get('/api/status', (_request, response) => {
  response.json({
    available: Boolean(apiKey),
    provider: 'Together AI',
    model,
    mode: apiKey ? 'live' : 'demo',
    output: {
      width: outputSize,
      height: outputSize,
      label: '2MP',
    },
  })
})

app.post('/api/generate', upload.single('portrait'), async (request, response) => {
  if (!request.file) {
    return response.status(400).json({ error: 'Choose a portrait before generating.' })
  }

  if (!apiKey) {
    return response.status(503).json({
      error: 'Together AI is not configured. Add TOGETHER_API_KEY to use live generation.',
      code: 'DEMO_MODE',
    })
  }

  const style = typeof request.body.style === 'string' ? request.body.style : 'soft-3d'
  const operation = typeof request.body.operation === 'string' ? request.body.operation : 'create'
  const preset = typeof request.body.preset === 'string' ? request.body.preset : ''
  const allowedOperations = new Set(['create', 'refine', 'pack'])

  if (!allowedOperations.has(operation)) {
    return response.status(400).json({
      error: 'That generation operation is not supported.',
      code: 'INVALID_OPERATION',
    })
  }

  if (!STYLE_PROMPTS[style]) {
    return response.status(400).json({
      error: 'Choose one of the available portrait styles.',
      code: 'INVALID_STYLE',
    })
  }

  const instruction = typeof request.body.instruction === 'string'
    ? request.body.instruction.trim().slice(0, 280)
    : ''
  let prompt

  if (operation === 'refine') {
    const refinement = preset === 'custom' ? instruction : REFINEMENT_PROMPTS[preset]
    if (!refinement) {
      return response.status(400).json({
        error: preset === 'custom'
          ? 'Describe the refinement you want to make.'
          : 'Choose one of the available refinements.',
        code: 'INVALID_REFINEMENT',
      })
    }
    prompt = `Refine this existing illustrated character portrait. ${refinement}\nReturn only one finished portrait image.`
  } else if (operation === 'pack') {
    const packPrompt = PACK_PROMPTS[preset]
    if (!packPrompt) {
      return response.status(400).json({
        error: 'Choose one of the available character-pack images.',
        code: 'INVALID_PACK_PRESET',
      })
    }
    prompt = `${packPrompt}\nReturn only one finished square portrait image.`
  } else {
    const basePrompt = STYLE_PROMPTS[style]
    prompt = `${basePrompt}\n\nAdditional user preference: ${instruction || 'No additional preference.'}\nReturn only one finished portrait image.`
  }

  try {
    const sourceImage = `data:${request.file.mimetype};base64,${request.file.buffer.toString('base64')}`
    const upstreamResponse = await fetch(togetherEndpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        prompt,
        image_url: sourceImage,
        width: outputSize,
        height: outputSize,
        n: 1,
        response_format: 'base64',
        output_format: 'png',
        prompt_upsampling: true,
      }),
      signal: AbortSignal.timeout(providerTimeoutMs),
    })

    const payload = await upstreamResponse.json().catch(() => ({}))
    if (!upstreamResponse.ok) {
      const providerMessage = payload?.error?.message || payload?.error || payload?.message || `Together AI returned HTTP ${upstreamResponse.status}.`
      const providerError = new Error(String(providerMessage))
      providerError.status = upstreamResponse.status
      throw providerError
    }

    const generatedImage = payload?.data?.[0]
    let image
    if (generatedImage?.b64_json) {
      image = `data:image/png;base64,${generatedImage.b64_json}`
    } else if (generatedImage?.url) {
      const imageResponse = await fetch(generatedImage.url, {
        signal: AbortSignal.timeout(30_000),
      })
      if (!imageResponse.ok) {
        throw new Error('Together AI generated an image, but it could not be downloaded.')
      }
      const mimeType = imageResponse.headers.get('content-type') || 'image/png'
      const imageBuffer = Buffer.from(await imageResponse.arrayBuffer())
      image = `data:${mimeType};base64,${imageBuffer.toString('base64')}`
    }

    if (!image) {
      throw new Error('Together AI returned no image. Try another portrait or style.')
    }

    return response.json({
      image,
      mode: 'live',
      model,
      operation,
      preset: preset || null,
      output: {
        width: outputSize,
        height: outputSize,
        label: '2MP',
      },
    })
  } catch (error) {
    const status = Number(error?.status || error?.statusCode || 0)
    const message = error instanceof Error ? error.message : 'The portrait could not be generated.'
    console.error('Together AI generation failed:', { status: status || undefined, message })

    if (error?.name === 'TimeoutError' || error?.name === 'AbortError') {
      return response.status(504).json({
        error: 'Together AI took too long to respond. Try again or use the local preview.',
        code: 'PROVIDER_TIMEOUT',
      })
    }

    if (status === 401 || status === 403 || /api key|unauthorized|authentication/i.test(message)) {
      return response.status(401).json({
        error: 'Together AI rejected the API key. Check TOGETHER_API_KEY and restart the server.',
        code: 'INVALID_API_KEY',
      })
    }

    if (status === 402 || /credit|balance|billing|payment|quota/i.test(message)) {
      return response.status(402).json({
        error: 'Together AI credits are unavailable. Add credit or use the local preview.',
        code: 'CREDITS_EXHAUSTED',
      })
    }

    if (status === 429) {
      return response.status(429).json({
        error: 'Together AI is temporarily rate-limited. Try again later or use the local preview.',
        code: 'RATE_LIMITED',
      })
    }

    return response.status(status >= 500 ? 502 : 400).json({
      error: 'Together AI could not create this portrait. Please try again.',
      code: 'GENERATION_FAILED',
    })
  }
})

app.use((error, _request, response, _next) => {
  if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
    return response.status(413).json({ error: 'Portraits must be smaller than 10 MB.' })
  }

  return response.status(400).json({
    error: error instanceof Error ? error.message : 'The upload could not be processed.',
  })
})

const currentDir = fileURLToPath(new URL('.', import.meta.url))
const distDir = join(currentDir, '..', 'dist')

if (existsSync(distDir)) {
  app.use(express.static(distDir))
  app.get('/{*splat}', (_request, response) => response.sendFile(join(distDir, 'index.html')))
}

app.listen(port, '127.0.0.1', () => {
  console.log(`Toonly server running at http://127.0.0.1:${port} (${apiKey ? 'Together AI live' : 'demo mode'})`)
})
