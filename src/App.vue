<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  Search,
  Navigation,
  RotateCw,
  Plus,
  Minus,
  Layers,
  Bus,
  X,
  ChevronUp,
  ChevronDown,
  CheckCircle2,
  AlertCircle
} from 'lucide-vue-next'

// --- Tipos de Dados ---
export interface LineItem {
  id: string
  short_name: string
  long_name: string
  color: string
  text_color: string
  area: string
}

// --- Estados do Bottom Sheet ---
// Snap points acessíveis: 'peek' (124px), 'half' (50vh), 'full' (88vh)
type SheetSnap = 'peek' | 'half' | 'full'
const sheetSnap = ref<SheetSnap>('peek')

const toggleSheet = () => {
  if (sheetSnap.value === 'peek') {
    sheetSnap.value = 'half'
  } else {
    sheetSnap.value = 'peek'
  }
}

// --- Pesquisa e Seleção de Linhas ---
const searchQuery = ref('')
const selectedLine = ref<LineItem | null>(null)
const isUpdating = ref(false)

// Catálogo de carreiras da Área Metropolitana de Lisboa
const lines = ref<LineItem[]>([
  { id: '2001', short_name: '2001', long_name: 'Alverca (Estação) - Loures', color: '#EA580C', text_color: '#FFFFFF', area: 'Área 2' },
  { id: '2002', short_name: '2002', long_name: 'Bucelas - Odivelas (Metro)', color: '#EA580C', text_color: '#FFFFFF', area: 'Área 2' },
  { id: '2715', short_name: '2715', long_name: 'Loures (Centro) - Campo Grande (Metro)', color: '#EA580C', text_color: '#FFFFFF', area: 'Área 2' },
  { id: '1502', short_name: '1502', long_name: 'Algés (Estação) - Amadora (Hospital)', color: '#E11D48', text_color: '#FFFFFF', area: 'Área 1' },
  { id: '3710', short_name: '3710', long_name: 'Costa da Caparica - Lisboa (Sete Rios)', color: '#2563EB', text_color: '#FFFFFF', area: 'Área 3' },
  { id: '4701', short_name: '4701', long_name: 'Lisboa (Oriente) - Barreiro', color: '#059669', text_color: '#FFFFFF', area: 'Área 4' },
])

const filteredLines = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return lines.value
  return lines.value.filter(
    (l) => l.short_name.toLowerCase().includes(q) || l.long_name.toLowerCase().includes(q)
  )
})

// --- Ações do Utilizador ---
const selectLine = (line: LineItem) => {
  selectedLine.value = line
  sheetSnap.value = 'peek'
}

const clearSelection = () => {
  selectedLine.value = null
  searchQuery.value = ''
}

const handleGpsLocation = () => {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        console.log('Centrar coordenadas:', pos.coords.latitude, pos.coords.longitude)
      },
      () => {
        alert('Por favor autorize o acesso à localização nas definições do seu telemóvel.')
      }
    )
  }
}

const handleRefresh = async () => {
  isUpdating.value = true
  await new Promise((resolve) => setTimeout(resolve, 600))
  isUpdating.value = false
}

const handleZoomIn = () => {
  // Chamada de zoom in no mapa Leaflet
}

const handleZoomOut = () => {
  // Chamada de zoom out no mapa Leaflet
}
</script>

