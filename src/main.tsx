import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import './styles/editor.css'
import './styles/theme-transition.css'

// 운영환경에서는 StrictMode 사용, 개발환경에서는 ReactQuill 경고 때문에 비활성화
const isDevelopment = import.meta.env.DEV;

ReactDOM.createRoot(document.getElementById('root')!).render(
  isDevelopment ? (
    <App />
  ) : (
    <React.StrictMode>
      <App />
    </React.StrictMode>
  ),
)