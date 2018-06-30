var socket = io.connect();

// On Document Ready
$(document).ready(function() {
  // Initialization
  drawPlayground(loggedNames);
  $("#dialog-hint").dialog({
    autoOpen: false,
    modal: true,
    buttons: {
      "Ok": function() {
        var hint = $("#hint").val();
        var cardId = $('#dialog-card').attr('x-card-id');
        var cardPos = $('#dialog-card').attr('x-card-pos');
        if (hint.length < 1) {
          return false;
        }
        $('#card-hand-' + cardPos).attr('src', 'img/cards/' + cardsFolder + 'card.jpg');
        $('#card-hand-' + cardPos).removeAttr('x-card-id');
        //placeTokenOnCard(cardPos);
        socket.emit('place-card', 'hint-setter', id, cardId);
        socket.emit('set-hint', hint, id);
        $('.hand-card').removeClass('hover-shadow');
        $('.hand-label').removeClass('hover-shadow');
        $(this).dialog("close");
      },
      "Cancel": function() {
          cardPlaced = false;
          $(this).dialog("close");
      }
    }
  });
  $("#dialog-hint").keydown(function(e) {
    if (e.keyCode == 13) {
      $(':button:contains("Ok")').click();
      e.preventDefault();
    }
  });
  $('#dialog-simple').dialog({
    autoOpen: false,
    modal: true,
    buttons: {
      'Ok': function() {
        $(this).dialog('close');
      }
    }
  });
  $('#dialog-kick').dialog({
    autoOpen: false,
    modal: true,
    buttons: {
      'Ok': function() {
        $(this).dialog('close');
      }
    }
  });
  // Append Listeners
  $('#logout').click(function() {
    if (loggedNames[id]) {
      socket.emit('logout', id);
    } else {
      $('#dialog-simple-text').text('You are already logged out.');
      $('#dialog-simple').dialog('open');
    }
  });
  $('.hand-card').click(function() {
    var cardId = parseInt($(this).attr('x-card-id'));
    var cardPos = parseInt($(this).attr('x-pos'));
    cardClick('hand', cardId, cardPos, this);
  });
  $('.desk-card').click(function() {
    var cardId = parseInt($(this).attr('x-card-id'));
    var cardPos = parseInt($(this).attr('x-pos'));
    if (allCardsPlaced) {
      cardClick('desk', cardId, cardPos, this);
    }
  });
});

