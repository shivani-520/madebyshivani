import { useEffect, useState } from "react";

export default function useDevicePixelRatio() {
  const [ratio, setRatio] = useState(() => typeof window === "undefined" ? 1 : window.devicePixelRatio || 1);
  useEffect(() => {
    let query;
    const update = () => {
      query?.removeEventListener("change", update);
      const next = window.devicePixelRatio || 1;
      setRatio(next);
      query = window.matchMedia(`(resolution: ${next}dppx)`);
      query.addEventListener("change", update);
    };
    update();
    return () => query?.removeEventListener("change", update);
  }, []);
  return ratio;
}
