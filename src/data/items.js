function getYoutubeThumbnail(url) 
{
  const id = url.split("v=")[1]?.split("&")[0] || url.split("be/")[1];

  return id
    ? `https://img.youtube.com/vi/${id}/maxresdefault.jpg`
    : null;
}
async function getVimeoThumbnail(url) {
  const res = await fetch(
    `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(url)}`
  );

  const data = await res.json();
  return data.thumbnail_url;
}

// src/data/items.js

export const WORK_ITEMS = [
  {
    title: "Pivotal CGI Website",
    description: "A browser-based interactive 3D gallery built for Pivotal CGI, an architectural visualisation studio. Users scroll through and explore a gallery on the home page. Built from scratch and delivered as a deployed project.",
    stack: ["React", "React Three Fibre", "HTML", "CSS", "Real-time Rendering", "UI/UX"],
    link: "https://pivotalcgi.com/",

    image: "/images/artwork/pivotal.webp",
  },
  {
    title: "TG Jones Virtual Store",
    description: `A browser-based immersive virtual store built using panoramic imagery exported from Realsee.ai, based on the physical TG Jones store in Leeds.`,
    stack: ["Three.js", "JavaScript", "HTML & CSS", "WebGL"],
    link: "https://youtu.be/EdmsvKvTHqY",

    image: getYoutubeThumbnail("https://youtu.be/EdmsvKvTHqY"),

  },
  {
    title: "Iceland Interactive Fridge",
    description: "A real-time interactive 3D product visualiser built using three.js as a pitch demo for Iceland. Developed in close collaboration with graphic designers at UYR, the application renders a fully detailed fridge model with supplied artwork and animations that can be applied dynamically. ",
    stack: ["Three.js", "Blender", "JavaScript", "HTML & CSS"],
    link: "https://youtu.be/M5wO_F_BlxQ",

    image: getYoutubeThumbnail("https://youtu.be/M5wO_F_BlxQ"),
  },
  {
    title: "UAV Search & Rescue Simulation",
    description: "This MSc dissertation explored the use of multi-agent reinforcement learning to train autonomous UAVs to perform coordinated search-and-rescue missions in a simulated environment built in Unity using C# and Python.",
    stack: ["Unity", "C#", "Python", "Reinforcement Learning"],
    link: "https://github.com/shivani-520/Final-Project-MARL",

    image: getYoutubeThumbnail("https://youtu.be/qE55VwkYWng"),
  },
  {
    title: "Virtual Reality Configurator",
    description: "A modular VR configurator built in Unreal Engine, enabling real-time customisation of a 3D architectural environment. Users navigate the space in VR and dynamically swap materials and structural elements, with changes reflected instantly across the scene.",
    stack: ["Unreal Engine", "C++", "Blueprints"],
    link: "https://pivotalcgi.com/portfolio/the-farmhouse",

    image: "/images/artwork/The_Farmhouse_Kitchen_CGI_008B.webp",
  },
  {
    title: "Games & Personal Projects",
    description: "A selection of games I've developed during my studies and in my own time, highlighting my passion for creating engaging gameplay and interactive experiences.",    
    stack: ["Unity", "C#", "Unreal Engine", "Blueprints"],
    link: "https://shivani-520.itch.io/",

    image: "/images/artwork/games.webp",
  },
];

export const ABOUT_ITEMS = [
  {
    description: `
      **Web Developer** with **4+ years of experience** building responsive, performant web applications using **React, JavaScript, HTML and CSS**. Proven ability to write clean, reusable code and deliver production-ready projects across a range of client briefs. 
    `,
  },
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