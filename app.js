// Application globals
global.x_application = {
  trackLength: 17,
  maxPlayers: 5,
  dealtCards: 5,
  cardsFolder: 'orig/', // nums/, orig/
  cardsCount: 0,
  title: 'DiXit'
};
global.x_game = {
  cards: [],
  start: false,
  tokenOnMove: null,
  hint: null,
  hintCardPos: null,
  hintCardId: null,
  finished: false,
  winnerIds: []
};
global.x_loggedNames = [];

const express = require('express');
const bodyParser = require('body-parser');
const appLogic = require('./appLogic');
const debug = require('debug')('app');
const fs = require('fs');

const cardFiles = fs.readdirSync(`public/img/cards/${global.x_application.cardsFolder}`);
const cardRegExp = /^card\d{1,3}.jpe?g$/i;
for (let i = 0; i < cardFiles.length; i += 1) {
  if (cardRegExp.test(cardFiles[i])) {
    global.x_application.cardsCount += 1;
  }
}
if (global.x_application.cardsCount >= (global.x_application.maxPlayers * global.x_application.dealtCards)) {
  console.log(`Loaded ${global.x_application.cardsCount} cards for game.`);
} else {
  throw new Error(`Not enough cards for game. Just ${global.x_application.cardsCount} from required ${global.x_application.maxPlayers * global.x_application.dealtCards} cards loaded.`);
}

const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
// const firebase = require('firebase');

const port = process.env.PORT || '80';

const urlencodedParser = bodyParser.urlencoded({ extended: false });

app.set('views', './src/views');
app.set('view engine', 'ejs');
app.use('/', express.static(`${__dirname}/public/`));

app.get('/', (req, res) => {
  res.render('login', { title: global.x_application.title });
});
app.post('/dixit', urlencodedParser, (req, res) => {
  let { name } = req.body;
  if (typeof name === 'undefined') {
    name = req.query.name;
  }
  const validationResult = appLogic.loginValidation(name);
  if (validationResult.valid) { // login success, continue to game
    res.render('index', {
      name,
      id: validationResult.id,
      token: validationResult.token,
      loggedNames: global.x_loggedNames,
      trackLength: global.x_application.trackLength,
      maxPlayers: global.x_application.maxPlayers,
      dealtCards: global.x_application.dealtCards,
      cardsFolder: global.x_application.cardsFolder,
      title: global.x_application.title
    });
    io.emit('login', {
      name,
      loggedNames: global.x_loggedNames,
      game: global.x_game
    });
  } else if (validationResult.err === 'full') { // login error, max num of users reached
    res.render('login', {
      full: true,
      title: global.x_application.title
    });
  } else if (validationResult.err === 'name_exists') { // login error, name already exists
    // appLogic.logout(validationResult.id);
    // io.emit('logout', {
    //   loggedNames: global.x_loggedNames,
    //   id: validationResult.id
    // });
    res.render('login', {
      name,
      id: validationResult.id,
      game: global.x_game,
      title: global.x_application.title
    });
  } else if (validationResult.err === 'game_started') { // login error, game already started
    res.render('login', {
      start: true,
      title: global.x_application.title
    });
  }
  console.log(global.x_loggedNames);
});


const server = http.listen(port, () => {
  debug(`debug server is running on port ${server.address().port}`);
});

io.on('connection', (socket) => {
  socket.on('logout', (id) => {
    const logoutPlayer = appLogic.logout(id);
    if (global.x_loggedNames.length < 1) {
      appLogic.restart();
    } else {
      global.x_game.start = false;
      io.emit('logout', { name: logoutPlayer.name, names: global.x_loggedNames, id, game: global.x_game });
    }
  });
  socket.on('restart', () => {
    appLogic.restart();
    appLogic.start();
    io.emit('start', global.x_loggedNames, global.x_game);
  });
  socket.on('start', () => {
    if (appLogic.start()) {
      io.emit('start', global.x_loggedNames, global.x_game);
    }
  });
  socket.on('end', () => {
    appLogic.restart();
    io.emit('end', global.x_loggedNames, global.x_game);
  });
  socket.on('set-hint', (hint, playerId) => {
    appLogic.setHint(hint);
    io.emit('set-hint', hint, playerId);
  });
  socket.on('place-card', (type, playerId, cardId) => {
    const allCardsPlaced = appLogic.placeCard(type, playerId, cardId);
    if (allCardsPlaced) {
      io.emit('place-card', global.x_loggedNames, global.x_game);
    }
  });
  socket.on('guess-card', (id, cardId, cardPos) => {
    const guessResult = appLogic.guessCard(id, cardId, cardPos);
    if (guessResult.allCardsGuessed) {
      io.emit('guess-card', global.x_loggedNames, global.x_game, guessResult.positionsMove);
    }
    if (guessResult.gameFinished) {
      io.emit('game-finished', guessResult.winnersString);
    }
  });
  socket.on('next-round', () => {
    appLogic.nextRound();
    io.emit('next-round', global.x_loggedNames, global.x_game);
  });
  socket.on('kick', () => {
    appLogic.kick();
    io.emit('start', global.x_loggedNames, global.x_game);
    io.emit('kick');
  });
});
