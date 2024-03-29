import ky from 'ky'
import { envString } from '../env'

interface PhotoListing {
  FileName: string
  Files: FileListing[]
  UID: string
}
interface FileListing {
  Hash: string
  Name: string
  UID: string
  Video: boolean
}

export const pageCount = 20
let api: typeof ky

export interface AlbumQueryResponse {
  UID: string
  Slug: string
}
const queryAlbums = async () => {
  const result = (await api
    .get('/api/v1/albums?count=48&offset=0&q=&category=&type=album')
    .json()) as AlbumQueryResponse[]
  return result
}

export type fileUrl = (photo: PhotoListing, type: string) => string

export const getFileUrl =
  (loginResult: LoginResult) =>
  (photo: PhotoListing, type: string): string => {
    if (!photo) {
      console.log('nophoto!')
      return 'nophoto'
    }
    if (photo.Files.length === 0) {
      console.error('photoprism photo has no files!')
      return ''
    }
    if (photo.Files.length > 1) {
      console.warn('photoprism photo has more than 1 file!', photo.Files)
    }

    return `${envString('REACT_APP_PHOTOPRISM_DOMAIN', '')}/api/v1/t/${photo.Files[0].Hash}/${
      loginResult.config.previewToken
    }/${type}`
  }

export const initApi = async () => {
  const loginResult = (await ky
    .post('/api/v1/session', {
      json: {
        username: 'admin',
        password: import.meta.env.VITE_PHOTOPRISM_PASSWORD,
      },
    })
    .json()) as LoginResult
  api = ky.extend({
    hooks: {
      beforeRequest: [
        (request) => {
          request.headers.set('X-Session-ID', loginResult.id)
        },
      ],
    },
  })
  return { fileUrl: getFileUrl(loginResult), firstAlbums: await queryAlbums() }
}

interface ServerConfig {
  previewToken: string
  downloadToken: string
}

interface LoginResult {
  id: string
  status: string
  config: ServerConfig
}

export const unsortedPhotos = async (offset: number) => {
  const photos = (await api
    .get(`/api/v1/photos?count=${pageCount}&offset=${offset}&merged=true&unsorted=true`)
    .json()) as Array<PhotoListing>
  const empty = { videos: [] as PhotoListing[], photos: [] as PhotoListing[] }
  if (!photos?.length) {
    console.log(`no photos found for page ${pageCount}, offset ${offset}`)
    return empty
  }
  return photos.reduce((acc, listing) => {
    const video = listing.Files.some((file) => file.Video)
    if (video) {
      acc.videos.push(listing)
    } else {
      acc.photos.push(listing)
    }
    return acc
  }, empty)
}

interface PhotoResponse {
  code: number
}

export const addPhotoToAlbum = async (uid: string, albumId: string) => {
  console.log(`Adding photo ${uid} to album ${albumId}`)
  const result = await api
    .post(`/api/v1/albums/${albumId}/photos`, {
      json: { photos: [uid] },
    })
    .json<PhotoResponse>()
  if (result.code !== 200) {
    console.error('Add result', result)
    throw new Error(`Add to album failed ${result.code} ${JSON.stringify(result)}`)
  }
}

export const deletePhotoFromAlbum = async (uid: string, albumId: string) => {
  console.log(`Deleting photo ${uid} from album ${albumId}`)
  const result = await api
    .delete(`/api/v1/albums/${albumId}/photos`, {
      json: { photos: [uid] },
    })
    .json<PhotoResponse>()
  if (result.code !== 200) {
    console.error('Delete result', result)
    throw new Error(`Delete from album failed ${JSON.stringify(result)}`)
  }
}

export const archive = async (uid: string) => {
  console.log(`Archiving photo ${uid}`)
  const result = await api
    .post('/api/v1/batch/photos/archive', {
      json: { photos: [uid] },
    })
    .json<PhotoResponse>()
  if (result.code !== 200) {
    console.error('archive result', result)
    throw new Error(`Archive failed ${JSON.stringify(result)}`)
  }
  //const result = await api.delete(`/api/v1/photos/${photos[0].UID}/${photos[0].Files[0].UID}`)
}
export const restore = async (uid: string) => {
  console.log(`Restoring photo ${uid}`)
  const result = await api
    .post('/api/v1/batch/photos/restore', {
      json: { photos: [uid] },
    })
    .json<PhotoResponse>()
  if (result.code !== 200) {
    console.error('Restore result', result)
    throw new Error(`Restore failed ${JSON.stringify(result)}`)
  }
}
