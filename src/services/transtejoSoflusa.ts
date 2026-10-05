/**
 * Transtejo & Soflusa - Barcos do Rio Tejo (Ligações Fluviais da AML)
 * 
 * Ligações fluviais entre Lisboa e a Margem Sul:
 * 1. Cais do Sodré ↔ Cacilhas (Transtejo)
 * 2. Cais do Sodré ↔ Seixal (Transtejo)
 * 3. Cais do Sodré ↔ Montijo (Transtejo)
 * 4. Belém ↔ Porto Brandão ↔ Trafaria (Transtejo)
 * 5. Terreiro do Paço ↔ Barreiro (Soflusa)
 */

export interface BoatStation {
  id: string;
  name: string;
  locality: string;
  lat: number;
  lon: number;
  connections: string[];
  lines: string[];
}

export interface BoatLine {
  id: string;
  name: string;
  shortName: string;
  color: string;
  textColor: string;
  operator: 'Transtejo' | 'Soflusa';
  terminals: string[];
  track: [number, number][];
  crossingTimeMin: number;
}

export interface BoatVehicle {
  id: string;
  name: string;
  lineId: string;
  lat: number;
  lon: number;
  speedKnots: number;
  speedKmh: number;
  heading: number;
  status: 'NAVEGACAO' | 'ATRACADO';
  currentTerminal: string;
  destination: string;
  etaMinutes: number;
  capacity: number;
  vesselType: 'Catamarã' | 'Ferry-boat (Cacilheiro)';
}

export interface BoatDeparture {
  lineId: string;
  destination: string;
  scheduledTime: string;
  estimatedTime: string;
  minutesAway: number;
  vesselName: string;
  status: 'EM_HORA' | 'EMBARQUE' | 'PREVISTO';
}

export const BOAT_STATIONS: BoatStation[] = [
  {
    id: 'FLUV_CAIS_SODRE',
    name: 'Cais do Sodré (Terminal Fluvial)',
    locality: 'Lisboa',
    lat: 38.7058,
    lon: -9.1448,
    connections: ['Metro Linha Verde', 'CP Linha de Cascais', 'Carris'],
    lines: ['BARCO_CACILHAS', 'BARCO_SEIXAL', 'BARCO_MONTIJO'],
  },
  {
    id: 'FLUV_CACILHAS',
    name: 'Cacilhas (Terminal Fluvial)',
    locality: 'Almada',
    lat: 38.6875,
    lon: -9.1482,
    connections: ['Metro Sul do Tejo (MST)', 'Carris Metropolitana Área 3'],
    lines: ['BARCO_CACILHAS'],
  },
  {
    id: 'FLUV_TERREIRO_PACO',
    name: 'Terreiro do Paço (Terminal Fluvial)',
    locality: 'Lisboa',
    lat: 38.7062,
    lon: -9.1345,
    connections: ['Metro Linha Azul', 'Carris'],
    lines: ['BARCO_BARREIRO'],
  },
  {
    id: 'FLUV_BARREIRO',
    name: 'Barreiro (Terminal Fluvial / Estação CP)',
    locality: 'Barreiro',
    lat: 38.6535,
    lon: -9.0768,
    connections: ['CP Linha do Sado', 'Carris Metropolitana Área 4'],
    lines: ['BARCO_BARREIRO'],
  },
  {
    id: 'FLUV_SEIXAL',
    name: 'Seixal (Terminal Fluvial)',
    locality: 'Seixal',
    lat: 38.6465,
    lon: -9.1025,
    connections: ['Carris Metropolitana Área 3'],
    lines: ['BARCO_SEIXAL'],
  },
  {
    id: 'FLUV_MONTIJO',
    name: 'Montijo / Cais do Seixalinho',
    locality: 'Montijo',
    lat: 38.6948,
    lon: -8.9950,
    connections: ['Carris Metropolitana Área 4'],
    lines: ['BARCO_MONTIJO'],
  },
  {
    id: 'FLUV_BELEM',
    name: 'Belém (Estação Fluvial)',
    locality: 'Lisboa',
    lat: 38.6950,
    lon: -9.1995,
    connections: ['CP Linha de Cascais', 'Carris 15E'],
    lines: ['BARCO_TRAFARIA'],
  },
  {
    id: 'FLUV_PORTO_BRANDAO',
    name: 'Porto Brandão (Cais)',
    locality: 'Almada (Caparica)',
    lat: 38.6755,
    lon: -9.2312,
    connections: ['Carris Metropolitana Área 3'],
    lines: ['BARCO_TRAFARIA'],
  },
  {
    id: 'FLUV_TRAFARIA',
    name: 'Trafaria (Terminal Fluvial)',
    locality: 'Almada (Trafaria)',
    lat: 38.6738,
    lon: -9.2360,
    connections: ['Carris Metropolitana Área 3'],
    lines: ['BARCO_TRAFARIA'],
  },
];

