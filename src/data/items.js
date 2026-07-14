function getYoutubeThumbnail(url) 
{
  const id = url.split("v=")[1]?.split("&")[0] || url.split("be/")[1];

  return id
    ? `https://img.youtube.com/vi/${id}/maxresdefault.jpg`
    : null;
}

// src/data/items.js

export const WORK_ITEMS = [
  {
    title: "TG Jones Virtual Store",
    description: `A browser-based immersive virtual store built using panoramic imagery exported from Realsee.ai, based on the physical TG Jones store in Leeds.`,
    stack: ["Three.js", "JavaScript", "WebGL"],
    link: "https://youtu.be/EdmsvKvTHqY",

    image: getYoutubeThumbnail("https://youtu.be/EdmsvKvTHqY"),

  },
  {
    title: "Iceland Fridge",
    description: "Concept visualization exploring domestic isolation and cold minimalism.",
    stack: ["Three.js", "Blender", "JavaScript"],
    link: "https://youtu.be/M5wO_F_BlxQ",

    image: getYoutubeThumbnail("https://youtu.be/M5wO_F_BlxQ"),
  },
  {
    title: "Pivotal CGI Website",
    description: "A browser-based interactive 3D gallery built for Pivotal CGI, an architectural visualisation studio. Users scroll through and explore a gallery on the home page. Built from scratch and delivered as a deployed project.",
    stack: ["React", "React Three Fibre", "HTML", "CSS", "Real-time Rendering", "UI/UX"],
    link: "https://pivotalcgi.com/",

    image: "/images/artwork/pivotal.webp",
  },
  {
    title: "UAV Search & Rescue Simulation",
    description: "Multi-Agent Reinforcement Learning for Coordinated UAV Search and Rescue in a Simulated Unity Environment.",
    stack: ["Unity", "C#", "Python"],
    link: "https://github.com/shivani-520/Final-Project-MARL",

    image: getYoutubeThumbnail("https://youtu.be/qE55VwkYWng"),
  },
  {
    title: "Games",
    description: "An asymmetrical, couch co-op platformer based on Greek mythology.",
    stack: ["Unity", "C#"],
    link: "https://shivani-520.itch.io/",

    image: "/images/artwork/games.webp",
  },
];

export const ABOUT_ITEMS = [
  {
    title: "About Me",
    description: `I’m a creative developer focused on 3D web experiences. I’m a creative developer focused on 3D web experiences.`,
    image: "/images/me.webp",
    stack: [
      "shivani.d.sharma@outlook.com",
      "linkedin.com/in/shivani-devi-sharma",
      "github.com/shivani-520"
    ]
  }
];

export const CONTACT_ITEMS = [
  {
    title: "Get in Touch",
    description: "Feel free to reach out for collaborations or opportunities.",
    image: "/images/me.webp",
    stack: [
      "shivani.d.sharma@outlook.com",
      "linkedin.com/in/shivani-devi-sharma",
      "github.com/shivani-520"
    ]
  }
];