// Socket.io Listeners
socket.on('login', function(data) {
  loggedNames = data.loggedNames;
  gameLocal = data.game;
  cardPlaced = false;
  cardGuessed = false;
  drawPlayground(data.loggedNames);
});
socket.on('logout', function(data) {
  loggedNames = data.names;
  if (data.id < id) {
    id--;
  }
  drawPlayground(data.names);
  gameLocal.start = false;
  nextPossible = false;
  $('.img-card').removeClass('hover-shadow on-move');
  $('.card-label').removeClass('hover-shadow');
  $('#dialog-simple-text').text('Player ' + data.name + ' logged out. Game is finished.');
  $('#dialog-simple').dialog('open');
});
socket.on('login-exists', function(data) {
  if (id == data.id) {
    console.log('login ' + data.name + ' exists');
    alert('login ' + data.name + ' exists');
  }
});
socket.on('start', function(names, game) {
  gameLocal = game;
  cardPlaced = false;
  cardGuessed = false;
  placedCardPos = -1;
  allCardsPlaced = false;
  playersCount = names.length;
  $('div.tokens-on-card').remove();
  drawPlayground(names, game);
  drawHandCards(game);
  drawDeskCards(game);
  onMove('start', { names, playerOnMove: game.tokenOnMove });
  toggleCorrectCard('hide', names, game);
});
socket.on('kick', function() {
  if (id != 0) {
    $('#dialog-kick').dialog('open');
    $('div[aria-describedby="dialog-kick"] span').html('<a href="./" >Ok</a>');
  }
});
socket.on('end', function(names, game) {
  cardPlaced = false;
  cardGuessed = false;
  placedCardPos = -1;
  allCardsPlaced = false;
  $('div.tokens-on-card').remove();
  drawPlayground(names, game);
  drawHandCards(game);
  drawDeskCards(game);
  onMove('end', { names, playerOnMove: game.tokenOnMove });
  toggleCorrectCard('hide', names, game);
  $('#dialog-simple-text').text('Game ended.');
  $('#dialog-simple').dialog('open');
});
socket.on('set-hint', function(hint, hintSetterId) {
  onMove('set-hint', { hint, playerOnMove: hintSetterId });
});
socket.on('place-card', function(names, game) {
  allCardsPlaced = true;
  drawHandCards(game);
  drawDeskCards(game);
  placedCardPos = names[id].placedPos;
  if (id == hintSetterId) {
    placeTokenOnCardLabel(game.hintCardPos);
  } else {
    var placedPos = names[id].placedPos;
    placeTokenOnCardLabel(placedPos);
    console.log(placedPos);
    console.log($('.desk-card[x-pos!="' + placedPos + '"]'));
    console.log($('.desk-bottom-label[x-pos!="' + placedPos + '"]'));
    $('.desk-card[x-pos!="' + placedPos + '"]').addClass('hover-shadow');
    $('.desk-upper-label').addClass('hover-shadow');
    $('.desk-bottom-label[x-pos!="' + placedPos + '"]').addClass('hover-shadow');
  }
  $('#message').text('All players placed cards. Choose correct card to hint: ' + game.hint);
});
socket.on('guess-card', function(names, game, moves) {
  nextPossible = true;
  placeAllTokensOnCards(names, game);
  toggleCorrectCard('show', names, game);
  var moveString = "";
  var endPosString = "";
  for (var i = 0; i < moves.length; i++) {
    moveString += ' Player ' + names[i].name + ': +' + moves[i] + ' points.';
    endPosString += ' Player ' + names[i].name + ' pos: ' + names[i].position + '.';
  }
  $('#message').text('All players guessed cards.' + moveString);
  console.log(endPosString);
});
socket.on('next-round', function(names, game) {
  nextPossible = false;
  cardPlaced = false;
  cardGuessed = false;
  placedCardPos = -1;
  allCardsPlaced = false;
  $('div.tokens-on-card').remove();
  $('div.tokens-on-label').remove();
  drawPlayground(names, game);
  drawHandCards(game);
  drawDeskCards(game);
  onMove('next-round', { names, playerOnMove: game.tokenOnMove });
  toggleCorrectCard('hide', names, game);
});
socket.on('game-finished', function(mess) {
  //alert(mess);
  nextPossible = false;
  $('#dialog-simple-text').text(mess);
  $('#dialog-simple').dialog('open');
});

// Socket.io Emitters
function startEmit() {
  if (loggedNames.length < 3) {
    $('#dialog-simple-text').text('Game can be started with at least 3 players.');
    $('#dialog-simple').dialog('open');
  } else if (gameLocal.start) {
    $('#dialog-simple-text').text('Game already started. Choose RESTART for restarting game.');
    $('#dialog-simple').dialog('open');
  } else {
    socket.emit('start');
  }
}
function restartEmit() {
  if (gameLocal.start) {
    socket.emit('restart');
  } else {
    $('#dialog-simple-text').text('Game is not started. Choose START for starting game.');
    $('#dialog-simple').dialog('open');
  }
}
function endEmit() {
  if (gameLocal.start) {
    socket.emit('end');
  } else {
    $('#dialog-simple-text').text('Game is not started.');
    $('#dialog-simple').dialog('open');
  }
}
function kickEmit() {
  if (!gameLocal.start) {
    socket.emit('kick');
  } else {
    $('#dialog-simple-text').text('Game is still running. Please end game first.');
    $('#dialog-simple').dialog('open');
  }
}
function nextEmit() {
  if (nextPossible) {
    socket.emit('next-round');
  } else {
    $('#dialog-simple-text').text('Next Round is not possible. Please finish current round or start new game.');
    $('#dialog-simple').dialog('open');
  }
}

