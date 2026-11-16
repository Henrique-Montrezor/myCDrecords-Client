# myCDrecords client

React, Vite e TypeScript. Interface em pt-BR.

```powershell
npm ci
npm run dev
```

Abrir `http://localhost:5173`, com a API em `localhost:3004`. Usar `localhost`, não `127.0.0.1`, para preservar o cookie de sessão. O endereço da API pode ser configurado por `VITE_API_URL`.

## Recomendações no feed

- O feed e a página **Para você** mantêm as sugestões do motor existente, com notas, favoritos e preferências. Não são apresentadas como resultados do novo modelo PyTorch.
- **Piloto de recomendações com ML** abre um painel opcional, carregado somente quando expandido. Ele mostra o aviso público integral e a situação da própria conta.
- A adesão exige convite, coleta habilitada e confirmação desmarcada por padrão do aviso vigente. Cadastro e aceite de publicação de reviews não autorizam ML.
- A retirada pode ser solicitada mesmo quando a consulta de participação está indisponível por pausa da coleta. Falhas são exibidas, sem confirmar retirada ou adesão que a API não confirmou.
- Somente novas notas independentes elegíveis após adesão entram no piloto. O painel não importa histórico, envia texto de reviews ou publica modelos.

Configuração operacional, convites e elegibilidade pertencem à [API](https://github.com/Henrique-Montrezor/myCDrecords-API#readme). Treino e limitações estão no [pacote ML](https://github.com/Henrique-Montrezor/myCDrecords-ml#readme). Esses repositórios devem ser clonados como pastas irmãs para os comandos privados Node → Python.

O laboratório `/recommendations/lab` é sintético e somente de desenvolvimento, separado da sessão real. Ele não substitui o feed.

## Verificação

```powershell
npm run lint
npm run typecheck
npm test
npm run build
```

O incremento de adesão foi validado com 127 testes e axe-core, lint, tipos e build. As respostas dos testes são sintéticas; os testes não inscrevem contas reais nem ligam coleta.

A conferência visual automatizada ficou pendente nesta entrega: a ferramenta de navegador apresentou timeouts CDP e `Storage.getCookies: Method not found`. Não foi possível homologar 375px/desktop por essa ferramenta; os testes jsdom não substituem essa conferência. O preview temporário usado na tentativa foi encerrado, sem encerrar o servidor de desenvolvimento existente.
