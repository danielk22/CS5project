var socket = io();
var players;
var gameID;
var redCards;
var greenCards;
var currentRed = 0;
var currentGreen = 0;
var judgeIndex;
const cardsPerHand = 7;
var selectedCards = [];



const gameDescriptor = {
    minPlayers: 2,
    maxPlayers: 10,
    clientURL: 'mangos_game/mangos_game_client.html'
};

console.log('executing javascript in generic_game_host.js!');

socket.emit('serverRegisterNewGame', gameDescriptor);

socket.on('hostRegisterNewGame', function(message) {
    console.log(`The code is ${message}`);
    gameID = message;
    document.getElementById('gameID').textContent = `Your Game ID is ${message}`;
});

socket.on('hostNewPlayerList', function(message) {
    console.log('got a hostNewPlayerList event');
    players = message;
    updateScore(); //This displays current player list and score (which is initially set to 0)
});

function storeRed() {
    var iframeDoc = document.getElementById('redCards').contentWindow.document;
    var redCardsStr =  iframeDoc.getElementById('cardList').innerHTML;
    redCards = retrieveCardInfo(redCardsStr);
}

function storeGreen() {
    var iframeDoc = document.getElementById('greenCards').contentWindow.document;
    var greenCardsStr = iframeDoc.getElementById('cardList').innerHTML;
    greenCards = retrieveCardInfo(greenCardsStr);
}

function retrieveCardInfo(stringList) {
    var wordsByLine = stringList.split('\n');
    var cardsArray = [];
    for (var i = 0; i < wordsByLine.length; i++) {
        var titleStart = wordsByLine[i].indexOf('<b>') + 3;
        var titleEnd = wordsByLine[i].indexOf('</b>');
        if (titleStart >= 0 && titleEnd >= titleStart) {
            var strTitle = wordsByLine[i].slice(titleStart, titleEnd);
            var descripStart = titleEnd + 7; //distance between end of title and start of description
            var descripEnd = wordsByLine[i].indexOf('<u>') - 1;
            if (descripEnd >= 0) {
                var strDescrip = wordsByLine[i].slice(descripStart, descripEnd);
                var setStart = descripEnd + 4;
                var setEnd = wordsByLine[i].indexOf('</u>');
                if (setEnd >= 0) {
                    var strSet = wordsByLine[i].slice(setStart, setEnd);
                    cardsArray.push({title: strTitle, descrip: strDescrip, set: strSet});
                }
            }
        }
    }
    return cardsArray;
}

//Got this shuffle algorithm from wikipedia! (Second example for Fisher-Yates modern algorithm)
function shuffleCards(cards) {
    for (var i = 0; i < cards.length - 1; i++) {
        var j = Math.floor((Math.random() * (cards.length - i)) + i);
        toSwap = cards[i];
        cards[i] = cards[j];
        cards[j] = toSwap;
    }
}


function startGame() {
    console.log('The start game button has been pressed!');
    socket.emit('serverGameStartRequested', gameID);
}

function sendToAllPlayers(gameID, event, message) {
    socket.emit('serverSendToAllPlayers', {gameID: gameID, event: event, clientMessage: message});
}

function sendToPlayer(gameID, username, event, message) {
    socket.emit('serverSendToPlayer', {gameID: gameID, username: username, event: event, clientMessage: message});
}

socket.on('hostGameStart', function () {
    document.getElementById('startMessage').textContent = 'The game has started!';
    shuffleCards(redCards);
    shuffleCards(greenCards);
    for (var i = 0; i < players.length; i++) {
        players[i].score = 0; //set every player's score to 0 at the start of the game, set their hand to empty.
        players[i].hand = [];
        players[i].selectedCardIndex = -1; //set every player to not have selected a card
    }
    judgeIndex = Math.floor(Math.random() * players.length);
    doNextRound();
});

function doNextRound() {
    changeScreenTo('inRound')
    document.getElementById('selectedCardNum').textContent = '0';
    document.getElementById('judgeDisplay').textContent = `This round's judge is: ${players[judgeIndex].username}`;
    document.getElementById('greenCardDisplay').innerHTML = `${greenCards[currentGreen].title} <br> ${greenCards[currentGreen].descrip}`;
    sendToAllPlayers(gameID, 'clientDeclareJudge', players[judgeIndex].username);
    sendToAllPlayers(gameID, 'clientRecieveGreenCard', greenCards[currentGreen]);
    for (var i = 0; i < players.length; i++) { //Fill each hand 
            fillHand(players[i].hand);
            sendToPlayer(gameID, players[i].username, 'clientUpdateHand', players[i].hand);
    }
}

socket.on('hostReceiveChosenCard', function(message) { //message has a username and selectedCardIndex
    var player = getPlayerByName(message.username);
    player.selectedCardIndex = message.selectedCardIndex;
    player.hand[player.selectedCardIndex].username = message.username;
    selectedCards.push(player.hand[player.selectedCardIndex]);
    document.getElementById('selectedCardNum').textContent = `${selectedCards.length}`;
    if (selectedCards.length === players.length - 1) {
        changeScreenTo('inJudging');
        str = '';
        for (var i = 0; i < selectedCards.length; i++) {
            str += `<li> ${selectedCards[i].title} <br> ${selectedCards[i].descrip} </li>`;
        }
        document.getElementById('chosenCards').innerHTML = str;
        sendToPlayer(gameID, players[judgeIndex].username, 'clientCardsToJudge', selectedCards);
    }
});

socket.on('hostRecieveWinningCard', function(message) { //message is the winning card index
    changeScreenTo('endRound');
    var selectedIndex = message;
    document.getElementById('winner').innerHTML = `${selectedCards[selectedIndex].username} won with the card 
                                                   ${selectedCards[selectedIndex].title} <br> 
                                                   ${selectedCards[selectedIndex].descrip}`;
    getPlayerByName(selectedCards[selectedIndex].username).score ++;
    updateScore();
    judgeIndex = (judgeIndex + 1) % players.length;
    currentGreen++;
    removeUsedCards();
    doNextRound();
});

function removeUsedCards() {
    for (var i = 0; i < players.length; i++) {
        if (players[i].selectedCardIndex != -1) {
            players[i].hand.splice(players[i].selectedCardIndex, 1);
            players[i].selectedCardIndex = -1;
        }
    }
    selectedCards = [];
}

function updateScore() {
    str = '';
    for (var i = 0; i < players.length; i++) {
        var score = (players[i].score == undefined ? '0' : players[i].score);
        str += `<tr><td>${players[i].username}</td><td>${score}</td></tr>`;
    }
    document.getElementById('players').innerHTML = str;
}

function fillHand(hand) {
    while (hand.length < cardsPerHand) {
        hand.push(redCards[currentRed++]);
    }
}

function getPlayerByName(name) {
    for (var i = 0; i < players.length; i++) {
        if (name === players[i].username) {
            return players[i];
        }
    }
    return undefined;
}

function changeScreenTo(screen) {
    const screens = ['pageIntro', 'inRound', 'inJudging', 'endRound'];
    for (var i = 0; i < screens.length; i++) {
        document.getElementById(screens[i]).style.display = (screens[i] === screen ? 'block' : 'none');
    }
}