// Helper Functions Definitions
function drawPlayground(names, game) {
  var id = '';
  for (var i = 0; i <= trackLength; i++) {
    for (var j = 0; j < maxPlayers; j++) {
      id = '#' + i + '_' + j;
      if (names[j] && i == names[j].position && j == names[j].id) {
        $(id).addClass('color-active');
        $(id).text(names[j].token);
      } else {
        $(id).removeClass('color-active');
        $(id).text('');
      }
      if (names[j] && game && i == names[j].position && j == game.tokenOnMove) {
        $(id).addClass('token-move');
      } else {
        $(id).removeClass('token-move');
      }
    }
  }
};

function drawHandCards(game) {
  $('.hand-card').attr('src', 'img/cards/' + cardsFolder + 'card.jpg');
  var ImgId = '';
  for (var i = 0; i < 5; i++) {
    ImgId = '#card-hand-' + i;
    for (var j = 0; j < game.cards.length; j++) {
      if (game.cards[j].player == id && game.cards[j].pos == i) {
        $(ImgId).attr('src', game.cards[j].url);
        $(ImgId).attr('x-card-id', j);
      } else {
        //$(ImgId).removeAttr('x-card-id');
      }
    }
  }
};

function drawDeskCards(game) {
  $('.desk-card').attr('src', 'img/cards/' + cardsFolder + 'card.jpg');
  var imgId = '';
  var labelId = '';
  for (var i = 0; i < 5; i++) {
    imgId = '#card-desk-' + i;
    labelId = '#desk-label-' + i;
    for (var j = 0; j < game.cards.length; j++) {
      if (game.cards[j].player == -1 && game.cards[j].pos == i) {
        $(imgId).attr('src', game.cards[j].url);
        $(imgId).attr('x-card-id', j);
        $(labelId).attr('x-card-id', j);
      } else {
        //$(ImgId).removeAttr('x-card-id');
      }
    }
    $(labelId).html();
    $(labelId).text(i + 1);
  }
};

function onMove(type, data) {
  hintSetterId = data.playerOnMove;
  var messText = '';
  if (data.playerOnMove == id) {
    switch (type) {
      case 'start':
        messText = 'Game started. You are on move.';
        $('.hand-card').addClass('on-move');
        $('.hand-card').addClass('hint-setter');
        $('.hand-card').addClass('hover-shadow');
        $('.hand-label').addClass('hover-shadow');
        break;
      case 'set-hint':
        messText = 'Hint: ' + data.hint;
        break;
      case 'next-round':
        messText = 'Next round. You are on move.';
        $('.hand-card').addClass('on-move');
        $('.hand-card').addClass('hint-setter');
        $('.hand-card').addClass('hover-shadow');
        $('.hand-label').addClass('hover-shadow');
        break;
      case 'end':
        messText = 'Game ended. New players can join.';
        break;
    }
  } else {
    $('.hand-card').removeClass('on-move');
    $('.hand-card').removeClass('hint-setter');
    $('.hand-card').removeClass('hover-shadow');
    $('.hand-label').removeClass('hover-shadow');
    switch (type) {
      case 'start':
        messText = 'Game started. Player ' + data.names[data.playerOnMove].name + ' is on move.';
        break;
      case 'set-hint':
        messText = 'Please choose your card to hint: ' + data.hint;
        $('.hand-card').addClass('on-move');
        $('.hand-card').addClass('hover-shadow');
        $('.hand-label').addClass('hover-shadow');
        break;
      case 'next-round':
        messText = 'Next round. Player ' + data.names[data.playerOnMove].name + ' is on move.';
        break;
      case 'end':
        messText = 'Game ended. New players can join.';
        break;
    }
  }
  $('#message').text(messText);
};

