"""
gesture_detector.py
-------------------
Interprets hand landmarks and finger states to produce drawing commands.
Implements gesture rules, pan‑mode activation, and coordinate smoothing.
"""

import time
import numpy as np

class GestureDetector:
    def __init__(self, pinch_threshold=40, pan_activation_frames=150):  # 5 sec at 30 fps = 150 frames
        self.pinch_threshold = pinch_threshold
        self.pan_activation_frames = pan_activation_frames
        self.pan_mode_active = False
        self.pan_counter = 0
        self.prev_hand_center = None          # for pan movement

        # Smoothing for index tip (DRAW mode)
        self.index_buffer = []
        self.smooth_window = 5

    def recognize(self, hand_data, frame_shape):
        """
        Main entry point: takes hand data (landmarks, handedness) and returns a command dict.
        """
        if not hand_data:
            return {'gesture': 'NO_HAND'}

        landmarks = hand_data[0]['landmarks']          # primary hand only
        handedness = hand_data[0]['handedness']
        finger_state = self._get_finger_state(hand_data[0])  # we'll compute inside

        # 1. Determine basic gesture from finger count and proximity
        gesture = self._classify_gesture(landmarks, finger_state)

        # 2. Handle pan mode activation (five fingers up for 5 seconds)
        gesture, pan_dx, pan_dy = self._handle_pan_mode(gesture, landmarks, finger_state)

        # 3. Build output command
        cmd = self._build_command(gesture, landmarks, pan_dx, pan_dy)
        return cmd

    def _get_finger_state(self, hand):
        """Reuse the tracker's method if available, but we'll implement a local version for independence."""
        # This replicates the logic from HandTracker; in practice you might call the tracker's method.
        # For simplicity, we'll compute here using raw landmarks.
        landmarks = hand['landmarks']
        handedness = hand['handedness']
        finger_tips = [4, 8, 12, 16, 20]
        finger_pips = [3, 6, 10, 14, 18]

        state = []
        # Thumb
        tip = landmarks[finger_tips[0]]
        pip = landmarks[finger_pips[0]]
        if handedness == 'Right':
            state.append(tip[0] < pip[0])
        else:
            state.append(tip[0] > pip[0])

        # Other fingers
        for i in range(1, 5):
            tip = landmarks[finger_tips[i]]
            pip = landmarks[finger_pips[i]]
            state.append(tip[1] < pip[1])

        return state

    def _classify_gesture(self, landmarks, finger_state):
        """
        Rule‑based classification:
        - 1 finger up (index)            → DRAW
        - 2 fingers up (index+middle)    → ERASE
        - Pinch (thumb & index close)    → SELECT (or MOVE/RESIZE if movement)
        - Closed fist (all down)         → PAUSE
        - Five fingers up                 → potentially PAN (handled later)
        """
        count_up = sum(finger_state)

        # Pinch gesture (thumb tip + index tip distance)
        thumb_tip = landmarks[4]
        index_tip = landmarks[8]
        distance = np.linalg.norm(np.array(thumb_tip) - np.array(index_tip))

        if distance < self.pinch_threshold:
            # Could be SELECT, MOVE, or RESIZE – we'll differentiate by movement later
            return 'PINCH'
        elif count_up == 1 and finger_state[1]:   # only index up
            return 'DRAW'
        elif count_up == 2 and finger_state[1] and finger_state[2]:  # index + middle
            return 'ERASE'
        elif count_up == 0:
            return 'PAUSE'
        elif count_up == 5:
            return 'FIVE_UP'
        else:
            return 'UNKNOWN'

    def _handle_pan_mode(self, gesture, landmarks, finger_state):
        """
        Implements pan mode:
        - Accumulate frames with five fingers up.
        - After threshold, activate pan mode.
        - While active, compute canvas movement based on hand displacement.
        """
        pan_dx, pan_dy = 0, 0

        if gesture == 'FIVE_UP':
            self.pan_counter += 1
            if self.pan_counter >= self.pan_activation_frames and not self.pan_mode_active:
                self.pan_mode_active = True
                self.pan_counter = 0          # reset counter
                # Store initial hand center for movement tracking
                self.prev_hand_center = self._get_hand_center(landmarks)
        else:
            # Any other gesture deactivates pan mode immediately
            self.pan_mode_active = False
            self.pan_counter = 0
            self.prev_hand_center = None

        if self.pan_mode_active:
            # Compute hand displacement (reverse direction for canvas)
            current_center = self._get_hand_center(landmarks)
            if self.prev_hand_center is not None:
                dx = current_center[0] - self.prev_hand_center[0]
                dy = current_center[1] - self.prev_hand_center[1]
                # Canvas moves opposite to hand movement
                pan_dx = -dx
                pan_dy = -dy
            self.prev_hand_center = current_center
            gesture = 'PAN'   # override gesture

        return gesture, pan_dx, pan_dy

    def _get_hand_center(self, landmarks):
        """Approximate hand center as mean of all landmarks."""
        xs = [p[0] for p in landmarks]
        ys = [p[1] for p in landmarks]
        return (int(np.mean(xs)), int(np.mean(ys)))

    def _build_command(self, gesture, landmarks, pan_dx=0, pan_dy=0):
        """
        Create output dictionary according to spec.
        For DRAW, include smoothed index tip coordinates.
        """
        cmd = {'gesture': gesture}

        if gesture == 'DRAW':
            # Smooth index tip (landmark 8)
            idx_tip = landmarks[8]
            self.index_buffer.append(idx_tip)
            if len(self.index_buffer) > self.smooth_window:
                self.index_buffer.pop(0)
            avg_x = int(np.mean([p[0] for p in self.index_buffer]))
            avg_y = int(np.mean([p[1] for p in self.index_buffer]))
            cmd['x'] = avg_x
            cmd['y'] = avg_y
        elif gesture == 'PAN':
            cmd['dx'] = pan_dx
            cmd['dy'] = pan_dy
        # ERASE, PAUSE, etc. need no extra data

        return cmd