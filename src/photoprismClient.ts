import ky from 'ky'

interface PhotoListing {
  FileName: string
  Files: FileListing[]
  UID: string
}
interface FileListing {
  Hash: string
  Name: string
  UID: string
}
interface LoginResult {
  id: string
  status: string
}

export const pageCount = 15
let api: typeof ky

const initApi = (() => {
  let initialized = false
  return async () => {
    if (initialized) {
      return
    }
    initialized = true
    const loginResult = (await ky
      .post('/api/v1/session', {
        json: {
          username: 'admin',
          password: process.env.REACT_APP_PHOTOPRISM_PASSWORD
        }
      })
      .json()) as LoginResult
    api = ky.extend({
      hooks: {
        beforeRequest: [
          (request) => {
            request.headers.set('X-Session-ID', loginResult.id)
          }
        ]
      }
    })
  }
})()

export const unsortedPhotos = async (offset: number): Promise<PhotoListing[]> => {
  await initApi()
  const photos = (await api
    .get(`/api/v1/photos?count=${pageCount}&offset=${offset}&merged=true&unsorted=true`)
    .json()) as Array<PhotoListing>
  if (photos?.length) {
    return photos
  }

  console.log('no photos found')
  return []
}

export const addPhotoToAlbum = async (uid: string, albumId: string) => {
  console.log(`Adding photo to album ${uid}`)
  const result = await api.post(`/api/v1/albums/${albumId}/photos`, {
    json: { photos: [uid] }
  })
  if (!result.ok) {
    console.error('Add result', result)
    throw new Error(`Add to albul failed ${JSON.stringify(result)}`)
  }
}

export const archive = async (uid: string) => {
  console.log(`Archiving photo ${uid}`)
  const result = await api.post('/api/v1/batch/photos/archive', {
    json: { photos: [uid] }
  })
  if (!result.ok) {
    console.error('archive result', result)
    throw new Error(`Archive failed ${JSON.stringify(result)}`)
  }
  //const result = await api.delete(`/api/v1/photos/${photos[0].UID}/${photos[0].Files[0].UID}`)
}

export const fileUrl = (photo: PhotoListing, type: string): string => {
  if (photo.Files.length === 0) {
    console.error('photoprism photo has no files!')
    return ''
  }
  if (photo.Files.length > 1) {
    console.warn('photoprism photo has more than 1 file!', photo.Files)
  }
  return `http://localhost:2342/api/v1/t/${photo.Files[0].Hash}/d15ac654/${type}`
}
