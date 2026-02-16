export const HERO_ASSET_VERSION = "20260215-topairef-1";

export const heroImage = (filename: string) =>
  `/media/hero/${filename}?v=${HERO_ASSET_VERSION}`;
