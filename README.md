# TransporAML - Sistema de Transportes Inteligente da AML (PWA)

Aplicação Web Progressiva (PWA) de alto desempenho e offline-first para planeamento e monitorização em tempo real de transportes na Área Metropolitana de Lisboa (AML).

## 🚀 Operadores Integrados
- **Carris Metropolitana:** API Oficial ao vivo (veículos GPS, paragens, percursos, estimativas em tempo real).
- **MobiCascais:** Linhas municipais de Cascais (M01-M44) com traçados e geometria viária.
- **Carris (Lisboa Urbana):** Linha 753 (via Ponte 25 de Abril) e dados abertos.
- **CP (Comboios de Portugal):** Linhas de Cascais, Sintra, Azambuja e Sado com horários e chegadas por estação.
- **Fertagus:** Eixo ferroviário Norte-Sul (Ponte 25 de Abril: Roma-Areeiro ↔ Setúbal) com frequências e partidas.
- **Transtejo & Soflusa:** Ligações fluviais do Tejo (Cacilhas, Barreiro, Seixal, Montijo, Trafaria-Porto Brandão).
- **Metro Sul do Tejo (MST):** Linhas 1, 2 e 3 de metro ligeiro de superfície.
- **Metropolitano de Lisboa:** Linhas Azul, Amarela, Verde e Vermelha com estados de circulação e estações.

---

## ⚡ Funcionalidade de Isolamento de Sinal do Servidor
O sistema inclui controlo estrito de conexão:
- **Desconexão global por omissão:** Nenhum operador é consultado sem pedido expresso do utilizador.
- **Isolamento de Carreira:** Ao selecionar uma carreira (ex.: `3009`), apenas o sinal dessa carreira é emitido pelo servidor.
- **Filtro de Sentido de Circulação:** Apresenta e questiona o sentido de viagem (ex.: *Cacilhas (Terminal) → Trafaria (Terminal)* ou *Trafaria (Terminal) → Cacilhas (Terminal)*), restringindo o mapa e as chegadas exclusivamente aos veículos que circulam nesse sentido.

---

## 🛠️ Tecnologias Utilizadas
- **Frontend:** React 19 + TypeScript + Vite
- **Estilos:** Tailwind CSS v4
- **Mapas:** Leaflet + Leaflet MarkerCluster com azulejos Carto Dark/Light/OSM
- **Ícones:** Lucide React
- **PWA:** Vite Plugin PWA + Web App Manifest + Service Worker Workbox

---

## 📦 Como Instalar e Executar Localmente

### 1. Pré-requisitos
- Node.js 18+ (recomendado Node 20 LTS ou superior)
- npm, pnpm ou bun

### 2. Instalação
```bash
# Instalar as dependências
npm install
```

### 3. Modo de Desenvolvimento
```bash
# Iniciar o servidor local na porta 3000
npm run dev
```
Abra no navegador em: `http://localhost:3000`

### 4. Compilação para Produção
```bash
npm run build
```
Os ficheiros finais serão gerados na pasta `dist/`.

### 5. Verificação de Tipos / Linter
```bash
npm run lint
```

---

## 📁 Estrutura do Projeto
```text
├── index.html                 # Ponto de entrada HTML e meta tags PWA
├── package.json               # Dependências e scripts npm
├── tsconfig.json              # Configuração do TypeScript
├── vite.config.ts             # Configuração do Vite, Tailwind e PWA
├── metadata.json              # Metadados da aplicação
├── public/                    # Ícones PWA, manifestos e ficheiros estáticos
│   ├── icon.svg
│   ├── pwa-192x192.png
│   ├── pwa-512x512.png
│   └── routes.json
└── src/
    ├── App.tsx                # Componente principal e orquestração de estado
    ├── main.tsx               # Montagem React no DOM
    ├── types.ts               # Tipos TypeScript globais
    ├── index.css              # Estilos base e Tailwind
    ├── components/            # Componentes visuais modulares
    │   ├── MapComponent.tsx   # Mapa Leaflet com veículos, linhas e paragens
    │   ├── FloatingSearchBar.tsx # Barra de pesquisa e seletor sólido de operadores
    │   ├── DirectionModal.tsx # Modal de seleção de sentido de circulação
    │   ├── LineSelectorModal.tsx # Seletor completo de carreiras por empresa
    │   ├── StopArrivalsDrawer.tsx # Painel de próximas chegadas à paragem
    │   ├── ServiceAlertsModal.tsx # Alertas de serviço, greves e perturbações
    │   ├── SettingsModal.tsx  # Definições (tema, intervalos de atualização)
    │   └── ...
    └── services/              # Integrações de APIs e lógica de transporte
        ├── api.ts             # Carris Metropolitana e filtros de isolamento
        ├── directions.ts      # Sentidos de circulação de todas as operadoras
        ├── cpTrains.ts        # Comboios CP
        ├── fertagus.ts        # Eixo Ferroviário Fertagus
        ├── transtejoSoflusa.ts # Barcos Transtejo Soflusa
        ├── metroSulTejo.ts    # Metro Sul do Tejo
        ├── metroLisboa.ts     # Metropolitano de Lisboa
        └── mobiCascais.ts     # Carreiras MobiCascais
```
