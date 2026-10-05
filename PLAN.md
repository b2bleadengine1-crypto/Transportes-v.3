# Plano — limpeza da interface + bolha (branch ui-bubble-cleanup)

Regra: um commit por passo; cada passo só conta como feito depois de a prova passar.

| # | Passo | Prova | Estado |
|---|-------|-------|--------|
| 1 | Build limpo: esbuild ^0.27 (pedido pelo vite 8) + react-is (pedido pelo recharts) | `rm -rf node_modules && npm install && npm run build` sem flags | feito |
| 2 | Limpeza: apagar src/App.vue (morto, Vue não instalado) e 4 arquivos do projeto em public/ | build passa; dist sem .zip/.tar.gz | feito |
| 3 | index.html: permitir zoom, corrigir título | ler dist/index.html | feito |
| 4 | BubbleMenu.tsx em React; tirar FloatingSearchBar + FloatingActionButtons do ecrã; barra mínima de linhas ativas só quando há linha selecionada | build + tsc; cada ação ligada ao handler que já existia | feito |
| 5 | Auditoria MapComponent/api: corrigir só bugs claros | build + tsc | por fazer |

Retomar noutra sessão: `git checkout ui-bubble-cleanup`, ver a coluna Estado.