function cardClick(cardType, cardId, cardPos, cardTag) {
  console.log('click', cardType, cardId);
  if (gameLocal.start) {
    if (cardType == 'hand') { // hand card
      if (!cardPlaced) {
        if ($(cardTag).hasClass('on-move') && $(cardTag).hasClass('hint-setter')) { // hint setter
          cardPlaced = true;
          $('#dialog-card').attr('src', 'img/cards/' + cardsFolder + 'card' + cardId + '.jpg');
          $('#dialog-card').attr('x-card-id', cardId);
          $('#dialog-card').attr('x-card-pos', cardPos);
          $("#dialog-hint").dialog("open");
        }
        else if ($(cardTag).hasClass('on-move')) { // guesser
          cardPlaced = true;
          $(cardTag).attr('src', 'img/cards/' + cardsFolder + 'card.jpg');
          $(cardTag).removeAttr('x-card-id');
          $('.hand-card').removeClass('hover-shadow');
          $('.hand-label').removeClass('hover-shadow');
          socket.emit('place-card', 'hint-guesser', id, cardId);
        }
      }
    }
    else if (cardType == 'desk' && cardPos < playersCount) { // desk card
      if (!cardGuessed && id != hintSetterId) { // guesser
        if (placedCardPos !== cardPos) { // not own card
          cardGuessed = true;
          $('.desk-card').removeClass('hover-shadow');
          $('.desk-upper-label').removeClass('hover-shadow');
          $('.desk-bottom-label').removeClass('hover-shadow');
          placeTokenOnCard(cardPos);
          socket.emit('guess-card', id, cardId, cardPos);
        } else {
          //alert('This is your card! Please, choose another card.');
          $('#dialog-simple-text').text('This is your card! Please, choose another card.');
          $('#dialog-simple').dialog('open');
        }
      }
    }
  }
};

function placeTokenOnCard(cardPos) {
  var tokenDiv = '<div class="tokens-on-card"><div class="field-col token-in-tokens color-' + id + ' color-active">' + token + '</div></div>';
  $('#card-desk-' + cardPos).after(tokenDiv);
};

function placeTokenOnCardLabel(cardPos) {
  var cardLabelTag = $('#desk-label-' + cardPos);
  var tokenDiv = '<div class="token-on-label color-' + id + ' color-active">' + token + '</div>';
  cardLabelTag.html(tokenDiv);
};

function placeAllTokensOnCards(names, game) {
  var cardPos;
  var tokensDiv;
  var innerTokensDiv;
  var playerId;
  var playerToken;
  $('div.tokens-on-card').remove();
  $('img.desk-card[x-card-id]').each(function(i) {
    cardPos = $(this).attr('x-pos');
    innerTokensDiv = '';
    for (var i = 0; i < names.length; i++) {
      if (names[i].guessPos == cardPos) {
        innerTokensDiv += '<div class="field-col token-in-tokens color-' +  names[i].id + ' color-active">' + names[i].token + '</div>';
      }
    }
    tokensDiv = '<div class="tokens-on-card">' + innerTokensDiv + '</div>';
    $(this).after(tokensDiv);
  });
  $('div.desk-bottom-label').each(function(i) {
    cardPos = $(this).attr('x-pos');
    playerId = -1;
    playerToken = null;
    for (var i = 0; i < names.length; i++) {
      if (names[i].placedPos == cardPos) {
        playerId = names[i].id;
        playerToken = names[i].token;
      }
    }
    if (playerId >= 0) {
      $(this).html('<div class="token-on-label color-' + playerId + ' color-active">' + playerToken + '</div>');
    }
  });
}

function toggleCorrectCard(toogleType, names, game) {
  var cardTag = $('#card-desk-' + game.hintCardPos);
  var cardLabelTag = $('#desk-label-' + game.hintCardPos);
  if (toogleType === 'show') {
    cardLabelTag.addClass('mark-card-label');
    cardTag.addClass('mark-card');
    cardTag.fadeOut('slow');
    cardTag.fadeIn('slow', drawPlayground(names, game));
  } else if (toogleType === 'hide') {
    $('.desk-bottom-label').removeClass('mark-card-label');
    $('.desk-card').removeClass('mark-card');
  }
}
