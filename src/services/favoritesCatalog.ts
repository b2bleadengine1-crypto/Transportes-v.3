import { useState, useEffect, useCallback } from 'react';
import { Line } from '../types';

export interface FavoriteItem {
  id: string; // e.g. "753", "M01", "CP_CASCAIS", "METRO_AZUL", "BARCO_CACILHAS", "MST_1", "3009"
  name: string;
  type: 'bus' | 'train' | 'metro' | 'boat' | 'tram';
  operator: string;
  color?: string;
  textColor?: string;
  subtitle?: string;
  addedAt: number;
}

export interface FavoriteCatalogItem {
  id: string;
  name: string;
  shortName: string;
  type: 'bus' | 'train' | 'metro' | 'boat' | 'tram';
  operator: string;
  operatorCategory: 'mobi' | 'cmet' | 'carris' | 'metro' | 'cp' | 'fertagus' | 'boat' | 'mst';
  color: string;
  textColor: string;
  subtitle: string;
  area?: string; // e.g. "Área 1", "Área 2", "Área 3", "Área 4"
  popular?: boolean;
}

export const FAVORITES_STORAGE_KEY = 'cm_user_favorites';
export const FAVORITES_CHANGE_EVENT = 'cm_user_favorites_changed';

export function notifyFavoritesChanged(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(FAVORITES_CHANGE_EVENT));
  }
}

export const DEFAULT_FAVORITES: FavoriteItem[] = [
  {
    id: '753',
    name: '753 · Centro Sul ↔ Praça José Fontana',
    type: 'bus',
    operator: 'Carris',
    color: '#FFC600',
    textColor: '#000000',
    subtitle: 'Ponte 25 de Abril',
    addedAt: 1700000000000,
  },
  {
    id: 'M01',
    name: 'M01 · Parede ↔ CascaiShopping',
    type: 'bus',
    operator: 'MobiCascais',
    color: '#009FE3',
    textColor: '#ffffff',
    subtitle: 'Via Estoril e Alcabideche',
    addedAt: 1700000000000,
  },
  {
    id: 'CP_CASCAIS',
    name: 'Linha de Cascais · Cais do Sodré ↔ Cascais',
    type: 'train',
    operator: 'CP',
    color: '#006633',
    textColor: '#ffffff',
    subtitle: 'Comboios Suburbanos',
    addedAt: 1700000000000,
  },
  {
    id: 'METRO_AZUL',
    name: 'Linha Azul · Santa Apolónia ↔ Reboleira',
    type: 'metro',
    operator: 'Metro de Lisboa',
    color: '#007AC2',
    textColor: '#ffffff',
    subtitle: 'Gaivota',
    addedAt: 1700000000000,
  },
  {
    id: 'BARCO_CACILHAS',
    name: 'Cais do Sodré ↔ Cacilhas',
    type: 'boat',
    operator: 'Transtejo',
    color: '#0284c7',
    textColor: '#ffffff',
    subtitle: 'Travessia Fluvial do Tejo',
    addedAt: 1700000000000,
  },
];

