import { useState } from "react";
import { COLLAGE_ITEMS } from "../../data/collage";

export default function CollageBackdrop() {
  const [activeSticker, setActiveSticker] = useState(null);

  return (
    <>
      {/* Background grid stays behind Three.js */}
      <div className="backdrop" aria-hidden="true" />

      {/* Stickers sit above Three.js */}
      <div className="collage-layer">
        {COLLAGE_ITEMS.map((item, index) => (
          <div
            key={index}
            className="collage-sticker-wrapper"
            style={{
              left: `${item.x}%`,
              top: `${item.y}%`,
            }}
          >
            <img
              className="collage-sticker"
              src={item.image}
              alt=""
              onClick={(event) => {
                event.stopPropagation();

                setActiveSticker((current) =>
                  current === index ? null : index
                );
              }}
              style={{
                width: `${item.size}px`,
                transform: `translate(-50%, -50%) rotate(${item.rotate}deg)`,
              }}
            />

            {activeSticker === index && (
              <div className="sticker-popup">
                {item.description}
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}