/**
 * Metro Sul do Tejo (MST) - Metro Ligeiro de Superfície da Margem Sul
 * 
 * Rede de Metro Ligeiro que serve os concelhos de Almada e Seixal:
 * - Linha 1 (Azul): Cacilhas ↔ Corroios
 * - Linha 2 (Amarela): Corroios ↔ Pragal
 * - Linha 3 (Verde): Cacilhas ↔ Universidade (FCT Caparica)
 */

export interface MSTStation {
  id: string;
  name: string;
  locality: string;
  lat: number;
  lon: number;
  lines: ('1' | '2' | '3')[];
  connections: string[];
}

export interface MSTLine {
  id: '1' | '2' | '3';
  name: string;
  shortName: string;
  color: string;
  textColor: string;
  terminals: string[];
  track: [number, number][];
  stations: string[];
}

export interface MSTVehicle {
  id: string;
  lineId: '1' | '2' | '3';
  lat: number;
  lon: number;
  speed: number;
  status: 'PARADO' | 'CIRCULACAO';
  currentStation: string;
  destination: string;
  etaMinutes: number;
  tramModel: 'Siemens Combino Plus';
}

export interface MSTDeparture {
  lineId: '1' | '2' | '3';
  destination: string;
  scheduledTime: string;
  estimatedTime: string;
  minutesAway: number;
  status: 'EM_HORA' | 'A_CHEGAR' | 'PREVISTO';
}

export const MST_STATIONS: MSTStation[] = [
  {
    id: 'MST_CACILHAS',
    name: 'Cacilhas (Terminal MST / Fluvial)',
    locality: 'Almada',
    lat: 38.6872,
    lon: -9.1485,
    lines: ['1', '3'],
    connections: ['Transtejo (Barcos para Cais do Sodré)', 'Carris Metropolitana Área 3'],
  },
  {
    id: 'MST_25_ABRIL',
    name: '25 de Abril',
    locality: 'Almada',
    lat: 38.6835,
    lon: -9.1530,
    lines: ['1', '3'],
    connections: ['Carris Metropolitana'],
  },
  {
    id: 'MST_ALMADA',
    name: 'Almada (Praça São João Baptista)',
    locality: 'Almada',
    lat: 38.6795,
    lon: -9.1565,
    lines: ['1', '3'],
    connections: ['Carris Metropolitana'],
  },
  {
    id: 'MST_S_JOAO_BAPTISTA',
    name: 'São João Baptista',
    locality: 'Almada',
    lat: 38.6765,
    lon: -9.1590,
    lines: ['1', '3'],
    connections: ['Carris Metropolitana'],
  },
  {
    id: 'MST_BENTO_GONCALVES',
    name: 'Bento Gonçalves',
    locality: 'Almada',
    lat: 38.6740,
    lon: -9.1620,
    lines: ['1', '2', '3'],
    connections: ['Carris Metropolitana'],
  },
  {
    id: 'MST_RAMALHA',
    name: 'Ramalha',
    locality: 'Almada',
    lat: 38.6720,
    lon: -9.1650,
    lines: ['1', '2', '3'],
    connections: ['Fertagus (Estação Pragal próxima)', 'Carris Metropolitana'],
  },
  {
    id: 'MST_PRAGAL',
    name: 'Pragal (Estação Ferroviária / Fertagus / CP)',
    locality: 'Almada',
    lat: 38.6780,
    lon: -9.1740,
    lines: ['2', '3'],
    connections: ['Fertagus (Ponte 25 de Abril)', 'CP Linha do Sul', 'Carris 753', 'Hospital Garcia de Orta'],
  },
  {
    id: 'MST_BOA_NOVA',
    name: 'Boa Nova',
    locality: 'Almada',
    lat: 38.6730,
    lon: -9.1820,
    lines: ['3'],
    connections: ['Carris Metropolitana'],
  },
  {
    id: 'MST_FUNCHALINHO',
    name: 'Funchalinho',
    locality: 'Caparica',
    lat: 38.6680,
    lon: -9.1910,
    lines: ['3'],
    connections: ['Carris Metropolitana'],
  },
  {
    id: 'MST_MONTE_CAPARICA',
    name: 'Monte de Caparica',
    locality: 'Caparica',
    lat: 38.6640,
    lon: -9.1980,
    lines: ['3'],
    connections: ['Carris Metropolitana'],
  },
  {
    id: 'MST_UNIVERSIDADE',
    name: 'Universidade (FCT Nova Caparica)',
    locality: 'Caparica',
    lat: 38.6610,
    lon: -9.2060,
    lines: ['3'],
    connections: ['Campus Universitário FCT', 'Carris Metropolitana'],
  },
  {
    id: 'MST_COVA_PIEDADE',
    name: 'Cova da Piedade',
    locality: 'Cova da Piedade',
    lat: 38.6685,
    lon: -9.1610,
    lines: ['1'],
    connections: ['Carris Metropolitana'],
  },
  {
    id: 'MST_PARQUE_PAZ',
    name: 'Parque da Paz',
    locality: 'Almada',
    lat: 38.6630,
    lon: -9.1585,
    lines: ['1'],
    connections: ['Parque da Paz', 'Carris Metropolitana'],
  },
  {
    id: 'MST_ANTONIO_GEDEAO',
    name: 'António Gedeão',
    locality: 'Laranjeiro',
    lat: 38.6580,
    lon: -9.1555,
    lines: ['1'],
    connections: ['Carris Metropolitana'],
  },
  {
    id: 'MST_LARANJEIRO',
    name: 'Laranjeiro',
    locality: 'Laranjeiro',
    lat: 38.6530,
    lon: -9.1530,
    lines: ['1'],
    connections: ['Carris Metropolitana'],
  },
  {
    id: 'MST_SANTO_AMARO',
    name: 'Santo Amaro',
    locality: 'Laranjeiro',
    lat: 38.6480,
    lon: -9.1510,
    lines: ['1'],
    connections: ['Carris Metropolitana'],
  },
  {
    id: 'MST_CASA_POVO',
    name: 'Casa do Povo',
    locality: 'Corroios',
    lat: 38.6440,
    lon: -9.1500,
    lines: ['1', '2'],
    connections: ['Carris Metropolitana'],
  },
  {
    id: 'MST_CORROIOS',
    name: 'Corroios (Estação Fertagus / CP)',
    locality: 'Corroios',
    lat: 38.6410,
    lon: -9.1525,
    lines: ['1', '2'],
    connections: ['Fertagus (Comboios para Lisboa)', 'Carris Metropolitana Área 3'],
  },
];

