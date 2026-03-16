import cv2
import math
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision

class HandTracker:
    def __init__(self, smoothing_factor=0.5):
        model_path = "hand_landmarker.task"
        base_options = python.BaseOptions(model_asset_path=model_path)
        
        # We detect up to 2 hands initially so we can pick the closest one if a new one appears,
        # but we only track one primary hand.
        options = vision.HandLandmarkerOptions(
            base_options=base_options,
            num_hands=2,
            running_mode=vision.RunningMode.IMAGE
        )
        self.detector = vision.HandLandmarker.create_from_options(options)
        
        self.smoothing_factor = smoothing_factor
        self.last_landmarks = None
        
        # Hand lock tracking
        self.locked_hand_center = None

    def distance(self, p1, p2):
        return math.sqrt((p1[0] - p2[0])**2 + (p1[1] - p2[1])**2)

    def get_center(self, landmarks):
        """Calculate the rough center of a hand (using wrist and metacarpophalangeal joints)"""
        x_sum = sum([lm[0] for lm in landmarks])
        y_sum = sum([lm[1] for lm in landmarks])
        return (x_sum / len(landmarks), y_sum / len(landmarks))

    def smooth_landmarks(self, current_landmarks):
        if self.last_landmarks is None:
            self.last_landmarks = current_landmarks
            return current_landmarks
            
        smoothed = []
        for curr, prev in zip(current_landmarks, self.last_landmarks):
            # Exponential Moving Average
            sx = prev[0] * self.smoothing_factor + curr[0] * (1 - self.smoothing_factor)
            sy = prev[1] * self.smoothing_factor + curr[1] * (1 - self.smoothing_factor)
            smoothed.append((sx, sy))
            
        self.last_landmarks = smoothed
        return smoothed

    def get_landmarks(self, frame):
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=frame)
        result = self.detector.detect(mp_image)

        if not result.hand_landmarks:
            self.locked_hand_center = None
            self.last_landmarks = None
            return None

        best_hand_landmarks = None
        
        if len(result.hand_landmarks) == 1:
            best_hand_landmarks = result.hand_landmarks[0]
        else:
            # We have multiple hands. Find the one closest to our last locked position.
            if self.locked_hand_center is None:
                # If we didn't have a lock, just take the first one
                best_hand_landmarks = result.hand_landmarks[0]
            else:
                best_dist = float('inf')
                for hand_lms in result.hand_landmarks:
                    # Convert to normalized (x,y)
                    pts = [(lm.x, lm.y) for lm in hand_lms]
                    center = self.get_center(pts)
                    dist = self.distance(center, self.locked_hand_center)
                    if dist < best_dist:
                        best_dist = dist
                        best_hand_landmarks = hand_lms

        # Extract (x,y) for the chosen hand
        extracted = [(lm.x, lm.y) for lm in best_hand_landmarks]
        
        # Update lock
        self.locked_hand_center = self.get_center(extracted)
        
        # Apply EMA smoothing
        smoothed = self.smooth_landmarks(extracted)

        return smoothed