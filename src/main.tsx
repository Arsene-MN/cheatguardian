
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Initialize TensorFlow backend for BlazeFace
import * as tf from '@tensorflow/tfjs';

// Initialize the WebGL backend
tf.setBackend('webgl').catch(err => {
  console.warn('Failed to set WebGL backend, trying CPU:', err);
  tf.setBackend('cpu').catch(err => {
    console.error('Failed to initialize any TensorFlow backend:', err);
  });
});

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