export const MST_LINES: Record<'1' | '2' | '3', MSTLine> = {
  '1': {
    id: '1',
    name: 'Linha 1 (Azul): Cacilhas ↔ Corroios',
    shortName: 'MST 1',
    color: '#0284c7', // Sky-600
    textColor: '#ffffff',
    terminals: ['Cacilhas', 'Corroios'],
    stations: [
      'MST_CACILHAS',
      'MST_25_ABRIL',
      'MST_ALMADA',
      'MST_S_JOAO_BAPTISTA',
      'MST_BENTO_GONCALVES',
      'MST_RAMALHA',
      'MST_COVA_PIEDADE',
      'MST_PARQUE_PAZ',
      'MST_ANTONIO_GEDEAO',
      'MST_LARANJEIRO',
      'MST_SANTO_AMARO',
      'MST_CASA_POVO',
      'MST_CORROIOS',
    ],
    track: [
      [38.6872, -9.1485],
      [38.6850, -9.1510],
      [38.6835, -9.1530],
      [38.6815, -9.1548],
      [38.6795, -9.1565],
      [38.6780, -9.1578],
      [38.6765, -9.1590],
      [38.6740, -9.1620],
      [38.6720, -9.1650],
      [38.6698, -9.1630],
      [38.6685, -9.1610],
      [38.6655, -9.1595],
      [38.6630, -9.1585],
      [38.6605, -9.1570],
      [38.6580, -9.1555],
      [38.6555, -9.1542],
      [38.6530, -9.1530],
      [38.6505, -9.1520],
      [38.6480, -9.1510],
      [38.6460, -9.1505],
      [38.6440, -9.1500],
      [38.6425, -9.1510],
      [38.6410, -9.1525],
    ],
  },
  '2': {
    id: '2',
    name: 'Linha 2 (Amarela): Corroios ↔ Pragal',
    shortName: 'MST 2',
    color: '#eab308', // Yellow-500
    textColor: '#18181b',
    terminals: ['Corroios', 'Pragal'],
    stations: [
      'MST_CORROIOS',
      'MST_CASA_POVO',
      'MST_SANTO_AMARO',
      'MST_LARANJEIRO',
      'MST_ANTONIO_GEDEAO',
      'MST_PARQUE_PAZ',
      'MST_COVA_PIEDADE',
      'MST_RAMALHA',
      'MST_BENTO_GONCALVES',
      'MST_PRAGAL',
    ],
    track: [
      [38.6410, -9.1525],
      [38.6440, -9.1500],
      [38.6480, -9.1510],
      [38.6530, -9.1530],
      [38.6580, -9.1555],
      [38.6630, -9.1585],
      [38.6685, -9.1610],
      [38.6720, -9.1650],
      [38.6740, -9.1620],
      [38.6755, -9.1680],
      [38.6780, -9.1740],
    ],
  },
  '3': {
    id: '3',
    name: 'Linha 3 (Verde): Cacilhas ↔ Universidade (Caparica)',
    shortName: 'MST 3',
    color: '#16a34a', // Green-600
    textColor: '#ffffff',
    terminals: ['Cacilhas', 'Universidade'],
    stations: [
      'MST_CACILHAS',
      'MST_25_ABRIL',
      'MST_ALMADA',
      'MST_S_JOAO_BAPTISTA',
      'MST_BENTO_GONCALVES',
      'MST_RAMALHA',
      'MST_PRAGAL',
      'MST_BOA_NOVA',
      'MST_FUNCHALINHO',
      'MST_MONTE_CAPARICA',
      'MST_UNIVERSIDADE',
    ],
    track: [
      [38.6872, -9.1485],
      [38.6835, -9.1530],
      [38.6795, -9.1565],
      [38.6765, -9.1590],
      [38.6740, -9.1620],
      [38.6720, -9.1650],
      [38.6755, -9.1680],
      [38.6780, -9.1740],
      [38.6755, -9.1780],
      [38.6730, -9.1820],
      [38.6705, -9.1865],
      [38.6680, -9.1910],
      [38.6660, -9.1945],
      [38.6640, -9.1980],
      [38.6625, -9.2020],
      [38.6610, -9.2060],
    ],
  },
};

