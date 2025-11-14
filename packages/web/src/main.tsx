import React from 'react'
import { createRoot } from 'react-dom/client'
import './styles/app.css'
import { App } from './App.js'

const rootEl = document.getElementById('root')!
createRoot(rootEl).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
