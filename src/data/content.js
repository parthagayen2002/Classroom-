export const siteConfig = {
  name: 'PARTHA PRATIM GAYEN',
  title: 'AI DEVELOPER',
  tagline: 'Building Intelligence Beyond Code.',
};

export const navigation = [
  { id: 'home', label: 'HOME', href: '#home' },
  { id: 'about', label: 'ABOUT', href: '#about' },
  { id: 'techstack', label: 'TECH STACK', href: '#techstack' },
  { id: 'projects', label: 'PROJECTS', href: '#projects' },
  { id: 'achievements', label: 'ACHIEVEMENTS', href: '#achievements' },
  { id: 'contact', label: 'CONTACT', href: '#contact' },
];

export const experience = [
  {
    id: 'ansys-icepak-thermal-modeling',
    title: 'Thermal Modeling for Electronic Cooling',
    type: 'COURSEWORK',
    description: 'Academic coursework project building thermal models for electronic component cooling — designed 3D models and ran cooling simulations using ANSYS Icepak.',
    technologies: ['ANSYS Icepak', 'Thermal Modeling', '3D Modeling'],
    duration: null,
  },
];

export const certificatesLink = 'https://drive.google.com/drive/folders/1NqcSA1LgfK15u5A-HToCF3Lj6wrA3yp9?usp=drive_link';

export const achievements = [
  {
    id: 'bits-pilani-hackathon-2024',
    title: 'BITS Pilani Hackathon',
    placement: '1ST PLACE',
    location: 'Hyderabad',
    year: '2024',
    team: 'Team',
    certificateLink: certificatesLink,
  },
  {
    id: 'aiml-virtual-internship-eduskill-2025',
    title: 'AI/ML Virtual Internship — EduSkill, in collaboration with Google & AICTE',
    placement: 'CERTIFIED',
    location: 'Virtual',
    year: '2025',
    team: '',
    certificateLink: certificatesLink,
  },
];

export const projects = [
  {
    id: 'ecollm',
    title: 'EcoLLM — Energy-Aware LLM Evaluation',
    description: 'An AI evaluation platform that compares different Large Language Models not only by their response quality, but also by inference time, energy consumption, and estimated carbon emissions. The system helps identify models that provide a better balance between performance and environmental impact.',
    technologies: ['Python', 'FastAPI', 'React', 'Tailwind CSS', 'Recharts', 'SQLite', 'CodeCarbon', 'Hugging Face Transformers', 'Google Gemini API', 'PyTorch'],
    features: [
      'LLM performance comparison',
      'Accuracy evaluation',
      'Energy consumption tracking',
      'Carbon emission estimation',
      'Interactive analytics dashboard',
      'Model comparison and visualization',
    ],
    category: 'AI EVALUATION',
    year: '2025',
    image: '/projects/ecollm.png',
    link: 'https://github.com/parthagayen2002/Eco-LLM-',
  },
  {
    id: 'safety-monitoring',
    title: 'AI-Based Industrial Safety Monitoring System',
    description: 'A computer vision system designed for real-time industrial safety monitoring. It uses object detection to identify safety helmets/PPE and detect fire in monitored environments, helping improve workplace safety and enable faster responses to hazardous situations.',
    technologies: ['Python', 'YOLO', 'OpenCV', 'PyTorch', 'Computer Vision', 'Deep Learning'],
    features: [
      'Helmet/PPE detection',
      'Fire detection',
      'Real-time video analysis',
      'Object detection',
      'Industrial safety monitoring',
    ],
    category: 'COMPUTER VISION',
    year: '2025',
    image: '/projects/safety-monitoring.png',
    link: 'https://github.com/sagniksannigrahi/AI-Based-Industrial-Safety-Monitoring-System-using-YOLO',
  },
  {
    id: 'mood-assistant',
    title: 'Mood-Based AI Assistant',
    description: 'An AI-powered assistant that analyzes the user\'s mood and dynamically adapts its music recommendations accordingly. Instead of providing the same experience to every user, the system uses mood detection to select music that matches the user\'s emotional state.',
    technologies: ['Python', 'Artificial Intelligence', 'Machine Learning', 'NLP', 'Mood/Sentiment Analysis', 'Music/YouTube API'],
    features: [
      'Mood detection',
      'Sentiment analysis',
      'Personalized music recommendations',
      'Dynamic playlist/song selection',
      'AI-based user interaction',
    ],
    category: 'AI / NLP',
    year: '2025',
    image: '/projects/mood-assistant.png',
    link: 'https://github.com/sagniksannigrahi/Bits_Wokshop---An-A.I.-Assistant',
  },
];

