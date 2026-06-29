import { Canvas } from "@react-three/fiber";
import { useEffect, useState, useCallback } from "react";

import "../index.css";
import GalleryScene from "../components/gallery/GalleryScene.jsx";
import useGalleryNavigation from "../hooks/useGalleryNavigation.js";
import useCameraMouseLook from "../hooks/useCameraMouseLook.js";
import { galleryItems } from "../constants/galleryData.js";
import useIsMobile from "../hooks/useIsMobile.js";
import { Link, useNavigate } from "react-router-dom";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

function CameraRig() {
  useCameraMouseLook({ intensity: 0.04, smoothness: 0.02 });
  return null;
}

export default function Home() 
{
  const isMobile = useIsMobile();
  const [menuOpen, setMenuOpen] = useState(false);
  const [desktopMenuOpen, setDesktopMenuOpen] = useState(false);
  const [scrolledAway, setScrolledAway] = useState(false);
  const navigate = useNavigate();

  const count = galleryItems.length;
  const [selected, setSelected] = useState(0);

  const handleScrolledAway = useCallback((isForward) => {
    if (isForward) setScrolledAway(true);
    else setScrolledAway(false);
  }, []);

  const navigation = useGalleryNavigation({
    count,
    selected,
    setSelected,
    onScrolledAway: handleScrolledAway,
  });

  const progress = `${(selected / (count - 1)) * 100}%`;

  const [isTransitioning, setIsTransitioning] = useState(false);

    const [introDone, setIntroDone] = useState(false);


  useEffect(() => {
    setIsTransitioning(false);
  }, []);

  const handleGalleryClick = (href) => {
    setIsTransitioning(true);

    setTimeout(() => {
      navigate(href);
      setIsTransitioning(false);
    }, 1000);
  };

  return (
    <div className="app">

      <div
        className={`page-fade ${
          isTransitioning ? "page-fade--active" : ""
        }`}
      />

      {/* Header */}
      {isMobile ? (
        <>
          <header className="mobile-header">
            <img
              src="/images/logos/logo.png"
              alt="Logo"
              className="mobile-logo"
            />
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="mobile-hamburger"
            >
              <span className={`hamburger-line ${menuOpen ? "open" : ""}`} />
              <span className={`hamburger-line ${menuOpen ? "open" : ""}`} />
              <span className={`hamburger-line ${menuOpen ? "open" : ""}`} />
            </button>
          </header>

          {menuOpen && (
            <div className="mobile-menu">
              <a href="/work" className="mobile-menu-link">Work</a>
              <a href="#about" className="mobile-menu-link">About</a>
              <a href="#process" className="mobile-menu-link">Process</a>
              <a href="#services" className="mobile-menu-link">Services</a>
              <a href="#contact" className="mobile-menu-link">Contact</a>
            </div>
          )}
        </>
      ) : (
        <header className="header">
          <div className="logo">
            pivotal<span className="logo-dot">.</span>
            <span className="logo-sub">CGI</span>
          </div>

          <div className="desktop-menu-wrapper">
            <nav className={`desktop-nav ${desktopMenuOpen ? "desktop-nav--open" : ""}`}>
              <a href="/work" className="nav-link">Work</a>
              <a href="#about" className="nav-link">About</a>
              <a href="#process" className="nav-link">Process</a>
              <a href="#services" className="nav-link">Services</a>
              <a href="#contact" className="nav-link">Contact</a>
            </nav>

            <button
              className="desktop-hamburger"
              onClick={() => setDesktopMenuOpen(!desktopMenuOpen)}
            >
              <span className={`hamburger-line ${desktopMenuOpen ? "open" : ""}`} />
              <span className={`hamburger-line ${desktopMenuOpen ? "open" : ""}`} />
              <span className={`hamburger-line ${desktopMenuOpen ? "open" : ""}`} />
            </button>
          </div>
        </header>
      )}

      {!isMobile && <div className="vertical-line" />}

      {/* Side Content */}
      {isMobile ? (
        <div className="mobile-side-content">
          <h1 className="mobile-heading">
            Visuals
            <br />
            That Drive
            <br />
            <span className="gold-text">Impact.</span>
          </h1>
        </div>
      ) : (
        <div className={`side-content ${scrolledAway ? "side-content--hidden" : ""}`}>
          <div className="side-logo">
            <img
              src="/images/logos/logo.png"
              alt="Logo"
              className="logo-image"
            />
          </div>

          <h1 className="side-heading">
            Visuals
            <br />
            That Drive
            <br />
            <span className="gold-text-underline">
              Impact.
              <span className="underline" />
            </span>
          </h1>
        </div>
      )}

      {/* Bottom Bar */}
      {isMobile ? (
        <div className="mobile-bottom-bar">
          <div className="mobile-progress-line">
            <div className="mobile-progress-dot" style={{ left: progress }} />
          </div>
          <span className="mobile-bottom-text">Swipe To Explore</span>
        </div>
      ) : (
        <div className="bottom-bar">
          <span className="bottom-text">DRAG / SCROLL TO EXPLORE</span>
          <div className="progress-line">
            <div className="progress-dot" style={{ left: progress }} />
          </div>
        </div>
      )}

      <Canvas
        style={{ touchAction: "none" }}
        camera={{ position: isMobile ? [0, 0, 10] : [1, 0, 10], fov: 45 }}
        onPointerMissed={() => (document.body.style.cursor = "default")}
        {...navigation}
      >
        <CameraRig />
        <GalleryScene
          selected={selected}
          isMobile={isMobile}
          isTransitioning={isTransitioning}
          onNavigate={handleGalleryClick}
        />
      </Canvas>
    </div>
  );
}