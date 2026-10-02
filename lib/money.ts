// Minor-unit digits per currency. Gulf dinars/fils and the Jordanian dinar use
// 3 decimals; JPY-style currencies use 0; everything else uses 2. catalog,
// checkout and the ledger layer all divide by this number.
export function minorUnits(currency: string): number {
  const code = currency.trim().toUpperCase()
  if (code === "KWD" || code === "BHD" || code === "OMR" || code === "JOD") return 3
  if (code === "JPY" || code === "CNH" || code === "KRW") return 0
  return 2
}
