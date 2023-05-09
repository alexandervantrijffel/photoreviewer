import './App.css'
import { AppApolloProvider } from './apolloClient'
import PhotoGallery from './PhotoManager/PhotoGallery'

function App() {
  return (
    <AppApolloProvider>
      <h1>React App</h1>
      <div>Hello world</div>
      <PhotoGallery />
    </AppApolloProvider>
  )
}

export default App