/**
 * Obtém os veículos elétricos (trams) do Metro Sul do Tejo em circulação
 */
export function getLiveMSTVehicles(): MSTVehicle[] {
  const nowSec = Date.now() / 1000;
  const vehicles: MSTVehicle[] = [];

  const lineKeys: ('1' | '2' | '3')[] = ['1', '2', '3'];

  lineKeys.forEach((lineId, lIdx) => {
    const line = MST_LINES[lineId];
    const track = line.track;
    if (track.length < 2) return;

    // 2 veículos por linha (ida e volta)
    for (let v = 0; v < 2; v++) {
      const isReverse = v === 1;
      const cycleSec = 16 * 60; // 16 min percurso
      const offset = v * (cycleSec / 2) + lIdx * 60;
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

      const isStopped = progress < 0.05 || progress > 0.95;
      const speed = isStopped ? 0 : Math.round(28 + 6 * Math.sin(nowSec / 8));

      const destination = isReverse ? line.terminals[0] : line.terminals[line.terminals.length - 1];
      const currentStation = isReverse ? line.terminals[line.terminals.length - 1] : line.terminals[0];
      const etaMin = Math.max(1, Math.round(16 * (1 - progress)));

      vehicles.push({
        id: `mst_${lineId}_${v + 1}`,
        lineId,
        lat: Number(lat.toFixed(5)),
        lon: Number(lon.toFixed(5)),
        speed,
        status: isStopped ? 'PARADO' : 'CIRCULACAO',
        currentStation,
        destination,
        etaMinutes: etaMin,
        tramModel: 'Siemens Combino Plus',
      });
    }
  });

  return vehicles;
}

/**
 * Previsões de partidas nas estações do MST
 */
export function getMSTStationDepartures(stationId: string): MSTDeparture[] {
  const station = MST_STATIONS.find((s) => s.id === stationId);
  if (!station) return [];

  const now = new Date();
  const departures: MSTDeparture[] = [];

  station.lines.forEach((lineId, idx) => {
    const line = MST_LINES[lineId];
    if (!line) return;

    line.terminals.forEach((term, tIdx) => {
      if (station.name.includes(term)) return;

      const minAdd = (idx * 4 + tIdx * 6 + 2) % 12 + 2;
      const depDate = new Date(now.getTime() + minAdd * 60000);
      const timeStr = depDate.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });

      departures.push({
        lineId,
        destination: term,
        scheduledTime: timeStr,
        estimatedTime: timeStr,
        minutesAway: minAdd,
        status: minAdd <= 2 ? 'A_CHEGAR' : minAdd <= 6 ? 'EM_HORA' : 'PREVISTO',
      });
    });
  });

  return departures.sort((a, b) => a.minutesAway - b.minutesAway);
}
