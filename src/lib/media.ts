export const HERO_ASSET_VERSION = "20260211";

export const heroImage = (filename: string) =>
  `/media/hero/${filename}?v=${HERO_ASSET_VERSION}`;
