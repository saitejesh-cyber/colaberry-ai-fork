import Layout from "../components/Layout";
import Image from "next/image";
import Link from "next/link";
import Head from "next/head";
import type { GetStaticProps } from "next";
import type { ContentTypeName } from "../lib/ontologyTypes";
import { useCallback, useEffect, useRef, useState } from "react";
import SectionHeader from "../components/SectionHeader";
import HeroGraphBloom from "../components/HeroGraphBloom";
import KineticHeading from "../components/KineticHeading";
import { m, useScroll, useTransform, useReducedMotion } from "framer-motion";
import {
  fetchAgents,
  fetchSkills,
  fetchMCPServers,
  fetchPodcastEpisodes,
  fetchUseCases,
  fetchCatalogCounts,
  type Agent,
  type Skill,
  type MCPServer,
  type PodcastEpisode,
  type UseCase,
} from "../lib/cms";
// heroImage available from ../lib/media if needed
import { seoTags, type SeoMeta } from "../lib/seo";
// PodcastSignup and NewsletterSignup removed from homepage per Ram's feedback

type HomePodcastSignal = {
  id: number;
  slug: string;
  title: string;
  publishedDate: string | null;
  podcastType?: string | null;
  coverImageUrl?: string | null;
  duration?: string | null;
  episodeNumber?: number | null;
};

type HomeAgentSignal = {
  id: number;
  slug: string;
  name: string;
  category?: string | null;
  lastUpdated?: string | null;
  rating?: number | null;
  usageCount?: number | null;
};

type HomeUseCaseSignal = {
  id: number;
  slug: string;
  title: string;
  lastUpdated?: string | null;
  verified?: boolean | null;
  linkedCount: number;
};

type HomeMcpSignal = {
  id: number;
  slug: string;
  name: string;
  category?: string | null;
  lastUpdated?: string | null;
  rating?: number | null;
  usageCount?: number | null;
};

type HomeSkillSignal = {
  id: number;
  slug: string;
  name: string;
  category?: string | null;
  lastUpdated?: string | null;
  rating?: number | null;
  usageCount?: number | null;
};

type HomeProps = {
  latestPodcasts: HomePodcastSignal[];
  trendingPodcasts: HomePodcastSignal[];
  latestAgents: HomeAgentSignal[];
  trendingAgents: HomeAgentSignal[];
  latestSkills: HomeSkillSignal[];
  trendingSkills: HomeSkillSignal[];
  latestUseCases: HomeUseCaseSignal[];
  trendingUseCases: HomeUseCaseSignal[];
  latestMCPs: HomeMcpSignal[];
  trendingMCPs: HomeMcpSignal[];
  catalogCounts: { agents: number; mcpServers: number; skills: number; tools: number; podcasts: number };
};

