import { Line } from '../types';

export interface TransportDirectionInfo {
  type: 'bus' | 'cp' | 'fertagus' | 'metro' | 'boat' | 'mst';
  id: string;
  name: string;
  color: string;
  textColor: string;
  origin: string;
  destination: string;
  direction0Label: string;
  direction1Label: string;
}

/**
 * Remove sufixos como (Terminal), (Circulação), etc. para títulos limpos
 */
function cleanTerminalName(name: string): string {
  return name
    .replace(/\s*\((?:terminal|circula[çc][ãa]o|esta[çc][ãa]o|apeadeiro|interface|metro|cp)\)/gi, '')
    .trim();
}

/**
 * Devolve a informação de sentidos para qualquer operador de transportes da AML
 */
export function getTransportDirections(
  type: 'bus' | 'cp' | 'fertagus' | 'metro' | 'boat' | 'mst',
  id: string,
  lineMeta?: Line | null
): TransportDirectionInfo {
  // 1. Comboios CP
  if (type === 'cp') {
    const cpId = id.toLowerCase().replace('cp_', '');
    switch (cpId) {
      case 'cascais':
        return {
          type: 'cp',
          id: 'cascais',
          name: 'Linha de Cascais',
          color: '#006633',
          textColor: '#ffffff',
          origin: 'Cais do Sodré',
          destination: 'Cascais',
          direction0Label: 'Cais do Sodré → Cascais',
          direction1Label: 'Cascais → Cais do Sodré',
        };
      case 'sintra':
        return {
          type: 'cp',
          id: 'sintra',
          name: 'Linha de Sintra',
          color: '#008542',
          textColor: '#ffffff',
          origin: 'Rossio / Oriente',
          destination: 'Sintra',
          direction0Label: 'Rossio / Oriente → Sintra',
          direction1Label: 'Sintra → Rossio / Oriente',
        };
      case 'azambuja':
        return {
          type: 'cp',
          id: 'azambuja',
          name: 'Linha de Azambuja',
          color: '#004d26',
          textColor: '#ffffff',
          origin: 'Santa Apolónia / Sintra',
          destination: 'Azambuja',
          direction0Label: 'Santa Apolónia → Azambuja',
          direction1Label: 'Azambuja → Santa Apolónia',
        };
      case 'sado':
        return {
          type: 'cp',
          id: 'sado',
          name: 'Linha do Sado',
          color: '#00a651',
          textColor: '#ffffff',
          origin: 'Barreiro',
          destination: 'Praias do Sado-A',
          direction0Label: 'Barreiro → Praias do Sado-A',
          direction1Label: 'Praias do Sado-A → Barreiro',
        };
    }
  }

  // 2. Comboios Fertagus
  if (type === 'fertagus') {
    return {
      type: 'fertagus',
      id: 'fertagus',
      name: 'Comboios Fertagus',
      color: '#00796B',
      textColor: '#ffffff',
      origin: 'Roma-Areeiro',
      destination: 'Setúbal / Coina',
      direction0Label: 'Roma-Areeiro → Setúbal / Coina (Sentido Sul)',
      direction1Label: 'Setúbal / Coina → Roma-Areeiro (Sentido Norte)',
    };
  }

  // 3. Metro de Lisboa
  if (type === 'metro') {
    const mId = id.toLowerCase();
    switch (mId) {
      case 'azul':
        return {
          type: 'metro',
          id: 'azul',
          name: 'Linha Azul (Gaivota)',
          color: '#0080FF',
          textColor: '#ffffff',
          origin: 'Santa Apolónia',
          destination: 'Reboleira',
          direction0Label: 'Santa Apolónia → Reboleira',
          direction1Label: 'Reboleira → Santa Apolónia',
        };
      case 'amarela':
        return {
          type: 'metro',
          id: 'amarela',
          name: 'Linha Amarela (Girassol)',
          color: '#FFCC00',
          textColor: '#000000',
          origin: 'Rato',
          destination: 'Odivelas',
          direction0Label: 'Rato → Odivelas',
          direction1Label: 'Odivelas → Rato',
        };
      case 'verde':
        return {
          type: 'metro',
          id: 'verde',
          name: 'Linha Verde (Caravela)',
          color: '#00B050',
          textColor: '#ffffff',
          origin: 'Cais do Sodré',
          destination: 'Telheiras',
          direction0Label: 'Cais do Sodré → Telheiras',
          direction1Label: 'Telheiras → Cais do Sodré',
        };
      case 'vermelha':
        return {
          type: 'metro',
          id: 'vermelha',
          name: 'Linha Vermelha (Oriente)',
          color: '#FF0000',
          textColor: '#ffffff',
          origin: 'São Sebastião',
          destination: 'Aeroporto',
          direction0Label: 'São Sebastião → Aeroporto',
          direction1Label: 'Aeroporto → São Sebastião',
        };
    }
  }

  // 4. Barcos Transtejo & Soflusa
  if (type === 'boat') {
    const bId = id.toLowerCase();
    if (bId.includes('cacilhas') || bId === 'boat_cacilhas') {
      return {
        type: 'boat',
        id: 'boat_cacilhas',
        name: 'Ligação Cacilhas ↔ Cais do Sodré',
        color: '#0284c7',
        textColor: '#ffffff',
        origin: 'Cacilhas',
        destination: 'Cais do Sodré',
        direction0Label: 'Cacilhas → Cais do Sodré',
        direction1Label: 'Cais do Sodré → Cacilhas',
      };
    }
    if (bId.includes('seixal') || bId === 'boat_seixal') {
      return {
        type: 'boat',
        id: 'boat_seixal',
        name: 'Ligação Seixal ↔ Cais do Sodré',
        color: '#0284c7',
        textColor: '#ffffff',
        origin: 'Seixal',
        destination: 'Cais do Sodré',
        direction0Label: 'Seixal → Cais do Sodré',
        direction1Label: 'Cais do Sodré → Seixal',
      };
    }
    if (bId.includes('montijo') || bId === 'boat_montijo') {
      return {
        type: 'boat',
        id: 'boat_montijo',
        name: 'Ligação Montijo ↔ Cais do Sodré',
        color: '#0284c7',
        textColor: '#ffffff',
        origin: 'Montijo',
        destination: 'Cais do Sodré',
        direction0Label: 'Montijo → Cais do Sodré',
        direction1Label: 'Cais do Sodré → Montijo',
      };
    }
    if (bId.includes('barreiro') || bId === 'boat_barreiro') {
      return {
        type: 'boat',
        id: 'boat_barreiro',
        name: 'Ligação Barreiro ↔ Terreiro do Paço',
        color: '#2563eb',
        textColor: '#ffffff',
        origin: 'Barreiro',
        destination: 'Terreiro do Paço',
        direction0Label: 'Barreiro → Terreiro do Paço',
        direction1Label: 'Terreiro do Paço → Barreiro',
      };
    }
    if (bId.includes('trafaria') || bId.includes('belem') || bId === 'boat_trafaria') {
      return {
        type: 'boat',
        id: 'boat_trafaria',
        name: 'Ligação Trafaria ↔ Belém (via Porto Brandão)',
        color: '#0284c7',
        textColor: '#ffffff',
        origin: 'Trafaria',
        destination: 'Belém',
        direction0Label: 'Trafaria → Belém (via Porto Brandão)',
        direction1Label: 'Belém → Trafaria (via Porto Brandão)',
      };
    }

    // Padrão de Barco
    return {
      type: 'boat',
      id,
      name: lineMeta?.long_name || 'Travessia Fluvial do Tejo',
      color: '#0284c7',
      textColor: '#ffffff',
      origin: 'Margem Sul',
      destination: 'Lisboa',
      direction0Label: 'Margem Sul → Lisboa',
      direction1Label: 'Lisboa → Margem Sul',
    };
  }

  // 5. Metro Sul do Tejo (MST)
  if (type === 'mst') {
    const mstId = id.toString().replace(/[^\d]/g, '');
    if (mstId === '1') {
      return {
        type: 'mst',
        id: '1',
        name: 'MST Linha 1 (Azul)',
        color: '#0284c7',
        textColor: '#ffffff',
        origin: 'Cacilhas',
        destination: 'Corroios',
        direction0Label: 'Cacilhas → Corroios',
        direction1Label: 'Corroios → Cacilhas',
      };
    }
    if (mstId === '2') {
      return {
        type: 'mst',
        id: '2',
        name: 'MST Linha 2 (Amarela)',
        color: '#eab308',
        textColor: '#000000',
        origin: 'Corroios',
        destination: 'Pragal',
        direction0Label: 'Corroios → Pragal',
        direction1Label: 'Pragal → Corroios',
      };
    }
    if (mstId === '3') {
      return {
        type: 'mst',
        id: '3',
        name: 'MST Linha 3 (Verde)',
        color: '#10b981',
        textColor: '#ffffff',
        origin: 'Cacilhas',
        destination: 'Universidade (FCT Caparica)',
        direction0Label: 'Cacilhas → Universidade',
        direction1Label: 'Universidade → Cacilhas',
      };
    }
  }

  // 6. Autocarros (Carris Metropolitana, Carris Lisboa 753, MobiCascais)
  const lineName = lineMeta?.long_name || `Carreira ${id}`;
  const lineColor = lineMeta?.color || (id.startsWith('M') ? '#0891b2' : id === '753' ? '#eab308' : '#fbbf24');
  const textColor = lineMeta?.text_color || '#000000';

  // Casos específicos conhecidos:
  if (id === '753') {
    return {
      type: 'bus',
      id: '753',
      name: 'Carris 753: Centro Sul - Praça José Fontana',
      color: '#eab308',
      textColor: '#000000',
      origin: 'Centro Sul (Almada)',
      destination: 'Praça José Fontana (Lisboa / Marquês)',
      direction0Label: 'Centro Sul → Praça José Fontana (Sentido Lisboa)',
      direction1Label: 'Praça José Fontana → Centro Sul (Sentido Almada)',
    };
  }

  if (id === '3009') {
    return {
      type: 'bus',
      id: '3009',
      name: 'Carreira 3009: Cacilhas - Trafaria',
      color: lineColor,
      textColor,
      origin: 'Cacilhas (Terminal)',
      destination: 'Trafaria (Terminal)',
      direction0Label: 'Cacilhas → Trafaria',
      direction1Label: 'Trafaria → Cacilhas',
    };
  }

  // Parse dinâmico a partir do long_name: "Origem - Destino" ou "Origem ↔ Destino"
  const parts = lineName.split(/\s*[-–—↔⇄]\s*/);
  if (parts.length >= 2) {
    const rawOrigin = parts[0].trim();
    const rawDest = parts.slice(1).join(' - ').trim();
    const origin = cleanTerminalName(rawOrigin);
    const destination = cleanTerminalName(rawDest);

    return {
      type: 'bus',
      id,
      name: lineName,
      color: lineColor,
      textColor,
      origin,
      destination,
      direction0Label: `${origin} → ${destination}`,
      direction1Label: `${destination} → ${origin}`,
    };
  }

  return {
    type: 'bus',
    id,
    name: lineName,
    color: lineColor,
    textColor,
    origin: 'Origem',
    destination: 'Destino',
    direction0Label: `${lineName} (Sentido Ida)`,
    direction1Label: `${lineName} (Sentido Volta)`,
  };
}
