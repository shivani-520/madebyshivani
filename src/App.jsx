import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useTexture, Html } from "@react-three/drei";
import { useRef, useState, useMemo } from "react";
import * as THREE from "three";
import { useCarouselScroll } from "./hooks/useCarouselScroll.js";

const GAP = 2;

const ITEMS = [
  {
    title: "TG Jones Virtual Store",
    description: "A virtual retail experience built in 3D with interactive product browsing.",
    image: "/images/artwork/Christmas_2019_CGI_001.jpg",
    width: 2.4,
    height: 1.5
  },
  {
    title: "Iceland Fridge",
    description: "Concept visualization exploring domestic isolation and cold minimalism.",
    image: "/images/artwork/Dark_Bedroom_001.jpg",
    width: 1.6,
    height: 2.0
  },
  { title: "3D Pivotal CGI Website", image: "/images/artwork/Modern_Apartment_Bedroom_001.jpg", width: 3.0, height: 1.5 },
  { title: "AI Drones", image: "/images/artwork/Pink_Wall_Bedroom_CGI_004.jpg", width: 1.8, height: 1.8 },
  { title: "O.M.G!", image: "/images/artwork/Saxton_Lane_001_2k.jpg", width: 2.2, height: 1.3 },
];

// precompute each card's center offset and the total track width once,
// so spacing stays visually consistent regardless of card size
function useLayout(items) {
  return useMemo(() => {
    let cursor = 0;
    const centers = items.map((item) => {
      const center = cursor + item.width / 2;
      cursor += item.width + GAP;
      return center;
    });
    const totalWidth = cursor; // includes trailing gap, fine for wrap math
    return { centers, totalWidth };
  }, [items]);
}

