import React, { useEffect, useState, useRef } from 'react'
import ImageGallery, { ReactImageGalleryItem } from 'react-image-gallery'
import { useHotkeys } from 'react-hotkeys-hook'
import {
  archive,
  addPhotoToAlbum,
  unsortedPhotos,
  pageCount,
  fileUrl,
  restore,
  deletePhotoFromAlbum
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
      console.error('Undo photo has no album', last)
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

const undo = initializeUndo()

const PhotoGallery = (): JSX.Element => {
  const ignore = -1
  const theaterMode = false

  const [preferredIndex, setPreferredIndex] = useState(ignore)
  const [images, setImages] = useState<ImageGalleryItem[]>([])
  const [page, setPage] = useState(0)
  const [paused, setPaused] = useState(!theaterMode)
  const imageGallery = useRef(null)

  const currentImageGallery = (): ImageGallery | undefined => {
    // @ts-ignore: Object is possibly 'null'.
    return imageGallery.current
  }
  const currentIndex = (): number => {
    return currentImageGallery()?.getCurrentIndex() ?? ignore
  }

  const actOnSelectedImage = (action: (photo: ImageGalleryItem) => Promise<void>): void => {
    if (imageGallery?.current) {
      const index = currentIndex()
      setPreferredIndex(index)
      setImages((prevImages) => {
        ;(async () => {
          await action(prevImages[index])
        })()
        return prevImages.filter((image) => image !== prevImages[index])
      })
    }
  }

  useHotkeys('del', () => {
    actOnSelectedImage(async (photo) => {
      await archive(photo.uid)
      undo.push({ type: ActionType.Archived, photo: photo })
    })
  })
  useHotkeys('p', () => {
    actOnSelectedImage(async (photo) => {
      const handpicked = 'aqv7go439bxqhxcf'
      addPhotoToAlbum(photo.uid, handpicked)
      undo.push({ type: ActionType.AddedToAlbum, album: handpicked, photo })
    })
  })
  useHotkeys('n', () => {
    actOnSelectedImage(async (photo) => {
      const nah = 'aqv7gny1rqphwbbs'
      addPhotoToAlbum(photo.uid, nah)
      undo.push({ type: ActionType.AddedToAlbum, album: nah, photo })
    })
  })
  useHotkeys('u', () => {
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
  // apply preferredIndex when images are added or removed
  useEffect(() => {
    if (preferredIndex !== ignore) {
      currentImageGallery()?.slideToIndex(preferredIndex < images.length ? preferredIndex : images.length - 1)
      setPreferredIndex(ignore)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [images])

  useEffect(() => {
    ;(async () => {
      const newImages = (await unsortedPhotos(page * pageCount)).map((p) => ({
        original: fileUrl(p, 'fit_2048'),
        originalTitle: p.FileName,
        thumbnail: fileUrl(p, 'tile_500'),
        thumbnailTitle: p.FileName,
        description: p.FileName,
        uid: p.UID
      }))

      setPreferredIndex(currentIndex())

      setImages((prevImages) => {
        return prevImages.concat(newImages)
      })
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page])

  const onSlide = (index: number) => {
    if (index + pageCount / 3 >= images.length) {
      console.log(`fetching next page`, { photoIndex: index, photo: images[index] })
      setPage((prevPage) => prevPage + 1)
    }
  }
  const onPause = () => {
    setPaused(true)
  }
  const onPlay = () => {
    setPaused(false)
  }

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
