import React, { useRef, useEffect, useState } from 'react';
import axios from 'axios';

const ObjectDetection = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [detections, setDetections] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    const startVideo = async () => {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          const video = videoRef.current;
          if (video) {
            video.srcObject = stream;
            video.onloadedmetadata = () => {
              video.play().catch((playError) => {
                console.error('Error trying to play video:', playError);
              });
            };
          }
        } else {
          setError('getUserMedia is not supported by your browser.');
        }
      } catch (err) {
        console.error('Error accessing the camera: ', err);
        let errorMessage = '';
        switch (err.name) {
          case 'NotAllowedError':
            errorMessage = 'Camera access denied. Please allow camera access in your browser settings.';
            break;
          case 'NotFoundError':
            errorMessage = 'No camera device found. Please connect a camera.';
            break;
          case 'NotReadableError':
            errorMessage = 'Camera is already in use by another application.';
            break;
          case 'OverconstrainedError':
            errorMessage = 'The requested camera constraints could not be satisfied.';
            break;
          case 'AbortError':
            errorMessage = 'The media access request was aborted by the user.';
            break;
          default:
            errorMessage = 'Error accessing the camera. Please check your browser settings and try again.';
        }
        setError(errorMessage);
      }
    };

    const captureFrame = () => {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      const context = canvas?.getContext('2d');

      if (video && canvas && context) {
        // Ensure canvas dimensions match video dimensions
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // Clear the canvas before drawing
        context.clearRect(0, 0, canvas.width, canvas.height);

        // Draw video frame onto canvas
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Debugging: Log canvas dimensions and image data
        console.log('Canvas dimensions:', canvas.width, canvas.height);
        console.log('Canvas image data URL:', canvas.toDataURL('image/jpeg'));

        const frame = canvas.toDataURL('image/jpeg');
        sendFrameToBackend(frame);
      } else {
        console.error('Video, canvas, or context is not properly initialized');
      }
    };

    startVideo();

    const interval = setInterval(captureFrame, 1000);
    return () => clearInterval(interval);
  }, []);

  const sendFrameToBackend = async (frame) => {
    try {
      const response = await axios.post('http://localhost:8000/detection/receive_detections/', {
        frame: frame
      });
      setDetections(response.data.detections);
    } catch (error) {
      console.error('Error sending frame to backend: ', error);
    }
  };

  return (
    <div>
      <h1>Object Detection</h1>
      {error ? (
        <p>{error}</p>
      ) : (
        <>
          <video ref={videoRef} width="640" height="480" style={{ display: 'block' }} />
          <canvas ref={canvasRef} style={{ display: 'none' }} />
          <h2>Detected Objects</h2>
          <ul>
            {detections.map((detection, index) => (
              <li key={index}>{detection.class} ({Math.round(detection.confidence * 100)}%)</li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
};

export default ObjectDetection;
