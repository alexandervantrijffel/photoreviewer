import { useEffect, useState, useRef, useCallback } from 'react'
import { gql, useQuery, useMutation } from '@apollo/client'
import ImageGallery, { ReactImageGalleryItem } from 'react-image-gallery'
import 'react-image-gallery/styles/css/image-gallery.css'
import { useHotkeys } from 'react-hotkeys-hook'

interface ImageGalleryItem extends ReactImageGalleryItem {
  uid: string
}

///     mutation {
///       reviewPhoto(path:"/albumx/testphoto.jpg", score: WORST)
///     }
const REVIEWPHOTO = gql`
  mutation ($path: String!, $score: ReviewScore!) {
    reviewPhoto(path: $path, score: $score) {
      success
      output
    }
  }
`

const Service = () => {
  const [reviewPhotoMutation] = useMutation(REVIEWPHOTO)
  const setReviewPhoto = (path: string, score: string) => {
    reviewPhotoMutation({ variables: { path, score } })
  }

  const { data } = useQuery(gql`
    {
      photosToReview {
        output {
          baseUrl
          photos {
            album
            url
          }
        }
      }
    }
  `)
  console.log('Have photos', data)

  const theaterMode = false
  const [images, setImages] = useState<Readonly<ImageGalleryItem[]>>([])
  const [paused, setPaused] = useState(!theaterMode)
  const ignore = -1
  const [preferredIndex, setPreferredIndex] = useState(ignore)
  const [processedPhotosCount, setProcessedPhotosCount] = useState(0)

  const imageGallery = useRef(null)
  const currentImageGallery = (): ImageGallery | undefined => {
    // @ts-ignore: Object is possibly 'null'.
    return imageGallery.current
  }
  const currentIndex = (): number => {
    return currentImageGallery()?.getCurrentIndex() ?? ignore
  }

  const onSlide = (_index: number) => {
    // index we get here is often undefined?! so we cannot rely on it
    // if (images.length < pageCount || (index && index + pageCount / 2 > images.length)) {
    //   setPage((prevPage) => prevPage + 1)
    // }
  }
  const onPause = () => {
    setPaused(true)
  }
  const onPlay = () => {
    setPaused(false)
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

  useEffect(() => {
    ;(async () => {
      const ptr = data?.photosToReview?.output
      console.log('have ptr', data)
      if (!ptr?.photos) {
        return
      }
      setPreferredIndex(currentIndex())
      setImages((prevImages) => {
        // @ts-ignore: use any
        const newPhotos = ptr?.photos.map((p: any) => ({
          original: ptr.baseUrl + p.url,
          originalTitle: 'originalTitle',
          thumbnail: ptr.baseUrl + p.url,
          thumbnailTitle: 'thumbnailTitle',
          description: 'description',
          uid: p.url,
        }))
        return prevImages.concat(newPhotos)
      })
    })()
  }, [data])

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

  const addPhoto = (score: string) => {
    setProcessedPhotosCount((prev) => prev + 1)
    actOnSelectedImage(async (photo) => {
      setReviewPhoto(photo.uid, score)
      // const albumId = findAlbumId(albumSlug)
      // addPhotoToAlbum(photo.uid, albumId)
      // undo.push({ type: ActionType.AddedToAlbum, album: albumId, photo })
    })
  }
  useHotkeys(
    'p',
    () => {
      addPhoto('BEST')
    },
    [data],
  )

  useHotkeys(
    'n',
    () => {
      addPhoto('SOSO')
    },
    [data],
  )

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
export default Service
