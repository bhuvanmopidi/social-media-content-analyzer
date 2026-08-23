export type Platform = "generic" | "x" | "instagram" | "linkedin";

export interface PlatformConfig {
  id: Platform;
  label: string;
  maxChars: number;
  /** Chars visible before the "See more" cutoff. null = no fold. */
  foldAt: number | null;
  idealHashtags: [number, number];
  linksHurtReach: boolean;
}

export const PLATFORMS: Record<Platform, PlatformConfig> = {
  generic: {
    id: "generic", label: "Generic",
    maxChars: 2200, foldAt: 140, idealHashtags: [2, 5], linksHurtReach: false,
  },
  x: {
    id: "x", label: "X",
    maxChars: 280, foldAt: null, idealHashtags: [1, 2], linksHurtReach: true,
  },
  instagram: {
    id: "instagram", label: "Instagram",
    maxChars: 2200, foldAt: 125, idealHashtags: [3, 5], linksHurtReach: true,
  },
  linkedin: {
    id: "linkedin", label: "LinkedIn",
    maxChars: 3000, foldAt: 210, idealHashtags: [3, 5], linksHurtReach: true,
  },
};

export const PLATFORM_LIST = Object.values(PLATFORMS);