import React, { StrictMode } from 'react'
import ReactDOM from 'react-dom'

import './index.css'
import App from './App'
import { createRoot } from 'react-dom/client'

// @ts-ignore: crazy type error
ReactDOM.createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
