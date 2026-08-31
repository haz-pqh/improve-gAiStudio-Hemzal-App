export const STORE_LAT = 3.130718500000013;
export const STORE_LNG = 101.7762545;
export const MAX_ALLOWED_RADIUS_METERS = 100;

export const ALLOWED_EMAILS = [
  "hassanhazril@gmail.com",
  "hazpiqah@gmail.com"
];

export const PRICING = {
  AYAM_PER_PC: 4.50,          // 1 Bag = 20 pcs * RM4.50 = RM90.00
  BAG_PCS: 20,
  MINYAK_MASAK_PACK: 5.00,    // RM5.00 / pack
  CKG_CUP: 2.00,              // Cheese, Korean, Garlic = RM2.00 / cup
  TF_CUP: 3.00,               // Furikake, Togarashi = RM3.00 / cup
  COLESLAW_SINGLE: 3.50,      // 1 Cup Coleslaw = RM3.50
  COLESLAW_PAIR: 6.50,        // 2 Cups Coleslaw Combo = RM6.50
  PROMO_10PCS: 53.90          // Promo 10 Pcs Ayam = RM53.90 / promo
};

export const FLAVOR_ITEMS = [
  'Cheese',
  'Korean',
  'Garlic',
  'Furikake',
  'Togarashi',
  'Coleslaw'
] as const;

export const DEFAULT_BRANCHES = [
  { name: 'Cawangan Cheras Utama', status: 'ACTIVE' },
  { name: 'Cawangan Ampang Jaya', status: 'ACTIVE' },
  { name: 'Cawangan Wangsa Maju', status: 'ACTIVE' },
  { name: 'Cawangan Bangi Gateway', status: 'ACTIVE' },
  { name: 'Cawangan Shah Alam Seksyen 7', status: 'ACTIVE' }
];
