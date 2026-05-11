/**
 * Demo registry — single source of truth for interactive demos under /demo.
 *
 * Add new demos here; the hub (`/demo`) and detail template (`/demo/[slug]`)
 * render automatically from this data. When the list grows (5+), consider
 * backing this with a Strapi `demo` content type. For now (1 live demo), a
 * static file keeps the surface small and avoids a CMS migration.
 */

export type DemoStatus = "live" | "coming-soon";

export interface DemoFeature {
  title: string;
  description: string;
}

export interface DemoTechItem {
  label: string;
  role: string;
}

export interface DemoMetric {
  value: string;
  label: string;
}

export interface DemoConfig {
  /**
   * URL slug under /demo/. Must be a URL-safe string. IMPORTANT: must NOT
   * collide with any hard-coded static file under src/pages/demo/ — Next.js
   * static routes take precedence over [slug].tsx, so the detail page would
   * silently be unreachable. `/demo/lens` is a reserved static path that
   * hosts the embedded iframe; use a distinct slug for its detail page.
   */
  slug: string;
  /** Display title on cards + detail page hero */
  title: string;
  /** Product/category label shown in kicker badge (e.g. "Virtual Try-On") */
  category: string;
  /** 1-line pitch shown on listing cards */
  tagline: string;
  /** Long-form description for the detail page hero (1–2 short paragraphs) */
  summary: string;
  /** Absolute or internal URL where the actual interactive demo is hosted */
  launchUrl: string;
  /** Deployment status — drives the "Live" badge and click-through behavior */
  status: DemoStatus;
  /** Feature bullets for the "What you can do" section (3–8 items) */
  features: DemoFeature[];
  /** Tech stack rows shown as a compact table on the detail page */
  techStack: DemoTechItem[];
  /** Headline metrics shown as stat cards under the hero (2–4 items) */
  metrics: DemoMetric[];
  /** Optional link to architecture doc / PDF / GitHub for deeper reading */
  architectureDocHref?: string;
  /** Release / version metadata shown in the hero */
  releaseVersion?: string;
  /** ISO date of last update */
  lastUpdated?: string;
  /**
   * Optional iframe embed URL for a walkthrough video shown in the hero's
   * right column (YouTube, Vimeo, or Loom — any provider that supports an
   * iframe embed). When set, a 16:9 video card renders next to the hero copy
   * on `lg+` and stacks above the tech stack on mobile. When omitted, a
   * subtle placeholder card renders in the same slot.
   *
   * Use the **embed** URL, not the watch URL:
   *   - YouTube: `https://www.youtube.com/embed/VIDEO_ID`
   *   - Vimeo:   `https://player.vimeo.com/video/VIDEO_ID`
   *   - Loom:    `https://www.loom.com/embed/VIDEO_ID`
   */
  videoEmbedUrl?: string;
  /**
   * Optional poster image shown while the video loads (or in place of the
   * video if `videoEmbedUrl` is omitted). Path under `/public` or an absolute
   * URL. Recommended 16:9 aspect, ≥1280×720.
   */
  videoPoster?: string;
  /**
   * Optional human-readable caption shown under the video (e.g. "2-min
   * walkthrough" or "Full live demo recording — 4:32").
   */
  videoCaption?: string;
}

