"""
hand_tracker.py
---------------
Uses MediaPipe Hands to detect and track a single primary hand.
Provides smoothed landmark positions and finger state (up/down).
"""

import cv2
import mediapipe as mp
import numpy as np
from collections import deque

class HandTracker:
    def __init__(self, static_mode=False, max_hands=2, min_detection_confidence=0.5,
                 min_tracking_confidence=0.5, smoothing_window=5):
        """
        Initialise MediaPipe Hands and smoothing buffers.
        :param smoothing_window: number of recent frames for moving average smoothing.
        """
        self.mp_hands = mp.solutions.hands
        self.hands = self.mp_hands.Hands(
            static_image_mode=static_mode,
            max_num_hands=max_hands,
            min_detection_confidence=min_detection_confidence,
            min_tracking_confidence=min_tracking_confidence
        )
        self.mp_draw = mp.solutions.drawing_utils

        # Primary hand lock
        self.primary_hand_id = None          # MediaPipe's tracking ID
        self.lock_timeout = 30                # frames to wait before releasing lock
        self.lock_counter = 0

        # Smoothing buffers for each landmark (21 landmarks, x,y per landmark)
        self.smoothing_window = smoothing_window
        self.landmark_buffer = [deque(maxlen=smoothing_window) for _ in range(21)]

        # Landmark connections for drawing (optional)
        self.connections = self.mp_hands.HAND_CONNECTIONS

    def find_hands(self, frame, draw=False):
        """
        Process frame, detect hands, and return annotated frame and list of hand data.
        Each hand data: {'id': tracking_id, 'landmarks': list of (x,y) in pixel coords,
                         'handedness': 'Left' or 'Right'}
        """
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = self.hands.process(rgb)

        hands_data = []
        if results.multi_hand_landmarks:
            for idx, hand_landmarks in enumerate(results.multi_hand_landmarks):
                # Get handedness
                handedness = results.multi_handedness[idx].classification[0].label
                tracking_id = idx  # MediaPipe doesn't provide persistent IDs; use index as temporary

                # Convert landmarks to pixel coordinates and store
                h, w, _ = frame.shape
                landmarks_px = []
                for lm in hand_landmarks.landmark:
                    px, py = int(lm.x * w), int(lm.y * h)
                    landmarks_px.append((px, py))

                hands_data.append({
                    'id': tracking_id,
                    'landmarks': landmarks_px,
                    'handedness': handedness
                })

                # Draw landmarks if requested
                if draw:
                    self.mp_draw.draw_landmarks(frame, hand_landmarks, self.connections)

        # Apply hand locking logic
        hands_data = self._lock_primary_hand(hands_data)

        return frame, hands_data

    def _lock_primary_hand(self, hands_data):
        """
        Maintain lock on one primary hand. If lock is active, return only that hand.
        If no primary hand, lock onto the first detected hand.
        If primary hand disappears for > lock_timeout frames, release lock.
        """
        if self.primary_hand_id is not None:
            # Look for the hand with matching ID (using index as ID)
            locked_hand = [h for h in hands_data if h['id'] == self.primary_hand_id]
            if locked_hand:
                self.lock_counter = 0
                return locked_hand
            else:
                self.lock_counter += 1
                if self.lock_counter > self.lock_timeout:
                    self.primary_hand_id = None
                    self.lock_counter = 0
                return []          # no hand this frame
        else:
            # No primary hand yet – lock onto first detected hand
            if hands_data:
                self.primary_hand_id = hands_data[0]['id']
                return [hands_data[0]]
            else:
                return []

    def get_smoothed_landmarks(self, raw_landmarks):
        """
        Apply moving average smoothing to landmark positions.
        Returns smoothed list of (x,y) tuples.
        """
        smoothed = []
        for i, (x, y) in enumerate(raw_landmarks):
            self.landmark_buffer[i].append((x, y))
            # Compute average of buffered positions
            avg_x = int(np.mean([p[0] for p in self.landmark_buffer[i]]))
            avg_y = int(np.mean([p[1] for p in self.landmark_buffer[i]]))
            smoothed.append((avg_x, avg_y))
        return smoothed

    def get_finger_state(self, landmarks, handedness):
        """
        Determine which fingers are up.
        Returns a list of 5 booleans: [thumb, index, middle, ring, pinky].
        Uses landmark positions: tip ids 4,8,12,16,20; pip ids 3,6,10,14,18.
        For thumb, compares x coordinate based on handedness.
        """
        finger_tips = [4, 8, 12, 16, 20]
        finger_pips = [3, 6, 10, 14, 18]   # joints below the tips

        state = []
        # Thumb (index 0)
        tip = landmarks[finger_tips[0]]
        pip = landmarks[finger_pips[0]]
        if handedness == 'Right':
            # Right hand: thumb up if tip.x < pip.x (thumb points left)
            state.append(tip[0] < pip[0])
        else:
            # Left hand: thumb up if tip.x > pip.x
            state.append(tip[0] > pip[0])

        # Other four fingers: up if tip.y < pip.y (y increases downward)
        for i in range(1, 5):
            tip = landmarks[finger_tips[i]]
            pip = landmarks[finger_pips[i]]
            state.append(tip[1] < pip[1])

        return state

    def release(self):
        self.hands.close()