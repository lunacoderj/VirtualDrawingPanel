import React, { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Video } from "lucide-react";

export const CameraPreview = ({ videoRef }: { videoRef: React.RefObject<HTMLVideoElement | null> }) => {
  useEffect(() => {
    let stream: MediaStream | null = null;
    
    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Failed to access camera", err);
      }
    };

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [videoRef]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="absolute bottom-16 right-4 w-64 aspect-video glass-panel-strong rounded-2xl overflow-hidden border border-primary/30 z-30"
      style={{ boxShadow: "0 0 30px rgba(34,211,238,0.15)" }}
    >
      <div className="absolute top-2 left-2 px-2 py-0.5 bg-primary text-primary-foreground text-[9px] font-bold uppercase tracking-widest rounded z-10 pointer-events-none">
        Camera
      </div>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover"
      />
    </motion.div>
  );
};
