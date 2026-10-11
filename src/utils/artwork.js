import * as THREE from "three";
import { getCardColor } from "../constants/cards";

function canvas(width, height) {
  const image = document.createElement("canvas");
  image.width = width;
  image.height = height;
  return [image, image.getContext("2d")];
}
export function textureFrom(image) {
  const texture = new THREE.CanvasTexture(image);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}
function lines(ctx, text, x, y, width, step) {
  let line = "";
  for (const word of text.split(" ")) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > width && line) {
      ctx.fillText(line, x, y);
      y += step;
      line = word;
    } else line = next;
  }
  ctx.fillText(line, x, y);
  return y + step;
}
// Original vector artwork, generated locally. No network texture dependency.
export function makePackArtwork() {
  const [image, ctx] = canvas(768, 1365);
  const base = ctx.createLinearGradient(0, 0, 768, 1365);
  base.addColorStop(0, "#9faab5");
  base.addColorStop(0.035, "#202c36");
  base.addColorStop(0.25, "#111a24");
  base.addColorStop(0.6, "#263542");
  base.addColorStop(0.92, "#0c151f");
  base.addColorStop(1, "#87949c");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 768, 1365);
  for (let x = 0; x < 768; x += 6) {
    ctx.fillStyle = x % 12 ? "#bbc9c980" : "#07111caa";
    ctx.fillRect(x, 0, 2, 48);
    ctx.fillRect(x, 1315, 2, 50);
  }
  ctx.strokeStyle = "#c9d4d759";
  ctx.lineWidth = 2;
  ctx.strokeRect(24, 68, 720, 1230);
  // Guilloche printing catches the virtual softboxes as the wrapper bends.
  for (let i = 0; i < 76; i++) {
    const angle = i * 0.041;
    ctx.save();
    ctx.translate(384, 690);
    ctx.rotate(angle);
    ctx.strokeStyle = `hsla(${165 + i * 2.3},45%,${45 + (i % 8)}%,.32)`;
    ctx.beginPath();
    ctx.ellipse(0, 0, 180 + i * 0.7, 310 - i * 1.4, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
  ctx.textAlign = "center";
  ctx.fillStyle = "#e8efed";
  ctx.font = "20px monospace";
  ctx.fillText("M A D E B Y S H I V A N I", 384, 150);
  ctx.fillStyle = "#adc5c8";
  ctx.font = "16px monospace";
  ctx.fillText("INDEPENDENT PORTFOLIO · 2026", 384, 195);
  ctx.fillStyle = "#f0efe6";
  ctx.font = "82px Georgia";
  ctx.fillText("Selected", 384, 418);
  ctx.fillText("Works", 384, 509);
  ctx.font = "italic 200px Georgia";
  ctx.fillStyle = "#e5e8d9";
  ctx.fillText("S", 379, 840);
  ctx.font = "17px monospace";
  ctx.fillStyle = "#c5dcd6";
  ctx.fillText("INTERACTIVE BY NATURE", 384, 1035);
  ctx.fillStyle = "#e3e5db";
  ctx.font = "22px monospace";
  ctx.fillText("06  /  HOLOGRAPHIC CARDS", 384, 1160);
  ctx.font = "14px monospace";
  ctx.fillStyle = "#9dacb8";
  ctx.fillText("GAMES · EXPERIENCES · CREATIVE CODE", 384, 1201);
  ctx.fillText("TEAR TO DISCOVER  →", 384, 94);
  return image;
}
export function makeCardArtwork(project, index, back = false) {
  const [image, ctx] = canvas(768, 1080);
  const accent = getCardColor(index);
  const gradient = ctx.createLinearGradient(0, 0, 768, 1080);
  gradient.addColorStop(0, "#253340");
  gradient.addColorStop(1, "#0b121d");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 768, 1080);
  ctx.strokeStyle = accent;
  ctx.lineWidth = 2;
  ctx.strokeRect(30, 30, 708, 1020);
  ctx.fillStyle = "#afc4ce";
  ctx.font = "17px monospace";
  ctx.fillText("MADEBYSHIVANI / SELECTED WORKS", 65, 89);
  ctx.fillStyle = accent;
  ctx.font = "20px monospace";
  ctx.fillText(
    `${project.number}   /   ${project.category.toUpperCase()}`,
    65,
    155,
  );
  ctx.fillStyle = "#f3f3e9";
  ctx.font = "46px Georgia";
  const titleEnd = lines(ctx, project.title, 65, 225, 632, 54);
  if (back) {
    ctx.font = "25px Arial";
    ctx.fillStyle = "#d7dfe5";
    const end = lines(ctx, project.description, 65, titleEnd + 52, 628, 38);
    ctx.font = "19px monospace";
    ctx.fillStyle = "#a9c7cb";
    lines(ctx, project.tech.join("  /  "), 65, end + 60, 620, 31);
    ctx.font = "16px monospace";
    ctx.fillStyle = "#81949e";
    ctx.fillText("THE STORY BEHIND THE CARD", 65, 963);
  } else {
    ctx.save();
    ctx.translate(384, 610);
    for (let i = 0; i < 45; i++) {
      ctx.rotate(0.07);
      ctx.strokeStyle = `${accent}88`;
      ctx.beginPath();
      ctx.ellipse(0, 0, 195, 85 + i * 1.5, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
    ctx.fillStyle = "#f3f3e9";
    ctx.font = "130px Georgia";
    ctx.textAlign = "center";
    ctx.fillText(project.number, 384, 655);
    ctx.textAlign = "left";
    ctx.font = "20px monospace";
    ctx.fillStyle = "#b6c9d1";
    lines(ctx, project.tech.join(" / "), 65, 879, 630, 32);
  }
  ctx.fillStyle = "#a1b1b9";
  ctx.font = "16px monospace";
  ctx.fillText(
    project.rarity === "Edition"
      ? "PORTFOLIO EDITION"
      : `${project.rarity.toUpperCase()} EDITION`,
    65,
    1011,
  );
  ctx.textAlign = "right";
  ctx.fillText(`${project.number} / 006 · ${project.year}`, 703, 1011);
  return image;
}
