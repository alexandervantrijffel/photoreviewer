import React, { useEffect, useState, useRef } from 'react'
import './App.css'
import ImageGallery, { ReactImageGalleryItem } from 'react-image-gallery'
import ky from 'ky'
import { useHotkeys } from 'react-hotkeys-hook'

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

let api: typeof ky
const archive = async (uid: string) => {
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

const unsortedPhotos = async (offset: number): Promise<PhotoListing[]> => {
  const photos = (await api
    .get(`/api/v1/photos?count=50&offset=${offset}&merged=true&unsorted=true&public=true`)
    .json()) as Array<PhotoListing>
  if (photos?.length) {
    return photos
  }

  console.log('no photos found')
  return []
}

const addPhotoToAlbum = async (uid: string, albumId: string) => {
  console.log(`Adding photo to album ${uid}`)
  const result = await api.post(`/api/v1/albums/${albumId}/photos`, {
    json: { photos: [uid] }
  })
  if (!result.ok) {
    console.error('Add result', result)
    throw new Error(`Add to albul failed ${JSON.stringify(result)}`)
  }
}

const initApi = async () => {
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

const fileUrl = (photo: PhotoListing, type: string): string => {
  if (photo.Files.length === 0) {
    console.error('photoprism photo has no files!')
    return ''
  }
  if (photo.Files.length > 1) {
    console.warn('photoprism photo has more than 1 file!', photo.Files)
  }
  return `http://localhost:2342/api/v1/t/${photo.Files[0].Hash}/d15ac654/${type}`
}

interface ImageGalleryItem extends ReactImageGalleryItem {
  uid: string
}

const ignore = -1

const PhotoGallery = (): JSX.Element => {
  const [preferredIndex, setPreferredIndex] = useState(ignore)
  const [images, setImages] = useState<ImageGalleryItem[]>([])
  const [page, _setPage] = useState(0)
  const imageGallery = useRef(null)

  const actOnSelectedImage = (action: (photo: ImageGalleryItem) => Promise<void>): void => {
    if (imageGallery?.current) {
      setImages((prevImages) => {
        // @ts-ignore: Object is possibly 'null'.
        const index = imageGallery.current.getCurrentIndex()
        ;(async () => {
          await action(prevImages[index])
        })()
        setPreferredIndex(index)
        console.log('setting preferredIndex to ', index)
        return prevImages.filter((image) => image !== prevImages[index])
      })
    }
  }

  useHotkeys('del', () => {
    actOnSelectedImage(async (photo) => {
      await archive(photo.uid)
    })
  })
  useHotkeys('p', () => {
    actOnSelectedImage(async (photo) => {
      const handpicked = 'aqv7go439bxqhxcf'
      addPhotoToAlbum(photo.uid, handpicked)
    })
  })
  useHotkeys('n', () => {
    actOnSelectedImage(async (photo) => {
      const nah = 'aqv7gny1rqphwbbs'
      addPhotoToAlbum(photo.uid, nah)
    })
  })
  useHotkeys('space', () => {
    if (imageGallery?.current) {
      // @ts-ignore: Object is possibly 'null'.
      imageGallery.current.togglePlay()
    }
  })
  useEffect(() => {
    if (preferredIndex !== ignore) {
      if (imageGallery?.current) {
        console.log('sliding programmatically to', preferredIndex)
        // @ts-ignore: Object is possibly 'null'.
        imageGallery.current.slideToIndex(preferredIndex < images.length ? preferredIndex : 0)
      }
      setPreferredIndex(ignore)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [images])

  const onSlide = (index: number) => {
    console.log(`sliding to`, { index, photo: images[index] })
  }
  useEffect(() => {
    ;(async () => {
      console.log('refreshing images')
      if (!api) await initApi()
      const newImages = (await unsortedPhotos(page)).map((p) => ({
        original: fileUrl(p, 'fit_2048'),
        originalTitle: p.FileName,
        originalAlt: p.FileName,
        thumbnail: fileUrl(p, 'tile_500'),
        thumbnailTitle: p.FileName,
        thumbnailAlt: p.FileName,
        description: p.FileName,
        uid: p.UID
      })) as ImageGalleryItem[]
      setImages(newImages)
    })()
  }, [page])
  return <ImageGallery items={images} slideInterval={30000} autoPlay={false} ref={imageGallery} onSlide={onSlide} />
}

function App() {
  return (
    <div>
      <PhotoGallery />
    </div>
  )
}

export default App
