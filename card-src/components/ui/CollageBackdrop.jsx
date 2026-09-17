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
                "--sticker-x": `${item.x}%`,
                "--sticker-y": `${item.y}%`,
                "--sticker-size": `${item.size}px`,
                "--sticker-rotation": `${item.rotate}deg`,
                zIndex: activeSticker === index ? 1 : 0,
              }}
            >
              <button
                type="button"
                className="sticker-button"
                aria-label={messages[0]}
                aria-expanded={activeSticker === index}
                onKeyDown={(event) => { if (event.key === "Escape") setActiveSticker(null); }}
                onClick={(event) => handleStickerClick(event, item, index)}
              >
              <img
                className="collage-sticker"
                src={item.image}
                alt=""
                draggable={false}
              />
              </button>

              {activeSticker === index && (
                <div className={`sticker-popup ${item.x > 60 ? "sticker-popup--left" : ""}`} role="status">
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