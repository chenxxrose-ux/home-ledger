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
  coffee: 'M5 8h11v6a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5zM16 10h2a2 2 0 0 1 0 4h-2M8 3v2M11 3v2',
  cup: 'M6 7h12l-1.5 14h-9zM5 7h14M12 7l2-4h3',
  cake: 'M4 13h16v8H4zM4 16.5c2 1.2 3-1.2 4 0s2 1.2 4 0 3-1.2 4 0 2 1.2 4 0M12 13V9M8 13v-3M16 13v-3',
  cart: 'M3 4h2l2.5 11h10L20 7H6.5M9 20h.01M17 20h.01',
  store: 'M3 9l2-5h14l2 5M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0M5 12v8h14v-8M10 20v-5h4v5',
  fuel: 'M5 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16M4 21h12M7 8h6M15 9l3 2v7a1.5 1.5 0 0 0 3 0V9l-3-3',
  train: 'M7 3h10a2 2 0 0 1 2 2v10a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3V5a2 2 0 0 1 2-2zM5 11h14M8 21l2-3M16 21l-2-3M9 14.5h.01M15 14.5h.01',
  bike: 'M6 18a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM18 18a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 15l4-7h5l3 7M9 5h3M12 15l-2-7',
  key: 'M8 15a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 11h9M18 11v3M15 11v2',
  sofa: 'M4 11V8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3M2 13a2 2 0 0 1 4 0v2h12v-2a2 2 0 0 1 4 0v5H2zM5 18v2M19 18v2',
  tool: 'M14.5 6.5a4 4 0 0 1 5-5l-2.5 2.5.5 2 2 .5 2.5-2.5a4 4 0 0 1-5 5L8 18a2 2 0 0 1-3-3z',
  plant: 'M12 21v-9M12 12C12 7 8 5 4 5c0 4 3 7 8 7zM12 14c0-4 3-6 7-6 0 4-3 6-7 6zM7 21h10',
  drop: 'M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z',
  flame: 'M12 3c.5 3.5 5 5.5 5 11a5 5 0 0 1-10 0c0-3 1.5-4.5 2.5-6.5C11 9 11.5 10.5 11.5 12c1.5-2 1.5-5 .5-9z',
  wifi: 'M2 9a15 15 0 0 1 20 0M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0M12 19.5h.01',
  tv: 'M3 6h18v12H3zM8 21h8M9 2l3 4 3-4',
  pill: 'M10.5 20.5a5 5 0 0 1-7-7l6-6a5 5 0 0 1 7 7zM7 10l7 7',
  hospital: 'M4 4h16v16H4zM12 8v8M8 12h8',
  tooth: 'M7 3c-2 0-4 2-4 5 0 4 2 5 2 9 0 2 1 4 2 4s2-3 2-5 1-3 3-3 3 1 3 3 1 5 2 5 2-2 2-4c0-4 2-5 2-9 0-3-2-5-4-5-2 0-3 1-5 1S9 3 7 3z',
  shield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6zM9 12l2 2 4-4',
  school: 'M2 9l10-5 10 5-10 5zM6 11v5c0 1.5 3 3 6 3s6-1.5 6-3v-5M22 9v6',
  game: 'M7 8h10a4 4 0 0 1 4 4v1a3 3 0 0 1-5.5 1.7L14 13h-4l-1.5 1.7A3 3 0 0 1 3 13v-1a4 4 0 0 1 4-4zM8 10v4M6 12h4M16 11h.01M18 13h.01',
  film: 'M4 4h16v16H4zM8 4v16M16 4v16M4 9h4M4 15h4M16 9h4M16 15h4',
  music: 'M9 18V5l11-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM20 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0z',
  ticket: 'M3 7h18v3a2 2 0 0 0 0 4v3H3v-3a2 2 0 0 0 0-4zM14 7v10',
  gym: 'M6 7v10M18 7v10M3 10v4M21 10v4M6 12h12',
  scissors: 'M6 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM8.5 7.5L20 18M8.5 16.5L20 6',
  glasses: 'M3 14a3.5 3.5 0 1 0 7 0 3.5 3.5 0 0 0-7 0zM14 14a3.5 3.5 0 1 0 7 0 3.5 3.5 0 0 0-7 0zM10 14h4M3 14l2-6M21 14l-2-6',
  umbrella: 'M3 12a9 9 0 0 1 18 0zM12 12v7a2 2 0 0 1-4 0',
  piggy: 'M4 12a7 6 0 0 1 12-3.5h3v3l1.5 1V16H19l-2 2.5V21h-3v-2h-4v2H7v-3a6 6 0 0 1-3-6zM15 11h.01M9 7.5h4',
  coins: 'M8 8a5 2.5 0 1 0 10 0 5 2.5 0 1 0-10 0M8 8v4c0 1.4 2.2 2.5 5 2.5s5-1.1 5-2.5V8M3 13c0 1.4 2.2 2.5 5 2.5M3 13v4c0 1.4 2.2 2.5 5 2.5s5-1.1 5-2.5',
  bank: 'M3 9l9-5 9 5zM5 9v8M9.5 9v8M14.5 9v8M19 9v8M3 20h18',
  calendar: 'M4 5h16v15H4zM4 10h16M8 3v4M16 3v4',
}

export const ICON_KEYS = Object.keys(P)
export const ICON_LABEL: Record<string, string> = {
  food: '餐具', bag: '購物袋', bus: '公車', car: '汽車', home: '房子', bolt: '閃電', heart: '愛心', card: '信用卡',
  building: '大樓', book: '書', star: '星星', dots: '其他', wallet: '錢包', gift: '禮物', chart: '長條圖', baby: '小孩',
  phone: '手機', shirt: '衣服', pet: '寵物', plane: '飛機',
  coffee: '咖啡', cup: '飲料', cake: '蛋糕', cart: '購物車', store: '商店', fuel: '加油', train: '火車', bike: '腳踏車',
  key: '鑰匙', sofa: '沙發', tool: '修繕', plant: '植物', drop: '水', flame: '瓦斯', wifi: '網路', tv: '電視',
  pill: '藥', hospital: '醫院', tooth: '牙齒', shield: '保險', school: '學校', game: '遊戲', film: '電影', music: '音樂',
  ticket: '票', gym: '運動', scissors: '剪髮', glasses: '眼鏡', umbrella: '雨傘', piggy: '存錢', coins: '零錢', bank: '銀行',
  calendar: '月曆',
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
  pencil: 'M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4',
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
