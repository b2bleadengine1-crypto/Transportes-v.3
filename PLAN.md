# Plano — limpeza da interface + bolha (branch ui-bubble-cleanup)

Regra: um commit por passo; cada passo só conta como feito depois de a prova passar.

| # | Passo | Prova | Estado |
|---|-------|-------|--------|
| 1 | Build limpo: esbuild ^0.27 (pedido pelo vite 8) + react-is (pedido pelo recharts) | `rm -rf node_modules && npm install && npm run build` sem flags | feito |
| 2 | Limpeza: apagar src/App.vue (morto, Vue não instalado) e 4 arquivos do projeto em public/ | build passa; dist sem .zip/.tar.gz | feito |
| 3 | index.html: permitir zoom, corrigir título | ler dist/index.html | feito |
| 4 | BubbleMenu.tsx em React; tirar FloatingSearchBar + FloatingActionButtons do ecrã; barra mínima de linhas ativas só quando há linha selecionada | build + tsc; cada ação ligada ao handler que já existia | feito |
| 5 | Auditoria MapComponent/api: corrigir só bugs claros | build + tsc | feito |

Retomar noutra sessão: `git checkout ui-bubble-cleanup`, ver a coluna Estado.

## Em aberto
- Proxy `/api/metropolitana`: está em `functions/` (Cloudflare **Pages** Functions). O site está em `*.workers.dev` (Cloudflare **Workers**), onde `functions/` não corre. A app cai para a API oficial (verificado no browser), por isso funciona, mas o proxy pode não estar ativo. Confirmar no painel Cloudflare se o projeto é Pages ou Worker.
- `FloatingSearchBar.tsx`, `FloatingActionButtons.tsx` e `TopNav.tsx` deixaram de ser usados; ficam no repositório para poder voltar atrás. Apagar quando a bolha estiver aprovada.
- Deploy: o push do ramo `ui-bubble-cleanup` disparou o Cloudflare Workers Builds e **falhou** (build ca28870f). O `main` passa. Localmente o build passa com npm e com bun, por isso a falha deve estar no passo de deploy do Cloudflare (wrangler) e não na compilação. Falta ver o log no painel Cloudflare.
