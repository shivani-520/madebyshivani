import { useProgress } from "@react-three/drei";
import { useEffect, useRef, useState } from "react";

export default function LoadingScreen() 
{
  const { progress, active } = useProgress();
  const [visible, setVisible] = useState(true);
  const [fadingOut, setFadingOut] = useState(false);
  const hasStartedFading = useRef(false);

  useEffect(() => {
    // once loading finishes, hold briefly then fade out
    if(!active && progress >= 100 && !hasStartedFading.current)
    {
        hasStartedFading.current = false;

        const holdTimer = setTimeout(() => {
          setFadingOut(true);
        }, 400);

        const removeTimer = setTimeout(() => {
          setVisible(false);
        }, 400 + 700);

        return() => {
          clearTimeout(holdTimer);
          clearTimeout(removeTimer);
        };
    }
  }, [active, progress]);

  if(!visible) return null;

  return (

    <div className={`loading-screen${fadingOut ? " loading-screen-out" : ""}`}>
      <div className="loading-content">
        <span className="loading-logo">Made By Shivani</span>

        <div className="loading-bar-track">
          <div 
            className="loading-bar-fill" 
            style={{ transform: `scaleX(${progress / 100})` }}
          />
        </div>

        <span className="loading-percent">{Math.floor(progress)}%</span>
      </div>
    </div>

  );
}
