var socket = io(); //The socket connection to the server
var players; //The list of players
var gameID; //The gameID
var redCards; //The array of red cards
var greenCards; //The array of green cards
var currentRed = 0; //The index of the last red card that we have dealt out
var currentGreen = 0; // The index of the last green card that we have dealt out
var judgeIndex; // The index of the judge in the list of players
const cardsPerHand = 7; //The number of cards in a hand
var selectedCards = []; //The array of cards that people have chosen which starts out being empty
const pointsToWin = 5; //The number of points it takes to win the game
const endRoundTime = 5; //The number of seconds after each round that there is a pause


//The server-required "gameDescriptor" which consistes of the min and max player count of a game, and the url a client should direct to
const gameDescriptor = {
    minPlayers: 2,
    maxPlayers: 10,
    clientURL: 'mangos_game/mangos_game_client.html'
};

//Send an event that registers this game with the server
socket.emit('serverRegisterNewGame', gameDescriptor);

//When the host sends back the register new game event with the code, display the code on the screen
socket.on('hostRegisterNewGame', function(message) { //message is the gameID
    console.log(`The code is ${message}`);
    gameID = message;
    document.getElementById('gameID').textContent = `Your Game ID is ${gameID}`;
});

//When the server gives us a new player in the game, add them to the player list and update the screen with their entry
socket.on('hostNewPlayerList', function(message) { //message is the list of players
    console.log('got a hostNewPlayerList event');
    players = message;
    updateScore(); //This displays current player list and score (which is initially set to 0)
});

//When the server tells the host to start the game, start the game!!!
socket.on('hostGameStart', function () {
    document.getElementById('startMessage').textContent = 'The game has started!';
    shuffleCards(redCards);
    shuffleCards(greenCards);
    currentRed = 0;
    currentGreen = 0;
    for (var i = 0; i < players.length; i++) {
        players[i].score = 0; //set every player's score to 0 at the start of the game, set their hand to empty.
        players[i].hand = [];
        players[i].selectedCardIndex = -1; //set every player to not have selected a card
    }
    updateScore();
    judgeIndex = Math.floor(Math.random() * players.length);
    doNextRound();
});

//When the host recieves a card that was chosen by a player, add it to an array that will be sent to the judge
socket.on('hostReceiveChosenCard', function(message) { //message has a username and selectedCardIndex
    var player = getPlayerByName(message.username);
    player.selectedCardIndex = message.selectedCardIndex;
    player.hand[player.selectedCardIndex].username = message.username;
    selectedCards.push(player.hand[player.selectedCardIndex]);
    console.log(`selectedCards has increased to: ${selectedCards}`);
    
    document.getElementById('selectedCardNum').textContent = `${selectedCards.length} cards have been submitted`;
    if (selectedCards.length === players.length - 1) {
        changeScreenTo('inJudging');
        document.getElementById('remindGreenCard').innerHTML = `The green card is: ${greenCards[currentGreen].title} <br> ${greenCards[currentGreen].descrip}`;
        str = '';
        for (var i = 0; i < selectedCards.length; i++) {
            str += `<li> ${selectedCards[i].title} <br> ${selectedCards[i].descrip} </li>`;
        }
        document.getElementById('chosenCards').innerHTML = str;
        sendToPlayer(gameID, players[judgeIndex].username, 'clientCardsToJudge', selectedCards);
    }
});

//When the host recieves the winning card from the judge, display who won the round and update the scores as well as players hands. Once all the clean up is done, start a new round or end the game.
socket.on('hostRecieveWinningCard', async function(message) { //message is the winning card index
    changeScreenTo('endRound');
    var selectedIndex = message;
    document.getElementById('winner').innerHTML = `${selectedCards[selectedIndex].username} won with the card 
                                                   ${selectedCards[selectedIndex].title} <br> 
                                                   ${selectedCards[selectedIndex].descrip}`;
    var winner = getPlayerByName(selectedCards[selectedIndex].username)
    winner.score++;
    updateScore();
    await sleep(endRoundTime * 1000);
    judgeIndex = (judgeIndex + 1) % players.length;
    currentGreen++;
    removeUsedCards();
    if (winner.score == pointsToWin) {
        endGame(winner);
    }
    else {
        doNextRound();
    }
});

