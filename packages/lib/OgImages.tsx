import type React from "react";
import { TIKKET_MARK_PATH, TIKKET_MARK_VIEWBOX } from "./brand/tikketMark";
import { APP_NAME, CAL_URL, LOGO, LOGO_DARK, WEBAPP_URL } from "./constants";

// Ensures tw prop is typed.
declare module "react" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface HTMLAttributes<T> {
    tw?: string;
  }
}

export interface MeetingImageProps {
  title: string;
  profile: { name: string; image?: string | null };
  users?: { name: string; username: string }[];
}

export interface AppImageProps {
  name: string;
  description: string;
  slug: string;
  logoUrl: string;
}

export interface GenericImageProps {
  title: string;
  description: string;
}

export interface ScreenshotImageProps {
  image: string;
  /**
   * Fallback image to use if the image prop fails to load.
   */
  fallbackImage: string;
}

interface WrapperProps {
  children: React.ReactNode;
  /** Short label shown top-right, opposite the lockup. */
  corner?: React.ReactNode;
}

const joinMultipleNames = (names: string[] = []) => {
  const lastName = names.pop();
  return `${names.length > 0 ? `${names.join(", ")} & ${lastName}` : lastName}`;
};

const makeAbsoluteUrl = (url: string) => (/^https?:\/\//.test(url) ? url : `${CAL_URL}${url}`);

const OG_ASSETS = {
  meeting: {
    id: "meeting-og-image-v2", // Bump version when changing Meeting component structure/styling
    logo: LOGO,
    logoWidth: "163",
    avatarSize: "136",
    variant: "dark" as const,
  },
  app: {
    id: "app-og-image-v2", // Bump version when changing App component structure/styling
    logo: LOGO,
    logoWidth: "163",
    iconSize: "96",
    variant: "dark" as const,
  },
  generic: {
    id: "generic-og-image-v2", // Bump version when changing Generic component structure/styling
    logo: LOGO_DARK,
    logoWidth: "163",
    variant: "dark" as const,
  },
};

export const getOGImageVersion = async (
  type: keyof typeof OG_ASSETS,
  additionalInputs?: Record<string, string>
) => {
  const versionInputs: Record<string, unknown> = {
    ...OG_ASSETS[type],
    ...(additionalInputs ?? {}),
  };

  const content = JSON.stringify(versionInputs, Object.keys(versionInputs).sort());

  // Use Web Crypto API instead of Node.js crypto for Edge Runtime compatibility (`/api/social/og/image` is an Edge Runtime route)
  const hashBuffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(content));
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

  return hashHex.substring(0, 8);
};

/**
 * Test urls:
 * 1. 1 user http://localhost:3000/api/social/og/image?type=meeting&title=super%20long%20event%20title%20for%20testing%20purposes&meetingProfileName=Pro%20Example&meetingImage=http://localhost:3000/pro/avatar.png&names=Pro%20Example&usernames=pro
 * 2. Team event (collection), lot's of people, long title http://localhost:3000/api/social/og/image?type=meeting&title=Getting%20to%20know%20us%20and%20have%20a%20beer%20together&meetingProfileName=Seeded%20Team&names=Team%20Pro%20Example%202&names=Team%20Pro%20Example%203&names=Team%20Pro%20Example%204&names=Team%20Free%20Example&names=Team%20Pro%20Example&usernames=teampro2&usernames=teampro3&usernames=teampro4&usernames=teamfree&usernames=teampro
 * 3. Team event of 2 (collection), http://localhost:3000/api/social/og/image?type=meeting&title=Getting%20to%20know%20each%20other&meetingProfileName=Seeded%20Team&names=Team%20Pro%20Example%202&names=Team%20Pro%20Example%203&usernames=teampro2&usernames=teampro3
 * 4. Team event (round robin) http://localhost:3000/api/social/og/image?type=meeting&title=Round%20Robin%20Seeded%20Team%20Event&meetingProfileName=Seeded%20Team
 * 5. Dynamic collective (2 persons) http://localhost:3000/api/social/og/image?type=meeting&title=15min&meetingProfileName=Team%20Pro%20Example,%20Pro%20Example&names=Team%20Pro%20Example&names=Pro%20Example&usernames=teampro&usernames=pro
 */
export const constructMeetingImage = async ({
  title,
  users = [],
  profile,
}: MeetingImageProps): Promise<string> => {
  const params = new URLSearchParams({
    type: "meeting",
    title,
    meetingProfileName: profile.name,
  });

  if (profile.image) {
    params.set("meetingImage", makeAbsoluteUrl(profile.image));
  }

  users.forEach((user) => {
    params.append("names", user.name);
    params.append("usernames", user.username);
  });

  params.set("v", await getOGImageVersion("meeting"));

  return encodeURIComponent(`/api/social/og/image?${params.toString()}`);
};

