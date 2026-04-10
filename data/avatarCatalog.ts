/**
 * Аватар «программист»: слои 2D (псевдо-объём), открытие предметов по уровню.
 * Картинки — компактные SVG как data URL (без отдельных файлов в репозитории).
 */

export type AvatarSlotId = 'bg' | 'body' | 'face' | 'hair' | 'top' | 'accessory' | 'gadget';

export interface AvatarItemDef {
  id: string;
  slot: AvatarSlotId;
  minLevel: number;
  label: string;
  /** Порядок отрисовки внутри слота */
  z: number;
  svg: string;
}

function svgUrl(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/** Единый холст 200×280, свет сверху-слева */
const VB = '0 0 200 280';

const BG_LAB = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${VB}"><defs><linearGradient id="b" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#1a1a24"/><stop offset="100%" stop-color="#0c0c12"/></linearGradient></defs><rect width="200" height="280" fill="url(#b)"/><circle cx="160" cy="60" r="40" fill="#e6002b" opacity="0.08"/></svg>`;

const BG_CODE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${VB}"><defs><linearGradient id="c" x1="0%" y1="100%" x2="100%" y2="0%"><stop offset="0%" stop-color="#0f172a"/><stop offset="100%" stop-color="#1e1b4b"/></linearGradient></defs><rect width="200" height="280" fill="url(#c)"/><text x="20" y="40" fill="#22c55e" opacity="0.15" font-family="monospace" font-size="10">{'{'} 'code': true {'}'}</text></svg>`;

const BODY_1 = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${VB}"><defs><linearGradient id="bd" x1="30%" y1="0%" x2="70%" y2="100%"><stop offset="0%" stop-color="#60a5fa"/><stop offset="100%" stop-color="#2563eb"/></linearGradient></defs><ellipse cx="100" cy="195" rx="52" ry="68" fill="url(#bd)"/><ellipse cx="100" cy="195" rx="52" ry="68" fill="none" stroke="#000" stroke-opacity="0.15" stroke-width="2"/></svg>`;

const BODY_2 = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${VB}"><defs><linearGradient id="bd2" x1="30%" y1="0%" x2="70%" y2="100%"><stop offset="0%" stop-color="#a78bfa"/><stop offset="100%" stop-color="#6d28d9"/></linearGradient></defs><ellipse cx="100" cy="195" rx="52" ry="68" fill="url(#bd2)"/></svg>`;

const FACE_1 = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${VB}"><defs><linearGradient id="fs" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#fff" stop-opacity="0.35"/><stop offset="100%" stop-color="#000" stop-opacity="0"/></linearGradient></defs><ellipse cx="100" cy="118" rx="38" ry="44" fill="#fcd9c4"/><ellipse cx="100" cy="118" rx="38" ry="44" fill="url(#fs)"/><ellipse cx="88" cy="112" rx="4" ry="5" fill="#1f2937"/><ellipse cx="112" cy="112" rx="4" ry="5" fill="#1f2937"/><path d="M88 128 Q100 134 112 128" stroke="#9a3412" stroke-width="2" fill="none" stroke-linecap="round"/></svg>`;

const FACE_2 = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${VB}"><ellipse cx="100" cy="118" rx="38" ry="44" fill="#e8c4a8"/><ellipse cx="88" cy="112" rx="4" ry="5" fill="#1f2937"/><ellipse cx="112" cy="112" rx="4" ry="5" fill="#1f2937"/><path d="M88 128 Q100 136 112 128" stroke="#7c2d12" stroke-width="2" fill="none" stroke-linecap="round"/></svg>`;

const HAIR_1 = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${VB}"><path d="M62 100 Q100 45 138 100 L138 115 Q100 88 62 115 Z" fill="#1c1917"/><path d="M65 105 Q100 55 135 105" stroke="#000" stroke-opacity="0.2" fill="none"/></svg>`;

const HAIR_2 = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${VB}"><path d="M58 108 Q100 38 142 108 L140 120 Q100 75 60 120 Z" fill="#78350f"/><ellipse cx="100" cy="95" rx="35" ry="25" fill="#92400e"/></svg>`;

const TOP_1 = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${VB}"><path d="M48 155 L152 155 L158 230 L42 230 Z" fill="#374151"/><path d="M48 155 Q100 175 152 155" stroke="#000" stroke-opacity="0.2" fill="none"/><text x="100" y="200" text-anchor="middle" fill="#9ca3af" font-size="9" font-family="monospace">&lt;/&gt;</text></svg>`;

const TOP_2 = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${VB}"><path d="M45 150 L155 150 L162 235 L38 235 Z" fill="#e6002b"/><path d="M45 150 Q100 168 155 150" fill="#000" fill-opacity="0.15"/></svg>`;

const TOP_3 = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${VB}"><path d="M50 152 L150 152 L145 228 L55 228 Z" fill="#065f46"/><path d="M70 152 L130 152 L125 175 L75 175 Z" fill="#10b981" opacity="0.5"/></svg>`;

const ACC_NONE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${VB}"></svg>`;

const ACC_GLASSES = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${VB}"><rect x="72" y="104" width="22" height="16" rx="3" fill="none" stroke="#1f2937" stroke-width="2.5"/><rect x="106" y="104" width="22" height="16" rx="3" fill="none" stroke="#1f2937" stroke-width="2.5"/><line x1="94" y1="112" x2="106" y2="112" stroke="#1f2937" stroke-width="2"/></svg>`;

const GADGET_LAPTOP = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${VB}"><rect x="55" y="215" width="90" height="55" rx="4" fill="#1e293b"/><rect x="60" y="220" width="80" height="42" rx="2" fill="#0ea5e9" opacity="0.3"/><rect x="40" y="265" width="120" height="8" rx="2" fill="#334155"/></svg>`;

const GADGET_KEYBOARD = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${VB}"><rect x="35" y="235" width="130" height="35" rx="4" fill="#292524"/><rect x="42" y="242" width="10" height="8" rx="1" fill="#78716c"/><rect x="55" y="242" width="10" height="8" rx="1" fill="#78716c"/><rect x="68" y="242" width="10" height="8" rx="1" fill="#78716c"/></svg>`;

const GADGET_COFFEE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${VB}"><rect x="130" y="200" width="40" height="50" rx="6" fill="#44403c"/><rect x="125" y="195" width="50" height="8" rx="2" fill="#78716c"/><path d="M135 200 Q150 188 165 200" stroke="#fef3c7" stroke-width="3" fill="none" opacity="0.6"/></svg>`;

function makeItem(
  id: string,
  slot: AvatarSlotId,
  minLevel: number,
  label: string,
  z: number,
  svg: string,
): AvatarItemDef {
  return { id, slot, minLevel, label, z, svg };
}

export const AVATAR_ITEMS: AvatarItemDef[] = [
  makeItem('bg_lab', 'bg', 1, 'Лаборатория', 0, BG_LAB),
  makeItem('bg_code', 'bg', 5, 'Код на фоне', 0, BG_CODE),
  makeItem('body_blue', 'body', 1, 'Худи (синий)', 10, BODY_1),
  makeItem('body_purple', 'body', 8, 'Худи (фиолет)', 10, BODY_2),
  makeItem('face_a', 'face', 1, 'Лицо А', 20, FACE_1),
  makeItem('face_b', 'face', 4, 'Лицо Б', 20, FACE_2),
  makeItem('hair_dark', 'hair', 1, 'Тёмные волосы', 30, HAIR_1),
  makeItem('hair_brown', 'hair', 6, 'Каштан', 30, HAIR_2),
  makeItem('top_gray', 'top', 1, 'Футболка &lt;/&gt;', 40, TOP_1),
  makeItem('top_cherry', 'top', 3, 'Мерч школы', 40, TOP_2),
  makeItem('top_green', 'top', 10, 'Хаки', 40, TOP_3),
  makeItem('acc_none', 'accessory', 1, 'Без аксессуара', 50, ACC_NONE),
  makeItem('acc_glasses', 'accessory', 2, 'Очки', 50, ACC_GLASSES),
  makeItem('gadget_laptop', 'gadget', 1, 'Ноутбук', 60, GADGET_LAPTOP),
  makeItem('gadget_keyboard', 'gadget', 7, 'Клавиатура', 60, GADGET_KEYBOARD),
  makeItem('gadget_coffee', 'gadget', 12, 'Кофе', 60, GADGET_COFFEE),
];

const byId = new Map<string, AvatarItemDef>();
AVATAR_ITEMS.forEach((i) => byId.set(i.id, i));

export function getAvatarItem(id: string): AvatarItemDef | undefined {
  return byId.get(id);
}

export const AVATAR_SLOT_ORDER: AvatarSlotId[] = ['bg', 'body', 'face', 'hair', 'top', 'accessory', 'gadget'];

export const SLOT_LABELS: Record<AvatarSlotId, string> = {
  bg: 'Фон',
  body: 'Силуэт',
  face: 'Лицо',
  hair: 'Причёска',
  top: 'Верх',
  accessory: 'Аксессуар',
  gadget: 'Гаджет',
};

/** Дефолтный набор для новых пользователей */
export const DEFAULT_AVATAR_EQUIP: Record<AvatarSlotId, string> = {
  bg: 'bg_lab',
  body: 'body_blue',
  face: 'face_a',
  hair: 'hair_dark',
  top: 'top_gray',
  accessory: 'acc_none',
  gadget: 'gadget_laptop',
};

export type AvatarEquipMap = Record<AvatarSlotId, string>;

/** Слить сохранённое из БД с дефолтами и отбросить неизвестные id */
export function mergeAvatarEquip(raw: unknown): AvatarEquipMap {
  const base = { ...DEFAULT_AVATAR_EQUIP };
  if (!raw || typeof raw !== 'object') return base;
  const o = raw as Record<string, unknown>;
  for (const slot of AVATAR_SLOT_ORDER) {
    const v = o[slot];
    if (typeof v === 'string' && byId.has(v)) {
      const def = byId.get(v)!;
      if (def.slot === slot) base[slot] = v;
    }
  }
  return base;
}

/** Оставить только предметы, доступные на данном уровне; срезать слишком высокие → дефолт слота */
export function clampEquipToLevel(equip: AvatarEquipMap, level: number): AvatarEquipMap {
  const next = { ...equip };
  for (const slot of AVATAR_SLOT_ORDER) {
    const id = next[slot];
    const def = byId.get(id);
    if (!def || def.minLevel > level) {
      const candidates = AVATAR_ITEMS.filter((i) => i.slot === slot && i.minLevel <= level).sort(
        (a, b) => b.minLevel - a.minLevel,
      );
      const pick = candidates[0];
      next[slot] = pick?.id ?? DEFAULT_AVATAR_EQUIP[slot];
    }
  }
  return next;
}

/** Проверка перед сохранением: все слоты заполнены разрешёнными предметами */
export function sanitizeEquipForSave(partial: unknown, level: number): AvatarEquipMap {
  const merged = mergeAvatarEquip(partial);
  return clampEquipToLevel(merged, level);
}

export function itemsForSlot(slot: AvatarSlotId): AvatarItemDef[] {
  return AVATAR_ITEMS.filter((i) => i.slot === slot).sort((a, b) => a.minLevel - b.minLevel);
}

export function itemSrc(def: AvatarItemDef): string {
  return svgUrl(def.svg);
}

/** Слои для отрисовки снизу вверх */
export function layersToRender(equip: AvatarEquipMap): { def: AvatarItemDef; src: string }[] {
  const out: { def: AvatarItemDef; src: string }[] = [];
  for (const slot of AVATAR_SLOT_ORDER) {
    const id = equip[slot];
    const def = byId.get(id);
    if (!def) continue;
    if (def.slot === 'accessory' && def.id === 'acc_none') continue;
    out.push({ def, src: itemSrc(def) });
  }
  out.sort((a, b) => a.def.z - b.def.z);
  return out;
}

export function cosmeticFromUnknown(raw: unknown): AvatarEquipMap | undefined {
  if (raw == null) return undefined;
  return mergeAvatarEquip(raw);
}
