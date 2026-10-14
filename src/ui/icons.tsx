// 線條圖示（不用 emoji），分類圖示各有自己的淡色底

const P: Record<string, string> = {
  food: 'M7 3v8M5 3v5a2 2 0 0 0 4 0V3M7 11v10M17 3c-2 0-3 3-3 6s1 4 3 4v8',
  bag: 'M5 8h14l-1 12H6zM9 8V6a3 3 0 0 1 6 0v2',
  bus: 'M6 4h12a1 1 0 0 1 1 1v11H5V5a1 1 0 0 1 1-1zM5 11h14M8 16v3M16 16v3M8 13.5h.01M16 13.5h.01',
  car: 'M5 16v-5l2-5h10l2 5v5zM5 16v2M19 16v2M5 11h14M8 13.5h.01M16 13.5h.01',
  home: 'M4 11l8-7 8 7v9H4zM10 20v-5h4v5',
  bolt: 'M13 3L5 13h6l-1 8 8-10h-6z',
  heart: 'M12 21s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 5.6-7 10-7 10z',
  card: 'M3 6h18v12H3zM3 10h18M7 15h3',
  building: 'M5 3h14v18H5zM9 7h2M13 7h2M9 11h2M13 11h2M10 21v-4h4v4',
  book: 'M4 5h6a2 2 0 0 1 2 2v12a2 2 0 0 0-2-2H4zM20 5h-6a2 2 0 0 0-2 2v12a2 2 0 0 1 2-2h6z',
  star: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z',
  dots: 'M6 12h.01M12 12h.01M18 12h.01',
  wallet: 'M4 7h15a1 1 0 0 1 1 1v11H5a1 1 0 0 1-1-1zM4 7l11-3v3M16 13h.01',
  gift: 'M4 10h16v10H4zM3 7h18v3H3zM12 7v13M12 7c-2-3-5-3-5-1s3 1 5 1c2 0 5 1 5-1s-3-2-5 1',
  chart: 'M4 20h16M7 16v-4M12 16V8M17 16v-7',
  baby: 'M12 4a3 3 0 1 1 0 6 3 3 0 0 1 0-6zM6 21v-3a6 6 0 0 1 12 0v3',
  phone: 'M8 3h8v18H8zM11 18h2',
  shirt: 'M8 4l4 2 4-2 4 4-3 2v10H7V10L4 8z',
  pet: 'M5 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM19 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM9 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM15 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM12 11c-3 0-6 4-6 7 0 2 2 3 6 3s6-1 6-3c0-3-3-7-6-7z',
  plane: 'M3 13l18-8-6 16-3-6zM12 15l3-3',
}

export const ICON_KEYS = Object.keys(P)
export const ICON_LABEL: Record<string, string> = {
  food: '餐具', bag: '購物袋', bus: '公車', car: '汽車', home: '房子', bolt: '閃電', heart: '愛心', card: '信用卡',
  building: '大樓', book: '書', star: '星星', dots: '其他', wallet: '錢包', gift: '禮物', chart: '長條圖', baby: '小孩',
  phone: '手機', shirt: '衣服', pet: '寵物', plane: '飛機',
}

/** 分類色：淡底、深線、圖表色 */
export const COLORS: Record<string, { bg: string; fg: string; chart: string }> = {
  red: { bg: '#FDE4E4', fg: '#B83A3A', chart: '#C94A4A' },
  coral: { bg: '#FDEBE4', fg: '#C2522F', chart: '#E0704F' },
  orange: { bg: '#FDEBD9', fg: '#B4621A', chart: '#EE9A4D' },
  amber: { bg: '#FCEFD8', fg: '#9A6410', chart: '#F0A35E' },
  yellow: { bg: '#FBF1C7', fg: '#8A6A00', chart: '#E8C547' },
  mint: { bg: '#E2F3F3', fg: '#1E7A78', chart: '#3BA7A3' },
  teal: { bg: '#DFF1EE', fg: '#1F6F66', chart: '#4DA89C' },
  sky: { bg: '#E1F1FB', fg: '#1D6A93', chart: '#5AAEDB' },
  blue: { bg: '#E3EEF9', fg: '#2468A8', chart: '#4F8FD0' },
  purple: { bg: '#F1E6FA', fg: '#7340A3', chart: '#9B6FD0' },
  pink: { bg: '#FCE7F1', fg: '#A63A6E', chart: '#DD7AA8' },
  gray: { bg: '#EEF0F3', fg: '#4B5563', chart: '#9AA3AF' },
}
export const COLOR_KEYS = Object.keys(COLORS)
export const COLOR_LABEL: Record<string, string> = {
  red: '紅', coral: '珊瑚', orange: '橘', amber: '琥珀', yellow: '黃', mint: '薄荷', teal: '青', sky: '天藍', blue: '藍', purple: '紫', pink: '粉', gray: '灰',
}

export function Icon({ name, size = 20, color = 'currentColor', width = 2 }: { name: string; size?: number; color?: string; width?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={P[name] ?? P.dots} />
    </svg>
  )
}

export function CatIcon({ icon, color, size = 36 }: { icon: string; color: string; size?: number }) {
  const c = COLORS[color] ?? COLORS.gray
  return (
    <span className="cat-ic" style={{ width: size, height: size, borderRadius: size / 3, background: c.bg }}>
      <Icon name={icon} size={Math.round(size * 0.55)} color={c.fg} />
    </span>
  )
}

const UI: Record<string, string> = {
  homeTab: 'M4 11l8-7 8 7v9H4z',
  list: 'M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01',
  pie: 'M12 4a8 8 0 1 0 8 8h-8zM15 3.5A8 8 0 0 1 20.5 9H15z',
  gear: 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
  repeat: 'M17 2l3 3-3 3M4 11V9a4 4 0 0 1 4-4h12M7 22l-3-3 3-3M20 13v2a4 4 0 0 1-4 4H4',
  chevL: 'M15 6l-6 6 6 6',
  chevR: 'M9 6l6 6-6 6',
  down: 'M6 9l6 6 6-6',
  plus: 'M12 5v14M5 12h14',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  trash: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13',
  line: 'M4 5h16v11H9l-5 4z',
  receipt: 'M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6M9 16h3',
}

export function UiIcon({ name, size = 22, width = 2 }: { name: keyof typeof UI; size?: number; width?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={UI[name]} />
    </svg>
  )
}
