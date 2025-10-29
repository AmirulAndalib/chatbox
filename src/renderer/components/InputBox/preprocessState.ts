import { StorageKeyGenerator } from '@/storage/StoreStorage'
import type { PreConstructedMessageState, PreprocessedFile, PreprocessedLink } from '../../types/input-box'
export type { PreConstructedMessageState }

// ----- Link helpers -----

export function markLinkProcessing(prev: PreConstructedMessageState, url: string): PreConstructedMessageState {
  const key = StorageKeyGenerator.linkUniqKey(url)
  return {
    ...prev,
    preprocessingStatus: {
      ...prev.preprocessingStatus,
      links: {
        ...prev.preprocessingStatus.links,
        [key]: 'processing',
      },
    },
  }
}

export function storeLinkPromise(
  prev: PreConstructedMessageState,
  url: string,
  promise: Promise<unknown>
): PreConstructedMessageState {
  const key = StorageKeyGenerator.linkUniqKey(url)
  const newPromises = new Map(prev.preprocessingPromises.links)
  newPromises.set(key, promise)
  return {
    ...prev,
    preprocessingPromises: {
      ...prev.preprocessingPromises,
      links: newPromises,
    },
  }
}

export function onLinkProcessed(
  prev: PreConstructedMessageState,
  url: string,
  item: PreprocessedLink,
  max: number = 6
): PreConstructedMessageState {
  const key = StorageKeyGenerator.linkUniqKey(url)
  const newPromises = new Map(prev.preprocessingPromises.links)
  newPromises.delete(key)

  const nextLinks = [...prev.preprocessedLinks.filter((l) => l.url !== url), item].slice(-max)

  return {
    ...prev,
    preprocessedLinks: nextLinks,
    preprocessingStatus: {
      ...prev.preprocessingStatus,
      links: {
        ...prev.preprocessingStatus.links,
        [key]: item.error ? 'error' : 'completed',
      },
    },
    preprocessingPromises: {
      ...prev.preprocessingPromises,
      links: newPromises,
    },
  }
}

export function cleanupLink(prev: PreConstructedMessageState, url: string): PreConstructedMessageState {
  const key = StorageKeyGenerator.linkUniqKey(url)
  const newLinkPromises = new Map(prev.preprocessingPromises.links)
  newLinkPromises.delete(key)

  return {
    ...prev,
    preprocessedLinks: prev.preprocessedLinks.filter((l) => l.url !== url),
    preprocessingStatus: {
      ...prev.preprocessingStatus,
      links: {
        ...prev.preprocessingStatus.links,
        [key]: undefined,
      },
    },
    preprocessingPromises: {
      ...prev.preprocessingPromises,
      links: newLinkPromises,
    },
  }
}

// ----- File helpers -----

export function markFileProcessing(prev: PreConstructedMessageState, file: File): PreConstructedMessageState {
  const key = StorageKeyGenerator.fileUniqKey(file)
  return {
    ...prev,
    preprocessingStatus: {
      ...prev.preprocessingStatus,
      files: {
        ...prev.preprocessingStatus.files,
        [key]: 'processing',
      },
    },
  }
}

export function storeFilePromise(
  prev: PreConstructedMessageState,
  file: File,
  promise: Promise<unknown>
): PreConstructedMessageState {
  const key = StorageKeyGenerator.fileUniqKey(file)
  const newPromises = new Map(prev.preprocessingPromises.files)
  newPromises.set(key, promise)
  return {
    ...prev,
    preprocessingPromises: {
      ...prev.preprocessingPromises,
      files: newPromises,
    },
  }
}

export function onFileProcessed(
  prev: PreConstructedMessageState,
  file: File,
  item: PreprocessedFile,
  max: number = 10
): PreConstructedMessageState {
  const key = StorageKeyGenerator.fileUniqKey(file)
  const newPromises = new Map(prev.preprocessingPromises.files)
  newPromises.delete(key)

  const nextFiles = [...prev.preprocessedFiles, item].slice(-max)

  return {
    ...prev,
    preprocessedFiles: nextFiles,
    preprocessingStatus: {
      ...prev.preprocessingStatus,
      files: {
        ...prev.preprocessingStatus.files,
        [key]: item.error ? 'error' : 'completed',
      },
    },
    preprocessingPromises: {
      ...prev.preprocessingPromises,
      files: newPromises,
    },
  }
}

export function cleanupFile(prev: PreConstructedMessageState, file: File): PreConstructedMessageState {
  const key = StorageKeyGenerator.fileUniqKey(file)
  const newFilePromises = new Map(prev.preprocessingPromises.files)
  newFilePromises.delete(key)

  return {
    ...prev,
    preprocessedFiles: prev.preprocessedFiles.filter((f) => f.file.name !== file.name),
    preprocessingStatus: {
      ...prev.preprocessingStatus,
      files: {
        ...prev.preprocessingStatus.files,
        [key]: undefined,
      },
    },
    preprocessingPromises: {
      ...prev.preprocessingPromises,
      files: newFilePromises,
    },
  }
}