export const aiLabModules = [
  {
    id: 'llm',
    label: 'LLM',
    fullName: 'LARGE LANGUAGE MODELS',
    description: 'Training, fine-tuning, and deploying large language models at scale.',
    icon: 'brain',
    technologies: ['GPT', 'LLaMA', 'Transformers', 'LoRA'],
    progress: 85,
  },
  {
    id: 'vision',
    label: 'COMPUTER VISION',
    fullName: 'COMPUTER VISION',
    description: 'Advanced visual perception systems for real-world applications.',
    icon: 'eye',
    technologies: ['YOLO', 'SAM', 'CLIP', 'ViT'],
    progress: 78,
  },
  {
    id: 'ml',
    label: 'MACHINE LEARNING',
    fullName: 'MACHINE LEARNING',
    description: 'End-to-end ML pipelines from data to production deployment.',
    icon: 'cpu',
    technologies: ['XGBoost', 'LightGBM', 'MLflow', 'Kubeflow'],
    progress: 92,
  },
  {
    id: 'generative',
    label: 'GENERATIVE AI',
    fullName: 'GENERATIVE AI',
    description: 'Creative AI systems for content generation and synthesis.',
    icon: 'sparkles',
    technologies: ['Diffusion', 'GANs', 'VAEs', 'NeRF'],
    progress: 80,
  },
  {
    id: 'agents',
    label: 'AI AGENTS',
    fullName: 'AI AGENTS',
    description: 'Autonomous agents for complex reasoning and task execution.',
    icon: 'bot',
    technologies: ['LangGraph', 'AutoGen', 'CrewAI', 'Tool Use'],
    progress: 75,
  },
];

// Real skills list as given, grouped into the four categories used by the
// 3D Tech Stack orb cloud (see TechCloud.jsx). No invented proficiency
// scores this time - the earlier version of this array had per-item
// percentages that were never real data and were never actually rendered
// anywhere (this file wasn't imported by the app), so they're dropped
// rather than carried forward.
export const techStack = [
  // Languages
  { id: 'python', name: 'Python', category: 'LANGUAGES' },
  { id: 'javascript', name: 'JavaScript', category: 'LANGUAGES' },
  { id: 'typescript', name: 'TypeScript', category: 'LANGUAGES' },
  { id: 'c', name: 'C', category: 'LANGUAGES' },
  { id: 'cpp', name: 'C++', category: 'LANGUAGES' },

  // AI / ML
  { id: 'machine-learning', name: 'Machine Learning', category: 'AI / ML' },
  { id: 'deep-learning', name: 'Deep Learning', category: 'AI / ML' },
  { id: 'llms', name: 'LLMs', category: 'AI / ML' },
  { id: 'pytorch', name: 'PyTorch', category: 'AI / ML' },
  { id: 'tensorflow', name: 'TensorFlow', category: 'AI / ML' },
  { id: 'opencv', name: 'OpenCV', category: 'AI / ML' },
  { id: 'nlp', name: 'NLP', category: 'AI / ML' },

  // Frontend / Web
  { id: 'react', name: 'React', category: 'FRONTEND' },
  { id: 'html', name: 'HTML', category: 'FRONTEND' },
  { id: 'css', name: 'CSS', category: 'FRONTEND' },
  { id: 'tailwind', name: 'Tailwind CSS', category: 'FRONTEND' },
  { id: 'threejs', name: 'Three.js', category: 'FRONTEND' },

  // Tools / Platforms
  { id: 'git', name: 'Git', category: 'TOOLS' },
  { id: 'github', name: 'GitHub', category: 'TOOLS' },
  { id: 'vscode', name: 'VS Code', category: 'TOOLS' },
  { id: 'docker', name: 'Docker', category: 'TOOLS' },
  { id: 'linux', name: 'Linux', category: 'TOOLS' },
];

