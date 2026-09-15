import { COLLAGE_ITEMS } from "../../data/collage";

export default function CollageBackdrop() {
  return (
    <div className="backdrop" aria-hidden="true">
      {COLLAGE_ITEMS.map((item, index) => (
        <img
          key={index}
          className="collage-sticker"
          src={item.image}
          alt=""
          style={{
            left: `${item.x}%`,
            top: `${item.y}%`,
            width: `${item.size}px`,
            transform: `translate(-50%, -50%) rotate(${item.rotate}deg)`,
          }}
        />
      ))}
    </div>
  );
}