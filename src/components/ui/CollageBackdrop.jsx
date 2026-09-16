import { useState } from "react";
import { COLLAGE_ITEMS } from "../../data/collage";

export default function CollageBackdrop() {
  const [activeSticker, setActiveSticker] = useState(null);
  const [messageIndexes, setMessageIndexes] = useState({});

  const handleStickerClick = (event, item, index) => {
    event.stopPropagation();

    const messages = Array.isArray(item.description)
      ? item.description
      : [item.description];

    // First click on a different sticker
    if (activeSticker !== index) {
      setActiveSticker(index);

      setMessageIndexes((current) => ({
        ...current,
        [index]: 0,
      }));

      return;
    }

    // Clicking the same sticker again cycles its messages
    setMessageIndexes((current) => ({
      ...current,
      [index]: ((current[index] ?? 0) + 1) % messages.length,
    }));
  };

  return (
    <>
      {/* Background grid stays behind Three.js */}
      <div className="backdrop" aria-hidden="true" />

      {/* Stickers sit above Three.js */}
      <div className="collage-layer">
        {COLLAGE_ITEMS.map((item, index) => {
          const messages = Array.isArray(item.description)
            ? item.description
            : [item.description];

          const messageIndex = messageIndexes[index] ?? 0;

          return (
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
                onClick={(event) =>
                  handleStickerClick(event, item, index)
                }
                style={{
                  width: `${item.size}px`,
                  transform: `translate(-50%, -50%) rotate(${item.rotate}deg)`,
                }}
              />

              {activeSticker === index && (
                <div className="sticker-popup">
                  {messages[messageIndex]}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}