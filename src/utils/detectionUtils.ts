
import * as tf from '@tensorflow/tfjs';
import * as blazeface from '@tensorflow-models/blazeface';

// Cache the model once loaded
let faceDetectionModel: blazeface.BlazeFaceModel | null = null;

// Tracking state for head movement detection
interface HeadPosition {
  x: number;
  y: number;
  timestamp: number;
}

const recentHeadPositions: HeadPosition[] = [];
const MAX_HEAD_POSITIONS = 10; // Track last 10 positions
const HEAD_MOVEMENT_THRESHOLD = 30; // Pixel threshold for significant movement
const FREQUENT_MOVEMENTS_THRESHOLD = 3; // Number of significant movements to consider "frequent"
const POSITION_TRACKING_INTERVAL = 500; // Record position every 500ms

/**
 * Initialize the face detection model
 */
export const initializeDetection = async (): Promise<void> => {
  try {
    // Load model if not already loaded
    if (!faceDetectionModel) {
      console.log('Loading face detection model...');
      faceDetectionModel = await blazeface.load();
      console.log('Face detection model loaded');
    }
  } catch (error) {
    console.error('Error initializing face detection:', error);
    throw new Error('Failed to initialize face detection model');
  }
};

/**
 * Process a video frame to detect faces
 */
export const processVideoFrame = async (
  videoElement: HTMLVideoElement | null
): Promise<{
  faceCount: number;
  facePresent: boolean;
  lookingAway: boolean;
  estimatedAttention: number; // 0-100 percentage
  predictions: blazeface.NormalizedFace[] | null;
}> => {
  if (!videoElement || !faceDetectionModel) {
    return {
      faceCount: 0,
      facePresent: false,
      lookingAway: false,
      estimatedAttention: 0,
      predictions: null,
    };
  }

  try {
    // Run detection
    const predictions = await faceDetectionModel.estimateFaces(videoElement, false);
    
    const faceCount = predictions.length;
    const facePresent = faceCount > 0;
    
    // Track head position for the primary face (if present)
    let lookingAway = false;
    let estimatedAttention = 100; // Start with 100% attention
    
    if (facePresent && predictions[0]) {
      const firstFace = predictions[0];
      const currentTime = Date.now();
      
      // Only add position at intervals to avoid too frequent updates
      if (recentHeadPositions.length === 0 || 
          (currentTime - recentHeadPositions[recentHeadPositions.length - 1].timestamp) > POSITION_TRACKING_INTERVAL) {
        
        const centerX = firstFace.topLeft[0] + (firstFace.bottomRight[0] - firstFace.topLeft[0]) / 2;
        const centerY = firstFace.topLeft[1] + (firstFace.bottomRight[0] - firstFace.topLeft[1]) / 2;
        
        // Add the position
        recentHeadPositions.push({
          x: centerX,
          y: centerY,
          timestamp: currentTime,
        });
        
        // Keep only the most recent positions
        if (recentHeadPositions.length > MAX_HEAD_POSITIONS) {
          recentHeadPositions.shift();
        }
        
        // Check for significant movements
        let significantMovements = 0;
        if (recentHeadPositions.length > 1) {
          for (let i = 1; i < recentHeadPositions.length; i++) {
            const prev = recentHeadPositions[i - 1];
            const curr = recentHeadPositions[i];
            
            const distance = Math.sqrt(
              Math.pow(curr.x - prev.x, 2) + Math.pow(curr.y - prev.y, 2)
            );
            
            if (distance > HEAD_MOVEMENT_THRESHOLD) {
              significantMovements++;
            }
          }
          
          lookingAway = significantMovements >= FREQUENT_MOVEMENTS_THRESHOLD;
          
          // Reduce attention based on movement frequency
          if (significantMovements > 0) {
            // Each significant movement reduces attention by 20%
            estimatedAttention = Math.max(0, 100 - (significantMovements * 20));
          }
        }
      }
    }
    
    return {
      faceCount,
      facePresent,
      lookingAway,
      estimatedAttention,
      predictions,
    };
  } catch (error) {
    console.error('Error in processVideoFrame:', error);
    return {
      faceCount: 0,
      facePresent: false,
      lookingAway: false,
      estimatedAttention: 0,
      predictions: null,
    };
  }
};

/**
 * Get the current detection status
 */
export const getDetectionStatus = (
  facePresent: boolean, 
  faceCount: number, 
  lookingAway: boolean
): {
  status: 'safe' | 'warning' | 'danger';
  message: string;
} => {
  if (!facePresent) {
    return {
      status: 'danger',
      message: 'No face detected in frame',
    };
  }
  
  if (faceCount > 1) {
    return {
      status: 'danger',
      message: `Multiple faces detected (${faceCount})`,
    };
  }
  
  if (lookingAway) {
    return {
      status: 'warning',
      message: 'Looking away from screen frequently',
    };
  }
  
  return {
    status: 'safe',
    message: 'Normal exam behavior',
  };
};

/**
 * Draw face detection results on a canvas
 */
export const drawDetections = (
  canvas: HTMLCanvasElement | null,
  predictions: blazeface.NormalizedFace[] | null,
  videoWidth: number,
  videoHeight: number
): void => {
  if (!canvas || !predictions) return;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  
  // Clear the canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Scale factors if video dimensions don't match canvas dimensions
  const scaleX = canvas.width / videoWidth;
  const scaleY = canvas.height / videoHeight;
  
  // Draw each prediction
  predictions.forEach((prediction) => {
    const start = prediction.topLeft;
    const end = prediction.bottomRight;
    const size = [end[0] - start[0], end[1] - start[1]];
    
    // Draw bounding box
    ctx.strokeStyle = predictions.length > 1 ? '#ef4444' : '#10b981';
    ctx.lineWidth = 2;
    ctx.strokeRect(
      start[0] * scaleX, 
      start[1] * scaleY, 
      size[0] * scaleX, 
      size[1] * scaleY
    );
    
    // Draw face landmarks if available
    if (prediction.landmarks) {
      ctx.fillStyle = '#3b82f6';
      // Convert landmarks to array if it's a tensor
      const landmarksArray = Array.isArray(prediction.landmarks) 
        ? prediction.landmarks 
        : prediction.landmarks.arraySync();
        
      // Now we can safely use forEach
      landmarksArray.forEach((landmark) => {
        ctx.beginPath();
        ctx.arc(
          landmark[0] * scaleX, 
          landmark[1] * scaleY, 
          2, 
          0, 
          2 * Math.PI
        );
        ctx.fill();
      });
    }
  });
};
