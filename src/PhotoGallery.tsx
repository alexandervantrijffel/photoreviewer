import React, { useEffect, useState, useRef, useCallback } from 'react'
import ImageGallery, { ReactImageGalleryItem } from 'react-image-gallery'
import { useHotkeys } from 'react-hotkeys-hook'
import {
  initApi,
  unsortedPhotos,
  archive,
  addPhotoToAlbum,
  pageCount,
  restore,
  deletePhotoFromAlbum,
  AlbumQueryResponse,
  fileUrl
} from './photoprismClient'

interface ImageGalleryItem extends ReactImageGalleryItem {
  uid: string
}

enum ActionType {
  Archived,
  AddedToAlbum
}

interface UndoItem {
  type: ActionType
  album?: string
  photo: ImageGalleryItem
}

const initializeUndo = () => {
  const history: UndoItem[] = []
  const undoOne = (): UndoItem | undefined => {
    const last = history.pop()
    if (!last) {
      return
    }
    if (last.type === ActionType.Archived) {
      restore(last.photo.uid)
      return last
    }
    if (!last.album) {
      console.error('Undo photo has no album, cannot remove photo from album', last)
      return
    }
    deletePhotoFromAlbum(last.photo.uid, last.album)
    return last
  }
  const pushPhoto = (item: UndoItem) => {
    if (history.length && history[history.length - 1].photo.uid === item.photo.uid) {
      console.error('refusing to add the same photo twice', item)
      return
    }
    history.push(item)
  }

  return { one: undoOne, push: pushPhoto }
}
function equalsCaseInsensitive(text: string, other: string) {
  return text.localeCompare(other, undefined, { sensitivity: 'base' }) === 0
}

interface ServiceData {
  albums: AlbumQueryResponse[]
  getFileUrl: fileUrl
}

const undo = initializeUndo()
const PhotoGallery = (): JSX.Element => {
  const ignore = -1
  const theaterMode = false

  const [preferredIndex, setPreferredIndex] = useState(ignore)
  const [images, setImages] = useState<Readonly<ImageGalleryItem[]>>([])
  const [page, setPage] = useState(0)
  const [paused, setPaused] = useState(!theaterMode)
  const [processedPhotosCount, setProcessedPhotosCount] = useState(0)
  const [serviceData, setServiceData] = useState<ServiceData | undefined>(undefined)
  const imageGallery = useRef(null)

  const currentImageGallery = (): ImageGallery | undefined => {
    // @ts-ignore: Object is possibly 'null'.
    return imageGallery.current
  }
  const currentIndex = (): number => {
    return currentImageGallery()?.getCurrentIndex() ?? ignore
  }

  const actOnSelectedImage = (action: (photo: ImageGalleryItem) => Promise<void>): void => {
    const index = currentIndex()
    if (index === ignore) {
      console.error('Cannot actOnSelectedImage as no image is selected')
    }
    setPreferredIndex(index)
    setImages((prevImages) => {
      ;(async () => {
        await action(prevImages[index])
      })()
      return prevImages.filter((image) => image !== prevImages[index])
    })
  }

  const onSlide = (index: number) => {
    // index we get here is often undefined?! so we cannot rely on it
    if (images.length < pageCount || (index && index + pageCount / 2 > images.length)) {
      setPage((prevPage) => prevPage + 1)
    }
  }
  const onPause = () => {
    setPaused(true)
  }
  const onPlay = () => {
    setPaused(false)
  }

  useHotkeys('del, backspace', () => {
    actOnSelectedImage(async (photo) => {
      await archive(photo.uid)
      undo.push({ type: ActionType.Archived, photo: photo })
    })
    setProcessedPhotosCount((prev) => prev + 1)
  })

  const findAlbumId = (name: string) => {
    if (!serviceData) {
      throw new Error('servicedata not retrieved yet')
    }
    const handpicked = serviceData.albums.find((r) => {
      return equalsCaseInsensitive(name, r.Slug)
    })
    if (!handpicked) {
      throw new Error(`Couldn't find album with name '${name}', albums: [${serviceData.albums}]`)
    }
    return handpicked.UID
  }
  const addPhoto = (albumSlug: string) => {
    const albumId = findAlbumId(albumSlug)
    setProcessedPhotosCount((prev) => prev + 1)
    actOnSelectedImage(async (photo) => {
      addPhotoToAlbum(photo.uid, albumId)
      undo.push({ type: ActionType.AddedToAlbum, album: albumId, photo })
    })
    return albumId
  }
  useHotkeys('p', () => {
    addPhoto('handpicked')
  })
  useHotkeys('n', () => {
    addPhoto('nah')
  })
  useHotkeys('u', () => {
    setProcessedPhotosCount((prev) => prev - 1)
    const photo = undo.one()
    if (photo) {
      setImages((prevImages) => [photo.photo, ...prevImages])
    }
  })
  useHotkeys('space', () => {
    if (imageGallery?.current) {
      // @ts-ignore: Object is possibly 'null'.
      imageGallery.current.togglePlay()
    }
  })

  useHotkeys('j', () => {
    if (imageGallery?.current) {
      // @ts-ignore: Object is possibly 'null'.
      imageGallery.current.slideLeft()
    }
  })
  useHotkeys(';', () => {
    if (imageGallery?.current) {
      // @ts-ignore: Object is possibly 'null'.
      imageGallery.current.slideRight()
    }
  })

  // apply preferredIndex when images are added or removed
  useEffect(() => {
    if (preferredIndex !== ignore) {
      const index = preferredIndex < images.length ? preferredIndex : images.length - 1
      currentImageGallery()?.slideToIndex(index)
      setPreferredIndex(ignore)
      onSlide(index)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [images])

  const getServiceData = useCallback(async () => {
    const { fileUrl: fileUrlImplementation, firstAlbums } = await initApi()
    setServiceData({ albums: firstAlbums, getFileUrl: fileUrlImplementation })
  }, [])

  useEffect(() => {
    if (!serviceData) {
      getServiceData()
      return
    }
    ;(async () => {
      const results = await unsortedPhotos(!images.length ? 0 : images.length + processedPhotosCount)

      if (results.videos?.length > 0) {
        for (const video of results.videos) {
          const albumId = findAlbumId('handpicked')
          addPhotoToAlbum(video.UID, albumId)
        }
        setProcessedPhotosCount((prev) => prev + results.videos.length)
      }
      if (!results.photos.length) {
        return
      }

      setPreferredIndex(currentIndex())

      setImages((prevImages) => {
        const newPhotos = results.photos.map((p) => ({
          original: serviceData.getFileUrl(p, 'fit_2048'),
          originalTitle: p.FileName,
          thumbnail: serviceData.getFileUrl(p, 'tile_500'),
          thumbnailTitle: p.FileName,
          description: p.FileName,
          uid: p.UID
        }))
        return prevImages.concat(newPhotos)
      })
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, serviceData])

  return (
    <ImageGallery
      items={images}
      slideDuration={0}
      slideInterval={30000}
      ref={imageGallery}
      lazyLoad={true}
      infinite={true}
      onSlide={onSlide}
      onPause={onPause}
      onPlay={onPlay}
      autoPlay={theaterMode}
      showNav={paused}
      showThumbnails={paused}
      showFullscreenButton={paused}
    />
  )
}

export default PhotoGallery
