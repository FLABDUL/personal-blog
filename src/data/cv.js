export const profile = {
  name: "Abdul Hakim Norazman",
  title: "Software Engineer building financial and data-intensive systems",
  summary:
    "Technology consultant at Detillens, contracted to Morgan Stanley as a software engineer in Fund Services Technology. This is my long-form career record: the systems I have shipped, the teams and communities I have contributed to, the technical work I pursue independently, and the learning behind it.",
  updated: "July 2026",
  contacts: [
    { label: "Email", href: "mailto:ahnorazman@gmail.com" },
    {
      label: "LinkedIn",
      href: "https://www.linkedin.com/in/abdulhakimnorazman/",
    },
    { label: "GitHub", href: "https://github.com/FLABDUL" },
  ],
}

export const overview = [
  {
    value: "2018 - present",
    label: "Engineering, leadership and professional work",
  },
  {
    value: "Finance + technology",
    label: "From trading and research platforms to fund services",
  },
  {
    value: "Build, operate, teach",
    label: "Production systems, independent projects and technical workshops",
  },
]

export const jumpLinks = [
  { label: "Experience", href: "#professional-experience" },
  { label: "Engineering work", href: "#engineering-work" },
  { label: "University", href: "#university" },
  { label: "Leadership & impact", href: "#leadership-impact" },
  { label: "Development", href: "#professional-development" },
  { label: "Skills", href: "#technical-skills" },
]

export const experience = [
  {
    role: "Technology Consultant & Software Engineer",
    company: "Detillens & Morgan Stanley",
    team: "Fund Services Technology",
    location: "Glasgow",
    period: "Dec 2025 - Present",
    summary:
      "Modernising and improving software used in large-scale financial-statement and fund-reporting workflows.",
    highlights: [
      "Reduced latency in financial-statement generation workflows by up to 30%, improving returns, allocation-extract and account-level data processing.",
      "Modernised a financial-statements Bulk Override Tool by upgrading Java, Spring Boot and Gradle.",
      "Used automated refactoring and AI-assisted development tools, including Moderne and GitHub Copilot, to reduce legacy-code risk.",
      "Validated and documented REST APIs with Swagger to improve consistency for downstream financial systems.",
      "Work across engineering and financial-domain boundaries to diagnose bottlenecks, clarify requirements and deliver maintainable production changes.",
    ],
  },
  {
    role: "Software Engineer - Research Technology",
    company: "J.P. Morgan Asset Management",
    team: "Long-Term Capital Market Assumptions",
    location: "Glasgow",
    period: "Mar 2025 - Nov 2025",
    summary:
      "Built research tooling used to model, review and report long-term market assumptions.",
    highlights: [
      "Developed a Java and React platform supporting Long-Term Capital Market Assumptions.",
      "Delivered an Asset Volatility module with backend calculations, controlled manual overrides and report integration.",
      "Upgraded Spring Boot versions across services using OpenRewrite and GitHub Copilot to improve maintainability.",
      "Tested and documented REST APIs with Swagger to support reliable data flow between research tools.",
      "Worked with research and engineering stakeholders to translate analytical workflows into production software.",
    ],
  },
  {
    role: "Software Engineer - Trading Technology",
    company: "J.P. Morgan Asset Management",
    team: "EMEA equities automation & North America fixed-income order routing",
    location: "Glasgow",
    period: "Jun 2021 - Feb 2025",
    summary:
      "Developed and operated cross-asset trading systems, primarily as a Java server-side engineer.",
    highlights: [
      "Migrated millions of reference and instrument records from legacy Sybase databases to internal platforms using Kafka, REST and GraphQL, with SQL-based reconciliation.",
      "Delivered instrument-specific data to Portware to improve ETF order releases and reduce trading latency.",
      "Enabled warrant-note orders in Asia to flow into Portware, reducing manual trader intervention and operational risk.",
      "Strengthened secure connectivity to external services including Bloomberg, OTCX and Symphony.",
      "Resolved urgent testing and production incidents across equities, fixed income, OTC, money markets and cash-management order routing.",
      "Acted as a global release manager, coordinating production delivery, support communications, system monitoring and trader-facing release notes.",
      "Moved order-grouping eligibility logic from the user interface into backend services ahead of a UI modernisation.",
      "Built relationships with traders and portfolio managers through one-to-one feedback sessions, workflow study and order-routing subject-matter expertise.",
    ],
  },
  {
    role: "Makerspace Technician",
    company: "University of Edinburgh Information Services",
    team: "uCreate Studio",
    location: "Edinburgh",
    period: "Nov 2019 - May 2021",
    summary:
      "Part-time technical role supporting a digitally focused makerspace alongside my engineering degree.",
    highlights: [
      "Helped manufacture more than 10,000 3D-printed face shields for NHS frontline staff during the COVID-19 pandemic.",
      "Delivered general inductions on the safe use of 3D scanners and printers, VR/AR equipment, CNC tools and electronics.",
      "Created and taught 90-minute interactive workshops in Inkscape vector-graphics design for students and staff.",
      "Worked with the School of Islamic and Middle Eastern Studies to research, design and manufacture an accurate, scalable astrolabe.",
      "Acted as a subject-matter expert on digital-manufacturing equipment including laser cutters.",
      "Contributed to the team recognised for Outstanding Library Team at the 2020 Times Higher Education Awards.",
    ],
  },
]

