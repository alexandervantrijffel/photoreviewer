import { gql, useQuery } from '@apollo/client'
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
  console.log('Have data', data)
  return <>PhotoManager/PhotoGallery</>
}
export default Service