//Get the red cards array from the website I have saved
function storeRed() {
    var iframeDoc = document.getElementById('redCards').contentWindow.document;
    var redCardsStr =  iframeDoc.getElementById('cardList').innerHTML;
    redCards = retrieveCardInfo(redCardsStr);
}

//Get the green cards array from the website I have saved
function storeGreen() {
    var iframeDoc = document.getElementById('greenCards').contentWindow.document;
    var greenCardsStr = iframeDoc.getElementById('cardList').innerHTML;
    greenCards = retrieveCardInfo(greenCardsStr);
}

//Format the card information given in the website into a game-usable array of json cards
function retrieveCardInfo(stringList) {
    var distanceBetweenDescripAndSet = 4;
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
                var setStart = descripEnd + distanceBetweenDescripAndSet;
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

//Start the game function! Is called when the start game button is pressed
function startGame() {
    console.log('The start game button has been pressed!');
    socket.emit('serverGameStartRequested', gameID);
}

//A function that sends data to all players when given the gameID, event that is being emitted, and the data you want to send
function sendToAllPlayers(gameID, event, message) {
    socket.emit('serverSendToAllPlayers', {gameID: gameID, event: event, clientMessage: message});
}

//A function that sends data to a single player when given the gameID, event that is being emitted, and the data you want to send
function sendToPlayer(gameID, username, event, message) {
    socket.emit('serverSendToPlayer', {gameID: gameID, username: username, event: event, clientMessage: message});
}

//The function plays a round of mangos to mangos. 
function doNextRound() {
    changeScreenTo('inRound')
    document.getElementById('selectedCardNum').textContent = '0 cards have been submitted';
    document.getElementById('judgeDisplay').textContent = `This round's judge is: ${players[judgeIndex].username}`;
    document.getElementById('greenCardDisplay').innerHTML = `The green card is: ${greenCards[currentGreen].title} <br> ${greenCards[currentGreen].descrip}`;
    sendToAllPlayers(gameID, 'clientDeclareJudge', players[judgeIndex].username);
    sendToAllPlayers(gameID, 'clientRecieveGreenCard', greenCards[currentGreen]);
    for (var i = 0; i < players.length; i++) { //Fill each hand 
            fillHand(players[i].hand);
            sendToPlayer(gameID, players[i].username, 'clientUpdateHand', players[i].hand);
    }
}

//Remove all the used cards from the players' hands as well as set the players to not have selected a card.
function removeUsedCards() {
    for (var i = 0; i < players.length; i++) {
        if (players[i].selectedCardIndex != -1) {
            players[i].hand.splice(players[i].selectedCardIndex, 1);
            players[i].selectedCardIndex = -1;
        }
    }
    selectedCards = [];
    console.log('selectedCards now = []');
}

//End the game and change the screen to the "endGame" screen. Offer the players to play again.
function endGame(winner) {
    console.log('got to endGame()');
    document.getElementById('displayWinner').textContent = `${winner.username} won!`;
    changeScreenTo('endGame');
}

//Updates the score on the host's screen
function updateScore() {
    str = '<tr><th>Name</th><th>Score</th></tr>';
    for (var i = 0; i < players.length; i++) {
        var score = (players[i].score == undefined ? '0' : players[i].score);
        str += `<tr><td>${players[i].username}</td><td>${score}</td></tr>`;
    }
    document.getElementById('players').innerHTML = str;
}

//Fills a hand until the hand.length is equal to cardsPerHand
function fillHand(hand) {
    while (hand.length < cardsPerHand) {
        hand.push(redCards[currentRed++]);
    }
}

//Finds a player in players based off of an inputted name. If no such player exists, returns undefined
function getPlayerByName(name) {
    for (var i = 0; i < players.length; i++) {
        if (name === players[i].username) {
            return players[i];
        }
    }
    return undefined;
}

//SLEEP FUNCTION COPIED FROM stackoverflow.com/questions/951021/what-is-the-javascript-version-of-sleep
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

//Change the screen to an inputted screen, as long as it is in the screens array
function changeScreenTo(screen) {
    const screens = ['pageIntro', 'inRound', 'inJudging', 'endRound', 'endGame'];
    for (var i = 0; i < screens.length; i++) {
        document.getElementById(screens[i]).style.display = (screens[i] === screen ? 'block' : 'none');
    }
}