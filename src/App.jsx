import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useTexture, Html, Text } from "@react-three/drei";
import { useRef, useState, useMemo, useEffect } from "react";
import * as THREE from "three";
import { useCarouselScroll } from "./hooks/useCarouselScroll.js";

const GAP = 2;

const WORK_ITEMS = [
  {
    title: "TG Jones Virtual Store",
    description: "A virtual retail experience built in 3D with interactive product browsing.",
    image: "/images/artwork/Christmas_2019_CGI_001.jpg",
    width: 2.4,
    height: 1.5,
    stack: ["Three.js", "JavaScript", "WebGL"]
  },
  {
    title: "Iceland Fridge",
    description: "Concept visualization exploring domestic isolation and cold minimalism.",
    image: "/images/artwork/Dark_Bedroom_001.jpg",
    width: 1.6,
    height: 1.8,
    stack: ["Three.js", "Blender", "JavaScript"]
  },
  { 
    title: "3D Pivotal CGI Website", 
    description: "Concept visualization exploring domestic isolation and cold minimalism.",
    image: "/images/artwork/Modern_Apartment_Bedroom_001.jpg", 
    width: 3.0, 
    height: 1.5 ,
    stack: ["React", "React Three Fibre", "JavaScript"]
  },
  { 
    title: "UAV Search & Rescue Simulation", 
    description: "Multi-Agent Reinforcement Learning for Coordinated UAV Search and Rescue in a Simulated Unity Environment.",
    image: "/images/artwork/Pink_Wall_Bedroom_CGI_004.jpg", 
    width: 1.8, 
    height: 1.8,
    stack: ["Unity", "C#", "Python"]
  },
  { 
    title: "O.M.G!", 
    description: "An asymmetrical, couch co-op platformer based on Greek mythology.",
    image: "/images/artwork/Saxton_Lane_001_2k.jpg", 
    width: 2.2, 
    height: 1.3,
    stack: ["Unity", "C#"]
  },
];

const ABOUT_ITEMS = [
  {
    title: "About Me",
    description: "I’m a creative developer focused on 3D web experiences.",
    image: "/images/me.webp",
    width: 1.5,
    height: 1.5,
    stack: ["React", "Three.js", "Creative Coding"]
  },
];

const CONTACT_ITEMS = [
  {
    title: "Get in Touch",
    description: "Feel free to reach out for collaborations or opportunities.",
    image: "/images/me.webp", // or any placeholder texture
    width: 2.0,
    height: 1.2,
    stack: ["shivani.d.sharma@outlook.com", "linkedin.com/in/shivani-devi-sharma", "github.com/shivani-520"]
  }
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

function Card({ index, baseCenter, totalWidth, scrollOffset, selectedIndex, image, title, description, width, height, onClick, item }) 
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
          color="#222"
          transparent
          opacity={1}
          toneMapped={false}
          side={THREE.DoubleSide}
        />

        {/* BACK TEXT */}
      </mesh>

      {isSelectedState && !flipped && (
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

      {isSelectedState && flipped && (
        <Html
          transform
          position={[0, 0, -0.011]}
          rotation={[0, Math.PI, 0]}
          scale={width / 10}
          style={{ pointerEvents: "none" }}
          pointerEvents="none"
        >
          <div
            className="card-back"
            style={{ width: "320px", height: `${320 * (height / width)}px` }}
          >
            <h3 className="card-back-title">{title}</h3>
            {description && <p className="card-back-description">{description}</p>}
            {item.stack && (
              <div className="card-back-stack">
                {item.stack.map((tech) => (
                  <span key={tech} className="stack-tag">
                    {tech}
                  </span>
                ))}
              </div>
            )}
          </div>
        </Html>
      )}

    </group>
  );
}

function Carousel({ items }) 
{
  const { centers, totalWidth } = useLayout(items);
  const { scrollOffset, selectedIndex, selectCard, reset } =
    useCarouselScroll(centers, totalWidth);

  useEffect(() => {
    reset?.(); // 👈 critical
  }, [items, reset]);

  return (
    <group>
      {items.map((item, i) => (
        <Card
          key={item.title} // also important (see below)
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
          item={item}
        />
      ))}
    </group>
  );
}

function Nav({ setSection }) 
{
  return (
    <nav className="nav">
      <span className="nav-logo">Made By Shivani</span>

      <div className="nav-right">
        <ul className="nav-links">
          <li>
            <a onClick={() => setSection("work")}>Work</a>
          </li>
          <li>
            <a onClick={() => setSection("about")}>About</a>
          </li>
          <li>
            <a onClick={() => setSection("contact")}>Contact</a>
          </li>
        </ul>
      </div>
    </nav>
  );
}
function Hero() 
{
  const words = ["Websites", "3D", "Software", "Games", "AI"];

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
function Footer() 
{
  const [time, setTime] = useState("");

  useEffect(() => {
    const updateTime = () => {
      setTime(
        new Intl.DateTimeFormat("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
          timeZone: "Europe/London",
        }).format(new Date())
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <footer className="footer">
      <span className="footer-left">
        UK — {time}
      </span>

      <div className="footer-right">
        <a
          href="https://www.linkedin.com/in/shivani-devi-sharma"
          target="_blank"
          rel="noopener noreferrer"
        >
          LINKEDIN
        </a>

        <a href="mailto:shivani.d.sharma@outlook.com">
          shivani.d.sharma@outlook.com
        </a>
      </div>
    </footer>
  );
}


export default function App() 
{
  const [section, setSection] = useState("work");

  const getItems = () => {
    switch (section) {
      case "about":
        return ABOUT_ITEMS;
      case "contact":
        return CONTACT_ITEMS;
      case "work":
      default:
        return WORK_ITEMS;
    }
  };

  return (
    <div className="app">
      <Nav setSection={setSection} />
      <Hero />
      <Footer />

      <Canvas camera={{ position: [0, 0, 6], fov: 45 }}>
        <Carousel items={getItems()} />
      </Canvas>
    </div>
  );
}