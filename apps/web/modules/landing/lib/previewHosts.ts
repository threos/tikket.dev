type PreviewHost = {
  name: string;
  avatarUrl: string;
  share: number;
  isNext: boolean;
};

type PreviewCharacter = { name: string; slug: string };

const PREVIEW_CHARACTERS: PreviewCharacter[] = [
  { name: "Akame", slug: "akame" },
  { name: "Gon", slug: "gon" },
  { name: "Happy", slug: "happy" },
  { name: "Kurapika", slug: "kurapika" },
  { name: "Laxus", slug: "laxus" },
  { name: "Luffy", slug: "luffy" },
  { name: "Shikamaru", slug: "shikamaru" },
  { name: "Tenten", slug: "tenten" },
  { name: "Yusuke", slug: "yusuke" },
];

const PREVIEW_SHARES: number[] = [50, 30, 20];

function pickPreviewHosts(random: () => number = Math.random): PreviewHost[] {
  const pool = [...PREVIEW_CHARACTERS];

  // Partial Fisher-Yates: only the first PREVIEW_SHARES.length slots need to be shuffled.
  for (let i = 0; i < PREVIEW_SHARES.length; i++) {
    const j = i + Math.floor(random() * (pool.length - i));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  return PREVIEW_SHARES.map((share, index) => ({
    name: pool[index].name,
    avatarUrl: `/landing/characters/${pool[index].slug}.webp`,
    share,
    isNext: index === 0,
  }));
}

export type { PreviewHost };
export { pickPreviewHosts };
