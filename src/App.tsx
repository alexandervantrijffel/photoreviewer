import './App.css'
import { AppApolloProvider } from './apolloClient'
import PhotoGallery from './PhotoManager/PhotoGallery'

function App() {
  return (
    <AppApolloProvider>
      <PhotoGallery />
    </AppApolloProvider>
  )
}

export default App