export const journey = [
  {
    id: '2023',
    year: '2023',
    title: 'START',
    description: 'Began the journey into AI development and machine learning.',
    highlights: ['First ML model', 'Python fundamentals', 'Data science basics'],
    icon: 'rocket',
  },
  {
    id: '2024',
    year: '2024',
    title: 'BUILDING',
    description: 'Building production ML systems and deploying at scale.',
    highlights: ['Production ML pipelines', 'MLOps practices', 'First open source'],
    icon: 'hammer',
  },
  {
    id: '2025',
    year: '2025',
    title: 'EXPLORING',
    description: 'Exploring cutting-edge AI: LLMs, Diffusion, Agents.',
    highlights: ['LLM fine-tuning', 'Generative AI', 'Agent frameworks'],
    icon: 'compass',
  },
  {
    id: '2026',
    year: '2026',
    title: 'CREATING',
    description: 'Creating innovative AI products and solutions.',
    highlights: ['AI products', 'Research papers', 'Community building'],
    icon: 'sparkles',
  },
  {
    id: '2027',
    year: '2027',
    title: 'NEXT',
    description: 'The next chapter: pushing boundaries of what AI can do.',
    highlights: ['AGI research', 'New paradigms', 'Impact at scale'],
    icon: 'infinity',
  },
];

export const contactLinks = [
  {
    id: 'email',
    label: 'EMAIL',
    value: 'parthapratimgayen2002@gmail.com',
    icon: 'mail',
    href: 'mailto:parthapratimgayen2002@gmail.com',
  },
  {
    id: 'github',
    label: 'GITHUB',
    value: 'github.com/parthagayen2002',
    icon: 'github',
    href: 'https://github.com/parthagayen2002',
  },
  {
    id: 'linkedin',
    label: 'LINKEDIN',
    value: 'linkedin.com/in/partha-pratim-gayen',
    icon: 'linkedin',
    href: 'https://www.linkedin.com/in/partha-pratim-gayen/',
  },
  {
    id: 'instagram',
    label: 'INSTAGRAM',
    value: '@p.p.g07',
    icon: 'instagram',
    href: 'https://instagram.com/p.p.g07',
  },
];

export const heroContent = {
  eyebrow: 'AI DEVELOPER',
  name: 'PARTHA PRATIM GAYEN',
  tagline: 'Building Intelligence Beyond Code.',
  paragraph: 'I\'m a final-year Computer Science student at SRMIST KTR with a focus on large language models and machine learning. I\'m interested in how LLMs and ML systems get built, fine-tuned, and applied — from experimentation through to real, working systems.',
  meta: '4TH YEAR CSE STUDENT · SRMIST KTR',
  skills: ['Python', 'Machine Learning', 'Deep Learning', 'LLMs', 'PyTorch'],
  socials: [
    { id: 'github', label: 'GitHub', href: 'https://github.com/parthagayen2002' },
    { id: 'linkedin', label: 'LinkedIn', href: 'https://www.linkedin.com/in/partha-pratim-gayen/' },
    { id: 'email', label: 'Email', href: 'mailto:parthapratimgayen2002@gmail.com' },
  ],
};

export const aboutContent = {
  headline: 'AI DEVELOPER',
  subheadline: 'Exploring how large language models and machine learning systems get built, understood, and applied.',
  paragraphs: [
    'I\'m a final-year Computer Science student at SRMIST KTR, focused on large language models and machine learning.',
    'I\'m drawn to understanding how ML systems actually work under the hood — from model architecture to training to how they get applied to real problems.',
    'Currently exploring: Large Language Models, machine learning fundamentals, and applied AI.',
  ],
  stats: [
    { label: '4TH YEAR CSE STUDENT', value: 'SRMIST KTR' },
    { label: 'PROJECTS DELIVERED', value: '10' },
    { label: 'OPEN SOURCE CONTRIBS', value: '3' },
  ],
  skills: ['Python', 'Machine Learning', 'LLMs', 'PyTorch'],
};