export const engineeringWork = [
  {
    title: "Independent & open-source",
    intro:
      "Public work where the code, product decisions or ongoing experiments can be explored directly.",
    items: [
      {
        name: "Backtest Library",
        context: "Open-source quantitative tooling",
        description:
          "Contributed tests and engineering improvements to a Python library for evaluating trading strategies, with an emphasis on reproducibility and trustworthy performance analysis.",
        href: "https://github.com/FLABDUL/backtest-lib",
        tags: ["Python", "Testing", "Quantitative finance"],
      },
      {
        name: "Dependency Agent",
        context: "AI-assisted developer tooling",
        description:
          "Built an OpenAI-powered prototype that analyses changelogs and dependency metadata to help diagnose Maven dependency conflicts.",
        href: "https://github.com/FLABDUL/dependency-agent",
        tags: ["OpenAI", "Java", "Maven"],
      },
      {
        name: "Strava Dashboard",
        context: "Full-stack fitness analytics",
        description:
          "Developed a dashboard with OAuth integration, PostgreSQL-backed activity data, custom weekly and monthly statistics, charts and interactive filtering.",
        href: "https://github.com/FLABDUL/strava-dashboard",
        tags: ["React", "Node.js", "PostgreSQL"],
      },
      {
        name: "Octopus Energy Dashboard",
        context: "Household-energy analytics",
        description:
          "Created a React dashboard for electricity and gas consumption, combining usage visualisation with AI-generated observations.",
        href: "https://github.com/FLABDUL/octopus-energy-app",
        tags: ["React", "APIs", "AI insights"],
      },
      {
        name: "Machine-learning CAD Filter",
        context: "BEng thesis",
        description:
          "Developed a computational-geometry and machine-learning filter for CAD data in partnership with Theorem Solutions and Ford Motor Company.",
        href: "https://github.com/FLABDUL/beng-thesis",
        tags: ["C++", "Python", "Computational geometry"],
      },
    ],
  },
  {
    title: "Professional systems",
    intro:
      "Representative systems work from roles in fund services, investment research and trading technology.",
    items: [
      {
        name: "Fund-reporting workflow performance",
        context: "Morgan Stanley Fund Services Technology",
        description:
          "Profiled and improved financial-statement generation workflows, reducing latency by up to 30% while modernising the surrounding Java and Spring platform.",
        tags: ["Java", "Spring Boot", "Performance"],
      },
      {
        name: "Long-Term Capital Market Assumptions",
        context: "J.P. Morgan Research Technology",
        description:
          "Extended a Java and React research platform with asset-volatility calculations, controlled overrides and downstream reporting integration.",
        tags: ["Java", "React", "Research systems"],
      },
      {
        name: "Trading data and order-routing modernisation",
        context: "J.P. Morgan Trading Technology",
        description:
          "Migrated millions of instrument records away from Sybase and improved cross-asset order workflows, secure vendor connectivity and production operations.",
        tags: ["Kafka", "SQL", "Distributed systems"],
      },
    ],
  },
  {
    title: "Hackathons & social-impact technology",
    intro:
      "Internal builds where the outcome combined engineering, communication and organisational impact.",
    items: [
      {
        name: "go/TeamDiversity",
        context: "2022 Pierpont Award - DE&I winner",
        description:
          "Led and presented an AWS prototype that measures team diversity to support internal mobility and more diverse hiring, engaging technology, HR, compliance and senior DE&I stakeholders.",
        tags: ["AWS", "Full stack", "Stakeholder engagement"],
      },
      {
        name: "Workplace community app",
        context: "Third place - 2023 JPMC Global Hackathon",
        description:
          "Built a seat-booking and community-discovery application designed to encourage cross-team collaboration and internal mobility.",
        tags: ["Hackathon", "Product design", "DE&I"],
      },
      {
        name: "Extended-reality trading workspace",
        context: "Top-ten team - 2022 Glasgow JPMC Global Hackathon",
        description:
          "Worked in a five-person team to prototype a browser-based virtual-reality workspace capable of displaying multiple trading screens.",
        tags: ["WebXR", "VR", "Rapid prototyping"],
      },
      {
        name: "Speak Out Scotland",
        context: "Force for Good - Best Client Engagement & Storytelling",
        description:
          "Helped develop and present a full-stack application providing personalised pre-therapy resources for male victims of abuse.",
        tags: ["Social impact", "Full stack", "Client communication"],
      },
    ],
  },
]

