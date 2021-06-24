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
  console.log('archive result', result)
  //const result = await api.delete(`/api/v1/photos/${photos[0].UID}/${photos[0].Files[0].UID}`)
}

const listPhotos = async (offset: number): Promise<PhotoListing[]> => {
  const photos = (await api.get(`/api/v1/photos?count=50&offset=${offset}&merged=true`).json()) as Array<PhotoListing>
  if (photos?.length) {
    return photos
  }

  console.log('no photos found')
  return []
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

const PhotoGallery = (): JSX.Element => {
  const [images, setImages] = useState<ImageGalleryItem[]>([])
  const [page, _setPage] = useState(0)
  const imageGallery = useRef(null)
  useHotkeys('del', () => {
    if (imageGallery?.current) {
      setImages((prevImages) => {
        // @ts-ignore: Object is possibly 'null'.
        const index = imageGallery.current!.getCurrentIndex()
        archive(prevImages[index].uid)
        return prevImages.filter((image) => image !== prevImages[index])
      })
    }
  })
  useHotkeys('space', () => {
    if (imageGallery?.current) {
      // @ts-ignore: Object is possibly 'null'.
      imageGallery.current.togglePlay()
    }
  })
  const onSlide = (index: number) => {
    console.log(`sliding to`, { index, photo: images[index] })
  }
  useEffect(() => {
    ;(async () => {
      console.log('refreshing images')
      if (!api) await initApi()
      const newImages = (await listPhotos(page)).map((p) => ({
        original: fileUrl(p, 'fit_2048'),
        thumbnail: fileUrl(p, 'tile_500'),
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