export function getStoredFavorites(): FavoriteItem[] {
  try {
    const raw = localStorage.getItem(FAVORITES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return DEFAULT_FAVORITES;
}

export function saveStoredFavorites(items: FavoriteItem[]): void {
  try {
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(items));
    notifyFavoritesChanged();
  } catch {}
}

export function isItemFavorite(id: string): boolean {
  if (!id) return false;
  const favs = getStoredFavorites();
  const targetId = id.toUpperCase().trim();
  return favs.some((f) => f.id.toUpperCase().trim() === targetId);
}

export function toggleStoredFavorite(item: FavoriteItem): boolean {
  const favs = getStoredFavorites();
  const targetId = item.id.toUpperCase().trim();
  const exists = favs.some((f) => f.id.toUpperCase().trim() === targetId);
  let updated: FavoriteItem[];
  if (exists) {
    updated = favs.filter((f) => f.id.toUpperCase().trim() !== targetId);
  } else {
    updated = [{ ...item, addedAt: Date.now() }, ...favs];
  }
  saveStoredFavorites(updated);
  return !exists;
}

export function setStoredFavoriteStatus(item: FavoriteItem, isFav: boolean): void {
  const favs = getStoredFavorites();
  const targetId = item.id.toUpperCase().trim();
  const exists = favs.some((f) => f.id.toUpperCase().trim() === targetId);

  if (isFav && !exists) {
    saveStoredFavorites([{ ...item, addedAt: Date.now() }, ...favs]);
  } else if (!isFav && exists) {
    saveStoredFavorites(favs.filter((f) => f.id.toUpperCase().trim() !== targetId));
  }
}

export function resetFavoritesToDefault(): FavoriteItem[] {
  saveStoredFavorites(DEFAULT_FAVORITES);
  return DEFAULT_FAVORITES;
}

export function clearAllFavorites(): void {
  saveStoredFavorites([]);
}

export function selectPopularFavorites(): FavoriteItem[] {
  const popular: FavoriteItem[] = [
    {
      id: '753',
      name: '753 · Centro Sul ↔ Praça José Fontana',
      type: 'bus',
      operator: 'Carris',
      color: '#FFC600',
      textColor: '#000000',
      subtitle: 'Via Ponte 25 de Abril',
      addedAt: Date.now(),
    },
    {
      id: 'M01',
      name: 'M01 · Parede ↔ CascaiShopping',
      type: 'bus',
      operator: 'MobiCascais',
      color: '#009FE3',
      textColor: '#ffffff',
      subtitle: 'Via Estoril e Alcabideche',
      addedAt: Date.now(),
    },
    {
      id: '3009',
      name: '3009 · Cacilhas (Terminal) ↔ Trafaria',
      type: 'bus',
      operator: 'Carris Metropolitana',
      color: '#FFC600',
      textColor: '#000000',
      subtitle: 'Margem Sul (Área 3)',
      addedAt: Date.now(),
    },
    {
      id: '3710',
      name: '3710 · Costa da Caparica ↔ Lisboa (Sete Rios)',
      type: 'bus',
      operator: 'Carris Metropolitana',
      color: '#FFC600',
      textColor: '#000000',
      subtitle: 'Via Ponte 25 de Abril',
      addedAt: Date.now(),
    },
    {
      id: 'CP_CASCAIS',
      name: 'Linha de Cascais · Cais do Sodré ↔ Cascais',
      type: 'train',
      operator: 'CP',
      color: '#006633',
      textColor: '#ffffff',
      subtitle: 'Suburbanos de Lisboa',
      addedAt: Date.now(),
    },
    {
      id: 'CP_SINTRA',
      name: 'Linha de Sintra · Rossio / Oriente ↔ Sintra',
      type: 'train',
      operator: 'CP',
      color: '#008542',
      textColor: '#ffffff',
      subtitle: 'Suburbanos de Lisboa',
      addedAt: Date.now(),
    },
    {
      id: 'FERTAGUS_L1',
      name: 'Fertagus · Roma-Areeiro ↔ Setúbal / Coina',
      type: 'train',
      operator: 'Fertagus',
      color: '#0284c7',
      textColor: '#ffffff',
      subtitle: 'Comboio da Ponte 25 de Abril',
      addedAt: Date.now(),
    },
    {
      id: 'METRO_AZUL',
      name: 'Linha Azul · Santa Apolónia ↔ Reboleira',
      type: 'metro',
      operator: 'Metro de Lisboa',
      color: '#007AC2',
      textColor: '#ffffff',
      subtitle: 'Linha da Gaivota',
      addedAt: Date.now(),
    },
    {
      id: 'METRO_VERDE',
      name: 'Linha Verde · Cais do Sodré ↔ Telheiras',
      type: 'metro',
      operator: 'Metro de Lisboa',
      color: '#009E49',
      textColor: '#ffffff',
      subtitle: 'Linha da Caravela',
      addedAt: Date.now(),
    },
    {
      id: 'BARCO_CACILHAS',
      name: 'Cais do Sodré ↔ Cacilhas',
      type: 'boat',
      operator: 'Transtejo',
      color: '#0284c7',
      textColor: '#ffffff',
      subtitle: 'Travessia Fluvial do Tejo',
      addedAt: Date.now(),
    },
    {
      id: 'MST_1',
      name: 'MST Linha 1 · Cacilhas ↔ Corroios',
      type: 'tram',
      operator: 'Metro Sul do Tejo',
      color: '#007AC2',
      textColor: '#ffffff',
      subtitle: 'Metro Ligeiro de Superfície',
      addedAt: Date.now(),
    },
  ];
  saveStoredFavorites(popular);
  return popular;
}

// Catálogo estruturado de todas as opções de transporte na Área Metropolitana de Lisboa
export const BASE_TRANSIT_CATALOG: FavoriteCatalogItem[] = [
  // --- 1. COMBOIOS CP ---
  {
    id: 'CP_CASCAIS',
    shortName: 'Cascais',
    name: 'Linha de Cascais · Cais do Sodré ↔ Cascais',
    type: 'train',
    operator: 'Comboios de Portugal',
    operatorCategory: 'cp',
    color: '#006633',
    textColor: '#ffffff',
    subtitle: 'Belém, Algés, Oeiras, Carcavelos, Estoril, Cascais',
    popular: true,
  },
  {
    id: 'CP_SINTRA',
    shortName: 'Sintra',
    name: 'Linha de Sintra · Rossio / Oriente ↔ Sintra',
    type: 'train',
    operator: 'Comboios de Portugal',
    operatorCategory: 'cp',
    color: '#008542',
    textColor: '#ffffff',
    subtitle: 'Campolide, Benfica, Amadora, Queluz, Cacém, Sintra',
    popular: true,
  },
  {
    id: 'CP_AZAMBUJA',
    shortName: 'Azambuja',
    name: 'Linha de Azambuja · Santa Apolónia ↔ Azambuja',
    type: 'train',
    operator: 'Comboios de Portugal',
    operatorCategory: 'cp',
    color: '#004d26',
    textColor: '#ffffff',
    subtitle: 'Oriente, Póvoa, Alverca, Vila Franca de Xira, Azambuja',
    popular: true,
  },
  {
    id: 'CP_SADO',
    shortName: 'Sado',
    name: 'Linha do Sado · Barreiro ↔ Praias do Sado',
    type: 'train',
    operator: 'Comboios de Portugal',
    operatorCategory: 'cp',
    color: '#00a651',
    textColor: '#ffffff',
    subtitle: 'Lavradio, Pinhal Novo, Palmela, Setúbal, Praias do Sado',
    popular: false,
  },

  // --- 2. FERTAGUS ---
  {
    id: 'FERTAGUS_L1',
    shortName: 'Fertagus',
    name: 'Fertagus · Roma-Areeiro ↔ Setúbal / Coina',
    type: 'train',
    operator: 'Fertagus',
    operatorCategory: 'fertagus',
    color: '#0284c7',
    textColor: '#ffffff',
    subtitle: 'Ponte 25 de Abril, Campolide, Pragal, Corroios, Fogueteiro, Coina, Setúbal',
    popular: true,
  },

  // --- 3. METRO DE LISBOA ---
  {
    id: 'METRO_AZUL',
    shortName: 'Azul',
    name: 'Linha Azul · Santa Apolónia ↔ Reboleira',
    type: 'metro',
    operator: 'Metro de Lisboa',
    operatorCategory: 'metro',
    color: '#007AC2',
    textColor: '#ffffff',
    subtitle: 'Terreiro do Paço, Baixa-Chiado, Marquês, S. Sebastião, Colégio Militar',
    popular: true,
  },
  {
    id: 'METRO_AMARELA',
    shortName: 'Amarela',
    name: 'Linha Amarela · Rato ↔ Odivelas',
    type: 'metro',
    operator: 'Metro de Lisboa',
    operatorCategory: 'metro',
    color: '#FFD100',
    textColor: '#1e293b',
    subtitle: 'Marquês de Pombal, Saldanha, Campo Grande, Lumiar, Odivelas',
    popular: true,
  },
  {
    id: 'METRO_VERDE',
    shortName: 'Verde',
    name: 'Linha Verde · Cais do Sodré ↔ Telheiras',
    type: 'metro',
    operator: 'Metro de Lisboa',
    operatorCategory: 'metro',
    color: '#009E49',
    textColor: '#ffffff',
    subtitle: 'Baixa-Chiado, Rossio, Martim Moniz, Alameda, Areeiro, Alvalade',
    popular: true,
  },
  {
    id: 'METRO_VERMELHA',
    shortName: 'Vermelha',
    name: 'Linha Vermelha · São Sebastião ↔ Aeroporto',
    type: 'metro',
    operator: 'Metro de Lisboa',
    operatorCategory: 'metro',
    color: '#E4002B',
    textColor: '#ffffff',
    subtitle: 'Saldanha, Alameda, Olaias, Oriente (Parque das Nações), Aeroporto',
    popular: true,
  },

  // --- 4. TRANSTEJO / SOFLUSA (BARCOS) ---
  {
    id: 'BARCO_CACILHAS',
    shortName: 'Cacilhas',
    name: 'Cais do Sodré ↔ Cacilhas',
    type: 'boat',
    operator: 'Transtejo',
    operatorCategory: 'boat',
    color: '#0284c7',
    textColor: '#ffffff',
    subtitle: 'Ligação fluvial Lisboa - Almada (10 min)',
    popular: true,
  },
  {
    id: 'BARCO_BARREIRO',
    shortName: 'Barreiro',
    name: 'Terreiro do Paço ↔ Barreiro',
    type: 'boat',
    operator: 'Soflusa',
    operatorCategory: 'boat',
    color: '#0369a1',
    textColor: '#ffffff',
    subtitle: 'Catamarãs rápidos Terreiro do Paço - Barreiro (20 min)',
    popular: true,
  },
  {
    id: 'BARCO_SEIXAL',
    shortName: 'Seixal',
    name: 'Cais do Sodré ↔ Seixal',
    type: 'boat',
    operator: 'Transtejo',
    operatorCategory: 'boat',
    color: '#0ea5e9',
    textColor: '#ffffff',
    subtitle: 'Ligação fluvial Cais do Sodré - Seixal (16 min)',
    popular: false,
  },
  {
    id: 'BARCO_MONTIJO',
    shortName: 'Montijo',
    name: 'Cais do Sodré ↔ Montijo',
    type: 'boat',
    operator: 'Transtejo',
    operatorCategory: 'boat',
    color: '#0284c7',
    textColor: '#ffffff',
    subtitle: 'Ligação fluvial Cais do Sodré - Montijo (Cais do Seixalinho)',
    popular: false,
  },
  {
    id: 'BARCO_TRAFARIA',
    shortName: 'Trafaria',
    name: 'Belém ↔ Porto Brandão ↔ Trafaria',
    type: 'boat',
    operator: 'Transtejo',
    operatorCategory: 'boat',
    color: '#38bdf8',
    textColor: '#0c4a6e',
    subtitle: 'Ferry fluvial com transporte de viaturas e passageiros',
    popular: false,
  },

  // --- 5. METRO SUL DO TEJO (MST) ---
  {
    id: 'MST_1',
    shortName: 'MST 1',
    name: 'Linha 1 Azul · Cacilhas ↔ Corroios',
    type: 'tram',
    operator: 'Metro Sul do Tejo',
    operatorCategory: 'mst',
    color: '#007AC2',
    textColor: '#ffffff',
    subtitle: 'Cacilhas, Almada Centro, Bento Gonçalves, Cova da Piedade, Corroios',
    popular: true,
  },
  {
    id: 'MST_2',
    shortName: 'MST 2',
    name: 'Linha 2 Amarela · Corroios ↔ Pragal',
    type: 'tram',
    operator: 'Metro Sul do Tejo',
    operatorCategory: 'mst',
    color: '#FFD100',
    textColor: '#1e293b',
    subtitle: 'Corroios, Casa do Povo, Ramalha, Estação Pragal (Fertagus)',
    popular: false,
  },
  {
    id: 'MST_3',
    shortName: 'MST 3',
    name: 'Linha 3 Verde · Cacilhas ↔ Universidade FCT',
    type: 'tram',
    operator: 'Metro Sul do Tejo',
    operatorCategory: 'mst',
    color: '#009E49',
    textColor: '#ffffff',
    subtitle: 'Cacilhas, Almada, Ramalha, Pragal, Boa Esperança, Monte de Caparica, FCT',
    popular: true,
  },

  // --- 6. CARRIS LISBOA ---
  {
    id: '753',
    shortName: '753',
    name: '753 · Centro Sul ↔ Praça José Fontana',
    type: 'bus',
    operator: 'Carris Lisboa',
    operatorCategory: 'carris',
    color: '#FFC600',
    textColor: '#000000',
    subtitle: 'Ponte 25 de Abril, Amoreiras, Marquês de Pombal, Picoas',
    popular: true,
  },
  {
    id: '728',
    shortName: '728',
    name: '728 · Restelo ↔ Portela',
    type: 'bus',
    operator: 'Carris Lisboa',
    operatorCategory: 'carris',
    color: '#FFC600',
    textColor: '#000000',
    subtitle: 'Belém, Cais do Sodré, Terreiro do Paço, Santa Apolónia, Oriente',
    popular: true,
  },
  {
    id: '736',
    shortName: '736',
    name: '736 · Cais do Sodré ↔ Odivelas',
    type: 'bus',
    operator: 'Carris Lisboa',
    operatorCategory: 'carris',
    color: '#FFC600',
    textColor: '#000000',
    subtitle: 'Rossio, Marquês de Pombal, Campo Grande, Lumiar, Odivelas',
    popular: true,
  },
  {
    id: '750',
    shortName: '750',
    name: '750 · Algés ↔ Estação Oriente',
    type: 'bus',
    operator: 'Carris Lisboa',
    operatorCategory: 'carris',
    color: '#FFC600',
    textColor: '#000000',
    subtitle: 'Via 2ª Circular, Benfica, Campo Grande, Aeroporto',
    popular: true,
  },
  {
    id: '783',
    shortName: '783',
    name: '783 · Amoreiras ↔ Prior Velho',
    type: 'bus',
    operator: 'Carris Lisboa',
    operatorCategory: 'carris',
    color: '#FFC600',
    textColor: '#000000',
    subtitle: 'Marquês, Saldanha, Entrecampos, Aeroporto',
    popular: false,
  },
  {
    id: '758',
    shortName: '758',
    name: '758 · Cais do Sodré ↔ Portas de Benfica',
    type: 'bus',
    operator: 'Carris Lisboa',
    operatorCategory: 'carris',
    color: '#FFC600',
    textColor: '#000000',
    subtitle: 'Rato, Amoreiras, Campolide, Sete Rios, Benfica',
    popular: false,
  },
  {
    id: '15E',
    shortName: '15E',
    name: '15E · Praça da Figueira ↔ Algés',
    type: 'tram',
    operator: 'Carris Lisboa',
    operatorCategory: 'carris',
    color: '#FFC600',
    textColor: '#000000',
    subtitle: 'Elétrico Rápido da Frente Ribeirinha, Cais do Sodré, Alcântara, Belém',
    popular: true,
  },
  {
    id: '28E',
    shortName: '28E',
    name: '28E · Martim Moniz ↔ Campo de Ourique',
    type: 'tram',
    operator: 'Carris Lisboa',
    operatorCategory: 'carris',
    color: '#FFC600',
    textColor: '#000000',
    subtitle: 'Elétrico Histórico de Lisboa, Graça, Alfama, Sé, Chiado, Estrela',
    popular: true,
  },
  {
    id: '711',
    shortName: '711',
    name: '711 · Terreiro do Paço ↔ Alto da Damaia',
    type: 'bus',
    operator: 'Carris Lisboa',
    operatorCategory: 'carris',
    color: '#FFC600',
    textColor: '#000000',
    subtitle: 'Restauradores, Amoreiras, Benfica, Damaia',
    popular: false,
  },
  {
    id: '735',
    shortName: '735',
    name: '735 · Cais do Sodré ↔ Hospital Santa Maria',
    type: 'bus',
    operator: 'Carris Lisboa',
    operatorCategory: 'carris',
    color: '#FFC600',
    textColor: '#000000',
    subtitle: 'Rua do Ouro, Martim Moniz, Alameda, Areeiro, Cidade Universitária',
    popular: false,
  },
  {
    id: '746',
    shortName: '746',
    name: '746 · Marquês de Pombal ↔ Estação Damaia',
    type: 'bus',
    operator: 'Carris Lisboa',
    operatorCategory: 'carris',
    color: '#FFC600',
    textColor: '#000000',
    subtitle: 'São Sebastião, Sete Rios, Estrada de Benfica, Damaia',
    popular: false,
  },

  // --- 7. MOBICASCAIS (M01 a M44) ---
  {
    id: 'M01',
    shortName: 'M01',
    name: 'M01 · Parede Terminal ↔ CascaiShopping',
    type: 'bus',
    operator: 'MobiCascais',
    operatorCategory: 'mobi',
    color: '#009FE3',
    textColor: '#ffffff',
    subtitle: 'Via Estoril e Alcabideche',
    popular: true,
  },
  {
    id: 'M02',
    shortName: 'M02',
    name: 'M02 · Parede Terminal ↔ Malveira da Serra',
    type: 'bus',
    operator: 'MobiCascais',
    operatorCategory: 'mobi',
    color: '#009FE3',
    textColor: '#ffffff',
    subtitle: 'Via Alcabideche e Murches',
    popular: false,
  },
  {
    id: 'M03',
    shortName: 'M03',
    name: 'M03 · Cascais Estação ↔ Parede Terminal',
    type: 'bus',
    operator: 'MobiCascais',
    operatorCategory: 'mobi',
    color: '#009FE3',
    textColor: '#ffffff',
    subtitle: 'Via Bicesse e Manique',
    popular: false,
  },
  {
    id: 'M04',
    shortName: 'M04',
    name: 'M04 · Cascais Estação ↔ Cascais Circular',
    type: 'bus',
    operator: 'MobiCascais',
    operatorCategory: 'mobi',
    color: '#009FE3',
    textColor: '#ffffff',
    subtitle: 'Percurso Urbano Circular de Cascais',
    popular: false,
  },
  {
    id: 'M05',
    shortName: 'M05',
    name: 'M05 · Cascais Estação ↔ Praia do Guincho',
    type: 'bus',
    operator: 'MobiCascais',
    operatorCategory: 'mobi',
    color: '#009FE3',
    textColor: '#ffffff',
    subtitle: 'Praias da Costa do Guincho e Areia',
    popular: true,
  },
  {
    id: 'M06',
    shortName: 'M06',
    name: 'M06 · Cascais Estação ↔ Malveira da Serra',
    type: 'bus',
    operator: 'MobiCascais',
    operatorCategory: 'mobi',
    color: '#009FE3',
    textColor: '#ffffff',
    subtitle: 'Via Charneca e Pisão',
    popular: false,
  },
  {
    id: 'M07',
    shortName: 'M07',
    name: 'M07 · Cascais Estação ↔ Zambujeiro',
    type: 'bus',
    operator: 'MobiCascais',
    operatorCategory: 'mobi',
    color: '#009FE3',
    textColor: '#ffffff',
    subtitle: 'Via Murches e Alvide',
    popular: false,
  },
  {
    id: 'M08',
    shortName: 'M08',
    name: 'M08 · Cascais Estação ↔ Alcabideche',
    type: 'bus',
    operator: 'MobiCascais',
    operatorCategory: 'mobi',
    color: '#009FE3',
    textColor: '#ffffff',
    subtitle: 'Via Cobre e Alvide',
    popular: false,
  },
  {
    id: 'M09',
    shortName: 'M09',
    name: 'M09 · Cascais Estação ↔ CascaiShopping',
    type: 'bus',
    operator: 'MobiCascais',
    operatorCategory: 'mobi',
    color: '#009FE3',
    textColor: '#ffffff',
    subtitle: 'Via Alvide e Alcabideche',
    popular: true,
  },
  {
    id: 'M10',
    shortName: 'M10',
    name: 'M10 · Cascais Estação ↔ Linhó',
    type: 'bus',
    operator: 'MobiCascais',
    operatorCategory: 'mobi',
    color: '#009FE3',
    textColor: '#ffffff',
    subtitle: 'Via CascaiShopping e Manique',
    popular: false,
  },
  {
    id: 'M11',
    shortName: 'M11',
    name: 'M11 · Cascais Estação ↔ Abóboda',
    type: 'bus',
    operator: 'MobiCascais',
    operatorCategory: 'mobi',
    color: '#009FE3',
    textColor: '#ffffff',
    subtitle: 'Via Alapraia e Matarraque',
    popular: false,
  },
  {
    id: 'M12',
    shortName: 'M12',
    name: 'M12 · Cascais Estação ↔ São Domingos de Rana',
    type: 'bus',
    operator: 'MobiCascais',
    operatorCategory: 'mobi',
    color: '#009FE3',
    textColor: '#ffffff',
    subtitle: 'Via Estoril e Tires',
    popular: false,
  },
  {
    id: 'M13',
    shortName: 'M13',
    name: 'M13 · Cascais Estação ↔ Carcavelos Estação',
    type: 'bus',
    operator: 'MobiCascais',
    operatorCategory: 'mobi',
    color: '#009FE3',
    textColor: '#ffffff',
    subtitle: 'Via Marginal, Estoril, Parede e Carcavelos',
    popular: true,
  },
  {
    id: 'M14',
    shortName: 'M14',
    name: 'M14 · Cascais Estação ↔ Murtal',
    type: 'bus',
    operator: 'MobiCascais',
    operatorCategory: 'mobi',
    color: '#009FE3',
    textColor: '#ffffff',
    subtitle: 'Via Galiza e São Pedro do Estoril',
    popular: false,
  },
  {
    id: 'M15',
    shortName: 'M15',
    name: 'M15 · Cascais Estação ↔ Hospital de Cascais',
    type: 'bus',
    operator: 'MobiCascais',
    operatorCategory: 'mobi',
    color: '#009FE3',
    textColor: '#ffffff',
    subtitle: 'Acesso Direto ao Hospital Dr. José de Almeida',
    popular: true,
  },
  {
    id: 'M21',
    shortName: 'M21',
    name: 'M21 · Carcavelos Estação ↔ Talaíde',
    type: 'bus',
    operator: 'MobiCascais',
    operatorCategory: 'mobi',
    color: '#009FE3',
    textColor: '#ffffff',
    subtitle: 'Via São Domingos de Rana e Abóboda',
    popular: false,
  },
  {
    id: 'M22',
    shortName: 'M22',
    name: 'M22 · Carcavelos Estação ↔ CascaiShopping',
    type: 'bus',
    operator: 'MobiCascais',
    operatorCategory: 'mobi',
    color: '#009FE3',
    textColor: '#ffffff',
    subtitle: 'Via Parede, Estoril e Alcabideche',
    popular: true,
  },
  {
    id: 'M27',
    shortName: 'M27',
    name: 'M27 · Parede Terminal ↔ Hospital de Cascais',
    type: 'bus',
    operator: 'MobiCascais',
    operatorCategory: 'mobi',
    color: '#009FE3',
    textColor: '#ffffff',
    subtitle: 'Ligação Rápida Parede - Hospital',
    popular: false,
  },
  {
    id: 'M31',
    shortName: 'M31',
    name: 'M31 · Parede Terminal ↔ Tires Aeródromo',
    type: 'bus',
    operator: 'MobiCascais',
    operatorCategory: 'mobi',
    color: '#009FE3',
    textColor: '#ffffff',
    subtitle: 'Via Rana e Bairro das Marianas',
    popular: false,
  },
  {
    id: 'M35',
    shortName: 'M35',
    name: 'M35 · CascaiShopping ↔ Hospital de Cascais',
    type: 'bus',
    operator: 'MobiCascais',
    operatorCategory: 'mobi',
    color: '#009FE3',
    textColor: '#ffffff',
    subtitle: 'Circular Comercial e de Saúde',
    popular: false,
  },

  // --- 8. CARRIS METROPOLITANA (TOP LINHAS AML ÁREAS 1 A 4) ---
  {
    id: '3009',
    shortName: '3009',
    name: '3009 · Cacilhas (Terminal) ↔ Trafaria',
    type: 'bus',
    operator: 'Carris Metropolitana',
    operatorCategory: 'cmet',
    color: '#FFC600',
    textColor: '#000000',
    subtitle: 'Margem Sul · Almada, Cova da Piedade, Monte de Caparica, Trafaria',
    area: 'Área 3',
    popular: true,
  },
  {
    id: '3710',
    shortName: '3710',
    name: '3710 · Costa da Caparica ↔ Lisboa (Sete Rios)',
    type: 'bus',
    operator: 'Carris Metropolitana',
    operatorCategory: 'cmet',
    color: '#FFC600',
    textColor: '#000000',
    subtitle: 'Direto via Ponte 25 de Abril e Praça de Espanha',
    area: 'Área 3',
    popular: true,
  },
  {
    id: '3715',
    shortName: '3715',
    name: '3715 · Santa Marta do Pinhal ↔ Lisboa (Sete Rios)',
    type: 'bus',
    operator: 'Carris Metropolitana',
    operatorCategory: 'cmet',
    color: '#FFC600',
    textColor: '#000000',
    subtitle: 'Corroios, Pragal, Ponte 25 de Abril, Lisboa',
    area: 'Área 3',
    popular: true,
  },
  {
    id: '3721',
    shortName: '3721',
    name: '3721 · Sesimbra (Terminal) ↔ Lisboa (Sete Rios)',
    type: 'bus',
    operator: 'Carris Metropolitana',
    operatorCategory: 'cmet',
    color: '#FFC600',
    textColor: '#000000',
    subtitle: 'Sesimbra, Santana, Coina, Ponte 25 de Abril, Lisboa',
    area: 'Área 3',
    popular: true,
  },
  {
    id: '3702',
    shortName: '3702',
    name: '3702 · Cacilhas (Terminal) ↔ Lisboa (Cidade Universitária)',
    type: 'bus',
    operator: 'Carris Metropolitana',
    operatorCategory: 'cmet',
    color: '#FFC600',
    textColor: '#000000',
    subtitle: 'Ponte 25 de Abril, Praça de Espanha, Entrecampos',
    area: 'Área 3',
    popular: false,
  },
  {
    id: '3508',
    shortName: '3508',
    name: '3508 · Cacilhas ↔ Paio Pires',
    type: 'bus',
    operator: 'Carris Metropolitana',
    operatorCategory: 'cmet',
    color: '#FFC600',
    textColor: '#000000',
    subtitle: 'Almada, Laranjeiro, Seixal, Paio Pires',
    area: 'Área 3',
    popular: false,
  },
  {
    id: '1502',
    shortName: '1502',
    name: '1502 · Algés (Estação) ↔ Amadora Este (Metro)',
    type: 'bus',
    operator: 'Carris Metropolitana',
    operatorCategory: 'cmet',
    color: '#FFC600',
    textColor: '#000000',
    subtitle: 'Área 1 · Carnaxide, Alfragide, Damaia, Amadora',
    area: 'Área 1',
    popular: true,
  },
  {
    id: '1715',
    shortName: '1715',
    name: '1715 · Belas ↔ Lisboa (Colégio Militar)',
    type: 'bus',
    operator: 'Carris Metropolitana',
    operatorCategory: 'cmet',
    color: '#FFC600',
    textColor: '#000000',
    subtitle: 'Área 1 · Sintra, Queluz, Amadora, Colombo',
    area: 'Área 1',
    popular: true,
  },
  {
    id: '1720',
    shortName: '1720',
    name: '1720 · Casal de Cambra ↔ Lisboa (Colégio Militar)',
    type: 'bus',
    operator: 'Carris Metropolitana',
    operatorCategory: 'cmet',
    color: '#FFC600',
    textColor: '#000000',
    subtitle: 'Área 1 · Caneças, Pontinha, Colombo',
    area: 'Área 1',
    popular: false,
  },
  {
    id: '1601',
    shortName: '1601',
    name: '1601 · Carcavelos (Praia) ↔ Amadora Este',
    type: 'bus',
    operator: 'Carris Metropolitana',
    operatorCategory: 'cmet',
    color: '#FFC600',
    textColor: '#000000',
    subtitle: 'Área 1 · Oeiras, Queluz, Amadora',
    area: 'Área 1',
    popular: false,
  },
  {
    id: '2601',
    shortName: '2601',
    name: '2601 · Loures (Centro) ↔ Lisboa (Campo Grande)',
    type: 'bus',
    operator: 'Carris Metropolitana',
    operatorCategory: 'cmet',
    color: '#FFC600',
    textColor: '#000000',
    subtitle: 'Área 2 · Loures, Odivelas, Lumiar, Campo Grande',
    area: 'Área 2',
    popular: true,
  },
  {
    id: '2720',
    shortName: '2720',
    name: '2720 · Odivelas (Metro) ↔ Alverca (Estação)',
    type: 'bus',
    operator: 'Carris Metropolitana',
    operatorCategory: 'cmet',
    color: '#FFC600',
    textColor: '#000000',
    subtitle: 'Área 2 · Odivelas, Loures, Santa Iria, Alverca',
    area: 'Área 2',
    popular: false,
  },
  {
    id: '2715',
    shortName: '2715',
    name: '2715 · Bucelas ↔ Lisboa (Campo Grande)',
    type: 'bus',
    operator: 'Carris Metropolitana',
    operatorCategory: 'cmet',
    color: '#FFC600',
    textColor: '#000000',
    subtitle: 'Área 2 · Bucelas, Loures, Frielas, Campo Grande',
    area: 'Área 2',
    popular: false,
  },
  {
    id: '4701',
    shortName: '4701',
    name: '4701 · Alcochete (Freeport) ↔ Lisboa (Oriente)',
    type: 'bus',
    operator: 'Carris Metropolitana',
    operatorCategory: 'cmet',
    color: '#FFC600',
    textColor: '#000000',
    subtitle: 'Área 4 · Via Ponte Vasco da Gama',
    area: 'Área 4',
    popular: true,
  },
  {
    id: '4305',
    shortName: '4305',
    name: '4305 · Montijo (Terminal) ↔ Lisboa (Oriente)',
    type: 'bus',
    operator: 'Carris Metropolitana',
    operatorCategory: 'cmet',
    color: '#FFC600',
    textColor: '#000000',
    subtitle: 'Área 4 · Via Ponte Vasco da Gama',
    area: 'Área 4',
    popular: true,
  },
  {
    id: '4530',
    shortName: '4530',
    name: '4530 · Setúbal (ITS) ↔ Moita',
    type: 'bus',
    operator: 'Carris Metropolitana',
    operatorCategory: 'cmet',
    color: '#FFC600',
    textColor: '#000000',
    subtitle: 'Área 4 · Setúbal, Palmela, Pinhal Novo, Moita',
    area: 'Área 4',
    popular: false,
  },
];

/**
 * Retorna todos os itens do catálogo de transportes, fundindo a lista base com
 * todas as carreiras ativas do Carris Metropolitana recebidas através de linesMap.
 */
export function getAllCatalogItems(linesMap?: Map<string, Line>): FavoriteCatalogItem[] {
  const itemsMap = new Map<string, FavoriteCatalogItem>();

  // 1. Inserir itens base
  for (const item of BASE_TRANSIT_CATALOG) {
    itemsMap.set(item.id.toUpperCase(), item);
  }

  // 2. Se linesMap existir, incorporar quaisquer outras linhas Carris Metropolitana ou Carris
  if (linesMap) {
    linesMap.forEach((line) => {
      const lineId = (line.short_name || line.id).toUpperCase();
      if (!itemsMap.has(lineId)) {
        let opCat: FavoriteCatalogItem['operatorCategory'] = 'cmet';
        let opName = 'Carris Metropolitana';
        let area = 'AML';

        if (lineId.startsWith('M')) {
          opCat = 'mobi';
          opName = 'MobiCascais';
        } else if (lineId === '753' || (lineId.startsWith('7') && lineId.length === 3) || lineId.endsWith('E')) {
          opCat = 'carris';
          opName = 'Carris Lisboa';
        } else if (lineId.startsWith('CP_')) {
          opCat = 'cp';
          opName = 'Comboios de Portugal';
        } else if (lineId.startsWith('1')) {
          area = 'Área 1';
        } else if (lineId.startsWith('2')) {
          area = 'Área 2';
        } else if (lineId.startsWith('3')) {
          area = 'Área 3';
        } else if (lineId.startsWith('4')) {
          area = 'Área 4';
        }

        itemsMap.set(lineId, {
          id: lineId,
          shortName: line.short_name || lineId,
          name: `${lineId} · ${line.long_name || `Carreira ${lineId}`}`,
          type: 'bus',
          operator: opName,
          operatorCategory: opCat,
          color: line.color || (opCat === 'mobi' ? '#009FE3' : '#FFC600'),
          textColor: line.text_color || (opCat === 'mobi' ? '#ffffff' : '#000000'),
          subtitle: line.long_name || `Carreira ${lineId}`,
          area,
          popular: false,
        });
      }
    });
  }

  return Array.from(itemsMap.values());
}

/**
 * Hook do React para gerir os favoritos do utilizador em tempo real com sincronização
 */
export function useFavorites() {
  const [favorites, setFavorites] = useState<FavoriteItem[]>(getStoredFavorites);

  useEffect(() => {
    const handleUpdate = () => {
      setFavorites(getStoredFavorites());
    };
    window.addEventListener(FAVORITES_CHANGE_EVENT, handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener(FAVORITES_CHANGE_EVENT, handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  const isFavorite = useCallback(
    (id: string) => {
      if (!id) return false;
      const target = id.toUpperCase().trim();
      return favorites.some((f) => f.id.toUpperCase().trim() === target);
    },
    [favorites]
  );

  const toggleFavorite = useCallback((item: FavoriteItem) => {
    const isNowFav = toggleStoredFavorite(item);
    notifyFavoritesChanged();
    return isNowFav;
  }, []);

  const removeFavorite = useCallback(
    (id: string) => {
      const target = id.toUpperCase().trim();
      const updated = favorites.filter((f) => f.id.toUpperCase().trim() !== target);
      saveStoredFavorites(updated);
      notifyFavoritesChanged();
    },
    [favorites]
  );

  const setFavoriteStatus = useCallback((item: FavoriteItem, isFav: boolean) => {
    setStoredFavoriteStatus(item, isFav);
    notifyFavoritesChanged();
  }, []);

  return {
    favorites,
    isFavorite,
    toggleFavorite,
    removeFavorite,
    setFavoriteStatus,
  };
}
