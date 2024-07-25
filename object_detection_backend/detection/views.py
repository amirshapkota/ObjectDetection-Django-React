import os
import base64
import cv2
import numpy as np
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
import json

# Define paths to the model files
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
configPath = os.path.join(BASE_DIR, 'ssd_mobilenet_v3_large_coco_2020_01_14.pbtxt')
weightsPath = os.path.join(BASE_DIR, 'frozen_inference_graph.pb')

# Load the model
net = cv2.dnn_DetectionModel(weightsPath, configPath)
net.setInputSize(320, 320)
net.setInputScale(1.0 / 127.5)
net.setInputMean((127.5, 127.5, 127.5))
net.setInputSwapRB(True)

# Load class names
with open(os.path.join(BASE_DIR, 'coco.names'), 'rt') as f:
    classNames = f.read().rstrip('\n').split('\n')

desired_classes = ['cup', 'bottle', 'cell phone', 'book', 'keyboard', 'watch']
desired_class_indices = [classNames.index(c) + 1 for c in desired_classes]

@csrf_exempt
def receive_detections(request):
    if request.method == 'POST':
        data = json.loads(request.body)
        frame_data = data.get('frame')
        if frame_data:
            # Decode the base64 frame data
            _, encoded_frame = frame_data.split(',')
            frame = base64.b64decode(encoded_frame)
            np_frame = np.frombuffer(frame, np.uint8)
            img = cv2.imdecode(np_frame, cv2.IMREAD_COLOR)

            # Detect objects
            classIds, confs, bbox = net.detect(img, confThreshold=0.45)

            detections = []
            if len(classIds) > 0:
                for classId, confidence, box in zip(classIds.flatten(), confs.flatten(), bbox):
                    if classId in desired_class_indices:
                        detections.append({
                            'class': classNames[classId - 1],
                            'confidence': float(confidence),
                            'box': box.tolist()
                        })

            return JsonResponse({'detections': detections})
        else:
            return JsonResponse({'error': 'No frame data provided'}, status=400)
    else:
        return JsonResponse({'error': 'Invalid method'}, status=405)
