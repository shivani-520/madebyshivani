import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useTexture, Html, Text, Stars } from "@react-three/drei";
import { useRef, useState, useMemo, useEffect } from "react";
import * as THREE from "three";
import { useCarouselScroll } from "./hooks/useCarouselScroll.js";
import "./components/CardDistortMaterial.js";
import { WORK_ITEMS, ABOUT_ITEMS, CONTACT_ITEMS } from "./data/items.js";

const GAP = 0.5;
const BASE_HEIGHT = 1.6;

function useLayout(items) {
  return useMemo(() => {
    let cursor = 0;

    const centers = items.map(() => {
      const center = cursor + BASE_HEIGHT / 2;
      cursor += BASE_HEIGHT + GAP;
      return center;
    });

    return {
      centers,
      totalHeight: cursor,
    };
  }, [items]);
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const paragraphs = text.split("\n");
  let lines = [];

  paragraphs.forEach((paragraph) => {
    const words = paragraph.trim().split(" ");
    let line = "";

    for (const word of words) {
      const test = line + word + " ";

      if (ctx.measureText(test).width > maxWidth && line) {
        lines.push(line.trim());
        line = word + " ";
      } else {
        line = test;
      }
    }

    if (line.trim()) {
      lines.push(line.trim());
    }

    // add empty line between paragraphs
    lines.push("");
  });

  const startY = y - ((lines.length - 1) * lineHeight) / 2;

  lines.forEach((l, i) => {
    ctx.fillText(l, x, startY + i * lineHeight);
  });
}

function parseHighlightedText(text) {
  return text.split("\n").map((paragraph) => {
    const tokens = [];
    const parts = paragraph.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);

    parts.forEach((part) => {
      const isHighlight = part.startsWith("**") && part.endsWith("**");
      const clean = isHighlight ? part.slice(2, -2) : part;

      clean
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .forEach((word) => tokens.push({ word, highlight: isHighlight }));
    });

    return tokens;
  });
}

function wrapTextHighlighted(
  ctx,
  text,
  x,
  y,
  maxWidth,
  lineHeight,
  { normalFont, highlightFont, normalColor, highlightColor },
) {
  const paragraphs = parseHighlightedText(text);

  ctx.font = normalFont;
  const spaceWidth = ctx.measureText(" ").width;

  const lines = [];

  paragraphs.forEach((tokens) => {
    let currentLine = [];
    let currentWidth = 0;

    tokens.forEach((t) => {
      ctx.font = t.highlight ? highlightFont : normalFont;
      const wWidth = ctx.measureText(t.word).width;
      const addWidth = currentLine.length ? spaceWidth + wWidth : wWidth;

      if (currentWidth + addWidth > maxWidth && currentLine.length) {
        lines.push({ tokens: currentLine, width: currentWidth });
        currentLine = [{ ...t, width: wWidth }];
        currentWidth = wWidth;
      } else {
        currentLine.push({ ...t, width: wWidth });
        currentWidth += addWidth;
      }
    });

    if (currentLine.length)
      lines.push({ tokens: currentLine, width: currentWidth });
    lines.push({ tokens: [], width: 0 }); // paragraph gap
  });

  while (lines.length && lines[lines.length - 1].tokens.length === 0)
    lines.pop();

  const startY = y - ((lines.length - 1) * lineHeight) / 2;
  const prevAlign = ctx.textAlign;
  ctx.textAlign = "left";

  lines.forEach((line, i) => {
    const lineY = startY + i * lineHeight;
    let curX = x - line.width / 2;

    line.tokens.forEach((t) => {
      ctx.font = t.highlight ? highlightFont : normalFont;
      ctx.fillStyle = t.highlight ? highlightColor : normalColor;
      ctx.fillText(t.word, curX, lineY);
      curX += t.width + spaceWidth;
    });
  });

  ctx.textAlign = prevAlign;
}

