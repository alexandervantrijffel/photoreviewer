import { useEffect, useState, useRef } from 'react'
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

  const { data, loading, error, refetch } = useQuery(gql`
    {
      photosToReview {
        output {
          baseUrl
          photos {
            album
            url
          }
          folderName
          folderImageCount
        }
      }
    }
  `)

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

  const currentImage = (): ReactImageGalleryItem | undefined => {
    return currentImageGallery()?.props?.items[currentIndex()]
  }

  const [currentImageFileName, setCurrentImageFileName] = useState('')

  const onSlide = (index: number) => {
    console.log('on slide.new', { index })
    // console.log('onSlide, index is', index)
    // index we get here is often undefined?! so we cannot rely on it
    // if (images.length < pageCount || (index && index + pageCount / 2 > images.length)) {
    //   setPage((prevPage) => prevPage + 1)
    // }
    // @ts-expect-error: fileName property
    setCurrentImageFileName(currentImageGallery()?.props?.items[index]?.fileName ?? '')
  }
  const onPause = () => {
    setPaused(true)
  }
  const onPlay = () => {
    setPaused(false)
  }
  const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

  const actOnSelectedImage = (action: (photo: ImageGalleryItem) => Promise<void>): void => {
    const index = currentIndex()
    if (index === ignore) {
      console.error('Cannot actOnSelectedImage as no image is selected')
      return doRefetch()
    }

    ;(async () => {
      const image = currentImage()
      if (!image) {
        console.error('refetching because currentImage is empty')
        return doRefetch()
      }

      await action(image as ImageGalleryItem)

      setImages((prevImages) => {
        return prevImages.filter((img) => img.uid !== (image as ImageGalleryItem).uid)
      })

      setPreferredIndex(index)

      const itemsLength = currentImageGallery()?.props?.items?.length
      console.log('itemsLength', itemsLength)
      if (itemsLength && itemsLength <= 1) {
        await delay(1250)
        doRefetch()
      }
    })()
  }

  function doRefetch() {
    console.log('refetching')
    refetch()
    setPreferredIndex(0)
  }

  const dataOutput = data?.photosToReview?.output
  async function loadData() {
    if (!dataOutput?.photos || images?.length > 0) {
      return
    }
    console.log('loading images', { imageCount: images?.length })
    setPreferredIndex(currentIndex())
    setImages((prevImages) => {
      // @ts-ignore: use any
      const newPhotos = dataOutput?.photos.map((p: any) => ({
        original: dataOutput.baseUrl + p.url,
        // originalTitle: 'originalTitle',
        thumbnail: dataOutput.baseUrl + p.url,
        // thumbnailTitle: 'thumbnailTitle',
        // description: p.url,
        fileName: p.url.substring(p.url.lastIndexOf('/') + 1),
        uid: p.url,
      }))
      return prevImages.concat(newPhotos)
    })
  }

  useEffect(() => {
    ;(async () => {
      await loadData()
    })()
  }, [data])

  const addPhoto = (score: string) => {
    setProcessedPhotosCount((prev) => prev + 1)
    actOnSelectedImage(async (photo) => {
      if (!photo?.uid) {
        console.error('actOnSelectedImage: photo is empty', photo)
      }
      console.log('setting review photo on photo', {
        url: photo.uid,
        score,
      })
      setReviewPhoto(photo.uid, score)
      // undo.push({ type: ActionType.AddedToAlbum, album: albumId, photo })
    })
  }
  useHotkeys(
    'b',
    () => {
      addPhoto('BEST')
    },
    [],
  )

  useHotkeys(
    'g',
    () => {
      addPhoto('GOOD')
    },
    [],
  )

  useHotkeys('del, backspace', () => {
    actOnSelectedImage(async (_photo) => {
      addPhoto('WORST')
      // undo.push({ type: ActionType.Archived, photo: photo })
    })
    setProcessedPhotosCount((prev) => prev + 1)
  })

  useHotkeys(
    'space',
    () => {
      if (imageGallery?.current) {
        // @ts-ignore: does not exist on type never
        imageGallery?.current?.togglePlay()
      }
    },
    [],
  )

  useHotkeys(
    'j',
    () => {
      if (imageGallery?.current) {
        // @ts-ignore: does not exist on type never
        imageGallery.current.slideLeft()
      }
    },
    [],
  )

  useHotkeys(
    ';',
    () => {
      if (imageGallery?.current) {
        // @ts-ignore: does not exist on type never
        imageGallery.current.slideRight()
      }
    },
    [],
  )

  // apply preferredIndex when images are added or removed
  useEffect(() => {
    if (preferredIndex !== ignore) {
      const index = preferredIndex < images.length ? preferredIndex : images.length - 1
      currentImageGallery()?.slideToIndex(index)
      setPreferredIndex(ignore)
      onSlide(index)
    }
  }, [images])

  if (loading)
    return (
      <p
        style={{
          color: 'white',
        }}
      >
        Loading...
      </p>
    )

  return (
    <>
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
        showPlayButton={false}
        thumbnailPosition={'right'}
        showFullscreenButton={paused}
      />
      <div className="flex fixed inset-x-0 bottom-0 items-end h-screen mb-[6vh]">
        <div className="w-full bg-gray-800 bg-opacity-50 h-150vh">
          <div className="flex justify-between items-center m-4 mx-10 h-full text-white text-md">
            <div>{currentImageFileName}</div>
            <div className="flex flex-col">
              <div className="text-white">{dataOutput?.folderName}</div>
              <div className="text-sm text-white">{dataOutput?.folderImageCount} images remaining</div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
export default Service
