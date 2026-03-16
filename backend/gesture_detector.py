import math
import time

class GestureDetector:
    def __init__(self):
        self.pan_start_time = None
        self.is_panning = False
        self.last_canvas_center = None

    def distance(self, p1, p2):
        return math.sqrt((p1[0] - p2[0])**2 + (p1[1] - p2[1])**2)

    def count_fingers_up(self, lm):
        tips = [4, 8, 12, 16, 20]
        fingers = []

        # Thumb (check if tip is further left/right than the joint, depending on hand)
        # A simple heuristic for thumb:
        fingers.append(1 if lm[4][0] > lm[3][0] else 0)

        for tip in tips[1:]:
            # Finger is up if tip is higher (smaller y) than the lower joint
            fingers.append(1 if lm[tip][1] < lm[tip-2][1] else 0)
        return fingers

    def detect(self, lm, w, h):
        """
        Takes 21 hand landmarks, and screen width/height.
        Returns a gesture command dictionary or None.
        """
        if not lm or len(lm) != 21:
            return None

        fingers = self.count_fingers_up(lm)
        num_fingers = sum(fingers)

        index_tip = lm[8]
        thumb_tip = lm[4]
        
        ix, iy = int(index_tip[0] * w), int(index_tip[1] * h)

        # === 5 Fingers: PAN MODE ===
        if num_fingers == 5:
            if self.pan_start_time is None:
                self.pan_start_time = time.time()
            elif time.time() - self.pan_start_time > 5.0:
                self.is_panning = True
                
                # Use wrist (lm[0]) or index finger as pan center
                center = (int(lm[0][0] * w), int(lm[0][1] * h))
                
                if self.last_canvas_center:
                    dx = center[0] - self.last_canvas_center[0]
                    # Note: moving hand UP means smaller Y, so dy is negative. 
                    # If moving hand UP -> canvas moves DOWN (positive dy in some systems, depends on frontend)
                    dy = center[1] - self.last_canvas_center[1]
                    
                    self.last_canvas_center = center
                    return {
                        "gesture": "MOVE_CANVAS",
                        "dx": dx,
                        "dy": dy
                    }
                else:
                    self.last_canvas_center = center
                    return {
                        "gesture": "MOVE_CANVAS",
                        "dx": 0,
                        "dy": 0
                    }
        else:
            self.pan_start_time = None
            self.is_panning = False
            self.last_canvas_center = None

        if self.is_panning:
            return None  # Don't trigger other gestures while in pan mode exit transition

        # === 0 Fingers: PAUSE ===
        if num_fingers == 0:
            return {"gesture": "PAUSE"}

        # === PINCH ===
        # Distance between thumb and index tip
        pinch_dist = self.distance(thumb_tip, index_tip)
        
        # You may need to tune this threshold (e.g. 0.05 is 5% of screen width)
        if pinch_dist < 0.05:
            # We assume it's a SELECT by default, but to differentiate between MOVE/RESIZE
            # we'd need history. For now, returning basic SELECT. 
            # If the frontend tracks movement after SELECT, it becomes a MOVE.
            
            # For RESIZE, you usually need 2 hands pinching, or a specific toggle. 
            # We will output SELECT OBJECT. The frontend can handle dragging logic.
            return {
                "gesture": "SELECT OBJECT",
                "x": ix,
                "y": iy,
                "pinch_dist": pinch_dist
            }

        # === 1 Finger (Index Up): DRAW ===
        if fingers == [0, 1, 0, 0, 0] or fingers == [1, 1, 0, 0, 0]:
            return {
                "gesture": "DRAW",
                "x": ix,
                "y": iy
            }

        # === 2 Fingers (Index + Middle Up): ERASE ===
        if fingers == [0, 1, 1, 0, 0] or fingers == [1, 1, 1, 0, 0]:
            return {
                "gesture": "ERASE",
                "x": ix,
                "y": iy
            }

        return None
