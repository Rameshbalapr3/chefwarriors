import React from 'react';
import {createRoot} from 'react-dom/client';
import {App} from './ui/App';
import './ui/style.css';
// Remove only retired browser demo data; never touch the desktop SQLite database.
try {
 for(const key of ['chefwarriors-demo-v1','chefwarriors-demo-v1-before-client-import'])localStorage.removeItem(key);
} catch { /* Storage may be disabled; desktop startup must still work. */ }
createRoot(document.getElementById('app')!).render(<React.StrictMode><App/></React.StrictMode>);
