import { StrictMode } from 'react'
import './index.css'
import App from './App'
import { createRoot } from 'react-dom/client'

// @ts-ignore: crazy type error
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
