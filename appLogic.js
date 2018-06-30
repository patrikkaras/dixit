const loginValidation = function loginValidation(name) {
  let nameExists = false;
  let idExists = false;
  let i;
  if (global.x_loggedNames.length >= global.x_application.maxPlayers) {
    return {
      valid: false,
      err: 'full',
      name
    };
  }
  for (i = 0; i < global.x_loggedNames.length; i += 1) {
    if (global.x_loggedNames[i].name === name) {
      nameExists = true;
      idExists = i;
    }
  }
  if (nameExists) {
    return {
      valid: false,
      err: 'name_exists',
      id: idExists,
      name
    };
  }
  if (global.x_game.start) {
    return {
      valid: false,
      err: 'game_started'
    }
  }
  const id = global.x_loggedNames.length;
  const token = name.charAt(0).toUpperCase();
  const position = 0;
  global.x_loggedNames.push({
    id,
    name,
    token,
    position
  });
  return {
    valid: true,
    name,
    token,
    id,
    position
  };
};

const logout = function logout(id) {
  global.x_game.start = false;
  const logoutPlayer = global.x_loggedNames[id];
  global.x_loggedNames.splice(id, 1);
  let i;
  for (i = 0; i < global.x_loggedNames.length; i += 1) {
    global.x_loggedNames[i].id = i;
  }
  return logoutPlayer;
};

const getRandomFromDeck = function getRandomFromDeck() {
  let random;
  let result = -1;
  while (result === -1) {
    random = Math.floor((Math.random() * global.x_application.cardsCount));
    if (global.x_game.cards[random].player === -1 && global.x_game.cards[random].pos === -1) {
      result = random;
    }
  }
  return result;
};

const getRandomFreeTablePos = function getRandomFreeTablePos() {
  let random;
  let result = -1;
  let setCardsCount = 0;
  while (result === -1 && setCardsCount < global.x_loggedNames.length) {
    random = Math.floor((Math.random() * global.x_loggedNames.length));
    result = random;
    let i;
    for (i = 0; i < global.x_game.cards.length; i += 1) {
      if (global.x_game.cards[i].player === -1 && global.x_game.cards[i].pos === random) {
        result = -1;
      }
    }
    setCardsCount = 0;
    for (i = 0; i < global.x_game.cards.length; i += 1) {
      if (global.x_game.cards[i].player === -1 && global.x_game.cards[i].pos >= 0) {
        setCardsCount += 1;
      }
    }
  }
  return result;
};

const dealCards = function dealCards() {
  let i;
  let j;
  let k;
  let cardId;
  let freeHandPos;
  // global.x_game.cards = [];
  if (global.x_game.cards.length === 0) { // dealing on start
    for (i = 0; i < global.x_application.cardsCount; i += 1) {
      global.x_game.cards.push({
        id: i,
        url: `img/cards/${global.x_application.cardsFolder}card${i}.jpg`,
        player: -1,
        pos: -1
      }); // deck: player=-1, pos=-1, table: player=-1, pos=0-4, player: player=0-4, pos=0-4
    }
  }
  for (i = 0; i < global.global.x_loggedNames.length; i += 1) {
    for (j = 0; j < global.x_application.dealtCards; j += 1) {
      freeHandPos = true;
      for (k = 0; k < global.x_game.cards.length; k += 1) {
        if (global.x_game.cards[k].player === i && global.x_game.cards[k].pos === j) {
          freeHandPos = false;
        }
      }
      if (freeHandPos) { // deal card only if player's free position
        cardId = getRandomFromDeck();
        global.x_game.cards[cardId].player = i;
        global.x_game.cards[cardId].pos = j;
      }
    }
  }
};

const start = function start() {
  if (global.x_game.start || global.x_loggedNames.length < 3) {
    return false;
  }
  global.x_game.start = true;
  global.x_game.tokenOnMove = 0;
  // deal cards
  dealCards();
  return true;
};

const restart = function restart() {
  let i;
  for (i = 0; i < global.x_loggedNames.length; i += 1) {
    global.x_loggedNames[i].position = 0;
    global.x_loggedNames[i].guessPos = -1;
    global.x_loggedNames[i].guessCardId = -1;
  }
  global.x_game = {};
  global.x_game.cards = [];
  global.x_game.winnerIds = [];
};

const kick = function kick() {
  let i;
  for (i = (global.x_loggedNames.length - 1); i > 0; i -= 1) {
    global.x_loggedNames.splice(i, 1);
  }
  restart();
};

const setHint = function setHint(hint) {
  global.x_game.hint = hint;
};

const placeCard = function placeCard(type, playerId, cardId) {
  const position = getRandomFreeTablePos();
  if (position === -1) {
    return false;
  }
  global.x_game.cards[cardId].player = -1;
  global.x_game.cards[cardId].pos = position;
  //global.x_game.cards[cardId].fromPlayer = playerId;
  global.x_loggedNames[playerId].placedPos = position;
  global.x_loggedNames[playerId].placedCardId = cardId;
  if (type === 'hint-setter') { // for hint setter fill also guess right after placing card
    global.x_loggedNames[playerId].guessPos = position;
    global.x_loggedNames[playerId].guessCardId = cardId;
    global.x_game.hintCardPos = position;
    global.x_game.hintCardId = cardId;
  }
  let i;
  let setCardsCount = 0;
  for (i = 0; i < global.x_game.cards.length; i += 1) {
    if (global.x_game.cards[i].player === -1 && global.x_game.cards[i].pos >= 0) {
      setCardsCount += 1;
    }
  }
  if (setCardsCount === global.x_loggedNames.length) {
    return true;
  }
  return false;
};