<template>
  <div class="relative w-screen h-screen overflow-hidden bg-zinc-950 font-sans select-none">
    
    <!-- 1. MAPA CANVAS / LEAFLET (FUNDO COMPLETO) -->
    <div id="map-root" class="absolute inset-0 z-0 bg-zinc-950" role="application" aria-label="Mapa de Transportes de Lisboa">
      <!-- O componente MapView.vue com preferCanvas: true monta aqui -->
    </div>

    <!-- 2. CABEÇALHO SUPERIOR ULTRA-LIMPO (SEM MENUS SOBREPOSTOS) -->
    <header class="absolute top-0 inset-x-0 z-10 p-3 pointer-events-none flex items-center justify-between">
      <div class="pointer-events-auto bg-zinc-900 border-2 border-zinc-700 shadow-2xl rounded-2xl px-4 py-2.5 flex items-center gap-3">
        <span class="w-3.5 h-3.5 rounded-full bg-emerald-500 animate-pulse" />
        <h1 class="text-base sm:text-lg font-black text-white tracking-wide">
          Guia de Transportes
        </h1>
      </div>

      <!-- Indicador da Carreira Ativa no Mapa -->
      <div 
        v-if="selectedLine"
        class="pointer-events-auto bg-amber-400 text-zinc-950 px-4 py-2 rounded-2xl border-2 border-amber-300 font-black text-base sm:text-lg flex items-center gap-2 shadow-2xl"
      >
        <span>Carreira {{ selectedLine.short_name }}</span>
        <button 
          @click="clearSelection" 
          type="button"
          class="h-10 px-2 flex items-center gap-1 bg-amber-500 active:bg-amber-600 rounded-xl cursor-pointer"
          aria-label="Limpar carreira selecionada"
        >
          <X class="w-5 h-5 stroke-[3]" />
          <span class="text-xs uppercase font-black">Limpar</span>
        </button>
      </div>
    </header>

    <!-- 3. CONTROLOS DE MAPA NA THUMB ZONE (CANTO INFERIOR DIREITO) -->
    <!-- Flutuam estrategicamente por cima do Bottom Sheet para fácil alcance do polegar -->
    <aside 
      class="fixed right-4 z-20 flex flex-col items-end gap-3 transition-all duration-300 ease-out"
      :style="{
        bottom: sheetSnap === 'peek' ? '136px' : sheetSnap === 'half' ? 'calc(50vh + 16px)' : 'calc(88vh + 16px)'
      }"
      aria-label="Controlos Rápidos de Mapa"
    >
      <!-- Botão: Localização GPS ("Onde Estou") -->
      <button
        @click="handleGpsLocation"
        type="button"
        class="h-14 px-5 bg-zinc-900 border-2 border-zinc-700 active:bg-zinc-800 text-white rounded-2xl shadow-2xl flex items-center gap-3 cursor-pointer touch-manipulation hover:border-amber-400 transition-colors"
      >
        <Navigation class="w-6 h-6 text-amber-400 shrink-0" />
        <span class="text-lg font-bold">Onde Estou</span>
      </button>

      <!-- Grupo de Zoom (Mínimo h-14 por botão, texto nítido, sem ícones solitários) -->
      <div class="bg-zinc-900 border-2 border-zinc-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        <button
          @click="handleZoomIn"
          type="button"
          class="h-14 px-4 flex items-center gap-2 text-white active:bg-zinc-800 border-b border-zinc-800 cursor-pointer touch-manipulation"
          aria-label="Aumentar zoom do mapa"
        >
          <Plus class="w-7 h-7 text-amber-400 stroke-[3]" />
          <span class="text-base font-bold">Mais Zoom</span>
        </button>
        <button
          @click="handleZoomOut"
          type="button"
          class="h-14 px-4 flex items-center gap-2 text-white active:bg-zinc-800 cursor-pointer touch-manipulation"
          aria-label="Diminuir zoom do mapa"
        >
          <Minus class="w-7 h-7 text-zinc-300 stroke-[3]" />
          <span class="text-base font-bold">Menos Zoom</span>
        </button>
      </div>

      <!-- Botão: Atualizar Telemetria em Tempo Real -->
      <button
        @click="handleRefresh"
        type="button"
        class="h-14 px-5 bg-amber-400 active:bg-amber-500 text-zinc-950 font-black rounded-2xl shadow-2xl flex items-center gap-3 border-2 border-amber-300 cursor-pointer touch-manipulation"
        :aria-busy="isUpdating"
      >
        <RotateCw class="w-6 h-6 stroke-[3]" :class="{ 'animate-spin': isUpdating }" />
        <span class="text-lg">Atualizar</span>
      </button>
    </aside>

    <!-- 4. BOTTOM SHEET: CONTAINER FIXO ANCORADO AO FUNDO -->
    <!-- Fundo sólido opaco (bg-zinc-900), alto contraste contra luz solar direta -->
    <section
      class="fixed inset-x-0 bottom-0 z-30 bg-zinc-900 border-t-4 border-zinc-700 rounded-t-3xl shadow-[0_-12px_40px_rgba(0,0,0,0.85)] transition-all duration-300 ease-out flex flex-col"
      :class="{
        'h-[124px]': sheetSnap === 'peek',
        'h-[50vh]': sheetSnap === 'half',
        'h-[88vh]': sheetSnap === 'full'
      }"
      role="region"
      aria-label="Painel Inferior de Carreiras e Paragens"
    >
      <!-- CABEÇALHO TÁTIL & PÍLULA DE ARRASTO -->
      <div 
        @click="toggleSheet"
        class="w-full pt-3 pb-2 px-4 flex flex-col items-center justify-center cursor-pointer select-none border-b border-zinc-800"
      >
        <!-- Pílula de arrasto com bom contraste -->
        <div class="w-20 h-2 bg-zinc-600 rounded-full mb-2 hover:bg-amber-400 transition-colors" />

        <div class="w-full flex items-center justify-between">
          <div class="flex items-center gap-2.5">
            <Bus class="w-7 h-7 text-amber-400" />
            <h2 class="text-lg sm:text-xl font-black text-white">
              {{ selectedLine ? `A acompanhar Carreira ${selectedLine.short_name}` : 'Escolher Carreira' }}
            </h2>
          </div>

          <!-- Botão explícito com ícone e texto para abrir/fechar a folha -->
          <button
            type="button"
            class="h-10 px-3 bg-zinc-800 border border-zinc-700 rounded-xl text-amber-400 font-bold text-sm flex items-center gap-1.5"
          >
            <span>{{ sheetSnap === 'peek' ? 'Abrir Lista' : 'Recolher' }}</span>
            <ChevronUp v-if="sheetSnap === 'peek'" class="w-5 h-5 stroke-[2.5]" />
            <ChevronDown v-else class="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>
      </div>

      <!-- CORPO DA FOLHA (PESQUISA + LISTA ACESSÍVEL) -->
      <div class="flex-1 overflow-y-auto px-4 py-3 space-y-3.5">
        
        <!-- CAMPO DE PESQUISA GIGANTE: h-16 (64PX) COM TEXTO EM LINGUAGEM NATURAL -->
        <div class="relative w-full">
          <label for="bus-search-input" class="sr-only">Qual é o número do seu autocarro?</label>
          <div class="relative flex items-center">
            <Search class="absolute left-4 w-7 h-7 text-amber-400 pointer-events-none" />
            <input
              id="bus-search-input"
              v-model="searchQuery"
              @focus="sheetSnap = sheetSnap === 'peek' ? 'half' : sheetSnap"
              type="text"
              inputmode="search"
              placeholder="Qual é o número do seu autocarro?"
              class="w-full h-16 pl-14 pr-12 bg-zinc-950 border-2 border-zinc-600 focus:border-amber-400 text-white text-lg sm:text-xl font-bold rounded-2xl placeholder:text-zinc-400 placeholder:font-normal focus:outline-none transition-colors shadow-inner"
            />
            <button
              v-if="searchQuery"
              @click="searchQuery = ''"
              type="button"
              class="absolute right-3 h-12 px-2 flex items-center justify-center text-zinc-400 hover:text-white"
              aria-label="Limpar pesquisa"
            >
              <X class="w-6 h-6 stroke-[3]" />
            </button>
          </div>
        </div>

        <!-- MENSAGEM DE AVISO QUANDO NÃO HÁ RESULTADOS -->
        <div 
          v-if="filteredLines.length === 0" 
          class="p-6 text-center bg-zinc-950 border-2 border-zinc-800 rounded-2xl space-y-2"
        >
          <AlertCircle class="w-10 h-10 text-amber-400 mx-auto" />
          <p class="text-xl font-black text-white">Nenhum autocarro encontrado</p>
          <p class="text-base text-zinc-400">Verifique o número e tente novamente.</p>
        </div>

        <!-- LISTA DE CARREIRAS: CARTÕES GIGANTES COM ALTURA MÍNIMA h-16 (64PX) -->
        <div class="space-y-2">
          <button
            v-for="line in filteredLines"
            :key="line.id"
            @click="selectLine(line)"
            type="button"
            class="w-full min-h-[64px] p-3 rounded-2xl border-2 flex items-center justify-between gap-3 text-left transition-all cursor-pointer touch-manipulation active:scale-[0.98]"
            :class="selectedLine?.id === line.id 
              ? 'bg-amber-400/20 border-amber-400 shadow-xl' 
              : 'bg-zinc-800 border-zinc-700 hover:border-zinc-500'"
          >
            <div class="flex items-center gap-3.5 min-w-0">
              <!-- Emblema Numérico da Carreira (Alto Contraste) -->
              <div
                class="h-14 min-w-[72px] px-2.5 rounded-xl font-black font-mono text-2xl flex items-center justify-center shrink-0 shadow-md"
                :style="{ backgroundColor: line.color, color: line.text_color }"
              >
                {{ line.short_name }}
              </div>

              <!-- Designação da Carreira & Destino em Tamanho Legível -->
              <div class="min-w-0">
                <p class="text-lg sm:text-xl font-black text-white truncate">
                  Carreira {{ line.short_name }}
                </p>
                <p class="text-sm sm:text-base font-medium text-zinc-300 truncate">
                  {{ line.long_name }}
                </p>
              </div>
            </div>

            <!-- Botão de Ação Explícito (Ícone + Texto) -->
            <div class="shrink-0">
              <span 
                v-if="selectedLine?.id === line.id"
                class="h-12 px-3 rounded-xl bg-amber-400 text-zinc-950 font-black text-sm uppercase flex items-center gap-1.5 shadow-md"
              >
                <CheckCircle2 class="w-5 h-5 stroke-[2.5]" />
                <span>Ativo</span>
              </span>
              <span 
                v-else
                class="h-12 px-3 rounded-xl bg-zinc-700 text-white font-bold text-sm flex items-center gap-1"
              >
                <span>Ver</span>
                <span>&rarr;</span>
              </span>
            </div>
          </button>
        </div>

      </div>
    </section>

  </div>
</template>

<style scoped>
/* Evita atraso de duplo toque em dispositivos móveis */
button, input {
  touch-action: manipulation;
}

/* Scrollbar visível com contraste apropriado */
::-webkit-scrollbar {
  width: 10px;
}
::-webkit-scrollbar-track {
  background: #18181b;
}
::-webkit-scrollbar-thumb {
  background: #3f3f46;
  border-radius: 6px;
  border: 2px solid #18181b;
}
::-webkit-scrollbar-thumb:hover {
  background: #fbbf24;
}
</style>
