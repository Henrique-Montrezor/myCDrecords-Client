# myCDrecords client

React, Vite e TypeScript. Interface em pt-BR.

```powershell
npm ci
npm run dev
```

Abrir `http://localhost:5173`, com a API em `localhost:3004`. Usar `localhost`, não `127.0.0.1`, para preservar o cookie de sessão. O endereço da API pode ser configurado por `VITE_API_URL`.

## Recomendações no feed

- O modo padrão continua no motor original. **Usar ML experimental no meu feed** seleciona `artist-bpr-fictional-v1`, treinado somente com perfis fictícios, mas aplicado privadamente às suas próprias notas, favoritos e artistas escolhidos.
- Para começar: abrir `http://localhost:5173/recommendations?engine=ml`; em **Ajuste seu gosto**, selecionar artistas suportados, adicionar e salvar. Não depende da busca externa de artistas. Usar **Ver minhas sugestões ML no feed** para abrir `http://localhost:5173/?engine=ml`.
- A escolha fica na URL; recarregar e voltar preservam o modo, navegar sem `engine=ml` usa o motor original. Os 24 nomes suportados aparecem no painel. Estilos/gêneros não alimentam este modelo.
- O vetor do perfil e o ranking ML não são salvos nem usados para retreinar. Falta de cobertura informa fallback; indisponibilidade mostra erro/retry. Não há dados Spotify, qualidade real comprovada ou modelo treinado com contas reais.
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

O incremento ML foi validado com 132 testes e axe-core, lint, tipos e build. As respostas dos testes são sintéticas; os testes não inscrevem contas reais nem ligam coleta.

O CDP integrado continuou indisponível. A conferência foi feita por alternativa nativa:
Edge headless com perfil isolado e todas as APIs interceptadas com fixtures,
no preview de produção em `localhost:4173`. 375px/1280px sem overflow, alvo 44px,
foco/ativação por teclado, feed, loading, vazio, fallback, erro/retry e anônimo.
Nenhuma chamada inesperada à API nem erro JavaScript; requisições externas
não necessárias ficaram bloqueadas. Isso não comprova relevância do perfil real
nem substitui login/sinais próprios no app. O navegador e o preview temporários
são encerrados após a verificação, preservando o servidor de desenvolvimento existente.