function useCardBackTexture(
  title,
  description,
  stack,
  width = 1024,
  height = 614,
) {
  const [texture, setTexture] = useState(null);

  useEffect(() => {
    let cancelled = false;

    // wait for the web font to actually be ready before drawing,
    // otherwise the first paint falls back to a system font
    document.fonts.load("600 40px 'Space Grotesk'").then(() => {
      document.fonts.load("300 26px 'Space Grotesk'").then(() => {
        if (cancelled) return;

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");

        // background
        const grad = ctx.createRadialGradient(
          width / 2,
          0,
          0,
          width / 2,
          0,
          width * 0.6,
        );
        grad.addColorStop(0, "rgba(139,92,246,0.5)");
        grad.addColorStop(1, "#1a1620");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);

        ctx.strokeStyle = "rgba(139,92,246,0.35)";
        ctx.lineWidth = 3;
        ctx.strokeRect(1.5, 1.5, width - 3, height - 3);

        // accent line
        ctx.fillStyle = "#8b5cf6";
        ctx.fillRect(width / 2 - 40, 50, 80, 4);

        ctx.textAlign = "center";

        // title
        ctx.fillStyle = "#f4f2f8";
        ctx.font = "600 40px 'Space Grotesk', sans-serif";
        ctx.fillText(title.toUpperCase(), width / 2, 165);

        // description
        if (description) {
          ctx.fillStyle = "rgba(244,242,248,0.62)";
          ctx.font = "300 26px 'Space Grotesk', sans-serif";
          wrapText(
            ctx,
            description,
            width / 2,
            height / 2 + 20,
            width * 0.75,
            36,
          );
        }

        // stack tags (simple centered row)
        if (stack?.length) {
          ctx.font = "600 20px 'Space Grotesk', sans-serif";
          const padX = 22;
          const gap = 16;
          const tagH = 44;
          const widths = stack.map(
            (t) => ctx.measureText(t.toUpperCase()).width + padX * 2,
          );
          const totalW =
            widths.reduce((a, b) => a + b, 0) + gap * (stack.length - 1);
          let x = width / 2 - totalW / 2;
          const y = height - 90;

          stack.forEach((t, i) => {
            const w = widths[i];
            ctx.strokeStyle = "rgba(139,92,246,0.5)";
            ctx.fillStyle = "rgba(139,92,246,0.1)";
            ctx.beginPath();
            ctx.roundRect(x, y, w, tagH, tagH / 2);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = "#c4b5fd";
            ctx.textAlign = "center";
            ctx.fillText(t.toUpperCase(), x + w / 2, y + tagH / 2 + 7);

            x += w + gap;
          });
        }

        const tex = new THREE.CanvasTexture(canvas);
        tex.anisotropy = 8;
        tex.needsUpdate = true;
        setTexture(tex);
      });
    });

    return () => {
      cancelled = true;
    };
  }, [title, description, stack, width, height]);

  return texture;
}

function useTextTexture(
  text,
  { width = 1024, height = 350, fontSize = 45 } = {},
) {
  const [texture, setTexture] = useState(null);

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      document.fonts.load(`700 ${fontSize}px 'Space Grotesk'`),
      document.fonts.load(`700 ${fontSize}px 'Space Grotesk'`), // highlight font, same weight here
    ]).then(() => {
      if (cancelled) return;

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");

      ctx.textAlign = "center";

      wrapTextHighlighted(
        ctx,
        text,
        width / 2,
        height / 2,
        width * 0.9,
        fontSize * 1.3,
        {
          normalFont: `700 ${fontSize}px 'Space Grotesk', sans-serif`,
          highlightFont: `700 ${fontSize}px 'Space Grotesk', sans-serif`,
          normalColor: "rgba(244,242,248,0.68)",
          highlightColor: "#c4b5fd",
        },
      );

      const tex = new THREE.CanvasTexture(canvas);
      tex.anisotropy = 8;
      tex.needsUpdate = true;
      setTexture(tex);
    });

    return () => {
      cancelled = true;
    };
  }, [text, width, height, fontSize]);

  return texture;
}

