export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_SOURCE_BYTES = 20 * 1024 * 1024

// Center-crops to the target ratio and re-encodes as JPEG, which also keeps uploads small and strips metadata.
export async function prepareImage(file: File, width: number, height: number): Promise<Blob> {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) throw new Error('Use uma imagem JPEG, PNG ou WebP.')
  if (file.size > MAX_SOURCE_BYTES) throw new Error('A imagem é grande demais. Escolha uma de até 20 MB.')

  const bitmap = await createImageBitmap(file).catch(() => { throw new Error('Não foi possível ler esta imagem. Tente outro arquivo.') })
  try {
    const scale = Math.max(width / bitmap.width, height / bitmap.height)
    const drawWidth = bitmap.width * scale
    const drawHeight = bitmap.height * scale
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Não foi possível processar a imagem.')
    context.fillStyle = '#17201e'
    context.fillRect(0, 0, width, height)
    context.drawImage(bitmap, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight)
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.86))
    if (!blob) throw new Error('Não foi possível processar a imagem.')
    return blob
  } finally {
    bitmap.close()
  }
}
