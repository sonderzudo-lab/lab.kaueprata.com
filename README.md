# lab.kaueprata.com

Galeria de aplicativos, jogos e exercícios de Kauê Prata. O hub e os projetos
publicados nele usam HTML, CSS e JavaScript puros, sem etapa de build.

## Como rodar

```bash
python -m http.server 8123
```

Abra `http://localhost:8123`.

## Adicionando um app

1. Crie uma pasta na raiz usando um slug curto, por exemplo `calculadora/`.
2. Coloque o app dentro dela, com `index.html` como entrada.
3. Use caminhos relativos dentro do app, como `./style.css` e `./script.js`.
4. Adicione o projeto em `assets/apps.js`.
5. Faça commit e push. A URL será `https://lab.kaueprata.com/calculadora/`.

O arquivo `assets/apps.js` é a fonte da lista exibida na página inicial.

## Primeiro projeto

- `/tabuada/` — Corrida da Tabuada, jogo educacional em Canvas 2D.

## Licença

MIT para o código do hub. Projetos incorporados podem ter suas próprias
licenças e autoria.
