import { useRef, useState } from "react";
import { Html, useTexture } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

const STICKERS = [
  {
    src: "/images/stickers/arthur-morgan.png",
    position: [-3.2, 1.8, -1],
    mobilePosition: [-1.2, 2.5, -1],
    rotation: [0, 0, -0.25],
    size: 1.2,
    mobileSize: 0.6,
    message: [
      "Arthur Morgan is filling in for me",
      "Photo of me coming eventually",
    ],
  },
  {
    src: "/images/stickers/graduation-cap.png",
    position: [3.4, 1.3, -1],
    mobilePosition: [1.2, 2.5, -1],
    rotation: [0, 0, 0],
    size: 1.3,
    mobileSize: 0.9,
    message: [
      "MSc Game Development (Programming) at Kingston University",
      "BSc Game Design at Leeds Beckett University",
    ],
    tip: true,
  },
  {
    src: "/images/stickers/bolt.png",
    position: [3.5, -1.8, -1],
    mobilePosition: [1.2, -2.5, -1],
    rotation: [0, 0, 0.15],
    size: 1.5,
    mobileSize: 1,
    squish: true,
  },
];

function Sticker({
  src,
  position,
  mobilePosition,
  rotation = [0, 0, 0],
  size = 1,
  mobileSize,
  message,
  open,
  onClick,
  squish = false,
  tip = false,
}) {
  const meshRef = useRef();
  const squishTime = useRef(0);
  const isSquishing = useRef(false);
  const tipTime = useRef(0);
  const isTipping = useRef(false);

  const [hearts, setHearts] = useState([]);
  const [messageIndex, setMessageIndex] = useState(0);

  const messages = Array.isArray(message) ? message : [message];

  const currentMessage = messages[messageIndex];

  const texture = useTexture(src);
  const { size: screenSize } = useThree();

  const isMobile = screenSize.width < 768;

  texture.colorSpace = THREE.SRGBColorSpace;

  const image = texture.image;
  const aspect = image.width / image.height;

  const interactive = Boolean(message) || squish || tip;

  const currentPosition =
    isMobile && mobilePosition ? mobilePosition : position;

  const currentSize = isMobile && mobileSize ? mobileSize : size;

  const baseScaleX = currentSize * aspect;
  const baseScaleY = currentSize;

  const handleClick = (event) => {
    event.stopPropagation();

    if (tip) {
      tipTime.current = 0;
      isTipping.current = true;
    }

    if (squish) {
      squishTime.current = 0;
      isSquishing.current = true;

      // Spawn hearts
      const burstId = `${Date.now()}-${Math.random()}`;

      const newHearts = Array.from({ length: 3 }, (_, index) => ({
        id: `${burstId}-${index}`,
        x: (Math.random() - 0.5) * 0.8,
        delay: Math.random() * 0.12,
        size: 14 + Math.random() * 10,
      }));

      // Keep existing hearts so repeated squishes stack naturally
      setHearts((current) => [...current, ...newHearts]);
    }

    if (message && open) {
      setMessageIndex((current) => (current + 1) % messages.length);
    }

    // Always tell the parent this sticker was clicked
    onClick();
  };

  useFrame((_, delta) => {
    if (!meshRef.current) return;

    if (isSquishing.current) {
      squishTime.current += delta;

      const t = squishTime.current;

      let scaleX = 1;
      let scaleY = 1;

      // Gentle squish
      if (t < 0.12) {
        const progress = t / 0.12;

        scaleX = THREE.MathUtils.lerp(1, 1.08, progress);
        scaleY = THREE.MathUtils.lerp(1, 0.92, progress);
      }

      // Gentle rebound
      else if (t < 0.24) {
        const progress = (t - 0.12) / 0.12;

        scaleX = THREE.MathUtils.lerp(1.08, 0.96, progress);
        scaleY = THREE.MathUtils.lerp(0.92, 1.06, progress);
      }

      // Return to normal
      else if (t < 0.4) {
        const progress = (t - 0.24) / 0.16;

        scaleX = THREE.MathUtils.lerp(0.96, 1, progress);
        scaleY = THREE.MathUtils.lerp(1.06, 1, progress);
      }

      // Finished
      else {
        scaleX = 1;
        scaleY = 1;

        isSquishing.current = false;
      }

      meshRef.current.scale.set(baseScaleX * scaleX, baseScaleY * scaleY, 1);
    }
    if (isTipping.current) {
      tipTime.current += delta;

      const t = tipTime.current;
      const baseRotation = rotation[2] ?? 0;

      let tipOffset = 0;
      let dipOffset = 0;

      if (t < 0.3) {
        // Tip and dip
        const progress = t / 0.3;

        tipOffset = THREE.MathUtils.lerp(0, -0.35, progress);
        dipOffset = THREE.MathUtils.lerp(0, -0.12, progress);
      } else if (t < 0.6) {
        // Swing back
        const progress = (t - 0.3) / 0.3;

        tipOffset = THREE.MathUtils.lerp(-0.35, 0.08, progress);
        dipOffset = THREE.MathUtils.lerp(-0.12, -0.03, progress);
      } else if (t < 0.9) {
        // Settle
        const progress = (t - 0.6) / 0.3;

        tipOffset = THREE.MathUtils.lerp(0.08, 0, progress);
        dipOffset = THREE.MathUtils.lerp(-0.03, 0, progress);
      } else {
        tipOffset = 0;
        dipOffset = 0;
        isTipping.current = false;
      }

      meshRef.current.rotation.z = baseRotation + tipOffset;
      meshRef.current.position.y = dipOffset;
    }
  });

  return (
    <group position={currentPosition}>
      <mesh
        ref={meshRef}
        rotation={rotation}
        scale={[baseScaleX, baseScaleY, 1]}
        onClick={interactive ? handleClick : undefined}
        onPointerEnter={
          interactive
            ? (event) => {
                event.stopPropagation();
                event.nativeEvent.target.style.cursor = "pointer";
              }
            : undefined
        }
        onPointerLeave={
          interactive
            ? (event) => {
                event.nativeEvent.target.style.cursor = "default";
              }
            : undefined
        }
      >
        <planeGeometry args={[1, 1]} />

        <meshBasicMaterial
          map={texture}
          transparent
          alphaTest={0.01}
          side={THREE.DoubleSide}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      {/* Hearts */}
      {squish &&
        hearts.map((heart) => (
          <Html
            key={heart.id}
            position={[heart.x, currentSize * 0.4, 0.2]}
            center
            distanceFactor={8}
            style={{
              pointerEvents: "none",
            }}
          >
            <span
              className="bolt-heart"
              style={{
                fontSize: `${heart.size}px`,
                animationDelay: `${heart.delay}s`,
              }}
              onAnimationEnd={() => {
                setHearts((current) =>
                  current.filter((item) => item.id !== heart.id),
                );
              }}
            >
              &#10084;
            </span>
          </Html>
        ))}

      {message && open && (
        <Html
          position={[0, currentSize / 2, 0.1]}
          center
          distanceFactor={8}
          style={{ pointerEvents: "none" }}
        >
          <div className="scene-sticker-popup">{currentMessage}</div>
        </Html>
      )}
    </group>
  );
}