export const education = {
  institution: "The University of Edinburgh",
  qualification: "BEng (Hons) Electrical and Mechanical Engineering",
  period: "Sep 2017 - Jul 2021",
  details: [
    "Thesis: The Development of a Machine Learning Computer-Aided Design Filter Using Computational Geometry.",
    "Completed the thesis in partnership with Theorem Solutions and Ford Motor Company, using C++ and Python.",
    "Combined mechanical and electrical engineering with software, mathematical modelling, project management and manufacturing.",
  ],
  coursework: [
    {
      label: "Software & digital systems",
      value:
        "C programming, C++, Python, MATLAB, R, Verilog and digital-systems laboratories",
    },
    {
      label: "Mathematics & computation",
      value:
        "Matrix analysis, differential equations, Laplace transforms, probability, statistics and computational geometry",
    },
    {
      label: "Engineering & delivery",
      value:
        "Mechanical engineering projects, supply chain management, industrial management and engineering project management",
    },
  ],
}

export const universityLeadership = {
  role: "Head of Dynamics - Technical Team",
  organisation: "HYPED, University of Edinburgh Hyperloop Team",
  location: "Edinburgh",
  period: "Sep 2018 - Jul 2019",
  summary:
    "Led the stability, braking and suspension programme for HYPED's third-generation pod while representing the UK at the SpaceX Hyperloop Pod Competition.",
  highlights: [
    "Led three technical sub-teams totalling around 25 people across stability, braking and suspension.",
    "Managed a technical budget of up to GBP 25,000.",
    "Represented the UK as a finalist at the 2019 SpaceX Hyperloop Pod Competition IV, where HYPED finished in the top ten.",
    "Contributed to HYPED's wider competition record, including sixth place at the 2018 SpaceX Hyperloop Pod Competition.",
    "Delivered a sold-out Institution of Mechanical Engineers lecture on Hyperloop technology and HYPED to an audience of around 100 people.",
    "Presented technical work to external audiences across the country.",
  ],
}

