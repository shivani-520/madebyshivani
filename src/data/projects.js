export const CARD_IMAGES = [
    "/images/artwork/games.webp",
    "/images/artwork/pivotal.webp",
    "/images/artwork/vr configurator.webp",
    "/images/artwork/iceland.webp",
    "/images/artwork/rl-agents.webp",
    "/images/artwork/vr configurator.webp",
];

// Replace each example.com URL with that project's real URL.
// Set url to "" to temporarily hide a project's View Project link.
export const PROJECTS = [
    {
        title: "Game & Personal Projects",
        image: CARD_IMAGES[0],
        description:
            "A selection of games I've developed during my studies and in my own time, highlighting my passion for creating engaging gameplay and interactive experiences.",
        tech: ["Unity", "C#", "Unreal Engine", "C++", "JavaScript", "WebGL"],
        category: "Interactive",
        rarity: "Rare",
        number: "001",
        year: "2026",
        url: "https://shivani-520.itch.io/", // TODO: replace with your project URL.
    },
    {
        title: "Pivotal CGI Website",
        image: CARD_IMAGES[1],
        description:
            "A browser-based interactive 3D gallery built for Pivotal CGI, an architectural visualisation studio. Users scroll through and explore a gallery on the home page. Built from scratch and delivered as a deployed project.",
        tech: ["React", "React Three Fiber", "HTML", "CSS", "Vite"],
        category: "Web Experience",
        rarity: "Edition",
        number: "002",
        year: "2026",
        url: "https://pivotalcgi.com/", // TODO: replace with your project URL.
    },
    {
        title: "TG Jones Virtual Store",
        image: CARD_IMAGES[2],
        description:
            "A browser-based immersive virtual store built using panoramic imagery exported from Realsee.ai, based on the physical TG Jones store in Leeds.",
        tech: ["Three.js", "JavaScript", "HTML", "CSS", "WebGL"],
        category: "Experiment",
        rarity: "Rare",
        number: "003",
        year: "2026",
        url: "https://tgjonesdemo.vercel.app/preview.html", // TODO: replace with your project URL.
    },
    {
        title: "Iceland Interactive Fridge",
        image: CARD_IMAGES[3],
        description:
            "A real-time interactive 3D product visualiser built using three.js as a pitch demo for Iceland. Developed in close collaboration with graphic designers at UYR, the application renders a fully detailed fridge model with supplied artwork and animations that can be applied dynamically.",
        tech: ["Three.js", "Blender", "JavaScript", "HTML & CSS"],
        category: "Interface",
        rarity: "Edition",
        number: "004",
        year: "2026",
        url: "https://www.youtube.com/watch?v=M5wO_F_BlxQ", // TODO: replace with your project URL.
    },
    {
        title: "UAV Search & Rescue Simulation",
        image: CARD_IMAGES[4],
        description:
            "This MSc dissertation explored the use of multi-agent reinforcement learning to train autonomous UAVs to perform coordinated search-and-rescue missions in a simulated environment built in Unity using C# and Python.",
        tech: ["Unity", "C#", "Python", "Reinforcement Learning"],
        category: "Creative Code",
        rarity: "Special",
        number: "005",
        year: "2026",
        url: "https://github.com/shivani-520/Final-Project-MARL", // TODO: replace with your project URL.
    },
    {
        title: "Virtual Reality Configurator",
        image: CARD_IMAGES[5],
        description:
            "A modular VR configurator built in Unreal Engine, enabling real-time customisation of a 3D architectural environment. Users navigate the space in VR and dynamically swap materials and structural elements, with changes reflected instantly across the scene.",
        tech: ["Unreal Engine", "C++", "Blueprints"],
        category: "Creative Code",
        rarity: "Special",
        number: "006",
        year: "2026",
        url: "https://pivotalcgi.com/portfolio/the-farmhouse", // TODO: replace with your project URL.
    },
];

export const CARD_COUNT = PROJECTS.length;