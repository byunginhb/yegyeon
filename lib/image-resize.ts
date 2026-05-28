// 클라이언트 사이드 이미지 리사이즈 + 압축 유틸.
// 사용자가 큰 사진을 올려도 1920px 이하 + JPEG 0.85로 변환해 업로드 페이로드를 줄인다.

export interface ResizeOptions {
  maxEdge?: number   // 가장 긴 변의 최대 픽셀
  quality?: number   // 0~1, JPEG 품질
  mimeType?: 'image/jpeg' | 'image/webp'
}

const DEFAULTS: Required<ResizeOptions> = {
  maxEdge: 1920,
  quality: 0.85,
  mimeType: 'image/jpeg',
}

export async function resizeImage(file: File, options: ResizeOptions = {}): Promise<File> {
  const { maxEdge, quality, mimeType } = { ...DEFAULTS, ...options }

  // GIF/SVG 등은 리사이즈하지 않고 그대로 반환
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
    return file
  }

  const bitmap = await loadBitmap(file)
  const { width: srcW, height: srcH } = bitmap

  const scale = Math.min(1, maxEdge / Math.max(srcW, srcH))
  const targetW = Math.round(srcW * scale)
  const targetH = Math.round(srcH * scale)

  // 이미 작은 이미지면서 JPEG/WebP라면 재인코딩 비용을 아끼고 원본 반환
  if (scale === 1 && (file.type === mimeType || file.type === 'image/jpeg')) {
    bitmap.close?.()
    return file
  }

  const canvas = document.createElement('canvas')
  canvas.width = targetW
  canvas.height = targetH
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    bitmap.close?.()
    return file
  }
  ctx.drawImage(bitmap, 0, 0, targetW, targetH)
  bitmap.close?.()

  const blob: Blob | null = await new Promise((resolve) =>
    canvas.toBlob(resolve, mimeType, quality)
  )
  if (!blob) return file

  const ext = mimeType === 'image/webp' ? 'webp' : 'jpg'
  const baseName = file.name.replace(/\.[^.]+$/, '')
  return new File([blob], `${baseName}.${ext}`, { type: mimeType, lastModified: Date.now() })
}

async function loadBitmap(file: File): Promise<ImageBitmap> {
  // createImageBitmap이 가장 빠르고 메모리 효율적
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file)
    } catch {
      // fall through to HTMLImageElement
    }
  }
  return new Promise<ImageBitmap>((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      // ImageBitmap 인터페이스 흉내 (width/height/close)
      resolve({
        width: img.naturalWidth,
        height: img.naturalHeight,
        close: () => {},
      } as unknown as ImageBitmap)
    }
    img.onerror = (err) => {
      URL.revokeObjectURL(url)
      reject(err)
    }
    img.src = url
  })
}

// XMLHttpRequest 기반 업로드. fetch는 업로드 progress를 제공하지 않으므로 XHR 사용.
export interface UploadResult<T> {
  success: boolean
  data?: T
  error?: string
}

export function uploadWithProgress<T>(
  url: string,
  formData: FormData,
  onProgress?: (percent: number) => void
): Promise<UploadResult<T>> {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', url)
    xhr.responseType = 'json'

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100))
      }
    }

    xhr.onload = () => {
      const body = xhr.response as UploadResult<T> | null
      if (body && typeof body === 'object') {
        resolve(body)
      } else {
        resolve({ success: false, error: '서버 응답을 해석할 수 없습니다.' })
      }
    }
    xhr.onerror = () => resolve({ success: false, error: '네트워크 오류가 발생했습니다.' })
    xhr.onabort = () => resolve({ success: false, error: '업로드가 취소되었습니다.' })

    xhr.send(formData)
  })
}