export const impact = [
  {
    title: "Engineering leadership",
    detail:
      "Led approximately 25 HYPED engineers across three vehicle-dynamics sub-teams and managed a budget of up to GBP 25,000.",
  },
  {
    title: "Technical teaching",
    detail:
      "Delivered uCreate inductions and 90-minute Inkscape workshops, and presented a sold-out public lecture on Hyperloop engineering.",
  },
  {
    title: "Inclusive technology",
    detail:
      "Built award-recognised tools for team diversity, internal mobility and tailored support for male victims of abuse.",
  },
  {
    title: "Early-career community",
    detail:
      "Contributed to Asset Management Technology DE&I work, volunteered with Entry Pathways, participated as a panellist and supported Code for Good as a mentor.",
  },
  {
    title: "Operational ownership",
    detail:
      "Coordinated regional and global releases, production checks and incident response across trading systems with multiple upstream and downstream teams.",
  },
  {
    title: "Client and user understanding",
    detail:
      "Worked directly with traders, portfolio managers, researchers and charity stakeholders to understand workflows and communicate technical outcomes.",
  },
]

export const development = [
  {
    title: "J.P. Morgan & Trivera engineering workshops",
    items: [
      "Completed foundational and advanced React workshops.",
      "Completed foundational and advanced Python workshops.",
      "Applied structured training alongside day-to-day Java, full-stack and production engineering work.",
    ],
  },
  {
    title: "Early-career engineering programmes",
    items: [
      "Completed the J.P. Morgan Tech Connect pathway and Tech Elevator coding bootcamp.",
      "Progressed through the Software Engineer Program while building experience across equities and fixed-income trading technology.",
      "Shared technical knowledge through documentation, presentations and internal knowledge-exchange sessions.",
    ],
  },
  {
    title: "Investment & markets",
    items: [
      "Passed the J.P. Morgan Asset Management Investment Essentials Program.",
      "Studied the CFA Level I curriculum, including Quantitative Methods, Fixed Income, Derivatives and Financial Statement Analysis.",
      "Completed the CFA Python Programming Fundamentals practical skills module, covering financial data analysis, portfolio statistics and Monte Carlo simulation.",
      "Studied J.P. Morgan CIB 101 asset-class material and attended portfolio-manager meetings and Asset Management Trade Talks.",
    ],
  },
  {
    title: "Bank of America markets programmes",
    items: [
      "Attended Rates University, covering rates, economics, money markets, government bonds, swaps, inflation and volatility.",
      "Attended the Futures & Options-led Forex, Rates and Derivatives University, covering cross-asset markets, derivatives and risk.",
      "Began the Bank of America Emerging Markets University programme.",
    ],
  },
  {
    title: "Cloud, AI & continuing development",
    items: [
      "Passed the AWS Certified Cloud Practitioner exam.",
      "Participated in the AWS DeepRacer 2023 competition while learning applied Python machine learning.",
      "Continue to study Java, distributed systems, AI-assisted engineering and quantitative software through independent projects.",
    ],
  },
  {
    title: "Communication & commercial context",
    items: [
      "Participated in the 2024 Centre Stage Challenge, acting as a client adviser presenting a UK equity fund and trading capability to prospective investors.",
      "Presented award submissions, technical designs, release communications and client-facing project outcomes to technical and non-technical audiences.",
    ],
  },
]

export const skills = [
  {
    category: "Professional languages",
    detail: "Java, Python, SQL, JavaScript and Bash",
  },
  {
    category: "Frameworks & applications",
    detail: "Spring Boot, React, Node.js, Gatsby and Flask",
  },
  {
    category: "Data & messaging",
    detail: "PostgreSQL, Oracle, Sybase, Kafka, GraphQL and REST APIs",
  },
  {
    category: "Engineering & delivery",
    detail:
      "Git, Maven, Gradle, Swagger, CI/CD, production support, release management and incident review",
  },
  {
    category: "Cloud & platforms",
    detail:
      "AWS, Vercel, distributed data platforms and AI-assisted development tooling",
  },
  {
    category: "Earlier engineering tools",
    detail:
      "C, C++, MATLAB, R, Verilog, computational geometry and digital-system design",
  },
  {
    category: "Digital fabrication",
    detail:
      "3D printing and scanning, laser cutting, CNC equipment, electronics, VR/AR and Inkscape",
  },
  {
    category: "Domains",
    detail:
      "Fund services, asset management, trading technology, investment research, financial data and quantitative tooling",
  },
]
