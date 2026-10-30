import React from 'react'
import ReactDOM from 'react-dom/client'
import { ready } from './hub-bridge.js'
import App from './App.jsx'

// Provide a simple localStorage-based storage API that the app expects
// (online, hub-bridge.js replaces this with one that also saves to the Math Hub server)
if (!window.HUB_PLANNER_ONLINE) {
  window.storage = {
    async get(key) {
      const val = localStorage.getItem(key);
      return val ? { value: val } : null;
    },
    async set(key, value) {
      localStorage.setItem(key, value);
    },
    async remove(key) {
      localStorage.removeItem(key);
    }
  };
}

ready.then(() => {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
})