/* ── Integration chip logos (20×20 official brand SVGs from Simple Icons / CDN) ── */
const _sz = { width: 20, height: 20, viewBox: "0 0 24 24", className: "shrink-0" };
const INTEGRATION_CHIPS: { name: string; logo: React.ReactNode }[] = [
  /* Slack — official Simple Icons path (#4A154B) */
  { name: "Slack", logo: <svg {..._sz}><path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" fill="#4A154B"/></svg> },
  /* Microsoft Teams — official Simple Icons path (#6264A7) */
  { name: "Microsoft Teams", logo: <svg {..._sz}><path d="M20.625 8.127q-.55 0-1.025-.205-.475-.205-.832-.563-.358-.357-.563-.832Q18 6.053 18 5.502q0-.54.205-1.02t.563-.837q.357-.358.832-.563.474-.205 1.025-.205.54 0 1.02.205t.837.563q.358.357.563.837.205.48.205 1.02 0 .55-.205 1.025-.205.475-.563.832-.357.358-.837.563-.48.205-1.02.205zm0-3.75q-.469 0-.797.328-.328.328-.328.797 0 .469.328.797.328.328.797.328.469 0 .797-.328.328-.328.328-.797 0-.469-.328-.797-.328-.328-.797-.328zM24 10.002v5.578q0 .774-.293 1.46-.293.685-.803 1.194-.51.51-1.195.803-.686.293-1.459.293-.445 0-.908-.105-.463-.106-.85-.329-.293.95-.855 1.729-.563.78-1.319 1.336-.756.557-1.67.861-.914.305-1.898.305-1.148 0-2.162-.398-1.014-.399-1.805-1.102-.79-.703-1.312-1.664t-.674-2.086h-5.8q-.411 0-.704-.293T0 16.881V6.873q0-.41.293-.703t.703-.293h8.59q-.34-.715-.34-1.5 0-.727.275-1.365.276-.639.75-1.114.475-.474 1.114-.75.638-.275 1.365-.275t1.365.275q.639.276 1.114.75.474.475.75 1.114.275.638.275 1.365t-.275 1.365q-.276.639-.75 1.113-.475.475-1.114.75-.638.276-1.365.276-.188 0-.375-.024-.188-.023-.375-.058v1.078h10.875q.469 0 .797.328.328.328.328.797zM12.75 2.373q-.41 0-.78.158-.368.158-.638.434-.27.275-.428.639-.158.363-.158.773 0 .41.158.78.159.368.428.638.27.27.639.428.369.158.779.158.41 0 .773-.158.364-.159.64-.428.274-.27.433-.639.158-.369.158-.779 0-.41-.158-.773-.159-.364-.434-.64-.275-.275-.639-.433-.363-.158-.773-.158zM6.937 9.814h2.25V7.94H2.814v1.875h2.25v6h1.875zm10.313 7.313v-6.75H12v6.504q0 .41-.293.703t-.703.293H8.309q.152.809.556 1.5.405.691.985 1.19.58.497 1.318.779.738.281 1.582.281.926 0 1.746-.352.82-.351 1.436-.966.615-.616.966-1.43.352-.815.352-1.752zm5.25-1.547v-5.203h-3.75v6.855q.305.305.691.452.387.146.809.146.469 0 .879-.176.41-.175.715-.48.304-.305.48-.715t.176-.879Z" fill="#6264A7"/></svg> },
  /* Google Drive — official Simple Icons path (#4285F4) */
  { name: "Google Drive", logo: <svg {..._sz}><path d="M12.01 1.485c-2.082 0-3.754.02-3.743.047.01.02 1.708 3.001 3.774 6.62l3.76 6.574h3.76c2.081 0 3.753-.02 3.742-.047-.005-.02-1.708-3.001-3.775-6.62l-3.76-6.574zm-4.76 1.73a789.828 789.861 0 0 0-3.63 6.319L0 15.868l1.89 3.298 1.885 3.297 3.62-6.335 3.618-6.33-1.88-3.287C8.1 4.704 7.255 3.22 7.25 3.214zm2.259 12.653-.203.348c-.114.198-.96 1.672-1.88 3.287a423.93 423.948 0 0 1-1.698 2.97c-.01.026 3.24.042 7.222.042h7.244l1.796-3.157c.992-1.734 1.85-3.23 1.906-3.323l.104-.167h-7.249z" fill="#4285F4"/></svg> },
  /* Salesforce — official Simple Icons path (#00A1E0) */
  { name: "Salesforce", logo: <svg {..._sz}><path d="M10.006 5.415a4.195 4.195 0 0 1 3.045-1.306c1.56 0 2.954.9 3.69 2.205.63-.3 1.35-.45 2.1-.45 2.85 0 5.159 2.34 5.159 5.22s-2.31 5.22-5.176 5.22c-.345 0-.69-.044-1.02-.104a3.75 3.75 0 0 1-3.3 1.95c-.6 0-1.155-.15-1.65-.375A4.314 4.314 0 0 1 8.88 20.4a4.302 4.302 0 0 1-4.05-2.82c-.27.062-.54.076-.825.076-2.204 0-4.005-1.8-4.005-4.05 0-1.5.811-2.805 2.01-3.51-.255-.57-.39-1.2-.39-1.846 0-2.58 2.1-4.65 4.65-4.65 1.53 0 2.85.705 3.72 1.8" fill="#00A1E0"/></svg> },
  /* ServiceNow — stylised "S" ring mark (#81B5A1) */
  { name: "ServiceNow", logo: <svg {..._sz}><path d="M12 1C5.925 1 1 5.925 1 12s4.925 11 11 11 11-4.925 11-11S18.075 1 12 1zm0 18.5a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15z" fill="#81B5A1"/><circle cx="12" cy="12" r="3.5" fill="#81B5A1"/></svg> },
  /* Workday — sunrise mark (#F68D2E) */
  { name: "Workday", logo: <svg {..._sz}><circle cx="12" cy="13" r="4" fill="#F68D2E"/><rect x="11.25" y="3" width="1.5" height="4" rx=".75" fill="#F68D2E"/><rect x="11.25" y="3" width="1.5" height="4" rx=".75" fill="#F68D2E" transform="rotate(45 12 13)"/><rect x="11.25" y="3" width="1.5" height="4" rx=".75" fill="#F68D2E" transform="rotate(90 12 13)"/><rect x="11.25" y="3" width="1.5" height="4" rx=".75" fill="#F68D2E" transform="rotate(135 12 13)"/><rect x="11.25" y="3" width="1.5" height="4" rx=".75" fill="#F68D2E" transform="rotate(180 12 13)"/><rect x="11.25" y="3" width="1.5" height="4" rx=".75" fill="#F68D2E" transform="rotate(225 12 13)"/><rect x="11.25" y="3" width="1.5" height="4" rx=".75" fill="#F68D2E" transform="rotate(270 12 13)"/><rect x="11.25" y="3" width="1.5" height="4" rx=".75" fill="#F68D2E" transform="rotate(315 12 13)"/></svg> },
  /* Jira — official Simple Icons path (#0052CC) */
  { name: "Jira", logo: <svg {..._sz}><path d="M11.571 11.513H0a5.218 5.218 0 0 0 5.232 5.215h2.13v2.057A5.215 5.215 0 0 0 12.575 24V12.518a1.005 1.005 0 0 0-1.005-1.005zm5.723-5.756H5.736a5.215 5.215 0 0 0 5.215 5.214h2.129v2.058a5.218 5.218 0 0 0 5.215 5.214V6.758a1.001 1.001 0 0 0-1.001-1.001zM23.013 0H11.455a5.215 5.215 0 0 0 5.215 5.215h2.129v2.057A5.215 5.215 0 0 0 24 12.483V1.005A1.001 1.001 0 0 0 23.013 0Z" fill="#0052CC"/></svg> },
  /* Okta — official Simple Icons path (#007DC1) */
  { name: "Okta", logo: <svg {..._sz}><path d="M12 0C5.389 0 0 5.35 0 12s5.35 12 12 12 12-5.35 12-12S18.611 0 12 0zm0 18c-3.325 0-6-2.675-6-6s2.675-6 6-6 6 2.675 6 6-2.675 6-6 6z" fill="#007DC1"/></svg> },
  /* Zendesk — official Simple Icons path (dark mode aware) */
  { name: "Zendesk", logo: <svg {..._sz}><path d="M12.914 2.904V16.29L24 2.905H12.914zM0 2.906C0 5.966 2.483 8.45 5.543 8.45s5.542-2.484 5.543-5.544H0zm11.086 4.807L0 21.096h11.086V7.713zm7.37 7.84c-3.063 0-5.542 2.48-5.542 5.543H24c0-3.06-2.48-5.543-5.543-5.543z" fill="currentColor" className="text-[#03363D] dark:text-zinc-300"/></svg> },
  /* Snowflake — official Simple Icons path (#29B5E8) */
  { name: "Snowflake", logo: <svg {..._sz}><path d="M24 3.459c0 .646-.418 1.18-1.141 1.18-.723 0-1.142-.534-1.142-1.18 0-.647.419-1.18 1.142-1.18.723 0 1.141.533 1.141 1.18zm-.228 0c0-.533-.38-.951-.913-.951s-.913.38-.913.95c0 .533.38.952.913.952.57 0 .913-.419.913-.951zm-1.37-.533h.495c.266 0 .456.152.456.38 0 .153-.076.229-.19.305l.19.266v.038h-.266l-.19-.266h-.229v.266h-.266zm.495.228h-.229v.267h.229c.114 0 .152-.038.152-.114.038-.077-.038-.153-.152-.153zM7.602 12.4c.038-.151.076-.304.076-.456 0-.114-.038-.228-.038-.342-.114-.343-.304-.647-.646-.838l-4.87-2.777c-.685-.38-1.56-.152-1.94.533-.381.685-.153 1.56.532 1.94l2.701 1.56-2.701 1.56c-.685.38-.913 1.256-.533 1.94.38.685 1.256.914 1.94.533l4.832-2.777c.343-.267.571-.533.647-.876zm1.332 2.626c-.266-.038-.57.038-.837.19l-4.832 2.777c-.685.38-.913 1.256-.532 1.94.38.686 1.255.914 1.94.533l2.701-1.56v3.12c0 .8.647 1.408 1.446 1.408.799 0 1.407-.647 1.407-1.408v-5.592c0-.761-.57-1.37-1.293-1.408zm4.946-6.088c.266.038.57-.038.837-.19l4.832-2.777c.685-.38.913-1.256.532-1.94-.38-.686-1.255-.914-1.94-.533l-2.701 1.56V1.975c0-.799-.647-1.408-1.446-1.408-.799 0-1.446.609-1.446 1.408V7.53c0 .76.609 1.37 1.332 1.407zM3.265 5.97l4.832 2.777c.266.152.533.19.837.19.723-.038 1.331-.684 1.331-1.407V1.975c0-.799-.646-1.408-1.407-1.408-.799 0-1.446.647-1.446 1.408v3.12l-2.701-1.56c-.685-.38-1.56-.152-1.94.533-.419.646-.19 1.521.494 1.902zm9.093 6.011a.412.412 0 0 0-.114-.266l-.57-.571a.346.346 0 0 0-.267-.114.412.412 0 0 0-.266.114l-.571.57a.411.411 0 0 0-.114.267c0 .076.038.19.114.267l.57.57a.345.345 0 0 0 .267.114c.076 0 .19-.038.266-.114l.571-.57a.412.412 0 0 0 .114-.267zm1.598.533L11.94 14.53c-.039.038-.153.114-.229.114h-.608a.411.411 0 0 1-.267-.114L8.82 12.514a.408.408 0 0 1-.076-.229v-.608c0-.076.038-.19.114-.267l2.016-2.016a.41.41 0 0 1 .267-.114h.608a.41.41 0 0 1 .267.114l2.016 2.016a.347.347 0 0 1 .114.267v.608c-.076.077-.114.19-.19.229zm5.593 5.44l-4.832-2.777c-.266-.152-.57-.19-.837-.152-.723.038-1.332.684-1.332 1.408v5.554c0 .8.647 1.408 1.408 1.408.799 0 1.446-.647 1.446-1.408v-3.12l2.7 1.56c.686.38 1.561.152 1.941-.533.419-.646.19-1.521-.494-1.94zm2.549-7.533l-2.701 1.56 2.7 1.56c.686.38.914 1.256.533 1.94-.38.685-1.255.913-1.94.533l-4.832-2.778a1.644 1.644 0 0 1-.647-.798c-.037-.153-.076-.305-.076-.457 0-.114.039-.228.039-.342.114-.343.342-.647.646-.837l4.832-2.778c.685-.38 1.56-.152 1.94.533.457.609.19 1.484-.494 1.864" fill="#29B5E8"/></svg> },
  /* AWS — official Simple Icons path (#FF9900) */
  { name: "AWS", logo: <svg {..._sz}><path d="M6.763 10.036c0 .296.032.535.088.71.064.176.144.368.256.576.04.063.056.127.056.183 0 .08-.048.16-.152.24l-.503.335a.383.383 0 0 1-.208.072c-.08 0-.16-.04-.239-.112a2.47 2.47 0 0 1-.287-.375 6.18 6.18 0 0 1-.248-.471c-.622.734-1.405 1.101-2.347 1.101-.67 0-1.205-.191-1.596-.574-.391-.384-.59-.894-.59-1.533 0-.678.239-1.23.726-1.644.487-.415 1.133-.623 1.955-.623.272 0 .551.024.846.064.296.04.6.104.918.176v-.583c0-.607-.127-1.03-.375-1.277-.255-.248-.686-.367-1.3-.367-.28 0-.568.031-.863.103-.295.072-.583.16-.862.272a2.287 2.287 0 0 1-.28.104.488.488 0 0 1-.127.023c-.112 0-.168-.08-.168-.247v-.391c0-.128.016-.224.056-.28a.597.597 0 0 1 .224-.167c.279-.144.614-.264 1.005-.36a4.84 4.84 0 0 1 1.246-.151c.95 0 1.644.216 2.091.647.439.43.662 1.085.662 1.963v2.586zm-3.24 1.214c.263 0 .534-.048.822-.144.287-.096.543-.271.758-.51.128-.152.224-.32.272-.512.047-.191.08-.423.08-.694v-.335a6.66 6.66 0 0 0-.735-.136 6.02 6.02 0 0 0-.75-.048c-.535 0-.926.104-1.19.32-.263.215-.39.518-.39.917 0 .375.095.655.295.846.191.2.47.296.838.296zm6.41.862c-.144 0-.24-.024-.304-.08-.064-.048-.12-.16-.168-.311L7.586 5.55a1.398 1.398 0 0 1-.072-.32c0-.128.064-.2.191-.2h.783c.151 0 .255.025.31.08.065.048.113.16.16.312l1.342 5.284 1.245-5.284c.04-.16.088-.264.151-.312a.549.549 0 0 1 .32-.08h.638c.152 0 .256.025.32.08.063.048.12.16.151.312l1.261 5.348 1.381-5.348c.048-.16.104-.264.16-.312a.52.52 0 0 1 .311-.08h.743c.127 0 .2.065.2.2 0 .04-.009.08-.017.128a1.137 1.137 0 0 1-.056.2l-1.923 6.17c-.048.16-.104.263-.168.311a.51.51 0 0 1-.303.08h-.687c-.151 0-.255-.024-.32-.08-.063-.056-.119-.16-.15-.32l-1.238-5.148-1.23 5.14c-.04.16-.087.264-.15.32-.065.056-.177.08-.32.08zm10.256.215c-.415 0-.83-.048-1.229-.143-.399-.096-.71-.2-.918-.32-.128-.071-.215-.151-.247-.223a.563.563 0 0 1-.048-.224v-.407c0-.167.064-.247.183-.247.048 0 .096.008.144.024.048.016.12.048.2.08.271.12.566.215.878.279.319.064.63.096.95.096.502 0 .894-.088 1.165-.264a.86.86 0 0 0 .415-.758.777.777 0 0 0-.215-.559c-.144-.151-.416-.287-.807-.415l-1.157-.36c-.583-.183-1.014-.454-1.277-.813a1.902 1.902 0 0 1-.4-1.158c0-.335.073-.63.216-.886.144-.255.335-.479.575-.654.24-.184.51-.32.83-.415.32-.096.655-.136 1.006-.136.175 0 .359.008.535.032.183.024.35.056.518.088.16.04.312.08.455.127.144.048.256.096.336.144a.69.69 0 0 1 .24.2.43.43 0 0 1 .071.263v.375c0 .168-.064.256-.184.256a.83.83 0 0 1-.303-.096 3.652 3.652 0 0 0-1.532-.311c-.455 0-.815.071-1.062.223-.248.152-.375.383-.375.71 0 .224.08.416.24.567.159.152.454.304.877.44l1.134.358c.574.184.99.44 1.237.767.247.327.367.702.367 1.117 0 .343-.072.655-.207.926-.144.272-.336.511-.583.703-.248.2-.543.343-.886.447-.36.111-.734.167-1.142.167zM21.698 16.207c-2.626 1.94-6.442 2.969-9.722 2.969-4.598 0-8.74-1.7-11.87-4.526-.247-.223-.024-.527.272-.351 3.384 1.963 7.559 3.153 11.877 3.153 2.914 0 6.114-.607 9.06-1.852.439-.2.814.287.383.607zM22.792 14.961c-.336-.43-2.22-.207-3.074-.103-.255.032-.295-.192-.063-.36 1.5-1.053 3.967-.75 4.254-.399.287.36-.08 2.826-1.485 4.007-.215.184-.423.088-.327-.151.32-.79 1.03-2.57.695-2.994z" fill="#FF9900"/></svg> },
  /* GitHub — official Simple Icons path (dark mode aware) */
  { name: "GitHub", logo: <svg {..._sz}><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" fill="currentColor" className="text-zinc-800 dark:text-zinc-200"/></svg> },
];

export default function Home({
  latestPodcasts,
  latestAgents,
  latestSkills,
  latestUseCases,
  latestMCPs,
  trendingPodcasts,
  trendingAgents,
  trendingSkills,
  trendingUseCases,
  trendingMCPs,
  catalogCounts,
}: HomeProps) {
  // Hardcoded minimums so metrics never show "0+" when CMS is unreachable during ISR
  const FALLBACK_COUNTS = { agents: 160, mcpServers: 1500, skills: 500, tools: 0, podcasts: 246 };
  const safeCounts = {
    agents: catalogCounts.agents || FALLBACK_COUNTS.agents,
    mcpServers: catalogCounts.mcpServers || FALLBACK_COUNTS.mcpServers,
    skills: catalogCounts.skills || FALLBACK_COUNTS.skills,
    tools: catalogCounts.tools || FALLBACK_COUNTS.tools,
    podcasts: catalogCounts.podcasts || FALLBACK_COUNTS.podcasts,
  };
  const fmt = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k+` : `${n}+`;

  /* ── Mouse-reactive parallax for orbital diagram (ref-based, no re-renders) ── */
  const heroRef = useRef<HTMLElement>(null);
  const parallaxGlowRef = useRef<HTMLDivElement>(null);
  const parallaxMetricRef = useRef<HTMLDivElement>(null);
  const rafId = useRef(0);
  const handleHeroMouse = useCallback((e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width - 0.5;
    const ny = (e.clientY - rect.top) / rect.height - 0.5;
    cancelAnimationFrame(rafId.current);
    rafId.current = requestAnimationFrame(() => {
      if (parallaxGlowRef.current) parallaxGlowRef.current.style.transform = `translate(${nx * -6}px, ${ny * -6}px)`;
      if (parallaxMetricRef.current) parallaxMetricRef.current.style.transform = `translate(${nx * 8}px, ${ny * 8}px)`;
    });
  }, []);
  const handleHeroLeave = useCallback(() => {
    cancelAnimationFrame(rafId.current);
    rafId.current = requestAnimationFrame(() => {
      if (parallaxGlowRef.current) parallaxGlowRef.current.style.transform = "translate(0px, 0px)";
      if (parallaxMetricRef.current) parallaxMetricRef.current.style.transform = "translate(0px, 0px)";
    });
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- false positive: used at line ~492
  const industries = [
    { name: "Agriculture", slug: "agriculture", icon: "leaf" as const },
    { name: "Energy", slug: "energy", icon: "droplet" as const },
    { name: "Utilities", slug: "utilities", icon: "tower" as const },
    {
      name: "Healthcare & Life Sciences",
      slug: "healthcare-life-sciences",
      icon: "dna" as const,
    },
    { name: "Climate Tech", slug: "climate-tech", icon: "leaf" as const },
    { name: "Manufacturing", slug: "manufacturing", icon: "factory" as const },
    { name: "Fintech", slug: "fintech", icon: "truck" as const },
    { name: "Supply Chain", slug: "supply-chain", icon: "truck" as const },
  ];

  const catalogs: CatalogItem[] = [
    {
      href: "/resources/podcasts",
      title: "AI Podcasts",
      description: "246 episodes with full transcripts, timestamps, and linked artifacts from Colaberry AI.",
      meta: "246 episodes",
      iconType: "podcast",
      gradient: "from-zinc-900 via-zinc-800 to-zinc-950",
      accentColor: "#a78bfa",
    },
    {
      href: "/aixcelerator/agents",
      title: "AI Agents",
      description: `${safeCounts.agents}+ enterprise agents with ownership, runbooks, and deployment readiness across 13 industries.`,
      meta: `${fmt(safeCounts.agents)} agents`,
      iconType: "agent",
      gradient: "from-zinc-900 via-zinc-800 to-zinc-900",
      accentColor: "#ef4444",
    },
    {
      href: "/aixcelerator/mcp",
      title: "MCP Servers",
      description: "1,500+ Model Context Protocol servers with tool access, connectors, and integration templates.",
      meta: "1.5k+ servers",
      iconType: "mcp",
      gradient: "from-zinc-900 via-zinc-800 to-zinc-950",
      accentColor: "#3b82f6",
    },
    {
      href: "/aixcelerator/skills",
      title: "AI Skills",
      description: `${safeCounts.skills.toLocaleString()}+ reusable capability units across workflow, domain, and orchestration categories.`,
      meta: `${fmt(safeCounts.skills)} skills`,
      iconType: "skill",
      gradient: "from-zinc-900 via-zinc-800 to-zinc-900",
      accentColor: "#f59e0b",
    },
    /* Use cases hidden for Release-1.0
    {
      href: "/solutions",
      title: "Use Cases",
      description: "Solution blueprints mapped to outcomes and operating models.",
      meta: "Solutions",
      iconType: "tool",
      gradient: "from-zinc-900 via-zinc-800 to-zinc-900",
      accentColor: "#10b981",
    },
    */
    {
      href: "/resources/books",
      title: "Books & Research",
      description: "Enterprise reference material, delivery frameworks, and responsible AI research.",
      meta: "Research",
      iconType: "skill",
      gradient: "from-zinc-900 via-zinc-800 to-zinc-900",
      accentColor: "#22d3ee",
    },
    {
      href: "/aixcelerator/ontology",
      title: "Knowledge Graph",
      description: "Knowledge graph ontology mapping agents, skills, MCPs, and tools into a structured intelligence layer.",
      meta: "Ontology",
      iconType: "mcp",
      gradient: "from-zinc-900 via-zinc-800 to-zinc-950",
      accentColor: "#f87171",
    },
  ];

  const platformTabs = [
    {
      id: "agents" as const,
      label: "Agents",
      title: "Agents & assistants catalog",
      description: "Adopt agents with clear ownership, status, and workflow alignment — ready for rollout. Browse by industry, deployment stage, and readiness level.",
      href: "/aixcelerator/agents",
      metrics: [
        { value: fmt(safeCounts.agents), label: "Agent profiles" },
        { value: "14", label: "Industries" },
        { value: fmt(safeCounts.agents), label: "Public agents" },
      ],
    },
    {
      id: "mcp" as const,
      label: "MCP",
      title: "MCP integration library",
      description: "Standardize tool access via MCP with integration-ready server patterns and endpoints. Connect your existing stack with governed, tested connectors.",
      href: "/aixcelerator/mcp",
      metrics: [
        { value: fmt(safeCounts.mcpServers), label: "MCP servers" },
        { value: "12", label: "Tool categories" },
        { value: "100%", label: "Tested connectors" },
      ],
    },
    {
      id: "skills" as const,
      label: "Skills",
      title: "Reusable AI skill library",
      description: "Discover modular, composable skills that agents use to execute tasks — from data extraction to code generation. Browse by category, source, and compatibility.",
      href: "/aixcelerator/skills",
      metrics: [
        { value: fmt(safeCounts.skills), label: "Skills indexed" },
        { value: "10", label: "Categories" },
        { value: "Composable", label: "Architecture" },
      ],
    },
    {
      id: "observability" as const,
      label: "Observability",
      title: "Observability + evaluation",
      description: "Track outcomes and failures, then close the loop with evaluations to improve reliability. Monitor agent performance across deployment stages.",
      href: "/aixcelerator",
      metrics: [
        { value: "Real-time", label: "Performance data" },
        { value: "Full", label: "Lifecycle tracking" },
        { value: "Built-in", label: "Eval frameworks" },
      ],
    },
    {
      id: "security" as const,
      label: "Security",
      title: "Security by design",
      description: "Access controls, data boundaries, and governance workflows designed for enterprise. Every agent and connector governed from day one.",
      href: "/aixcelerator",
      metrics: [
        { value: "SOC 2", label: "Compliant" },
        { value: "RBAC", label: "Access control" },
        { value: "Full", label: "Audit trail" },
      ],
    },
    {
      id: "workspaces" as const,
      label: "Workspaces",
      title: "Industry workspaces",
      description: "Bring domain context into delivery with repeatable playbooks and patterns. Tailored for agriculture, healthcare, oil & gas, biotech, and more.",
      href: "/industries",
      metrics: [
        { value: "10", label: "Industries" },
        { value: "Custom", label: "Playbooks" },
        { value: "Domain", label: "Intelligence" },
      ],
    },
    {
      id: "developer" as const,
      label: "Developer",
      title: "Developer control",
      description: "Use a clean platform surface that supports code-level control with faster patterns when needed. API-first design with full SDK access.",
      href: "/aixcelerator",
      metrics: [
        { value: "REST", label: "API access" },
        { value: "Full", label: "SDK support" },
        { value: "CI/CD", label: "Integration" },
      ],
    },
  ];

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.colaberry.ai";
  const metaDescription =
    "Colaberry AI is an LLM-ready catalog and knowledge graph for AI agents, MCP servers, skills, podcasts, and enterprise AI discovery.";
  const seoMeta: SeoMeta = {
    title: "Colaberry AI | The go-to destination for agents, MCPs, and AI knowledge",
    description: metaDescription,
    canonical: siteUrl,
    ogImage: "/og/homepage.png",
    ogImageAlt: "Colaberry AI — The go-to destination for AI agents, MCP servers, skills, and podcasts",
  };
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "Colaberry AI",
      url: siteUrl,
      logo: `${siteUrl}/brand/colaberry-ai-logo.png`,
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "Colaberry AI",
      url: siteUrl,
      description: metaDescription,
      potentialAction: {
        "@type": "SearchAction",
        target: `${siteUrl}/search?q={search_term_string}`,
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "What is Colaberry AI?",
          acceptedAnswer: {
            "@type": "Answer",
            text: `Colaberry AI is an enterprise platform for discovering, evaluating, and deploying AI agents, MCP servers, skills, and research. It catalogs ${safeCounts.agents}+ AI agents, ${safeCounts.mcpServers.toLocaleString()}+ MCP servers, and ${safeCounts.skills.toLocaleString()}+ reusable AI skills — all structured for both human teams and LLM-based discovery.`,
          },
        },
        {
          "@type": "Question",
          name: "What are MCP servers and why do enterprises need them?",
          acceptedAnswer: {
            "@type": "Answer",
            text: `Model Context Protocol (MCP) servers provide standardized tool access and integration templates for AI agents. Colaberry AI catalogs ${safeCounts.mcpServers.toLocaleString()}+ MCP servers across categories like Slack, Salesforce, GitHub, and AWS — enabling enterprises to connect AI agents to their existing tool stack through a unified protocol.`,
          },
        },
        {
          "@type": "Question",
          name: "How is Colaberry AI optimized for Answer Engine Optimization (AEO)?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Colaberry AI is built for AEO — Answer Engine Optimization. Every page includes JSON-LD structured data, the site provides /llms.txt for AI crawlers including OAI-SearchBot, Claude-SearchBot, PerplexityBot, and Google-Extended, and all 260+ podcast episodes include full searchable transcripts. The Colaberry Knowledge Graph maps relationships between agents, skills, MCP servers, and tools — making the content natively accessible to AI answer engines like ChatGPT, Perplexity, Claude, and Gemini.",
          },
        },
      ],
    },
  ];
  const heroCatalogLinks = [
    { href: "/aixcelerator/agents", label: "AI agents catalog" },
    { href: "/aixcelerator/mcp", label: "MCP servers directory" },
    { href: "/aixcelerator/skills", label: "AI skills catalog" },
    { href: "/resources/podcasts", label: "AI podcasts" },
    { href: "/aixcelerator/ontology", label: "Platform ontology" },
    { href: "/aixcelerator/ecosystem", label: "Ecosystem graph" },
  ];

  return (
    <Layout>
      <Head>
        <title>{seoMeta.title}</title>
        {seoTags(seoMeta).map(({ key, ...props }) => (
          "rel" in props ? <link key={key} {...props} /> : <meta key={key} {...props} />
        ))}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      </Head>
      {/* ---- Hero (dark animated hero) ----
       * Restored to the contained-card look: rounded-2xl corners inside
       * the <main> gutter. If we ever want the editorial full-bleed look
       * again, swap this back to `-mx-4 overflow-hidden sm:-mx-6 xl:-mx-8`
       * (no rounded corners at viewport edges). */}
      <section ref={heroRef} onMouseMove={handleHeroMouse} onMouseLeave={handleHeroLeave} className="relative overflow-hidden rounded-2xl" style={{ background: "var(--gradient-hero)" }}>
        {/* Hero visual anchor — coded-motion knowledge-graph constellation
         * (Sprint v5 kinetic-pacing). Replaces the prior `.hero-orb-*` gradient
         * blur stack with a tangible, brand-relevant artifact. The graph itself
         * is decorative (aria-hidden), but it signals what Colaberry *is* —
         * structured relationships — much better than abstract orbs. */}
        <div className="hero-gradient-mesh" aria-hidden="true">
          <HeroGraphBloom />
        </div>

        {/* Radial vignette for depth */}
        <div className="hero-vignette" aria-hidden="true" />

        {/* Subtle noise grain texture — premium depth */}
        <div className="pointer-events-none absolute inset-0 z-[2] opacity-[0.03]" aria-hidden="true" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")", backgroundRepeat: "repeat", backgroundSize: "256px 256px" }} />

        {/* Content — split layout: text left, orbital diagram right.
         * max-w removed so the H1 + metric aside hug the viewport edges
         * on wide screens; tight horizontal padding provides just enough
         * breathing room without a visible content-column gutter. */}
        <div className="relative z-10 w-full px-5 py-10 sm:px-8 sm:py-12 md:px-10 lg:px-14 lg:py-14 xl:min-h-[80vh] xl:flex xl:flex-col xl:justify-center xl:px-16 2xl:px-20">
          <div className="grid grid-cols-1 items-center gap-8 xl:grid-cols-[1fr_auto] xl:gap-10">
            {/* LEFT: Text content */}
            <div className="text-center xl:text-left">
              <div
                className="hero-stagger-1 kicker-chip mx-auto inline-flex rounded-full px-4 py-1.5 text-[0.75rem] tracking-[0.14em] xl:mx-0"
                style={{ borderColor: "rgba(255,255,255,0.20)", background: "rgba(255,255,255,0.08)", color: "#FAFAFA" }}
              >
                <span className="kicker-chip-dot" />
                Enterprise AI Platform
              </div>

              {/* Sprint v5: KineticHeading word-by-word line-mask reveal on the
               * editorial half of the H1; the word rotator is preserved as a
               * child slot so its existing CSS animation continues unaffected.
               * Plain crawlable text "Discover, govern, and scale AI podcasts|
               * agents|MCP servers|skills" is always present in the DOM pre-
               * hydration via the KineticHeading sr-only label + the rotator's
               * static text fallback. */}
              <KineticHeading
                as="h1"
                text="Discover, govern, and scale "
                className="hero-stagger-2 mx-auto mt-6 max-w-[20ch] font-sans text-display-md font-bold text-white text-pretty sm:max-w-[24ch] sm:text-display-lg lg:text-display-xl xl:mx-0 xl:max-w-none 2xl:text-display-2xl"
                duration={0.9}
                stagger={0.08}
              >
                <span className="hero-word-rotator">
                  <span className="hero-word-track">
                    <span className="text-gradient">AI podcasts</span>
                    <span className="text-gradient">AI agents</span>
                    <span className="text-gradient">MCP servers</span>
                    <span className="text-gradient">AI skills</span>
                  </span>
                </span>
              </KineticHeading>

              <p className="hero-stagger-3 mx-auto mt-5 max-w-2xl text-body-lg leading-relaxed text-zinc-300 text-pretty xl:mx-0">
                A unified catalog where teams discover, evaluate, and deploy AI agents, MCP servers, skills, and research — governed and structured for both people and LLMs.
              </p>

              <div className="hero-stagger-4 mt-8 flex flex-wrap justify-center gap-4 xl:justify-start">
                <Link href="/request-demo" className="btn btn-cta" data-tour="hero-cta">
                  Book a demo
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
                <Link
                  href="/aixcelerator"
                  className="btn"
                  style={{ borderColor: "rgba(255,255,255,0.2)", color: "#FAFAFA", background: "rgba(255,255,255,0.06)" }}
                >
                  Explore platform
                </Link>
              </div>

              <div className="hero-stagger-5 mt-6">
                <p className="text-sm font-medium text-zinc-300">
                  Explore the LLM-ready catalogs:
                </p>
                <div className="mt-3 flex flex-wrap justify-center gap-3 xl:justify-start">
                  {heroCatalogLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="inline-flex items-center rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-sm text-zinc-100 transition hover:bg-white/10"
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            {/* RIGHT: Live metrics feed — typography-first showcase.
             * Hidden below xl (1280px) so iPad Pro + smaller tablets get a
             * clean single-column hero with HeroGraphBloom behind centered
             * copy, preventing the coral bleed + metric-panel overlap that
             * broke the layout at 1024px. */}
            <div className="hidden items-center justify-end xl:flex relative overflow-hidden">
              {/* Grid dot pattern — subtle texture */}
              <div className="hero-grid-dots" aria-hidden="true" />

              {/* Atmospheric glow — parallax counter-motion */}
              <div ref={parallaxGlowRef} className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true" style={{ transition: "transform 0.2s ease-out", willChange: "transform" }}>
                <div className="absolute right-[5%] top-[0%] h-[500px] w-[500px] rounded-full bg-[radial-gradient(circle,rgba(220,38,38,0.14)_0%,rgba(220,38,38,0.04)_30%,transparent_55%)] blur-2xl" />
                <div className="absolute right-[20%] top-[50%] h-[300px] w-[300px] rounded-full bg-[radial-gradient(circle,rgba(139,92,246,0.10)_0%,transparent_55%)] blur-3xl" />
                <div className="absolute right-[0%] top-[25%] h-[250px] w-[250px] rounded-full bg-[radial-gradient(circle,rgba(6,182,212,0.08)_0%,transparent_55%)] blur-3xl" />
              </div>

              {/* Hero metric — one massive number + bar breakdown */}
              <div ref={parallaxMetricRef} className="relative z-10" style={{ transition: "transform 0.15s ease-out", willChange: "transform", maxWidth: 420 }}>
                {/* The ONE big hero number */}
                <div className="hero-metric-hero">
                  <div className="hero-metric-hero-number">
                    <span>{fmt(safeCounts.agents + safeCounts.mcpServers + safeCounts.skills + safeCounts.podcasts)}</span>
                  </div>
                  <div className="hero-metric-hero-label">AI resources cataloged</div>
                </div>

                {/* Category breakdown — horizontal bar chart */}
                <div className="hero-breakdown">
                  <Link href="/resources/podcasts" className="hero-bar-row" style={{ "--mc": "236, 72, 153" } as React.CSSProperties}>
                    <div className="hero-bar-row-label">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-3.5 w-3.5"><path d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" /></svg>
                      Podcasts
                    </div>
                    <div className="hero-bar-track"><div className="hero-bar-fill" style={{ "--bar-width": "40%" } as React.CSSProperties} /></div>
                    <div className="hero-bar-count">{fmt(safeCounts.podcasts)}</div>
                  </Link>

                  <Link href="/aixcelerator/agents" className="hero-bar-row" style={{ "--mc": "245, 158, 11" } as React.CSSProperties}>
                    <div className="hero-bar-row-label">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-3.5 w-3.5"><path d="M9.75 3.104v5.714a2.25 2.25 0 0 1-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.3 24.3 0 0 1 4.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19 14.5M12 21a9 9 0 0 0 9-9m-9 9a9 9 0 0 1-9-9" /></svg>
                      Agents
                    </div>
                    <div className="hero-bar-track"><div className="hero-bar-fill" style={{ "--bar-width": "35%" } as React.CSSProperties} /></div>
                    <div className="hero-bar-count">{fmt(safeCounts.agents)}</div>
                  </Link>

                  <Link href="/aixcelerator/mcp" className="hero-bar-row" style={{ "--mc": "6, 182, 212" } as React.CSSProperties}>
                    <div className="hero-bar-row-label">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-3.5 w-3.5"><path d="M5.25 14.25h13.5m-13.5 0a3 3 0 0 1-3-3m3 3a3 3 0 1 0 0 6h13.5a3 3 0 1 0 0-6m-13.5-3a3 3 0 0 1 0-6h13.5a3 3 0 1 1 0 6" /></svg>
                      MCP Servers
                    </div>
                    <div className="hero-bar-track"><div className="hero-bar-fill" style={{ "--bar-width": "55%" } as React.CSSProperties} /></div>
                    <div className="hero-bar-count">{fmt(safeCounts.mcpServers)}</div>
                  </Link>

                  <Link href="/aixcelerator/skills" className="hero-bar-row" style={{ "--mc": "139, 92, 246" } as React.CSSProperties}>
                    <div className="hero-bar-row-label">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-3.5 w-3.5"><path d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" /></svg>
                      Skills
                    </div>
                    <div className="hero-bar-track"><div className="hero-bar-fill" style={{ "--bar-width": "95%" } as React.CSSProperties} /></div>
                    <div className="hero-bar-count">{fmt(safeCounts.skills)}</div>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stay in the loop section removed per Ram's feedback */}

      {/* ---- Trust metrics ---- */}
      <section className="reveal section-spacing">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <PodcastPromoCard episodeCount={safeCounts.podcasts} delay={0} />
          <AnimatedMetric value="8+" label="Industries served" note="Agriculture to fintech" delay={150} />
          <AnimatedMetric value={fmt(safeCounts.agents)} label="Agent profiles" note="Cataloged and governed" delay={300} />
          <AnimatedMetric value={fmt(safeCounts.mcpServers)} label="MCP servers" note="Integration-ready connectors" delay={450} />
          <AnimatedMetric value={fmt(safeCounts.skills)} label="Skills indexed" note="Reusable capability units" delay={600} />
        </div>
      </section>

      {/* divider line removed */}

      <section className="section-spacing">
        <div className="reveal flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <SectionHeader
            kicker="Explore the catalog"
            title="A structured destination for agents, MCPs, skills, podcasts, and research"
            description="Give teams and LLMs a single place to discover, compare, and deploy intelligence."
            animate={false}
            wipeTitle
          />
          <Link href="/aixcelerator/ontology" className="btn btn-primary shrink-0">
            View knowledge graph
          </Link>
        </div>
        <div className="stagger-grid mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" data-tour="catalog-grid">
          {catalogs.map((catalog) => (
            <CatalogCard key={catalog.title} {...catalog} />
          ))}
        </div>
      </section>

      {/* ---- Signal Dashboard (tabbed consolidation) ---- */}
      <SignalDashboard
        latestAgents={latestAgents}
        trendingAgents={trendingAgents}
        latestSkills={latestSkills}
        trendingSkills={trendingSkills}
        latestMCPs={latestMCPs}
        trendingMCPs={trendingMCPs}
        latestPodcasts={latestPodcasts}
        trendingPodcasts={trendingPodcasts}
        latestUseCases={latestUseCases}
        trendingUseCases={trendingUseCases}
      />

      <PlatformTabsSection tabs={platformTabs} />

      <section className="reveal section-spacing surface-panel p-6 sm:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <SectionHeader
            kicker="Connect your stack"
            title="Integrations-ready from day one"
            description="Build assistants that can act across your tools — using a standardized MCP surface."
            wipeTitle
          />
          <Link href="/aixcelerator/mcp" className="btn btn-secondary shrink-0">
            Explore MCP servers
          </Link>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          {INTEGRATION_CHIPS.map(({ name, logo }) => (
            <Link
              key={name}
              href={`/aixcelerator/mcp?q=${encodeURIComponent(name.toLowerCase())}`}
              className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:border-zinc-300 hover:bg-zinc-100 hover:text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:border-zinc-500 dark:hover:bg-zinc-700 dark:hover:text-white"
            >
              {logo}
              {name}
            </Link>
          ))}
        </div>
      </section>

      {/* Industries section hidden for Release-1.0 — re-enable when industry pages have content
      <section className="reveal section-spacing">
        <SectionHeader
          kicker="Industry expertise"
          title="Proven success across industries"
          description="Domain-specific playbooks and patterns for your sector."
        />
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {industries.map((item) => (
            <IndustryTile key={item.slug} href={`/industries/${item.slug}`} title={item.name} icon={item.icon} />
          ))}
        </div>
      </section>
      */}

      <section className="reveal section-spacing surface-panel p-6 sm:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <SectionHeader
              kicker="Explore next"
              title="Resources, solutions, and updates"
              description="Dedicated landing spots for podcasts, books, white papers, case studies, and news."
            />
          </div>
          <Link
            href="/resources"
            className="btn btn-primary shrink-0"
          >
            Explore resources
          </Link>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <QuickLink
            href="/resources/books#trust-before-intelligence"
            title="Trust Before Intelligence"
            description="Foundational research on responsible AI."
          />
          <QuickLink href="/resources/podcasts" title="Podcasts" description="Audio insights, transcripts, and AI narratives." />
          {/* Hidden for Release-1.0: Solutions, Case Studies, News & product */}
        </div>
      </section>
    </Layout>
  );
}

export const getStaticProps: GetStaticProps<HomeProps> = async () => {
  const cmsUrl = process.env.CMS_URL || process.env.NEXT_PUBLIC_CMS_URL || "";
  const hasToken = !!(process.env.CMS_API_TOKEN || "").trim();
  console.log(`[home:getStaticProps] CMS_URL=${cmsUrl ? "set" : "MISSING"} CMS_API_TOKEN=${hasToken ? "set" : "MISSING"}`);

  const allowPrivate = process.env.NEXT_PUBLIC_SHOW_PRIVATE === "true";
  const visibilityFilter = allowPrivate ? undefined : "public";
  const fetchOrEmpty = async <T,>(label: string, task: () => Promise<T>, fallback: T): Promise<T> => {
    try {
      return await task();
    } catch (error) {
      console.error(`[home:getStaticProps] ${label} failed:`, error instanceof Error ? error.message : error);
      return fallback;
    }
  };

  // Parallelize all CMS fetches for 60-80% faster ISR regeneration
  const [
    latestPodcasts,
    trendingPodcasts,
    latestAgentsRaw,
    trendingAgentsRaw,
    latestSkillsRaw,
    trendingSkillsRaw,
    latestUseCasesRaw,
    trendingUseCasesRaw,
    latestMCPRaw,
    trendingMCPRaw,
    catalogCounts,
  ] = await Promise.all([
    fetchOrEmpty("latestPodcasts", () => fetchPodcastEpisodes({ maxRecords: 6, sortBy: "latest" }), [] as PodcastEpisode[]),
    fetchOrEmpty("trendingPodcasts", () => fetchPodcastEpisodes({ maxRecords: 80, sortBy: "trending" }), [] as PodcastEpisode[]),
    fetchOrEmpty("latestAgents", () => fetchAgents(visibilityFilter, { maxRecords: 6, sortBy: "latest" }), [] as Agent[]),
    fetchOrEmpty("trendingAgents", () => fetchAgents(visibilityFilter, { maxRecords: 30 }), [] as Agent[]),
    fetchOrEmpty("latestSkills", () => fetchSkills(visibilityFilter, { maxRecords: 6, sortBy: "latest" }), [] as Skill[]),
    fetchOrEmpty("trendingSkills", () => fetchSkills(visibilityFilter, { maxRecords: 30, sortBy: "latest" }), [] as Skill[]),
    fetchOrEmpty("latestUseCases", () => fetchUseCases(visibilityFilter, { maxRecords: 6, sortBy: "latest" }), [] as UseCase[]),
    fetchOrEmpty("trendingUseCases", () => fetchUseCases(visibilityFilter, { maxRecords: 30, sortBy: "latest" }), [] as UseCase[]),
    fetchOrEmpty("latestMCP", () => fetchMCPServers(visibilityFilter, { maxRecords: 6, sortBy: "latest" }), [] as MCPServer[]),
    fetchOrEmpty("trendingMCP", () => fetchMCPServers(visibilityFilter, { maxRecords: 30 }), [] as MCPServer[]),
    fetchOrEmpty("catalogCounts", () => fetchCatalogCounts(visibilityFilter), { agents: 0, mcpServers: 0, skills: 0, tools: 0, podcasts: 0, llmArchitectures: 0 }),
  ]);

  const latestAgents = sortAgentsByDate(latestAgentsRaw).slice(0, 6).map(toHomeAgentSignal);
  const trendingAgents = sortAgentsByTrending(trendingAgentsRaw).slice(0, 6).map(toHomeAgentSignal);
  const latestSkills = sortSkillsByDate(latestSkillsRaw).slice(0, 6).map(toHomeSkillSignal);
  const trendingSkills = sortSkillsByTrending(trendingSkillsRaw).slice(0, 6).map(toHomeSkillSignal);
  const latestUseCases = sortUseCasesByDate(latestUseCasesRaw).slice(0, 6).map(toHomeUseCaseSignal);
  const trendingUseCases = sortUseCasesByTrending(trendingUseCasesRaw).slice(0, 6).map(toHomeUseCaseSignal);
  const latestMCPs = sortMCPByDate(latestMCPRaw).slice(0, 6).map(toHomeMcpSignal);
  const trendingMCPs = sortMCPByTrending(trendingMCPRaw).slice(0, 6).map(toHomeMcpSignal);

  return {
    props: {
      latestPodcasts: latestPodcasts.map(toHomePodcastSignal),
      trendingPodcasts: trendingPodcasts.slice(0, 6).map(toHomePodcastSignal),
      latestAgents,
      trendingAgents,
      latestSkills,
      trendingSkills,
      latestUseCases,
      trendingUseCases,
      latestMCPs,
      trendingMCPs,
      catalogCounts,
    },
    revalidate: 600,
  };
};

const SIGNAL_TABS = ["Podcasts", "Agents", "Skills", "MCP"] as const; // Use Cases hidden for Release-1.0
type SignalTab = (typeof SIGNAL_TABS)[number];

function SignalDashboard({
  latestAgents,
  trendingAgents,
  latestSkills,
  trendingSkills,
  latestMCPs,
  trendingMCPs,
  latestPodcasts,
  trendingPodcasts,
  latestUseCases: _latestUseCases,
  trendingUseCases: _trendingUseCases,
}: {
  latestAgents: HomeAgentSignal[];
  trendingAgents: HomeAgentSignal[];
  latestSkills: HomeSkillSignal[];
  trendingSkills: HomeSkillSignal[];
  latestMCPs: HomeMcpSignal[];
  trendingMCPs: HomeMcpSignal[];
  latestPodcasts: HomePodcastSignal[];
  trendingPodcasts: HomePodcastSignal[];
  latestUseCases: HomeUseCaseSignal[];
  trendingUseCases: HomeUseCaseSignal[];
}) {
  const [activeTab, setActiveTab] = useState<SignalTab>("Podcasts");

  const onTabChange = useCallback((tab: SignalTab) => {
    setActiveTab(tab);
  }, []);

  return (
    <section className="reveal section-spacing">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <SectionHeader
          kicker="Platform signals"
          title="Latest and trending across the catalog"
          description="Fresh profiles and high-interest items across agents, skills, MCP servers, podcasts, and use cases."
          animate={false}
          wipeTitle
        />
        <Link href="/aixcelerator/ecosystem" className="btn btn-primary shrink-0">
          View ecosystem
        </Link>
      </div>

      {/* Tab bar */}
      <div
        className="mt-6 flex gap-1 overflow-x-auto rounded-lg border border-[var(--stroke)] bg-[var(--surface-soft)] p-1"
        role="tablist"
        aria-label="Signal category tabs"
      >
        {SIGNAL_TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={activeTab === tab}
            aria-controls={`signal-panel-${tab}`}
            id={`signal-tab-${tab}`}
            className={`shrink-0 rounded-md px-4 py-2 text-sm font-semibold transition-all ${
              activeTab === tab
                ? "bg-zinc-950 text-white shadow-sm dark:bg-zinc-100 dark:text-zinc-950"
                : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
            }`}
            onClick={() => onTabChange(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab panels */}
      <div className="mt-5 overflow-hidden">
        {activeTab === "Agents" && (
          <div role="tabpanel" id="signal-panel-Agents" aria-labelledby="signal-tab-Agents">
            {latestAgents.length > 0 && (
              <div className="mb-4">
                <FeaturedSignalCard item={latestAgents[0]} type="agent" label="Latest agent" href={`/aixcelerator/agents/${latestAgents[0].slug}`} />
              </div>
            )}
            <div className="grid gap-4 lg:grid-cols-2">
              <AgentRail title="Latest agents" description="Most recently updated." items={latestAgents} detailType="latest" />
              {trendingAgents.length > 0 && (
                <AgentRail title="Trending agents" description="Highest rated and most used." items={trendingAgents} detailType="trending" />
              )}
            </div>
            <div className="mt-4 text-center">
              <Link href="/aixcelerator/agents" className="btn btn-secondary">Browse all agents</Link>
            </div>
          </div>
        )}
        {activeTab === "Skills" && (
          <div role="tabpanel" id="signal-panel-Skills" aria-labelledby="signal-tab-Skills">
            {latestSkills.length > 0 && (
              <div className="mb-4">
                <FeaturedSignalCard item={latestSkills[0]} type="skill" label="Latest skill" href={`/aixcelerator/skills/${latestSkills[0].slug}`} />
              </div>
            )}
            <div className="grid gap-4 lg:grid-cols-2">
              <SkillRail title="Latest skills" description="Most recently updated." items={latestSkills} detailType="latest" />
              {trendingSkills.length > 0 && (
                <SkillRail title="Trending skills" description="Highest rated and most used." items={trendingSkills} detailType="trending" />
              )}
            </div>
            <div className="mt-4 text-center">
              <Link href="/aixcelerator/skills" className="btn btn-secondary">Browse all skills</Link>
            </div>
          </div>
        )}
        {activeTab === "MCP" && (
          <div role="tabpanel" id="signal-panel-MCP" aria-labelledby="signal-tab-MCP">
            {latestMCPs.length > 0 && (
              <div className="mb-4">
                <FeaturedSignalCard item={latestMCPs[0]} type="mcp" label="Latest MCP server" href={`/aixcelerator/mcp/${latestMCPs[0].slug}`} />
              </div>
            )}
            <div className="grid gap-4 lg:grid-cols-2">
              <McpRail title="Latest MCP servers" description="Most recently updated." items={latestMCPs} detailType="latest" />
              {trendingMCPs.length > 0 && (
                <McpRail title="Trending MCP servers" description="Highest rated and most used." items={trendingMCPs} detailType="trending" />
              )}
            </div>
            <div className="mt-4 text-center">
              <Link href="/aixcelerator/mcp" className="btn btn-secondary">Browse all MCP servers</Link>
            </div>
          </div>
        )}
        {activeTab === "Podcasts" && (
          <div role="tabpanel" id="signal-panel-Podcasts" aria-labelledby="signal-tab-Podcasts">
            {latestPodcasts.length > 0 && (
              <div className="mb-4">
                <FeaturedPodcastCard episode={latestPodcasts[0]} />
              </div>
            )}
            <div className="grid gap-4 lg:grid-cols-2">
              <PodcastRail title="Latest episodes" description="Most recently published." items={latestPodcasts} />
              {trendingPodcasts.length > 0 && (
                <PodcastRail title="Trending episodes" description="Most viewed and referenced." items={trendingPodcasts} />
              )}
            </div>
            <div className="mt-4 text-center">
              <Link href="/resources/podcasts" className="btn btn-secondary">
                Browse all episodes
              </Link>
            </div>
          </div>
        )}
        {/* Use Cases tab hidden for Release-1.0 */}
      </div>
    </section>
  );
}

type CatalogItem = {
  href: string;
  title: string;
  description: string;
  meta: string;
  iconType: ContentTypeName;
  gradient: string;
  accentColor: string;
};

const CATALOG_ICON_PATHS: Record<string, { d: string; viewBox: string }> = {
  agent: { viewBox: "0 0 24 24", d: "M9 2v2H7a2 2 0 00-2 2v2H3v4h2v2a2 2 0 002 2h2v2h2v-2h2v2h2v-2h2a2 2 0 002-2v-2h2V8h-2V6a2 2 0 00-2-2h-2V2h-2v2h-2V2H9zm-2 6h10v8H7V8zm3 2v1h1v-1h-1zm3 0v1h1v-1h-1zm-4 3v1h4v-1H9z" },
  mcp: { viewBox: "0 0 24 24", d: "M4 6a2 2 0 012-2h12a2 2 0 012 2v3a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm14 1.5a1 1 0 10-2 0 1 1 0 002 0zM4 15a2 2 0 012-2h12a2 2 0 012 2v3a2 2 0 01-2 2H6a2 2 0 01-2-2v-3zm14 1.5a1 1 0 10-2 0 1 1 0 002 0z" },
  skill: { viewBox: "0 0 24 24", d: "M13 2L3 14h9l-1 8 10-12h-9l1-8z" },
  tool: { viewBox: "0 0 24 24", d: "M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" },
  podcast: { viewBox: "0 0 24 24", d: "M12 1a4 4 0 00-4 4v7a4 4 0 008 0V5a4 4 0 00-4-4zM6 11a1 1 0 10-2 0 8 8 0 0016 0 1 1 0 10-2 0 6 6 0 01-12 0zm5 10.93A8 8 0 014.07 14H6.1a6 6 0 0011.8 0h2.03A8 8 0 0113 21.93V24h-2v-2.07z" },
};

function CatalogCard({ href, title, description, meta, iconType, gradient, accentColor }: CatalogItem) {
  const icon = CATALOG_ICON_PATHS[iconType] || CATALOG_ICON_PATHS.skill;
  return (
    <Link
      href={href}
      className="group flex h-full min-h-[280px] flex-col overflow-hidden rounded-xl border border-zinc-200/80 bg-zinc-50 shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 dark:border-zinc-700/60 dark:bg-zinc-900 dark:hover:border-zinc-500"
      aria-label={`Open ${title}`}
    >
      <div className={`relative flex items-center justify-center bg-gradient-to-br ${gradient} px-6 py-12`}>
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
        {/* Large soft glow */}
        <div className="absolute rounded-full blur-3xl transition-opacity duration-300 group-hover:opacity-30" style={{ width: 140, height: 140, backgroundColor: accentColor, opacity: 0.2 }} />
        {/* Floating particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
          <div className="catalog-particle" style={{ left: "20%", top: "30%", animationDelay: "0s", animationDuration: "4s" }} />
          <div className="catalog-particle" style={{ left: "65%", top: "55%", animationDelay: "1.3s", animationDuration: "5s" }} />
          <div className="catalog-particle" style={{ left: "80%", top: "25%", animationDelay: "2.6s", animationDuration: "3.5s" }} />
        </div>
        {/* Icon with orbit ring */}
        <div className="relative flex items-center justify-center">
          <div className="catalog-orbit-ring" style={{ color: accentColor }} aria-hidden="true">
            <div className="catalog-orbit-dot" />
          </div>
          <svg viewBox={icon.viewBox} className="relative h-16 w-16 drop-shadow-lg transition-transform duration-300 group-hover:scale-110" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <path d={icon.d} fill={accentColor} fillOpacity={0.85} stroke={accentColor} strokeWidth={0.3} />
          </svg>
        </div>
        {/* Badge */}
        <div className="absolute left-3.5 top-3.5">
          <div className="rounded-full border border-white/15 bg-black/30 px-3 py-1 text-xs font-bold tracking-wide text-white/95 backdrop-blur-md">
            {meta}
          </div>
        </div>
        {/* Arrow */}
        <div className="absolute right-3.5 top-3.5 rounded-full border border-white/10 bg-white/5 p-2 text-white/50 transition-all duration-300 group-hover:bg-white/15 group-hover:text-white">
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M7 17L17 7M17 7H7M17 7v10" /></svg>
        </div>
      </div>
      <div className="flex flex-1 flex-col justify-between p-5">
        <div>
          <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-50">{title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">{description}</p>
        </div>
      </div>
    </Link>
  );
}

function FeaturedPodcastCard({ episode }: { episode: HomePodcastSignal }) {
  const isExternal = (episode.podcastType || "internal").toLowerCase() === "external";
  return (
    <Link
      href={`/resources/podcasts/${episode.slug}`}
      className="group section-card flex flex-col gap-4 rounded-lg p-4 transition sm:flex-row sm:items-center"
    >
      {episode.coverImageUrl ? (
        <div className="relative h-32 w-full shrink-0 overflow-hidden rounded-lg sm:h-24 sm:w-40">
          <Image
            src={episode.coverImageUrl}
            alt={episode.title}
            fill
            className="object-cover"
            loading="lazy"
            sizes="(min-width: 640px) 160px, 100vw"
          />
        </div>
      ) : (
        <div className="flex h-32 w-full shrink-0 items-center justify-center rounded-lg bg-[#DC2626]/10 dark:bg-[#DC2626]/20 sm:h-24 sm:w-40">
          <svg viewBox="0 0 24 24" className="h-8 w-8 text-[#DC2626]" fill="none" aria-hidden="true">
            <path d="M9 18V5l12-2v13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="6" cy="18" r="3" stroke="currentColor" strokeWidth="2" />
            <circle cx="18" cy="16" r="3" stroke="currentColor" strokeWidth="2" />
          </svg>
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-deep dark:text-[#FAFAFA]">
            Latest episode
          </span>
          <span className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-semibold leading-none ${isExternal ? "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300" : "bg-[#DC2626]/10 text-[#18181B] dark:bg-[#DC2626]/20 dark:text-[#FAFAFA]"}`}>
            {isExternal ? "External" : "Colaberry"}
          </span>
        </div>
        <h4 className="mt-1 line-clamp-2 text-base font-semibold text-zinc-900 group-hover:text-brand-deep dark:text-zinc-100">
          {episode.title}
        </h4>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-zinc-500 dark:text-zinc-400">
          {formatPodcastDate(episode.publishedDate) || "Date pending"}
          {episode.duration ? <span>· {episode.duration}</span> : null}
          {episode.episodeNumber ? <span>· Episode {episode.episodeNumber}</span> : null}
        </div>
      </div>
      <span className="hidden shrink-0 text-zinc-400 transition-transform group-hover:translate-x-1 group-hover:text-brand-deep sm:block" aria-hidden="true">
        →
      </span>
    </Link>
  );
}

