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

// Enhanced constants for better detection
const recentHeadPositions: HeadPosition[] = [];
const MAX_HEAD_POSITIONS = 15; // Increased from 10 to 15 for better movement tracking
const HEAD_MOVEMENT_THRESHOLD = 25; // Lowered from 30 to 25 for higher sensitivity
const FREQUENT_MOVEMENTS_THRESHOLD = 3; // Keep at 3 significant movements
const POSITION_TRACKING_INTERVAL = 300; // Decreased from 500ms to 300ms for more frequent sampling

// New constants for face size and position tracking
const FACE_DISAPPEARANCE_THRESHOLD = 3; // Number of consecutive frames without a face to trigger warning
let framesSinceFaceDetected = 0;

/**
 * Initialize the face detection model
 */
export const initializeDetection = async (): Promise<void> => {
  try {
    // Load model if not already loaded
    if (!faceDetectionModel) {
      console.log('Loading face detection model...');
      faceDetectionModel = await blazeface.load({
        maxFaces: 3, // Detect up to 3 faces in frame
        iouThreshold: 0.3, // Lower threshold for better detection of multiple faces
        scoreThreshold: 0.6, // Lower threshold to catch more potential faces
      });
      console.log('Face detection model loaded');
    }
  } catch (error) {
    console.error('Error initializing face detection:', error);
    throw new Error('Failed to initialize face detection model');
  }
};

/**
 * Process a video frame to detect faces with enhanced sensitivity
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
    // Enhanced detection with multiple runs for better accuracy
    let predictions = await faceDetectionModel.estimateFaces(videoElement, false);
    
    // If no faces detected on first try, attempt a second pass with different settings
    if (predictions.length === 0) {
      // Try again with a different tensor input format
      const imageTensor = tf.browser.fromPixels(videoElement);
      predictions = await faceDetectionModel.estimateFaces(imageTensor, false);
      imageTensor.dispose(); // Clean up tensor
    }
    
    const faceCount = predictions.length;
    const facePresent = faceCount > 0;
    
    // Update consecutive frames without a face counter
    if (!facePresent) {
      framesSinceFaceDetected++;
    } else {
      framesSinceFaceDetected = 0;
    }
    
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
    } else {
      // If no face is present, attention is 0
      estimatedAttention = 0;
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
 * Get the current detection status with enhanced criteria
 */
export const getDetectionStatus = (
  facePresent: boolean, 
  faceCount: number, 
  lookingAway: boolean
): {
  status: 'safe' | 'warning' | 'danger';
  message: string;
} => {
  // Face has been missing for several consecutive frames
  if (!facePresent && framesSinceFaceDetected >= FACE_DISAPPEARANCE_THRESHOLD) {
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
  
  // Short-term face disappearance (less than threshold) - warning level
  if (!facePresent && framesSinceFaceDetected > 0) {
    return {
      status: 'warning',
      message: 'Face temporarily not visible',
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