/**
 * Test url:
 * http://localhost:3000/api/social/og/image?type=app&name=Huddle01&slug=/api/app-store/huddle01video/icon.svg&description=Huddle01%20is%20a%20new%20video%20conferencing%20software%20native%20to%20Web3%20and%20is%20comparable%20to%20a%20decentralized%20version%20of%20Zoom.%20It%20supports%20conversations%20for...
 */
export const constructAppImage = async ({
  name,
  slug,
  logoUrl,
  description,
}: AppImageProps): Promise<string> => {
  const params = new URLSearchParams({
    type: "app",
    name,
    slug,
    description,
    logoUrl,
  });

  params.set("v", await getOGImageVersion("app"));

  return encodeURIComponent(`/api/social/og/image?${params.toString()}`);
};

export const constructGenericImage = async ({ title, description }: GenericImageProps): Promise<string> => {
  const params = new URLSearchParams({
    type: "generic",
    title,
    description,
  });

  params.set("v", await getOGImageVersion("generic"));

  return encodeURIComponent(`/api/social/og/image?${params.toString()}`);
};

// Satori (the renderer behind /api/social/og/image) needs explicit flex layout on every
// element with several children, explicit sizes for images, and nowrap + ellipsis for
// single-line truncation. Styles are inline for that reason.
const OG = {
  width: 1200,
  height: 630,
  padX: 72,
  padY: 64,
  bg: "#141414",
  fg: "#FFFFFF",
  muted: "#A3A3A3",
  surface: "#1C1C1C",
  border: "#2A2A2A",
  avatarColors: ["#3B5BDB", "#C2410C", "#15803D"],
} as const;

const fontCal = { fontFamily: "cal", fontWeight: 600 } as const;
const fontInter = { fontFamily: "inter", fontWeight: 400 } as const;

const singleLine = {
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
} as const;

const Lockup = () => (
  <img
    src={`${WEBAPP_URL}/tikket/wordmark-white.svg`}
    width={163}
    height={44}
    alt={APP_NAME}
    style={{ width: 163, height: 44 }}
  />
);

const Watermark = () => (
  <svg
    viewBox={TIKKET_MARK_VIEWBOX}
    width={760}
    height={760}
    style={{ position: "absolute", right: -220, top: -60, opacity: 0.05 }}>
    <path fill={OG.fg} d={TIKKET_MARK_PATH} />
  </svg>
);

const Wrapper = ({ children, corner }: WrapperProps) => (
  <div
    style={{
      display: "flex",
      flexDirection: "column",
      width: OG.width,
      height: OG.height,
      padding: `${OG.padY}px ${OG.padX}px`,
      backgroundColor: OG.bg,
      color: OG.fg,
      position: "relative",
      overflow: "hidden",
      ...fontInter,
    }}>
    <Watermark />
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <Lockup />
      {corner ? <div style={{ display: "flex", fontSize: 26, color: OG.muted }}>{corner}</div> : null}
    </div>
    {children}
  </div>
);

const Pill = ({ children }: { children: React.ReactNode }) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      border: `2px solid ${OG.border}`,
      borderRadius: 999,
      padding: "10px 22px",
      fontSize: 24,
      color: OG.muted,
    }}>
    {children}
  </div>
);

const avatarStyle = (size: number) =>
  ({
    width: size,
    height: size,
    borderRadius: 999,
    border: `8px solid ${OG.bg}`,
    marginRight: -28,
  }) as const;

const Avatar = ({
  image,
  name,
  index,
  size,
}: {
  image?: string;
  name: string;
  index: number;
  size: number;
}) => {
  if (image) {
    return <img src={image} width={size} height={size} alt="" style={avatarStyle(size)} />;
  }
  return (
    <div
      style={{
        ...avatarStyle(size),
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: OG.avatarColors[index % OG.avatarColors.length],
        color: OG.fg,
        fontSize: 52,
        ...fontCal,
      }}>
      {name.trim().charAt(0).toUpperCase()}
    </div>
  );
};

const stripAppNameSuffix = (title: string) => title.replace(new RegExp(`\\s*\\|\\s*${APP_NAME}$`), "");

/**
 * ⚠️ IMPORTANT: When modifying this component's structure, styling, or visual output,
 * remember to bump the version in OG_ASSETS.meeting.id (e.g., "meeting-og-image-v1" → "meeting-og-image-v2")
 * to ensure proper cache invalidation.
 */