function Card({
  index,
  baseCenter,
  totalHeight,
  scrollOffset,
  scrollDistortion,
  selectedIndex,
  image,
  texture,
  title,
  description,
  onClick,
  item,
}) {
  const aspect = useMemo(() => {
    const img = texture?.image;
    if (!img) return 1;
    return img.width / img.height;
  }, [texture]);

  // const planeWidth = BASE_HEIGHT * aspect;
  // const planeHeight = BASE_HEIGHT;

  const backTexture = useCardBackTexture(title, description, item.stack);

  const planeWidth = 2.5;
  const planeHeight = 1.5;

  const frontRef = useRef();
  const backRef = useRef();
  const meshRef = useRef();
  const groupRef = useRef();
  const [hovered, setHovered] = useState(false);
  const [isSelectedState, setIsSelectedState] = useState(false); // mirrors ref for Html visibility
  const tilt = useRef({ x: 0, y: 0 });
  const [flipped, setFlipped] = useState(false);

  const hintPos = useRef(new THREE.Vector3(0, -planeHeight / 2 - 0.15, 0.05));
  const hintGroupRef = useRef();
  const defaultHintPos = useMemo(
    () => new THREE.Vector3(0, -planeHeight / 2 - 0.15, 0.05),
    [planeHeight],
  );

  const frontMatRef = useRef();
  const backMatRef = useRef();
  const hoverUvRef = useRef(new THREE.Vector2(0.5, 0.5));
  const hoverStrengthRef = useRef(0);
  const dimRef = useRef(1);

  useFrame((state, delta) => {
    if (!groupRef.current) return;

    let y = baseCenter - scrollOffset.current;

    y =
      ((((y + totalHeight / 2) % totalHeight) + totalHeight) % totalHeight) -
      totalHeight / 2;

    groupRef.current.position.y = -y;

    const distFromCenter = Math.abs(y);
    const fade = THREE.MathUtils.clamp(1 - (distFromCenter - 3) / 3, 0, 1);
    const isSelected = index === selectedIndex.current;

    // NEW: ease opacity down for unselected cards
    const targetDim = isSelected ? 1 : 0.35; // tweak 0.35 to taste
    dimRef.current = THREE.MathUtils.lerp(dimRef.current, targetDim, 0.08);
    const opacity = fade * dimRef.current;

    if (frontMatRef.current) {
      frontMatRef.current.uOpacity = opacity;
      frontMatRef.current.uTime = state.clock.elapsedTime;
    }
    if (backMatRef.current) {
      backMatRef.current.uOpacity = opacity;
      backMatRef.current.uTime = state.clock.elapsedTime;
    }

    // ease the hover strength in/out
    const targetStrength = hovered && isSelected ? 1 : 0;
    hoverStrengthRef.current = THREE.MathUtils.lerp(
      hoverStrengthRef.current,
      targetStrength,
      0.12,
    );
    if (frontMatRef.current) {
      frontMatRef.current.uHoverStrength = hoverStrengthRef.current;
      frontMatRef.current.uHoverUv = frontHoverUvRef.current;
    }
    if (backMatRef.current) {
      backMatRef.current.uHoverStrength = hoverStrengthRef.current;
      backMatRef.current.uHoverUv = backHoverUvRef.current;
    }

    const EASE = 0.08;

    if (isSelected !== isSelectedState) setIsSelectedState(isSelected);
    if (!isSelected && flipped && !hovered) setFlipped(false);

    // no idle wobble, no hover tilt — cards stay flat/straight always
    groupRef.current.rotation.x = THREE.MathUtils.lerp(
      groupRef.current.rotation.x,
      0,
      EASE,
    );
    groupRef.current.rotation.z = THREE.MathUtils.lerp(
      groupRef.current.rotation.z,
      0,
      EASE,
    );

    let targetScale = isSelected ? 1.7 : 1;
    if (hovered && isSelected) targetScale = 1.5;
    groupRef.current.scale.x = THREE.MathUtils.lerp(
      groupRef.current.scale.x,
      targetScale,
      EASE,
    );
    groupRef.current.scale.y = THREE.MathUtils.lerp(
      groupRef.current.scale.y,
      targetScale,
      EASE,
    );

    const targetFlipY = flipped ? Math.PI : 0;

    groupRef.current.rotation.y = THREE.MathUtils.damp(
      groupRef.current.rotation.y,
      targetFlipY + (hovered && isSelected ? tilt.current.x * 0.2 : 0),
      8,
      delta,
    );

    let targetZ = isSelected ? 1 : 0;
    if (hovered && isSelected) targetZ += 0.8;
    groupRef.current.position.z = THREE.MathUtils.lerp(
      groupRef.current.position.z,
      targetZ,
      EASE,
    );

    if (hintGroupRef.current) {
      const target = hovered && isSelected ? hintPos.current : defaultHintPos;
      hintGroupRef.current.position.lerp(target, 0.25);
    }

    if (hovered && !isSelected) setHovered(false);
  });

  const frontHoverUvRef = useRef(new THREE.Vector2(0.5, 0.5));
  const backHoverUvRef = useRef(new THREE.Vector2(0.5, 0.5));

  const handlePointerMove = (e) => {
    if (index !== selectedIndex.current) return;
    tilt.current.x = (e.uv.x - 0.5) * 2;
    tilt.current.y = (e.uv.y - 0.5) * 2;

    // e.eventObject tells us which mesh's event handler fired
    if (e.eventObject === backRef.current) {
      backHoverUvRef.current.set(e.uv.x, e.uv.y);
    } else {
      frontHoverUvRef.current.set(e.uv.x, e.uv.y);
    }

    if (groupRef.current) {
      const localPoint = groupRef.current.worldToLocal(e.point.clone());
      hintPos.current.set(localPoint.x, localPoint.y, 0.05);
    }
  };

  const handlePointerOver = () => {
    document.body.style.cursor = "pointer";
    if (index !== selectedIndex.current) return;
    setHovered(true);
  };

  const handlePointerOut = () => {
    document.body.style.cursor = "auto";
    setHovered(false);
  };

  const handleCardClick = (e) => {
    e.stopPropagation();

    if (index !== selectedIndex.current) {
      onClick(); // select it, as before
      return;
    }
    setFlipped((prev) => !prev);
  };

  return (
    <group ref={groupRef}>
      {/* FRONT */}
      <mesh
        ref={frontRef}
        onPointerMove={handlePointerMove}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        onClick={handleCardClick}
      >
        <planeGeometry args={[planeWidth, planeHeight, 32, 32]} />
        <cardDistortMaterial
          ref={frontMatRef}
          uTexture={texture}
          transparent
          toneMapped={false}
          side={THREE.FrontSide}
        />
      </mesh>

      {/* BACK */}
      <mesh
        ref={backRef}
        position={[0, 0, -0.01]}
        rotation={[0, Math.PI, 0]}
        onPointerMove={handlePointerMove}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        onClick={handleCardClick}
      >
        <planeGeometry args={[planeWidth, planeHeight, 32, 32]} />
        <cardDistortMaterial
          ref={backMatRef}
          uTexture={backTexture}
          uUseTexture={!!backTexture}
          transparent
          toneMapped={false}
          side={THREE.FrontSide}
        />
      </mesh>

      {/* TITLE TEXT */}
      {isSelectedState && !flipped && (
        <Html
          key={title}
          position={[0, planeHeight / 2 + 0.1, 0]}
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

      {/* FLIP HINT BUTTON */}
      {isSelectedState && (
        <group ref={hintGroupRef} position={defaultHintPos}>
          <Html
            center
            distanceFactor={8}
            style={{ pointerEvents: "none", zIndex: 999999 }}
          >
            <div className={`flip-hint${hovered ? " flip-hint-visible" : ""}`}>
              <span>Flip</span>
            </div>
          </Html>
        </group>
      )}

      {/* VIEW BUTTON */}
      {isSelectedState && item.link && (
        <Html
          position={[0, -planeHeight / 2 - 0.15, 0]}
          center
          distanceFactor={8}
          style={{ pointerEvents: "auto" }}
        >
          <button
            className="card-view-btn"
            onClick={(e) => {
              e.stopPropagation();
              window.open(item.link, "_blank", "noopener,noreferrer");
            }}
          >
            View
          </button>
        </Html>
      )}
    </group>
  );
}

function Carousel({ items }) {
  const textures = useTexture(items.map((i) => i.image));

  const ready = textures?.every((t) => t?.image);

  const { centers, totalHeight } = useLayout(
    ready ? items : [],
    ready ? textures : [],
  );

  if (!ready) return null; // or a loader

  const { scrollOffset, scrollDistortion, selectedIndex, selectCard, reset } =
    useCarouselScroll(centers, totalHeight);

  useEffect(() => {
    reset?.();
  }, [items, reset]);

  return (
    <group>
      {items.map((item, i) => (
        <Card
          key={item.title} // also important (see below)
          index={i}
          baseCenter={centers[i]}
          totalHeight={totalHeight}
          scrollOffset={scrollOffset}
          selectedIndex={selectedIndex}
          image={item.image}
          texture={textures[i]}
          title={item.title}
          description={item.description}
          onClick={() => selectCard(i)}
          item={item}
          scrollDistortion={scrollDistortion}
        />
      ))}
    </group>
  );
}

function AboutCard({
  index,
  baseCenter,
  totalHeight,
  scrollOffset,
  selectedIndex,
  description,
  onClick,
}) {
  const planeWidth = 2.5;
  const planeHeight = 1.5;

  const texture = useTextTexture(description, {
    width: 1024,
    height: 614,
    fontSize: 42,
  });

  const groupRef = useRef();
  const matRef = useRef();
  const [hovered, setHovered] = useState(false);
  const hoverUvRef = useRef(new THREE.Vector2(0.5, 0.5));
  const hoverStrengthRef = useRef(0);
  const dimRef = useRef(1);

  useFrame((state) => {
    if (!groupRef.current) return;

    let y = baseCenter - scrollOffset.current;
    y =
      ((((y + totalHeight / 2) % totalHeight) + totalHeight) % totalHeight) -
      totalHeight / 2;

    groupRef.current.position.y = -y;

    const distFromCenter = Math.abs(y);
    const fade = THREE.MathUtils.clamp(1 - (distFromCenter - 3) / 3, 0, 1);
    const isSelected = index === selectedIndex.current;

    const targetDim = isSelected ? 1 : 0.35;
    dimRef.current = THREE.MathUtils.lerp(dimRef.current, targetDim, 0.08);
    const opacity = fade * dimRef.current;

    if (matRef.current) {
      matRef.current.uOpacity = opacity;
      matRef.current.uTime = state.clock.elapsedTime;

      const targetStrength = hovered && isSelected ? 1 : 0;
      hoverStrengthRef.current = THREE.MathUtils.lerp(
        hoverStrengthRef.current,
        targetStrength,
        0.12,
      );
      matRef.current.uHoverStrength = hoverStrengthRef.current;
      matRef.current.uHoverUv = hoverUvRef.current;
    }

    const EASE = 0.08;
    let targetScale = isSelected ? 1.7 : 1;
    if (hovered && isSelected) targetScale = 1.5;
    groupRef.current.scale.x = THREE.MathUtils.lerp(
      groupRef.current.scale.x,
      targetScale,
      EASE,
    );
    groupRef.current.scale.y = THREE.MathUtils.lerp(
      groupRef.current.scale.y,
      targetScale,
      EASE,
    );

    let targetZ = isSelected ? 1 : 0;
    if (hovered && isSelected) targetZ += 0.8;
    groupRef.current.position.z = THREE.MathUtils.lerp(
      groupRef.current.position.z,
      targetZ,
      EASE,
    );

    if (hovered && !isSelected) setHovered(false);
  });

  const handlePointerMove = (e) => {
    if (index !== selectedIndex.current) return;
    hoverUvRef.current.set(e.uv.x, e.uv.y);
  };

  const handlePointerOver = () => {
    document.body.style.cursor = "pointer";
    if (index !== selectedIndex.current) return;
    setHovered(true);
  };

  const handlePointerOut = () => {
    document.body.style.cursor = "auto";
    setHovered(false);
  };

  const handleClick = (e) => {
    e.stopPropagation();
    if (index !== selectedIndex.current) onClick();
  };

  return (
    <group ref={groupRef}>
      <mesh
        onPointerMove={handlePointerMove}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        onClick={handleClick}
      >
        <planeGeometry args={[planeWidth, planeHeight, 32, 32]} />
        <cardDistortMaterial
          ref={matRef}
          uTexture={texture}
          uUseTexture={!!texture}
          transparent
          toneMapped={false}
          side={THREE.FrontSide}
        />
      </mesh>
    </group>
  );
}

function AboutCarousel({ items }) {
  const { centers, totalHeight } = useLayout(items);

  const { scrollOffset, selectedIndex, selectCard, reset } = useCarouselScroll(
    centers,
    totalHeight,
  );

  useEffect(() => {
    reset?.();
  }, [items, reset]);

  return (
    <group>
      {items.map((item, i) => (
        <AboutCard
          key={i}
          index={i}
          baseCenter={centers[i]}
          totalHeight={totalHeight}
          scrollOffset={scrollOffset}
          selectedIndex={selectedIndex}
          description={item.description}
          onClick={() => selectCard(i)}
        />
      ))}
    </group>
  );
}

function Nav({ setSection }) {
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
        </ul>
      </div>
    </nav>
  );
}
function Hero() {
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
function Footer() {
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
        }).format(new Date()),
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <footer className="footer">
      <span className="footer-left">UK — {time}</span>

      <div className="footer-right">
        <a
          href="https://www.linkedin.com/in/shivani-devi-sharma"
          target="_blank"
          rel="noopener noreferrer"
          style={{ textDecoration: "underline" }}
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

function AnimatedStars() {
  const ref = useRef();

  useFrame((_, delta) => {
    ref.current.position.z += delta * 2;

    if (ref.current.position.z > 20) {
      ref.current.position.z = 0;
    }
  });

  return (
    <group ref={ref}>
      <Stars radius={50} depth={100} count={1000} factor={4} fade />
    </group>
  );
}

export default function App() {
  const [section, setSection] = useState("work");

  return (
    <div className="app">
      <Nav setSection={setSection} />
      <Footer />

      <Canvas camera={{ position: [0, 0, 6], fov: 45 }}>
        <AnimatedStars />
        {section === "work" && <Carousel items={WORK_ITEMS} />}
        {section === "about" && <AboutCarousel items={ABOUT_ITEMS} />}
      </Canvas>

      <div className="vignette-overlay" />
    </div>
  );
}
