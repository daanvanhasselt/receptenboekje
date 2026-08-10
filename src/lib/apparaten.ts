export interface Apparaat {
  opwarmtijd: number;
  aanzetten: string;
  wijzigen?: string;
}

export const APPARATEN: Record<string, Apparaat> = {
  oven: {
    opwarmtijd: 15,
    aanzetten: 'Zet {wanneer}de oven aan op {temperatuur}°C',
    wijzigen: 'Zet {wanneer}de oven op {temperatuur}°C',
  },
  grill: { opwarmtijd: 10, aanzetten: 'Zet {wanneer}de grill aan' },
  waterkoker: { opwarmtijd: 3, aanzetten: 'Zet {wanneer}de waterkoker aan' },
  'pan-water': { opwarmtijd: 10, aanzetten: 'Breng {wanneer}een pan water aan de kook' },
};
