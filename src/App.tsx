import React from 'react'
import './App.css'
import { AppApolloProvider } from './apolloClient'

function App() {
  return (
    <AppApolloProvider>
      <h1>React App</h1>
      <div>Hello world</div>
    </AppApolloProvider>
  )
}

export default App