function Card({ index, baseCenter, totalWidth, scrollOffset, selectedIndex, image, title, description, width, height, onClick }) 
{
  const frontRef = useRef();
  const backRef = useRef();
  const meshRef = useRef();
  const groupRef = useRef();
  const [hovered, setHovered] = useState(false);
  const [isSelectedState, setIsSelectedState] = useState(false); // mirrors ref for Html visibility
  const tilt = useRef({ x: 0, y: 0 });
  const texture = useTexture(image);
  const [flipped, setFlipped] = useState(false);

  useFrame((state, delta) => {
    if (!groupRef.current) return;

    let x = baseCenter - scrollOffset.current;
    x = ((x + totalWidth / 2) % totalWidth + totalWidth) % totalWidth - totalWidth / 2;
    groupRef.current.position.x = x;

    const distFromCenter = Math.abs(x);
    const fade = THREE.MathUtils.clamp(1 - (distFromCenter - 3) / 3, 0, 1);
    const applyOpacity = (ref, value) => {
      if (ref.current?.material) {
        ref.current.material.opacity = value;
      }
    };

    applyOpacity(frontRef, fade);
    applyOpacity(backRef, fade);

    const EASE = 0.08;

    const isSelected = index === selectedIndex.current;
    if (isSelected !== isSelectedState) setIsSelectedState(isSelected);
    if (!isSelected && flipped && !hovered) setFlipped(false);

    const targetRotX = hovered && isSelected ? tilt.current.y * 0.4 : 0;
    const targetRotY = hovered && isSelected ? tilt.current.x * 0.4 : 0;
    groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, targetRotX, EASE);

    let targetScale = isSelected ? 1.15 : 1;
    if (hovered && isSelected) targetScale = 1.22;
    groupRef.current.scale.x = THREE.MathUtils.lerp(groupRef.current.scale.x, targetScale, EASE);
    groupRef.current.scale.y = THREE.MathUtils.lerp(groupRef.current.scale.y, targetScale, EASE);

    const targetFlipY = flipped ? Math.PI : 0;

    groupRef.current.rotation.y = THREE.MathUtils.damp(
      groupRef.current.rotation.y,
      targetFlipY + (hovered && isSelected ? tilt.current.x * 0.2 : 0),
      8, // higher = faster spin
      delta
    );

    let targetZ = isSelected ? 1 : 0;
    if (hovered && isSelected) targetZ += 0.8;
    groupRef.current.position.z = THREE.MathUtils.lerp(groupRef.current.position.z, targetZ, EASE);

    if (hovered && !isSelected) setHovered(false);
    
  });

  const handlePointerMove = (e) => {
    if (index !== selectedIndex.current) return;
    tilt.current.x = (e.uv.x - 0.5) * 2;
    tilt.current.y = (e.uv.y - 0.5) * 2;
  };

  const handlePointerOver = () => {
    if (index !== selectedIndex.current) return;
    setHovered(true);
  };

  const handlePointerOut = () => {
    setHovered(false);
  };

  const handleDoubleClick = () => {
    if (index !== selectedIndex.current) return;
    setFlipped((prev) => !prev);
  };

  return (
    <group
      ref={groupRef}
      onDoubleClick={handleDoubleClick}
    >
      
      {/* FRONT */}
      <mesh
        ref={frontRef}
        onPointerMove={handlePointerMove}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        onClick={onClick}

      >
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial
          map={texture}
          transparent
          opacity={1}
          toneMapped={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* BACK */}
      <mesh
        ref={backRef}
        position={[0, 0, -0.01]}   // IMPORTANT: same position
        rotation={[0, Math.PI, 0]} // flips the back side properly
        onPointerMove={handlePointerMove}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        onClick={onClick}
        onDoubleClick={handleDoubleClick}
      >
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial
          color="#111"
          transparent
          opacity={1}
          toneMapped={false}
          side={THREE.DoubleSide}
        />

        {/* BACK TEXT */}
      </mesh>

      {flipped && (
        <Html
          center
          distanceFactor={8}
          style={{
            pointerEvents: "none",
            width: `${width * 100}px`,
          }}
        >
          <div className="card-back">
            <h3 className="card-back-title">{title}</h3>
            <p className="card-description">{description}</p>
          </div>
        </Html>
      )}

      {isSelectedState && (
        <Html
          key={title}
          position={[0, height / 2 + 0.1, 0]}
          center
          distanceFactor={8}
          style={{ pointerEvents: "none" }}
        >
          <div className="card-title">
            {title.split("").map((letter, i) => (
              <span
                key={i}
                className="card-letter"
                style={{ animationDelay: `${i * 35}ms` }}
              >
                {letter === " " ? "\u00A0" : letter}
              </span>
            ))}
          </div>
        </Html>
      )}

    </group>
  );
}

function Carousel() 
{
  const { centers, totalWidth } = useLayout(ITEMS);
  const { scrollOffset, selectedIndex, selectCard } = useCarouselScroll(centers, totalWidth);

  return (
    <group>
      {ITEMS.map((item, i) => (
        <Card
          key={i}
          index={i}
          baseCenter={centers[i]}
          totalWidth={totalWidth}
          scrollOffset={scrollOffset}
          selectedIndex={selectedIndex}
          image={item.image}
          title={item.title}
          description={item.description}
          width={item.width}
          height={item.height}
          onClick={() => selectCard(i)}
        />
      ))}
    </group>
  );
}

function Nav() {
  return (
    <nav className="nav">
      <span className="nav-logo">Shivani Sharma</span>
      <div className="nav-right">
        <a href="shivani.d.sharma@outlook.com" className="nav-email">shivani.d.sharma@outlook.com</a>
        <ul className="nav-links">
          <li><a href="#work">Work</a></li>
          <li><a href="#about">About</a></li>
          <li><a href="#contact">Contact</a></li>
        </ul>
      </div>
    </nav>
  );
}
function Hero() 
{
  const words = ["Websites", "Software", "Games", "3D"];

  return (
    <div className="hero">
      <div className="marquee">
        <span className="marquee-track">
          {[...words, ...words].map((word, i) => (
            <span key={i} className="marquee-word">
              {word}
            </span>
          ))}
        </span>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <div className="app">
      <Nav />
      <Hero />
      <Canvas camera={{ position: [0, 0, 6], fov: 45 }}>
        <Carousel />
      </Canvas>
    </div>
  );
}