export const demos: DemoConfig[] = [
  {
    slug: "goggle-vton",
    title: "Virtual Lens Try-On",
    category: "Virtual Try-On",
    tagline:
      "Real-time AI-powered eyewear try-on with 3D overlay, face-shape classification, and GPT-4.1 frame recommendations.",
    summary:
      "Goggle VTON is a production-grade virtual try-on proof of concept for smart eyewear and goggles. The platform combines MediaPipe face detection (478-point mesh), Three.js WebGL 3D rendering, and a LangGraph agentic pipeline wrapping GPT-4.1 to deliver real-time 3D glasses overlay on a live camera feed, automated face-shape classification, and expert-optician style recommendations. Built to give enterprise clients a hands-on look at what an end-to-end AI try-on experience feels like — from camera frame to fit analysis to personalized SKU picks.",
    launchUrl: "/demo/lens",
    status: "live",
    releaseVersion: "v2.0",
    lastUpdated: "2026-03-28",
    architectureDocHref: "/demo/lens",
    // Auto-generated explainer video (Playwright drives the live VTON app
    // with a Y4M fake-camera feed through the LangGraph pipeline: detect ->
    // classify -> fit -> recommend -> render). Refresh via:
    //   node scripts/prepare-fake-camera.mjs --input <face-clip.mp4>
    //   node scripts/generate-demo-walkthrough.mjs --mode=explainer
    // (Path B — see docs/demo-walkthrough-video-brief.md §14.) The legacy
    // `goggle-vton-walkthrough.mp4` (22s page tour) is retained for
    // fallback but the explainer leads.
    videoEmbedUrl: "/videos/goggle-vton-explainer.mp4",
    videoPoster: "/videos/goggle-vton-explainer-poster.jpg",
    videoCaption: "Automated product explainer · MediaPipe face mesh + Three.js overlay in action",
    metrics: [
      { value: "30–60 FPS", label: "Real-time overlay" },
      { value: "478-point", label: "Face mesh" },
      { value: "15+", label: "Frame SKUs" },
      { value: "GPT-4.1", label: "Style engine" },
    ],
    features: [
      {
        title: "Real-time 3D glasses overlay",
        description:
          "Live camera feed with head tracking at 30–60 FPS. Three.js + React Three Fiber render GLB goggle models with lighting, shadows, and occlusion.",
      },
      {
        title: "Photo mode with Lenskart-style browsing",
        description:
          "Capture a photo and cycle through 15+ frame models in a grid layout — compare looks side-by-side without re-calibrating the camera.",
      },
      {
        title: "AI face-shape classification",
        description:
          "Geometric analysis of width, height, ratios, and jaw angle classifies the face as oval, round, square, heart, or oblong to power fit scoring.",
      },
      {
        title: "Expert-optician recommendations",
        description:
          "A LangGraph agentic pipeline wraps GPT-4.1 with an expert-optician persona to recommend the top SKUs for the detected face shape and fit.",
      },
      {
        title: "2D asset upload + auto SVG overlay",
        description:
          "Upload a 2D goggle image; the backend runs Pillow + landmark detection to generate an SVG overlay and landmarks automatically.",
      },
      {
        title: "Multi-photo 3D reconstruction",
        description:
          "Upload multiple photos of a frame to trigger a COLMAP-style point cloud + mesh generation pipeline for new SKUs.",
      },
      {
        title: "Lens tint visualization",
        description:
          "Preview clear, blue-light, polarized, sunglass, gradient, and mirror tints on the current frame in real time.",
      },
      {
        title: "Session persistence + analytics",
        description:
          "Every try-on session is persisted via SQLAlchemy + PostgreSQL for history, recommendations memory, and usage analytics.",
      },
    ],
    techStack: [
      { label: "Python 3.12 + FastAPI", role: "Async REST API with auto-generated OpenAPI docs" },
      { label: "PostgreSQL 16 + SQLAlchemy 2.0", role: "Async ORM for sessions, assets, and reconstruction jobs" },
      { label: "LangGraph + LangChain + GPT-4.1", role: "Agentic DAG pipeline for fit analysis + style recommendations" },
      { label: "MediaPipe (server + client)", role: "478-point face mesh detection via WASM at 30–60 FPS" },
      { label: "React 18 + TypeScript + Vite", role: "Hot-reload frontend with type-safe API integration" },
      { label: "Three.js + @react-three/fiber + drei", role: "WebGL 3D rendering of GLB goggle models with R3F" },
      { label: "Pillow + trimesh", role: "Image compositing + 3D model dimension extraction" },
      { label: "Docker Compose v2", role: "Orchestrates backend, frontend, and PostgreSQL containers" },
      { label: "Playwright 1.51 + pytest 8", role: "End-to-end browser tests + backend unit/integration" },
    ],
  },
  {
    slug: "voice-agent",
    title: "Voice Agent",
    category: "Voice AI",
    tagline:
      "Real-time conversational voice agent with sub-1.2s round-trip latency, multi-language speech, and tool-calling via LangGraph + LiveKit.",
    summary:
      "Voice Agent is a production-grade conversational AI proof of concept that demonstrates a sub-1.2-second round-trip from end-of-utterance to first audio byte — the latency budget that separates a natural-feeling agent from one that feels broken. The platform combines LiveKit Cloud (WebRTC SFU + Python agent worker), a LangGraph state machine for conversation flow, FastMCP for tool exposure, Sarvam for Indian-language speech, Groq for English speech, and OpenAI for language understanding. PostgreSQL persists session memory; Redis holds live state. The architecture follows the latency budget, silence-handling, and conversation-design patterns from the Building Intelligent Voice Agents guide.",
    launchUrl: "/demo/voice",
    status: "live",
    releaseVersion: "v1.0",
    lastUpdated: "2026-05-08",
    architectureDocHref: "/demo/voice-agent",
    // Walkthrough video — auto-recorded against the live dev page via:
    //   node scripts/generate-demo-walkthrough.mjs --slug voice-agent --host https://dev.colaberry.ai
    // Refresh whenever the detail-page layout meaningfully changes.
    videoEmbedUrl: "/videos/voice-agent-walkthrough.mp4",
    videoPoster: "/videos/voice-agent-walkthrough-poster.jpg",
    videoCaption: "Detail-page tour · LiveKit + LangGraph + multi-language voice stack",
    metrics: [
      { value: "<1.2s", label: "Round-trip latency" },
      { value: "<1.1s", label: "Max silence" },
      { value: "Multi-lang", label: "EN + Indian" },
      { value: "WebRTC", label: "Audio transport" },
    ],
    features: [
      {
        title: "Sub-1.2s round-trip latency",
        description:
          "End-to-end pipeline tuned to keep total time from end of caller's utterance to first audio byte of the agent's response under the 1.2-second budget that separates natural conversation from a broken-feeling agent.",
      },
      {
        title: "Filler-phrase handler against silence",
        description:
          "When the language model is slow, a brief phrase like 'let me check on that for you' fills the gap without breaking flow. The agent never goes silent for more than 1.1 seconds — silence in a phone call is an error signal, not a neutral state.",
      },
      {
        title: "LangGraph conversation state machine",
        description:
          "Multi-turn dialog managed as an explicit DAG with named nodes (greet, gather, confirm, fulfill, recover) instead of free-form prompts — predictable, testable, and easier to evolve as flows grow.",
      },
      {
        title: "FastMCP tool exposure",
        description:
          "External tools (lookups, bookings, escalations) are surfaced through FastMCP so the agent can call them mid-conversation with bounded latency and structured arguments.",
      },
      {
        title: "Multi-language speech (Sarvam + Groq)",
        description:
          "Sarvam handles Indian-language voice (Hindi, Telugu, Tamil, etc.); Groq handles English STT with sub-200ms first-token. Voice routing is transparent to the language model.",
      },
      {
        title: "OpenAI for language understanding",
        description:
          "Conversation reasoning, intent extraction, and tool-argument synthesis run through OpenAI; the model sees only text after STT, so the language layer is decoupled from the audio layer.",
      },
      {
        title: "Persistent + live session memory",
        description:
          "PostgreSQL stores cross-call memory (preferences, history); Redis holds live in-session state (current turn, pending tool calls, partial transcripts) so reconnections after a network blip resume cleanly.",
      },
      {
        title: "LiveKit Cloud audio transport",
        description:
          "WebRTC SFU handles bidirectional low-latency audio. The Python agent worker auto-joins each room created by the front-end token-issuer; no audio ever transits our application server.",
      },
    ],
    techStack: [
      { label: "LiveKit Cloud (Agents SDK + SFU)", role: "WebRTC audio transport + Python agent worker that auto-joins rooms" },
      { label: "LangGraph", role: "Stateful conversation DAG (greet → gather → confirm → fulfill → recover)" },
      { label: "FastMCP", role: "Tool exposure surface — lookup, booking, escalation calls during a turn" },
      { label: "Sarvam", role: "Indian-language speech-to-text + text-to-speech (Hindi, Telugu, Tamil, etc.)" },
      { label: "Groq", role: "English speech-to-text with sub-200ms first-token latency" },
      { label: "OpenAI", role: "Language understanding, intent extraction, tool-argument synthesis" },
      { label: "PostgreSQL", role: "Persistent cross-call memory (preferences, history, audit log)" },
      { label: "Redis", role: "Live in-session state (current turn, pending tool calls, partial transcripts)" },
      { label: "Next.js 15 + LiveKit React SDK", role: "Front-end UI + server-side LiveKit access-token issuer" },
    ],
  },
];

/** Lookup helper used by the detail page + hub. */
export function getDemoBySlug(slug: string): DemoConfig | undefined {
  return demos.find((demo) => demo.slug === slug);
}

/** Slugs for getStaticPaths — only `live` demos get pre-rendered detail pages. */
export function getLiveDemoSlugs(): string[] {
  return demos.filter((demo) => demo.status === "live").map((demo) => demo.slug);
}
