import './App.css'
import { AppApolloProvider } from './apolloClient'
import PhotoGallery from './PhotoManager/PhotoGallery'

console.log('app started...')

function App() {
  return (
    <AppApolloProvider>
      <PhotoGallery />
    </AppApolloProvider>
  )
}

export default App