export const Meeting = ({ title, users = [], profile }: MeetingImageProps) => {
  const config = OG_ASSETS.meeting;
  const avatarSize = Number(config.avatarSize);

  // Hosts shown on the card: the event profile when it has an image (a user page), then the
  // other hosts of a collective or dynamic event, without duplicates.
  const attendees = (profile.image ? [profile, ...users] : users).filter(
    (value, index, self) => self.findIndex((v) => v.name === value.name) === index
  );
  const hosts = attendees.length > 0 ? attendees : [profile];
  const names = hosts.map((host) => host.name);
  const username = users.length === 1 ? users[0].username : undefined;
  const host = (() => {
    try {
      return new URL(WEBAPP_URL).host;
    } catch {
      return undefined;
    }
  })();

  return (
    <Wrapper corner={<Pill>Book a time</Pill>}>
      <div style={{ display: "flex", flexDirection: "column", marginTop: "auto" }}>
        <div style={{ display: "flex", marginBottom: 34 }}>
          {hosts.slice(0, 3).map((attendee, index) => (
            <Avatar
              key={attendee.name}
              name={attendee.name}
              image={"image" in attendee && attendee.image ? attendee.image : undefined}
              index={index}
              size={avatarSize}
            />
          ))}
          {hosts.length > 3 && (
            <div
              style={{
                ...avatarStyle(avatarSize),
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: OG.surface,
                color: OG.fg,
                fontSize: 40,
                ...fontCal,
              }}>
              +{hosts.length - 3}
            </div>
          )}
        </div>
        <div
          style={{
            display: "flex",
            width: 1000,
            fontSize: 64,
            lineHeight: 1.1,
            letterSpacing: -1,
            ...fontCal,
            ...singleLine,
          }}>
          Meet {joinMultipleNames([...names])}
        </div>
        <div
          style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: 16 }}>
          <div style={{ display: "flex", width: 760, fontSize: 34, color: OG.muted, ...singleLine }}>
            {title}
          </div>
          {host && username ? (
            <div style={{ display: "flex", fontSize: 26, color: OG.muted }}>
              {host}/{username}
            </div>
          ) : null}
        </div>
      </div>
    </Wrapper>
  );
};

/**
 * ⚠️ IMPORTANT: When modifying this component's structure, styling, or visual output,
 * remember to bump the version in OG_ASSETS.app.id (e.g., "app-og-image-v1" → "app-og-image-v2")
 * to ensure proper cache invalidation.
 */
export const App = ({ name, description, logoUrl }: AppImageProps) => {
  const config = OG_ASSETS.app;
  const iconSize = Number(config.iconSize);

  return (
    <Wrapper corner="Apps">
      <div style={{ display: "flex", flexDirection: "column", marginTop: "auto" }}>
        <div
          style={{
            display: "flex",
            width: 160,
            height: 160,
            borderRadius: 36,
            backgroundColor: OG.surface,
            border: `2px solid ${OG.border}`,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 36,
          }}>
          <img src={`${WEBAPP_URL}${logoUrl}`} alt="" width={iconSize} height={iconSize} />
        </div>
        <div
          style={{
            display: "flex",
            width: 1000,
            fontSize: 68,
            lineHeight: 1.1,
            letterSpacing: -1,
            ...fontCal,
            ...singleLine,
          }}>
          {name}
        </div>
        <div
          style={{
            display: "block",
            width: 900,
            marginTop: 16,
            fontSize: 32,
            lineHeight: 1.4,
            color: OG.muted,
            lineClamp: 2,
          }}>
          {description}
        </div>
      </div>
    </Wrapper>
  );
};

/**
 * ⚠️ IMPORTANT: When modifying this component's structure, styling, or visual output,
 * remember to bump the version in OG_ASSETS.generic.id (e.g., "generic-og-image-v1" → "generic-og-image-v2")
 * to ensure proper cache invalidation.
 */
export const Generic = ({ title, description }: GenericImageProps) => {
  const host = (() => {
    try {
      return new URL(WEBAPP_URL).host;
    } catch {
      return APP_NAME;
    }
  })();

  return (
    <Wrapper corner={host}>
      <div style={{ display: "flex", flexDirection: "column", marginTop: "auto" }}>
        <div
          style={{
            display: "block",
            width: 900,
            fontSize: 76,
            lineHeight: 1.08,
            letterSpacing: -1,
            ...fontCal,
            lineClamp: 2,
          }}>
          {stripAppNameSuffix(title)}
        </div>
        <div
          style={{
            display: "block",
            width: 760,
            marginTop: 22,
            fontSize: 32,
            lineHeight: 1.4,
            color: OG.muted,
            lineClamp: 2,
          }}>
          {description}
        </div>
      </div>
    </Wrapper>
  );
};
