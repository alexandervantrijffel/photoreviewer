import { useEffect, useState, useRef, useCallback } from 'react'
import { gql, useQuery } from '@apollo/client'
import ImageGallery, { ReactImageGalleryItem } from 'react-image-gallery'
import 'react-image-gallery/styles/css/image-gallery.css'

interface ImageGalleryItem extends ReactImageGalleryItem {
  uid: string
}

const Service = () => {
  const { data } = useQuery(gql`
    {
      photosToReview {
        baseUrl
        photos {
          album
          url
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

  useEffect(() => {
    ;(async () => {
      if (!data?.photosToReview?.photos) {
        return
      }
      setPreferredIndex(currentIndex())
      const ptr = data?.photosToReview
      setImages((prevImages) => {
        // @ts-ignore: use any
        const newPhotos = data.photosToReview.photos.map((p: any) => ({
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