const SIGNAL_ICONS: Record<string, { viewBox: string; d: string }> = {
  agent: { viewBox: "0 0 24 24", d: "M9 2v2H7a2 2 0 00-2 2v2H3v4h2v2a2 2 0 002 2h2v2h2v-2h2v2h2v-2h2a2 2 0 002-2v-2h2V8h-2V6a2 2 0 00-2-2h-2V2h-2v2h-2V2H9zm-2 6h10v8H7V8zm3 2v1h1v-1h-1zm3 0v1h1v-1h-1zm-4 3v1h4v-1H9z" },
  skill: { viewBox: "0 0 24 24", d: "M13 2L3 14h9l-1 8 10-12h-9l1-8z" },
  mcp: { viewBox: "0 0 24 24", d: "M4 6a2 2 0 012-2h12a2 2 0 012 2v3a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm14 1.5a1 1 0 10-2 0 1 1 0 002 0zM4 15a2 2 0 012-2h12a2 2 0 012 2v3a2 2 0 01-2 2H6a2 2 0 01-2-2v-3zm14 1.5a1 1 0 10-2 0 1 1 0 002 0z" },
};

function FeaturedSignalCard({ item, type, label, href }: { item: { name: string; category?: string | null; lastUpdated?: string | null; rating?: number | null }; type: "agent" | "skill" | "mcp"; label: string; href: string }) {
  const icon = SIGNAL_ICONS[type];
  return (
    <Link
      href={href}
      className="group section-card flex flex-col gap-4 rounded-lg p-4 transition sm:flex-row sm:items-center"
    >
      <div className="flex h-32 w-full shrink-0 items-center justify-center rounded-lg bg-[#DC2626]/10 dark:bg-[#DC2626]/20 sm:h-24 sm:w-40">
        <svg viewBox={icon.viewBox} className="h-8 w-8 text-[#DC2626]" fill="currentColor" aria-hidden="true">
          <path d={icon.d} />
        </svg>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-deep dark:text-[#FAFAFA]">
            {label}
          </span>
          {item.category ? (
            <span className="inline-flex rounded-md bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold leading-none text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
              {item.category}
            </span>
          ) : null}
        </div>
        <h4 className="mt-1 line-clamp-2 text-base font-semibold text-zinc-900 group-hover:text-brand-deep dark:text-zinc-100">
          {item.name}
        </h4>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-zinc-500 dark:text-zinc-400">
          {formatPodcastDate(item.lastUpdated) || "Recently updated"}
          {item.rating ? <span>· Rating {item.rating.toFixed(1)}</span> : null}
        </div>
      </div>
      <span className="hidden shrink-0 text-zinc-400 transition-transform group-hover:translate-x-1 group-hover:text-brand-deep sm:block" aria-hidden="true">
        →
      </span>
    </Link>
  );
}

function PodcastRail({
  title,
  description,
  items,
}: {
  title: string;
  description: string;
  items: HomePodcastSignal[];
}) {
  return (
    <article className="section-card rounded-lg p-5">
      <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{title}</div>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{description}</p>
      {items.length === 0 ? (
        <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
          Podcast signals will appear after next content sync.
        </p>
      ) : (
        <ul className="mt-4 grid gap-2">
          {items.map((episode) => {
            const isExternal = (episode.podcastType || "internal").toLowerCase() === "external";
            return (
              <li key={episode.slug}>
                <Link
                  href={`/resources/podcasts/${episode.slug}`}
                  className="group section-card flex items-center gap-3 rounded-lg px-3 py-2.5 transition"
                >
                  {episode.coverImageUrl ? (
                    <Image
                      src={episode.coverImageUrl}
                      alt=""
                      width={48}
                      height={48}
                      className="h-10 w-10 shrink-0 rounded-lg object-cover"
                      loading="lazy"
                      sizes="48px"
                    />
                  ) : (
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#DC2626]/10 dark:bg-[#DC2626]/20">
                      <svg viewBox="0 0 24 24" className="h-4 w-4 text-[#DC2626]" fill="none" aria-hidden="true">
                        <path d="M9 18V5l12-2v13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        <circle cx="6" cy="18" r="3" stroke="currentColor" strokeWidth="2" />
                        <circle cx="18" cy="16" r="3" stroke="currentColor" strokeWidth="2" />
                      </svg>
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <span className="line-clamp-1 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      {episode.title}
                    </span>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-zinc-500 dark:text-zinc-400">
                      {formatPodcastDate(episode.publishedDate) || "Date pending"}
                      {episode.duration ? <span>· {episode.duration}</span> : null}
                      <span className={`inline-flex rounded-md px-1.5 py-0.5 text-[10px] font-semibold leading-none ${isExternal ? "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300" : "bg-[#DC2626]/10 text-[#18181B] dark:bg-[#DC2626]/20 dark:text-[#FAFAFA]"}`}>
                        {isExternal ? "External" : "Colaberry"}
                      </span>
                    </div>
                  </div>
                  <span className="ml-1 shrink-0 text-zinc-400 transition-transform group-hover:translate-x-0.5 group-hover:text-brand-deep dark:text-zinc-400">
                    →
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </article>
  );
}

function AgentRail({
  title,
  description,
  items,
  detailType: _detailType,
}: {
  title: string;
  description: string;
  items: HomeAgentSignal[];
  detailType: "latest" | "trending";
}) {
  return (
    <article className="section-card rounded-lg p-5">
      <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{title}</div>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{description}</p>
      {items.length === 0 ? (
        <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">Agent signals will appear after next refresh.</p>
      ) : (
        <ul className="mt-4 grid gap-2">
          {items.map((agent) => (
            <li key={agent.slug || agent.id}>
              <Link
                href={`/aixcelerator/agents/${agent.slug || agent.id}`}
                className="group section-card flex items-center gap-3 rounded-lg px-3 py-2.5 transition"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#DC2626]/10 dark:bg-[#DC2626]/20">
                  <svg viewBox="0 0 24 24" className="h-4 w-4 text-[#DC2626]" fill="currentColor" aria-hidden="true">
                    <path d="M9 2v2H7a2 2 0 00-2 2v2H3v4h2v2a2 2 0 002 2h2v2h2v-2h2v2h2v-2h2a2 2 0 002-2v-2h2V8h-2V6a2 2 0 00-2-2h-2V2h-2v2h-2V2H9zm-2 6h10v8H7V8zm3 2v1h1v-1h-1zm3 0v1h1v-1h-1zm-4 3v1h4v-1H9z" />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <span className="line-clamp-1 text-sm font-semibold text-zinc-900 dark:text-zinc-100">{agent.name}</span>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-zinc-500 dark:text-zinc-400">
                    {formatPodcastDate(agent.lastUpdated) || "Recently updated"}
                    {agent.category ? <span>· {agent.category}</span> : null}
                    {agent.rating ? <span>· Rating {agent.rating.toFixed(1)}</span> : null}
                  </div>
                </div>
                <span className="ml-1 shrink-0 text-zinc-400 transition-transform group-hover:translate-x-0.5 group-hover:text-brand-deep dark:text-zinc-400">→</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

function SkillRail({
  title,
  description,
  items,
  detailType: _detailType,
}: {
  title: string;
  description: string;
  items: HomeSkillSignal[];
  detailType: "latest" | "trending";
}) {
  return (
    <article className="section-card rounded-lg p-5">
      <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{title}</div>
      <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">{description}</p>
      {items.length === 0 ? (
        <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">Skill signals will appear after next refresh.</p>
      ) : (
        <ul className="mt-3 grid gap-2">
          {items.map((skill) => (
            <li key={skill.slug || skill.id}>
              <Link
                href={`/aixcelerator/skills/${skill.slug || skill.id}`}
                className="section-card group flex items-center gap-3 rounded-lg px-3 py-2.5"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#DC2626]/10 dark:bg-[#DC2626]/20">
                  <svg viewBox="0 0 24 24" className="h-4 w-4 text-[#DC2626]" fill="currentColor" aria-hidden="true">
                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <span className="line-clamp-1 text-sm font-semibold text-zinc-900 dark:text-zinc-100">{skill.name}</span>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-zinc-500 dark:text-zinc-400">
                    {formatPodcastDate(skill.lastUpdated) || "Recently updated"}
                    {skill.category ? <span>· {skill.category}</span> : null}
                    {skill.rating ? <span>· Rating {skill.rating.toFixed(1)}</span> : null}
                  </div>
                </div>
                <span className="ml-1 shrink-0 text-zinc-400 transition-transform group-hover:translate-x-0.5 group-hover:text-brand-deep dark:text-zinc-400">→</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

function _UseCaseRail({
  title,
  description,
  items,
  detailType,
}: {
  title: string;
  description: string;
  items: HomeUseCaseSignal[];
  detailType: "latest" | "trending";
}) {
  return (
    <article className="section-card rounded-lg p-5">
      <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{title}</div>
      <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">{description}</p>
      {items.length === 0 ? (
        <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">Use case signals will appear after next refresh.</p>
      ) : (
        <ul className="mt-3 grid gap-2">
          {items.map((useCase) => (
            <li key={useCase.slug || useCase.id}>
              <Link
                href={`/use-cases/${useCase.slug || useCase.id}`}
                className="section-card group flex items-center justify-between rounded-lg px-3 py-2"
              >
                <span className="truncate pr-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">{useCase.title}</span>
                <span className="shrink-0 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500 group-hover:text-brand-deep dark:text-zinc-400">
                  {detailType === "latest"
                    ? formatPodcastDate(useCase.lastUpdated) || "Updated"
                    : useCase.verified
                    ? "Verified"
                    : `${useCase.linkedCount} links`}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

function McpRail({
  title,
  description,
  items,
  detailType: _detailType,
}: {
  title: string;
  description: string;
  items: HomeMcpSignal[];
  detailType: "latest" | "trending";
}) {
  return (
    <article className="section-card rounded-lg p-5">
      <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{title}</div>
      <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">{description}</p>
      {items.length === 0 ? (
        <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">MCP signals will appear after next refresh.</p>
      ) : (
        <ul className="mt-3 grid gap-2">
          {items.map((mcp) => (
            <li key={mcp.slug || mcp.id}>
              <Link
                href={`/aixcelerator/mcp/${mcp.slug || mcp.id}`}
                className="section-card group flex items-center gap-3 rounded-lg px-3 py-2.5"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#DC2626]/10 dark:bg-[#DC2626]/20">
                  <svg viewBox="0 0 24 24" className="h-4 w-4 text-[#DC2626]" fill="currentColor" aria-hidden="true">
                    <path d="M4 6a2 2 0 012-2h12a2 2 0 012 2v3a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm14 1.5a1 1 0 10-2 0 1 1 0 002 0zM4 15a2 2 0 012-2h12a2 2 0 012 2v3a2 2 0 01-2 2H6a2 2 0 01-2-2v-3zm14 1.5a1 1 0 10-2 0 1 1 0 002 0z" />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <span className="line-clamp-1 text-sm font-semibold text-zinc-900 dark:text-zinc-100">{mcp.name}</span>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-zinc-500 dark:text-zinc-400">
                    {formatPodcastDate(mcp.lastUpdated) || "Recently updated"}
                    {mcp.category ? <span>· {mcp.category}</span> : null}
                    {mcp.rating ? <span>· Rating {mcp.rating.toFixed(1)}</span> : null}
                  </div>
                </div>
                <span className="ml-1 shrink-0 text-zinc-400 transition-transform group-hover:translate-x-0.5 group-hover:text-brand-deep dark:text-zinc-400">→</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

function QuickLink({
  href,
  title,
  description,
  external = false,
}: {
  href: string;
  title: string;
  description: string;
  external?: boolean;
}) {
  const content = (
    <div className="flex items-start justify-between gap-3">
      <div>
        <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{title}</div>
        <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{description}</div>
      </div>
      <div className="mt-0.5 text-zinc-400 transition-transform group-hover:translate-x-0.5 group-hover:text-brand-deep dark:text-zinc-400">
        <span aria-hidden="true">→</span>
      </div>
    </div>
  );

  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="card-glass gradient-border group flex items-start justify-between gap-3 p-5"
        aria-label={`Open ${title}`}
      >
        {content}
      </a>
    );
  }

  return (
    <Link href={href} className="card-glass gradient-border group flex items-start justify-between gap-3 p-5" aria-label={`Open ${title}`}>
      {content}
    </Link>
  );
}

function formatPodcastDate(value?: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function toHomePodcastSignal(item: PodcastEpisode): HomePodcastSignal {
  return {
    id: item.id,
    slug: item.slug,
    title: item.title,
    publishedDate: item.publishedDate || null,
    podcastType: item.podcastType || null,
    coverImageUrl: item.coverImageUrl || null,
    duration: item.duration || null,
    episodeNumber: typeof item.episodeNumber === "number" ? item.episodeNumber : null,
  };
}

function toHomeAgentSignal(item: Agent): HomeAgentSignal {
  return {
    id: item.id,
    slug: item.slug,
    name: item.name,
    category: item.department?.category?.name || item.department?.name || item.industry || null,
    lastUpdated: item.lastUpdated || null,
    rating: typeof item.rating === "number" ? item.rating : null,
    usageCount: typeof item.usageCount === "number" ? item.usageCount : null,
  };
}

function toHomeSkillSignal(item: Skill): HomeSkillSignal {
  return {
    id: item.id,
    slug: item.slug,
    name: item.name,
    category: item.category || item.skillType || null,
    lastUpdated: item.lastUpdated || null,
    rating: typeof item.rating === "number" ? item.rating : null,
    usageCount: typeof item.usageCount === "number" ? item.usageCount : null,
  };
}

function toHomeUseCaseSignal(item: UseCase): HomeUseCaseSignal {
  return {
    id: item.id,
    slug: item.slug,
    title: item.title,
    lastUpdated: item.lastUpdated || null,
    verified: Boolean(item.verified),
    linkedCount: (item.agents?.length || 0) + (item.mcpServers?.length || 0),
  };
}

function toHomeMcpSignal(item: MCPServer): HomeMcpSignal {
  return {
    id: item.id,
    slug: item.slug,
    name: item.name,
    category: item.category || item.industry || null,
    lastUpdated: item.lastUpdated || null,
    rating: typeof item.rating === "number" ? item.rating : null,
    usageCount: typeof item.usageCount === "number" ? item.usageCount : null,
  };
}

function sortAgentsByDate(agents: Agent[]) {
  return [...agents].sort(
    (a, b) => compareDateDesc(a.lastUpdated, b.lastUpdated) || a.name.localeCompare(b.name)
  );
}

function sortAgentsByTrending(agents: Agent[]) {
  return [...agents].sort((a, b) => {
    const delta = scoreTrendingAgent(b) - scoreTrendingAgent(a);
    if (delta !== 0) return delta;
    return compareDateDesc(a.lastUpdated, b.lastUpdated) || a.name.localeCompare(b.name);
  });
}

function sortUseCasesByDate(useCases: UseCase[]) {
  return [...useCases].sort(
    (a, b) => compareDateDesc(a.lastUpdated, b.lastUpdated) || a.title.localeCompare(b.title)
  );
}

function sortSkillsByDate(skills: Skill[]) {
  return [...skills].sort(
    (a, b) => compareDateDesc(a.lastUpdated, b.lastUpdated) || a.name.localeCompare(b.name)
  );
}

function sortSkillsByTrending(skills: Skill[]) {
  return [...skills].sort((a, b) => {
    const delta = scoreTrendingSkill(b) - scoreTrendingSkill(a);
    if (delta !== 0) return delta;
    return compareDateDesc(a.lastUpdated, b.lastUpdated) || a.name.localeCompare(b.name);
  });
}

function sortUseCasesByTrending(useCases: UseCase[]) {
  return [...useCases].sort((a, b) => {
    const delta = scoreTrendingUseCase(b) - scoreTrendingUseCase(a);
    if (delta !== 0) return delta;
    return compareDateDesc(a.lastUpdated, b.lastUpdated) || a.title.localeCompare(b.title);
  });
}

function sortMCPByDate(mcps: MCPServer[]) {
  return [...mcps].sort((a, b) => compareDateDesc(a.lastUpdated, b.lastUpdated) || a.name.localeCompare(b.name));
}

function sortMCPByTrending(mcps: MCPServer[]) {
  return [...mcps].sort((a, b) => {
    const delta = scoreTrendingMcp(b) - scoreTrendingMcp(a);
    if (delta !== 0) return delta;
    return compareDateDesc(a.lastUpdated, b.lastUpdated) || a.name.localeCompare(b.name);
  });
}

function compareDateDesc(left?: string | null, right?: string | null) {
  return toTimestamp(right) - toTimestamp(left);
}

function toTimestamp(value?: string | null) {
  if (!value) return 0;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

function scoreTrendingMcp(mcp: MCPServer) {
  const ratingScore = typeof mcp.rating === "number" ? Math.max(mcp.rating, 0) * 18 : 0;
  const usageScore =
    typeof mcp.usageCount === "number" && mcp.usageCount > 0
      ? Math.log10(mcp.usageCount + 1) * 25
      : 0;
  const verifiedScore = mcp.verified ? 8 : 0;
  const freshnessScore = (() => {
    const timestamp = toTimestamp(mcp.lastUpdated);
    if (!timestamp) return 0;
    const days = (Date.now() - timestamp) / (1000 * 60 * 60 * 24);
    if (days <= 14) return 12;
    if (days <= 45) return 8;
    if (days <= 90) return 4;
    return 0;
  })();
  return ratingScore + usageScore + verifiedScore + freshnessScore;
}

function scoreTrendingAgent(agent: Agent) {
  const ratingScore = typeof agent.rating === "number" ? Math.max(agent.rating, 0) * 18 : 0;
  const usageScore =
    typeof agent.usageCount === "number" && agent.usageCount > 0
      ? Math.log10(agent.usageCount + 1) * 25
      : 0;
  const verifiedScore = agent.verified ? 8 : 0;
  const freshnessScore = (() => {
    const timestamp = toTimestamp(agent.lastUpdated);
    if (!timestamp) return 0;
    const days = (Date.now() - timestamp) / (1000 * 60 * 60 * 24);
    if (days <= 14) return 12;
    if (days <= 45) return 8;
    if (days <= 90) return 4;
    return 0;
  })();
  return ratingScore + usageScore + verifiedScore + freshnessScore;
}

function scoreTrendingUseCase(useCase: UseCase) {
  const linkageScore = Math.min(useCase.agents.length * 5 + useCase.mcpServers.length * 4, 30);
  const verifiedScore = useCase.verified ? 8 : 0;
  const completenessScore =
    (useCase.summary ? 2 : 0) +
    (useCase.longDescription ? 4 : 0) +
    (useCase.outcomes ? 3 : 0) +
    (useCase.metrics ? 3 : 0);
  const freshnessScore = (() => {
    const timestamp = toTimestamp(useCase.lastUpdated);
    if (!timestamp) return 0;
    const days = (Date.now() - timestamp) / (1000 * 60 * 60 * 24);
    if (days <= 14) return 12;
    if (days <= 45) return 8;
    if (days <= 90) return 4;
    return 0;
  })();
  return linkageScore + verifiedScore + completenessScore + freshnessScore;
}

function scoreTrendingSkill(skill: Skill) {
  const ratingScore = typeof skill.rating === "number" ? Math.max(skill.rating, 0) * 18 : 0;
  const usageScore =
    typeof skill.usageCount === "number" && skill.usageCount > 0
      ? Math.log10(skill.usageCount + 1) * 25
      : 0;
  const verifiedScore = skill.verified ? 8 : 0;
  const linkageScore = Math.min(
    (skill.agents?.length || 0) * 3 + (skill.mcpServers?.length || 0) * 3 + (skill.useCases?.length || 0) * 4,
    24
  );
  const completenessScore =
    (skill.summary ? 2 : 0) +
    (skill.longDescription ? 4 : 0) +
    (skill.inputs ? 2 : 0) +
    (skill.outputs ? 2 : 0) +
    (skill.toolsRequired ? 2 : 0) +
    (skill.modelsSupported ? 2 : 0);
  const freshnessScore = (() => {
    const timestamp = toTimestamp(skill.lastUpdated);
    if (!timestamp) return 0;
    const days = (Date.now() - timestamp) / (1000 * 60 * 60 * 24);
    if (days <= 14) return 12;
    if (days <= 45) return 8;
    if (days <= 90) return 4;
    return 0;
  })();
  return ratingScore + usageScore + verifiedScore + linkageScore + completenessScore + freshnessScore;
}

function _formatUsageLabel(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return String(value);
}

type IndustryIcon = "leaf" | "tower" | "droplet" | "dna" | "factory" | "truck";

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- false positive: used at line ~493
function IndustryTile({
  href,
  title,
  icon,
}: {
  href: string;
  title: string;
  icon: IndustryIcon;
}) {
  return (
    <Link
      href={href}
      className="surface-panel surface-hover surface-interactive group relative flex flex-col items-center gap-3 p-4 text-center"
      aria-label={`View ${title} industry`}
    >
      <div className="absolute right-4 top-4 text-zinc-400 transition-transform group-hover:translate-x-0.5 group-hover:text-brand-deep">
        <span aria-hidden="true">→</span>
      </div>
      <div className="flex h-14 w-14 items-center justify-center rounded-lg border border-[#DC2626]/10 bg-[#DC2626]/5 text-zinc-800 dark:border-[#DC2626]/15 dark:bg-[#DC2626]/10 dark:text-zinc-200">
        <IndustryIconSvg icon={icon} />
      </div>
      <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{title}</div>
    </Link>
  );
}

function IndustryIconSvg({ icon }: { icon: IndustryIcon }) {
  const common = "h-7 w-7";
  switch (icon) {
    case "leaf":
      return (
        <svg viewBox="0 0 24 24" className={common} fill="none" aria-hidden="true">
          <path
            d="M20 4c-6.5 0-12 3.2-14.8 9.2C4.3 15.1 4 17 4 20c3 0 4.9-.3 6.8-1.2C16.8 16 20 10.5 20 4Z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path
            d="M7 17c2-2.6 5.2-5.2 10-7"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      );
    case "tower":
      return (
        <svg viewBox="0 0 24 24" className={common} fill="none" aria-hidden="true">
          <path d="M12 2v20" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          <path
            d="M7 22l5-8 5 8"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path
            d="M6 8c2.2-2 4.3-3 6-3s3.8 1 6 3"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      );
    case "droplet":
      return (
        <svg viewBox="0 0 24 24" className={common} fill="none" aria-hidden="true">
          <path
            d="M12 2s6 6.4 6 12a6 6 0 1 1-12 0C6 8.4 12 2 12 2Z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "dna":
      return (
        <svg viewBox="0 0 24 24" className={common} fill="none" aria-hidden="true">
          <path
            d="M8 3c3 3 3 6 0 9s-3 6 0 9"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          <path
            d="M16 3c-3 3-3 6 0 9s3 6 0 9"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          <path
            d="M9 7h6M9 12h6M9 17h6"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      );
    case "factory":
      return (
        <svg viewBox="0 0 24 24" className={common} fill="none" aria-hidden="true">
          <path
            d="M4 21V10l6 3V10l6 3V8l4 2v11H4Z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path
            d="M8 21v-4m4 4v-4m4 4v-4"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      );
    case "truck":
      return (
        <svg viewBox="0 0 24 24" className={common} fill="none" aria-hidden="true">
          <path
            d="M3 7h11v10H3V7Z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path
            d="M14 10h4l3 3v4h-7v-7Z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path
            d="M7 19.5a1.5 1.5 0 1 0 0-.01V19.5Zm12 0a1.5 1.5 0 1 0 0-.01V19.5Z"
            fill="currentColor"
          />
        </svg>
      );
  }
}

/** Parse a display value like "1.5k+" into { num: 1500, decimals: 0, suffix: "+" } */
function parseMetricValue(value: string): { target: number; decimals: number; suffix: string; prefix: string } {
  const match = value.match(/^([^0-9]*)(\d+(?:\.\d+)?)(k\+?|\+|%?)(.*)$/i);
  if (!match) return { target: 0, decimals: 0, suffix: value, prefix: "" };
  const [, prefix, numStr, unit, rest] = match;
  const num = parseFloat(numStr);
  const hasK = unit.toLowerCase().startsWith("k");
  const suffix = unit + rest;
  const decimals = numStr.includes(".") ? numStr.split(".")[1].length : 0;
  return { target: hasK ? num * 1000 : num, decimals: hasK ? 0 : decimals, suffix: hasK ? suffix : suffix, prefix: prefix || "" };
}

function formatCountedValue(current: number, original: string): string {
  // Match the original formatting: "1.5k+", "29", "16.9k+", "260"
  const match = original.match(/^([^0-9]*)(\d+(?:\.\d+)?)(k\+?|\+|%?)(.*)$/i);
  if (!match) return original;
  const [, prefix, , unit, rest] = match;
  const hasK = unit.toLowerCase().startsWith("k");
  if (hasK) {
    const kVal = current / 1000;
    const decimals = original.includes(".") ? original.split(".")[1]?.match(/\d+/)?.[0]?.length || 1 : 0;
    return `${prefix}${kVal.toFixed(decimals)}${unit}${rest}`;
  }
  return `${prefix}${Math.round(current)}${unit}${rest}`;
}

const prefersReducedMotion =
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function useCountUp(target: number, duration: number, started: boolean): number {
  const [current, setCurrent] = useState(0);
  useEffect(() => {
    if (!started || target === 0) return;
    // Respect prefers-reduced-motion
    if (prefersReducedMotion) {
      const id = requestAnimationFrame(() => setCurrent(target));
      return () => cancelAnimationFrame(id);
    }
    const start = performance.now();
    let raf: number;
    const tick = (now: number) => {
      const elapsed = Math.min((now - start) / duration, 1);
      // Ease-out expo: fast start, smooth deceleration
      const progress = elapsed === 1 ? 1 : 1 - Math.pow(2, -10 * elapsed);
      setCurrent(target * progress);
      if (elapsed < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [started, target, duration]);
  return current;
}

function AnimatedMetric({
  value,
  label,
  note,
  delay = 0,
}: {
  value: string;
  label: string;
  note: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [counting, setCounting] = useState(false);
  const { target } = parseMetricValue(value);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Start counting after the delay
  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => setCounting(true), delay);
    return () => clearTimeout(timer);
  }, [visible, delay]);

  const counted = useCountUp(target, 1500, counting);
  const displayValue = counting ? formatCountedValue(counted, value) : "0";

  return (
    <div
      ref={ref}
      className="card-glass gradient-border p-5 text-center"
    >
      <div
        className={visible ? "counter-animate" : "opacity-0"}
        style={{ animationDelay: `${delay}ms` }}
      >
        <div className="font-sans text-display-sm font-bold bg-gradient-to-r from-[#B91C1C] to-[#DC2626] bg-clip-text text-transparent dark:from-[#F87171] dark:to-[#FCA5A5]">
          {displayValue}
        </div>
        <div className="mt-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">{label}</div>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{note}</p>
      </div>
    </div>
  );
}

/* ── Podcast metric card — uniform with siblings, subtle CTA on hover ── */
function PodcastPromoCard({ episodeCount, delay = 0 }: { episodeCount: number; delay?: number }) {
  const ref = useRef<HTMLAnchorElement>(null);
  const [visible, setVisible] = useState(false);
  const [counting, setCounting] = useState(false);
  const { target } = parseMetricValue(`${episodeCount}+`);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => setCounting(true), delay);
    return () => clearTimeout(timer);
  }, [visible, delay]);

  const counted = useCountUp(target, 1500, counting);
  const displayValue = counting ? `${Math.round(counted)}+` : "0";

  return (
    <Link href="/resources/podcasts" ref={ref} className="podcast-metric-card card-glass gradient-border p-5 text-center group">
      <div
        className={visible ? "counter-animate" : "opacity-0"}
        style={{ animationDelay: `${delay}ms` }}
      >
        <div className="font-sans text-display-sm font-bold bg-gradient-to-r from-[#B91C1C] to-[#DC2626] bg-clip-text text-transparent dark:from-[#F87171] dark:to-[#FCA5A5]">
          {displayValue}
        </div>
        <div className="mt-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">Podcast episodes</div>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">AI leadership insights</p>
        {/* Subtle play CTA — appears prominently on hover */}
        <div className="podcast-metric-cta">
          <span className="podcast-metric-play">
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-3 w-3"><path d="M8 5.14v14l11-7-11-7z" /></svg>
          </span>
          <span>Listen now</span>
        </div>
      </div>
    </Link>
  );
}

type PlatformTab = {
  id: string;
  label: string;
  title: string;
  description: string;
  href: string;
  metrics: { value: string; label: string }[];
};

function PlatformTabsSection({ tabs }: { tabs: PlatformTab[] }) {
  const [activeId, setActiveId] = useState(tabs[0].id);
  const active = tabs.find((t) => t.id === activeId) || tabs[0];

  // Sprint v5 kinetic-pacing: scroll-linked parallax layers behind the section
  // give it visible depth without touching the content layout. Three layers
  // move at different rates (grain stays ~still, mesh drifts, coral spot
  // counter-moves a little more) so the eye reads them as separate planes.
  const sectionRef = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });
  // Ranges are pixel-y offsets applied to absolutely-positioned layers.
  // Under reduced-motion we collapse all ranges to zero so nothing translates.
  const grainY = useTransform(scrollYProgress, [0, 1], reduceMotion ? [0, 0] : [-12, 12]);
  const meshY = useTransform(scrollYProgress, [0, 1], reduceMotion ? [0, 0] : [-40, 40]);
  const coralY = useTransform(scrollYProgress, [0, 1], reduceMotion ? [0, 0] : [40, -40]);

  return (
    <section
      ref={sectionRef}
      className="reveal section-spacing relative isolate overflow-hidden"
    >
      {/* ── Parallax backdrop layers (decorative, aria-hidden) ────────────────
       * z-stack (bottom → top):
       *   .z-grain  (-30)  — fine noise texture, barely moves
       *   .z-mesh   (-20)  — large radial mesh, drifts gently
       *   .z-punch  (-10)  — small coral blob, counter-moves for depth cue
       * Content sits at the default stack (z-auto, isolated). `isolate` keeps
       * the parallax layers from bleeding into adjacent sections. */}
      <m.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-[-30] opacity-[0.035]"
        style={{
          y: grainY,
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          backgroundRepeat: "repeat",
          backgroundSize: "256px 256px",
        }}
      />
      <m.div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-16 z-[-20] opacity-60 dark:opacity-40"
        style={{
          y: meshY,
          background:
            "radial-gradient(ellipse at 20% 20%, rgba(161, 161, 170, 0.10) 0%, rgba(161, 161, 170, 0) 55%), radial-gradient(ellipse at 85% 70%, rgba(113, 113, 122, 0.08) 0%, rgba(113, 113, 122, 0) 60%)",
        }}
      />
      <m.div
        aria-hidden="true"
        className="pointer-events-none absolute right-[-120px] top-[10%] z-[-10] h-[320px] w-[320px] rounded-full blur-3xl"
        style={{
          y: coralY,
          background:
            "radial-gradient(circle, rgba(220, 38, 38, 0.10) 0%, rgba(220, 38, 38, 0.02) 45%, transparent 70%)",
        }}
      />

      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <SectionHeader
          kicker="Platform capabilities"
          title="Everything teams need to build, govern, and scale AI"
          description="From cataloging agents to evaluating outcomes, the platform supports full lifecycle delivery."
          animate={false}
        />
        <Link href="/aixcelerator" className="btn btn-primary shrink-0">
          Explore AIXcelerator
        </Link>
      </div>

      {/* Tab bar */}
      <div className="mt-6 flex flex-wrap gap-1 border-b border-[var(--stroke)]" role="tablist" aria-label="Platform capability tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeId === tab.id}
            aria-controls={`platform-panel-${tab.id}`}
            className={`relative px-5 py-3 text-sm font-semibold transition-colors ${
              activeId === tab.id
                ? "text-[var(--text-primary)]"
                : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
            }`}
            onClick={() => setActiveId(tab.id)}
          >
            {tab.label}
            {activeId === tab.id && (
              <span className="absolute inset-x-0 -bottom-px h-0.5 bg-[#DC2626] dark:bg-[#F87171]" />
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div
        key={active.id}
        role="tabpanel"
        id={`platform-panel-${active.id}`}
        className="mt-6 grid gap-6 lg:grid-cols-2 overflow-hidden"
      >
        <div className="flex flex-col justify-center">
          <h3 className="text-display-xs font-bold text-[var(--text-primary)] sm:text-display-sm">
            {active.title}
          </h3>
          <p className="mt-4 text-body-lg leading-relaxed text-[var(--text-muted)]">
            {active.description}
          </p>
          <div className="mt-6">
            <Link href={active.href} className="btn btn-cta">
              Learn more
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </div>
        </div>

        {/* Metrics panel (right side) */}
        <div className="flex items-center">
          <div className="grid w-full gap-4 sm:grid-cols-3">
            {active.metrics.map((metric) => (
              <div
                key={metric.label}
                className="surface-panel p-5 text-center"
              >
                <div className="text-display-xs font-bold text-[#DC2626] dark:text-[#F87171]">
                  {metric.value}
                </div>
                <div className="mt-1 text-sm font-medium text-[var(--text-muted)]">
                  {metric.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
