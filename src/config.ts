export const ENCRYPTION = {
  key: `${process.env.ENCRYPTION_KEY}`,
  ivLength: Number(process.env.IV_LENGTH || 16)
};

export const BONUSTYPE = ['cashback', 'happyhour', 'wager'];

export const BONUSCONFIG: any = {
  cashback: {
    multiplier: 0.2,
    detail: 'Cashback Bonus',
    status: 'pending'
  },
  happyhour: {
    multiplier: 0.5,
    detail: 'HappyHour Bonus',
    status: 'pending'
  },
  wager: {
    multiplier: 2,
    detail: 'Wager Bonus',
    status: 'confirmed'
  }
};