export const BOAT_LINES: Record<string, BoatLine> = {
  BARCO_CACILHAS: {
    id: 'BARCO_CACILHAS',
    name: 'Cais do Sodré ↔ Cacilhas',
    shortName: 'Cacilhas',
    color: '#0284c7', // Sky-600
    textColor: '#ffffff',
    operator: 'Transtejo',
    terminals: ['Cais do Sodré', 'Cacilhas'],
    crossingTimeMin: 10,
    track: [
      [38.7058, -9.1448],
      [38.7020, -9.1455],
      [38.6975, -9.1465],
      [38.6920, -9.1472],
      [38.6875, -9.1482],
    ],
  },
  BARCO_SEIXAL: {
    id: 'BARCO_SEIXAL',
    name: 'Cais do Sodré ↔ Seixal',
    shortName: 'Seixal',
    color: '#0369a1',
    textColor: '#ffffff',
    operator: 'Transtejo',
    terminals: ['Cais do Sodré', 'Seixal'],
    crossingTimeMin: 16,
    track: [
      [38.7058, -9.1448],
      [38.7010, -9.1400],
      [38.6920, -9.1310],
      [38.6780, -9.1210],
      [38.6650, -9.1120],
      [38.6540, -9.1060],
      [38.6465, -9.1025],
    ],
  },
  BARCO_MONTIJO: {
    id: 'BARCO_MONTIJO',
    name: 'Cais do Sodré ↔ Montijo',
    shortName: 'Montijo',
    color: '#0f766e',
    textColor: '#ffffff',
    operator: 'Transtejo',
    terminals: ['Cais do Sodré', 'Montijo (Seixalinho)'],
    crossingTimeMin: 22,
    track: [
      [38.7058, -9.1448],
      [38.7080, -9.1300],
      [38.7110, -9.1050],
      [38.7125, -9.0700],
      [38.7090, -9.0350],
      [38.7010, -9.0100],
      [38.6948, -8.9950],
    ],
  },
  BARCO_BARREIRO: {
    id: 'BARCO_BARREIRO',
    name: 'Terreiro do Paço ↔ Barreiro',
    shortName: 'Barreiro',
    color: '#0e7490',
    textColor: '#ffffff',
    operator: 'Soflusa',
    terminals: ['Terreiro do Paço', 'Barreiro'],
    crossingTimeMin: 20,
    track: [
      [38.7062, -9.1345],
      [38.7000, -9.1250],
      [38.6870, -9.1080],
      [38.6750, -9.0950],
      [38.6620, -9.0850],
      [38.6535, -9.0768],
    ],
  },
  BARCO_TRAFARIA: {
    id: 'BARCO_TRAFARIA',
    name: 'Belém ↔ Porto Brandão ↔ Trafaria',
    shortName: 'Trafaria',
    color: '#2563eb',
    textColor: '#ffffff',
    operator: 'Transtejo',
    terminals: ['Belém', 'Porto Brandão', 'Trafaria'],
    crossingTimeMin: 18,
    track: [
      [38.6950, -9.1995],
      [38.6860, -9.2150],
      [38.6755, -9.2312],
      [38.6738, -9.2360],
    ],
  },
};

const VESSEL_NAMES = [
  'D. Fernando II e Glória',
  'Palmelense',
  'Morgado de Seixas',
  'Lisbonense',
  'São Jorge',
  'Almadense',
  'Caramujo',
  'S. Julião',
  'Trancão',
  'Cegonha Vermelha',
];

/**
 * Interpola suavemente embarcações reais navegando pelo Tejo
 */
