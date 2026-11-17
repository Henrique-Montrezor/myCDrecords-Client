# myCDrecords client

React, Vite e TypeScript. Interface em pt-BR.

```powershell
npm ci
npm run dev
```

Abrir `http://localhost:5173`, com a API em `localhost:3004`. Usar `localhost`, não `127.0.0.1`, para preservar o cookie de sessão. O endereço da API pode ser configurado por `VITE_API_URL`.

## Recomendações no feed

- O modo padrão continua no motor original. **Usar ML experimental no meu feed** seleciona `artist-bpr-fictional-v1`, treinado somente com perfis fictícios, mas aplicado privadamente às suas próprias notas, favoritos e artistas escolhidos.
- **Para você** é uma seção própria acima das atividades, com capas em uma única faixa rolável, em vez de uma coluna lateral.
- Para começar: ativar **Usar ML experimental no meu feed** no início ou em **Para você**. Em **Ajuste seu gosto**, selecionar artistas suportados, adicionar e salvar. Não depende da busca externa de artistas.
- A escolha fica salva na conta via API e vale após recarregar, navegar ou entrar em outro dispositivo. Depois da ativação, a caixa desaparece do feed e de Para você. Para desligar ou religar, abrir **Configurações → Recomendações** (`/settings/recommendations`).
- O antigo parâmetro `engine=ml` não ativa nem desativa o modelo. Como a versão anterior guardava a escolha apenas na URL, é preciso ativar uma vez para salvá-la na conta; não há migração de aceite presumido. A API precisa da migração aditiva 010 (aplicada na inicialização).
- Os 24 nomes suportados aparecem nas preferências do modo ML e em **Como escolhemos**. Estilos/gêneros não alimentam este modelo. A ativação da inferência não autoriza coleta ou treinamento.
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

O ajuste de seção/configurações foi validado com 138 testes em 28 arquivos,
axe-core, lint, tipos e build. A suíte passou com `npm test -- --maxWorkers=2`;
a execução com 28 workers teve um timeout no teste legado de Listas, sem
alteração de código ou de timeout para contorná-lo. As respostas são sintéticas;
os testes não inscrevem contas reais nem ligam coleta.

A conferência visual deste ajuste em 375px/1280px continua pendente:
o navegador integrado falhou por timeout CDP e Edge/Chrome isolados não
iniciaram/responderam à automação. Testes DOM não comprovam layout real.
O preview temporário foi encerrado, preservando o servidor de desenvolvimento
existente; nenhum perfil real foi consultado nessa tentativa.