/* -------------------- */
/* Tennis animation     */
/* -------------------- */

function TennisStickers({ onClick }) {
  const racketRef = useRef();
  const ballRef = useRef();

  const { size: screenSize } = useThree();
  const isMobile = screenSize.width < 768;

  const [animation, setAnimation] = useState("idle");

  const animationTime = useRef(0);

  const racketPosition = isMobile ? [-1.2, -2.5, -1] : [-3.2, -2, -1];

  const ballStartPosition = isMobile ? [-1, -2.3, -0.9] : [-2.8, -1.6, -1];

  const racketSize = isMobile ? 0.8 : 1.5;
  const ballSize = isMobile ? 0.3 : 0.5;

  const racketTexture = useTexture("/images/stickers/tennis-racket.png");

  const ballTexture = useTexture("/images/stickers/tennis-ball.png");

  racketTexture.colorSpace = THREE.SRGBColorSpace;
  ballTexture.colorSpace = THREE.SRGBColorSpace;

  const racketAspect = racketTexture.image.width / racketTexture.image.height;

  const ballAspect = ballTexture.image.width / ballTexture.image.height;

  const startSwing = (event) => {
    event.stopPropagation();

    onClick?.();

    if (animation !== "idle") return;

    animationTime.current = 0;
    setAnimation("backswing");
  };

  useFrame((_, delta) => {
    if (!racketRef.current || !ballRef.current) return;

    animationTime.current += delta;

    /* Pull racket backwards */
    if (animation === "backswing") {
      racketRef.current.rotation.z = THREE.MathUtils.lerp(
        racketRef.current.rotation.z,
        0.9,
        delta * 8,
      );

      if (animationTime.current > 0.25) {
        animationTime.current = 0;
        setAnimation("swing");
      }
    }

    /* Swing racket forwards */
    if (animation === "swing") {
      racketRef.current.rotation.z = THREE.MathUtils.lerp(
        racketRef.current.rotation.z,
        -0.3,
        delta * 18,
      );

      if (animationTime.current > 0.18) {
        animationTime.current = 0;
        setAnimation("hit");
      }
    }

    /* Ball flies away */
    if (animation === "hit") {
      ballRef.current.position.x += delta * 7;
      ballRef.current.position.y += delta * 2;

      racketRef.current.rotation.z = THREE.MathUtils.lerp(
        racketRef.current.rotation.z,
        -0.2,
        delta * 5,
      );

      if (animationTime.current > 2) {
        animationTime.current = 0;

        ballRef.current.position.set(...ballStartPosition);

        setAnimation("idle");
      }
    }
  });

  return (
    <>
      {/* Racket */}
      <mesh
        ref={racketRef}
        position={racketPosition}
        rotation={[0, 0, -0.2]}
        scale={[racketSize * racketAspect, racketSize, 1]}
        onClick={startSwing}
        onPointerEnter={(event) => {
          event.stopPropagation();
          event.nativeEvent.target.style.cursor = "pointer";
        }}
        onPointerLeave={(event) => {
          event.nativeEvent.target.style.cursor = "default";
        }}
      >
        <planeGeometry args={[1, 1]} />

        <meshBasicMaterial
          map={racketTexture}
          transparent
          alphaTest={0.01}
          side={THREE.DoubleSide}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      {/* Ball */}
      <mesh
        ref={ballRef}
        position={ballStartPosition}
        scale={[ballSize * ballAspect, ballSize, 1]}
      >
        <planeGeometry args={[1, 1]} />

        <meshBasicMaterial
          map={ballTexture}
          transparent
          alphaTest={0.01}
          side={THREE.DoubleSide}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </>
  );
}

export default function SceneStickers() {
  const [activeSticker, setActiveSticker] = useState(null);

  const handleStickerClick = (index) => {
    setActiveSticker(STICKERS[index].message ? index : null);
  };

  return (
    <group>
      {/* Clicking empty space closes popup */}
      <mesh position={[0, 0, -1.1]} onClick={() => setActiveSticker(null)}>
        <planeGeometry args={[100, 100]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>

      {STICKERS.map((sticker, index) => (
        <Sticker
          key={sticker.src}
          {...sticker}
          open={Boolean(sticker.message) && activeSticker === index}
          onClick={() => handleStickerClick(index)}
        />
      ))}

      <TennisStickers />
    </group>
  );
}