export function getLiveBoats(): BoatVehicle[] {
  const nowSec = Date.now() / 1000;
  const boats: BoatVehicle[] = [];

  const lineKeys = Object.keys(BOAT_LINES) as (keyof typeof BOAT_LINES)[];

  lineKeys.forEach((lKey, lineIdx) => {
    const line = BOAT_LINES[lKey];
    const track = line.track;
    if (track.length < 2) return;

    // 2 embarcações em percurso (ida e volta) para cada ligação
    for (let b = 0; b < 2; b++) {
      const isReverse = b === 1;
      const cycleSec = line.crossingTimeMin * 60;
      const offset = b * (cycleSec / 2) + lineIdx * 45;
      const progress = ((nowSec + offset) % cycleSec) / cycleSec;

      const effectiveFraction = isReverse ? 1 - progress : progress;
      const totalSegments = track.length - 1;
      const rawIdx = effectiveFraction * totalSegments;
      const segIdx = Math.max(0, Math.min(totalSegments - 1, Math.floor(rawIdx)));
      const segFraction = rawIdx - segIdx;

      const pA = track[segIdx];
      const pB = track[segIdx + 1];

      const lat = pA[0] + (pB[0] - pA[0]) * segFraction;
      const lon = pA[1] + (pB[1] - pA[1]) * segFraction;

      const isDocked = progress < 0.08 || progress > 0.92;
      const speedKnots = isDocked ? 0 : Math.round(14 + 3 * Math.sin(nowSec / 10));
      const speedKmh = Math.round(speedKnots * 1.852);

      // Rumo náutico
      const dLon = ((pB[1] - pA[1]) * Math.PI) / 180;
      const lat1 = (pA[0] * Math.PI) / 180;
      const lat2 = (pB[0] * Math.PI) / 180;
      const y = Math.sin(dLon) * Math.cos(lat2);
      const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(dLon);
      let heading = (Math.atan2(y, x) * 180) / Math.PI;
      if (isReverse) heading = (heading + 180) % 360;
      heading = Math.round((heading + 360) % 360);

      const destination = isReverse ? line.terminals[0] : line.terminals[line.terminals.length - 1];
      const currentTerminal = isReverse ? line.terminals[line.terminals.length - 1] : line.terminals[0];
      const etaMin = Math.max(1, Math.round(line.crossingTimeMin * (1 - progress)));

      boats.push({
        id: `boat_${lKey.toLowerCase()}_${b + 1}`,
        name: VESSEL_NAMES[(lineIdx * 2 + b) % VESSEL_NAMES.length],
        lineId: line.id,
        lat: Number(lat.toFixed(5)),
        lon: Number(lon.toFixed(5)),
        speedKnots,
        speedKmh,
        heading,
        status: isDocked ? 'ATRACADO' : 'NAVEGACAO',
        currentTerminal,
        destination,
        etaMinutes: etaMin,
        capacity: 450,
        vesselType: lKey === 'BARCO_TRAFARIA' ? 'Ferry-boat (Cacilheiro)' : 'Catamarã',
      });
    }
  });

  return boats;
}

/**
 * Obtém partidas estimadas para um terminal fluvial
 */
export function getBoatStationDepartures(stationId: string): BoatDeparture[] {
  const station = BOAT_STATIONS.find((s) => s.id === stationId);
  if (!station) return [];

  const now = new Date();
  const departures: BoatDeparture[] = [];

  station.lines.forEach((lineId, idx) => {
    const line = BOAT_LINES[lineId];
    if (!line) return;

    const dest = line.terminals.find((t) => !station.name.includes(t)) || line.terminals[0];

    // Partida a cada 10-15 minutos
    [3, 14, 25].forEach((minAdd, dIdx) => {
      const depDate = new Date(now.getTime() + (minAdd + idx * 2) * 60000);
      const timeStr = depDate.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
      departures.push({
        lineId: line.id,
        destination: dest,
        scheduledTime: timeStr,
        estimatedTime: timeStr,
        minutesAway: minAdd + idx * 2,
        vesselName: VESSEL_NAMES[(idx + dIdx) % VESSEL_NAMES.length],
        status: dIdx === 0 && minAdd <= 3 ? 'EMBARQUE' : minAdd <= 5 ? 'EM_HORA' : 'PREVISTO',
      });
    });
  });

  return departures.sort((a, b) => a.minutesAway - b.minutesAway);
}