const moveTrackTokens = function moveTrackTokens() {
  let cardFounds = 0;
  const playersCount = global.x_loggedNames.length;
  const hintSetterId = global.x_game.tokenOnMove;
  let i;
  let j;
  let positionsStart = [];
  let positionsEnd = [];
  let positionsMove = [];
  for (i = 0; i < playersCount; i += 1) {
    positionsStart.push(global.x_loggedNames[i].position);
  }
  for (i = 0; i < playersCount; i += 1) {
    if (global.x_loggedNames[i].guessPos === global.x_game.hintCardPos) {
      cardFounds += 1;
    }
  }
  if (cardFounds === playersCount) { // all players found card
    for (i = 0; i < playersCount; i += 1) {
      if (global.x_loggedNames[i].id !== hintSetterId) { // 2 points for guessers, 0 for hinter
        global.x_loggedNames[i].position += 2;
      }
    }
  } else if (cardFounds === 1) { // no players found card (except 1 hinter)
    for (i = 0; i < playersCount; i += 1) {
      if (global.x_loggedNames[i].id === hintSetterId) { // 0 points for guessers, 2 for hinter
        global.x_loggedNames[i].position += 2;
      }
    }
    for (i = 0; i < playersCount; i += 1) {
      if (global.x_loggedNames[i].id !== hintSetterId) { // +1 point for guesser per his card vote
        for (j = 0; j < playersCount; j += 1) {
          if (global.x_loggedNames[j].guessPos === global.x_loggedNames[i].placedPos) {
            global.x_loggedNames[i].position += 1;
          }
        }
      }
    }
  } else if (cardFounds > 1 && cardFounds < playersCount) { // at least one player but not all found card
    for (i = 0; i < playersCount; i += 1) {
      if (global.x_loggedNames[i].id === hintSetterId) { // 3 points for hinter
        global.x_loggedNames[i].position += 3;
      } else {
        if (global.x_loggedNames[i].guessPos === global.x_game.hintCardPos) { // 3 points for succesfull guesser
          global.x_loggedNames[i].position += 3;
        }
        for (j = 0; j < playersCount; j += 1) {
          if (global.x_loggedNames[j].guessPos === global.x_loggedNames[i].placedPos) { // +1 point for guesser per his card vote
            global.x_loggedNames[i].position += 1;
          }
        }
      }
    }
  }
  for (i = 0; i < playersCount; i+= 1) {
    positionsEnd.push(global.x_loggedNames[i].position);
  }
  // check if some player finished
  for (i = 0; i < global.x_loggedNames.length; i += 1) {
    if (global.x_loggedNames[i].position >= global.x_application.trackLength) {
      global.x_loggedNames[i].position = global.x_application.trackLength;
      global.x_game.finished = true;
      global.x_game.winnerIds.push(global.x_loggedNames[i].id);
    }
  }
  for (i = 0; i < playersCount; i+= 1) {
    positionsMove.push(positionsEnd[i] - positionsStart[i]);
  }
  return positionsMove;
};

const guessCard = function guessCard(playerId, cardId, cardPos) {
  let allCardsGuessed = false;
  let gameFinished = false;
  let positionsMove;
  global.x_loggedNames[playerId].guessPos = cardPos;
  global.x_loggedNames[playerId].guessCardId = cardId;
  let guessedCardsCount = 0;
  let i;
  for (i = 0; i < global.x_loggedNames.length; i += 1) {
    if (global.x_loggedNames[i].guessPos >= 0) {
      guessedCardsCount += 1;
    }
  }
  if (guessedCardsCount === global.x_loggedNames.length) {
    allCardsGuessed = true;
    positionsMove = moveTrackTokens();
    if (global.x_game.finished) {
      gameFinished = true;
      global.x_game.start = false;
    }
  }
  let winnersString = 'Game finished! ';
  if (global.x_game.winnerIds.length === 1) {
    winnersString += `Winner is ${global.x_loggedNames[global.x_game.winnerIds[0]].name}.`;
  } else if (global.x_game.winnerIds.length > 1) {
    winnersString += 'Winners are ';
    for (i = 0; i < global.x_game.winnerIds.length; i += 1) {
      if (i > 0) {
        winnersString += ' and ';
      }
      winnersString += global.x_loggedNames[global.x_game.winnerIds[i]].name;
    }
    winnersString += '.';
  }
  return {
    allCardsGuessed,
    gameFinished,
    positionsMove,
    winnersString
  };
};

const nextRound = function nextRound() {
  // remove desk cards to deck
  // remove tokens from desk cards
  // remove correct card highligt
  // add new card from deck to players
  // set on move next player with message

  const playersCount = global.x_loggedNames.length;
  const cardsCount = global.x_game.cards.length;
  let i;
  // clear players's placements and guesses
  for (i = 0; i < playersCount; i += 1) {
    global.x_loggedNames[i].guessPos = -1;
    global.x_loggedNames[i].guessCardId = -1;
    global.x_loggedNames[i].placedPos = -1;
    global.x_loggedNames[i].placedCardId = -1;
  }
  // move hint position to next player
  if (global.x_game.tokenOnMove + 1 < playersCount) {
    global.x_game.tokenOnMove += 1;
  } else {
    global.x_game.tokenOnMove = 0;
  }
  // move all cards from desk to deck
  for (i = 0; i < cardsCount; i += 1) {
    global.x_game.cards[i].player = -1;
    global.x_game.cards[i].pos = -1;
  }
  // deal missing cards to players
  dealCards();
};

module.exports.loginValidation = loginValidation;
module.exports.logout = logout;
module.exports.start = start;
module.exports.restart = restart;
module.exports.setHint = setHint;
module.exports.placeCard = placeCard;
module.exports.guessCard = guessCard;
module.exports.nextRound = nextRound;
module.exports.kick = kick;
