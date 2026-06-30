import { Canvas } from "@react-three/fiber";
import { useEffect, useState, useCallback } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import "../index.css";
import GalleryScene from "../components/gallery/GalleryScene.jsx";
import useGalleryNavigation from "../hooks/useGalleryNavigation.js";
import useCameraMouseLook from "../hooks/useCameraMouseLook.js";
import { galleryItems } from "../constants/galleryData.js";
import useIsMobile from "../hooks/useIsMobile.js";


function CameraRig() 
{
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

  const [introDone, setIntroDone] = useState(false);

  const [isTransitioning, setIsTransitioning] = useState(false);
  const location = useLocation();

  const handleNavigate = (href) => {
    setIsTransitioning(true);

    setTimeout(() => {
      navigate(href);
    }, 800); // match your CSS fade duration
  };

  useEffect(() => {
    setIsTransitioning(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = "auto";
    };
  }, []);

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
            <Link to="/">
              <img
                src="/images/logos/logo.png"
                className="mobile-logo"
                alt="Pivotal CGI"
              />
            </Link>
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
            <div className="mobile-menu mobile-menu--fixed">
              <Link to="/portfolio" className="mobile-menu-link">Portfolio</Link>
              <Link to="/team" className="mobile-menu-link">Team</Link>
              <Link to="/services" className="mobile-menu-link">Services</Link>
              <Link to="/contact" className="mobile-menu-link">Contact</Link>
            </div>
          )}
        </>
      ) : (
        <header className="header">
          <Link to="/" className="logo">
            pivotal<span className="logo-dot">.</span>
            <span className="logo-sub">CGI</span>
          </Link>

          <div className="desktop-menu-wrapper">
            <nav className={`desktop-nav ${desktopMenuOpen ? "desktop-nav--open" : ""}`}>
              <Link to="/portfolio" className={`nav-link ${location.pathname === '/portfolio' ? 'nav-link--active' : ''}`}>Portfolio</Link>
              <Link to="/team" className={`nav-link ${location.pathname === '/team' ? 'nav-link--active' : ''}`}>Team</Link>
              <Link to="/services" className={`nav-link ${location.pathname === '/services' ? 'nav-link--active' : ''}`}>Services</Link>
              <Link to="/contact" className={`nav-link ${location.pathname === '/contact' ? 'nav-link--active' : ''}`}>Contact</Link>
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

      {!isMobile}

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
          setSelected={setSelected}
          isMobile={isMobile}
          isTransitioning={isTransitioning}
          onNavigate={handleNavigate}
        />
      </Canvas>
    </div>
  );
}