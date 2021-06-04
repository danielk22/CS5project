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
var turnPhase; //The current turn phase should be one of the following constants
const tpExpectingPlayerCards = 1;//The phase when the players should choose their best card
const tpExpectingJudgeCard = 2; //The phase when the judge should choose the winning card
const millisecondsPerSecond = 1000; //The number of milliseconds in a second
const secondsInRound = 30; //The number of seconds that players have to submit their red cards in each round
const secondsInJudging = 20; //The number of seconds that a judge has to choose a winning card in each round
var timerID; 
var secondsLeft;
var quickPickEnabled;
var numConsecTimeOuts = 0;
const MAX_TIME_OUTS = 5;

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
    document.getElementById('gameID').textContent = `Game ID: ${gameID}`;
    document.getElementById('lobbyMusic').play();
});

//When the server gives us a new player in the game, add them to the player list and update the screen with their entry
socket.on('hostNewPlayerList', function(message) { //message is the list of players
    console.log('got a hostNewPlayerList event');
    players = message;
    updateScore('players'); //This displays current player list and score (which is initially set to 0)
});

//The function plays a round of mangos to mangos. 
socket.on('hostGameStart', function () {
    document.getElementById('lobbyMusic').pause();
    document.getElementById('startMessage').textContent = 'The game has started!';
    document.getElementById('mangosIntro').play();
});

//The function that accepts each card chosen by players and decides whether everyone has submitted a card.
//If so, the game moves to the 'inJudging' state. 
socket.on('hostReceiveChosenCard', function(message) { //message has a username and selectedCardIndex and round
    if (message.round == currentGreen && turnPhase == tpExpectingPlayerCards) {  
        var player = getPlayerByName(message.username);
        player.selectedCardIndex = message.selectedCardIndex;
        player.hand[player.selectedCardIndex].username = message.username;
        selectedCards.push(player.hand[player.selectedCardIndex]);
        console.log(`selectedCards has increased to: ${selectedCards}`);
        
        document.getElementById('selectedCardNum').textContent = `${selectedCards.length} cards have been submitted`;
        if (selectedCards.length === players.length - 1) {
            inJudging();
            numConsecTimeOuts = 0;
        }
        else if (selectedCards.length == players.length - 2 && quickPickEnabled && players.length > 2) {
            inJudging();
            numConsecTimeOuts = 0;
            socket.emit('clientPostSelect', true);
        }
    }
});

//Remove all the used cards from the players' hands as well as set the players to not have selected a card.
socket.on('hostReceiveWinningCard', function(message) { //message is {cardIndex: cardIndex, round: round}
    stopStopWatch('suspenseMusic');
    if (message.round == currentGreen && turnPhase == tpExpectingJudgeCard) {
        changeScreenTo('endRound');
        var selectedIndex = message.cardIndex;
        document.getElementById('winner').innerHTML = `${selectedCards[selectedIndex].username} 
            won with the card \"${selectedCards[selectedIndex].title}\" <br>`;
        document.getElementById('winningcard_desc').innerHTML = `Description: 
            ${selectedCards[selectedIndex].descrip}`;
        var winner = getPlayerByName(selectedCards[selectedIndex].username)
        winner.score++;
        updateScore('playerScores');
        console.log('calling from hostReceiveWinningCard');
        if (winner.score == pointsToWin) {
            endGame(winner);
        }
        else {
            cleanUpAndPrepareAndDoNextRound();
        }
    }
});

//This function is specific to the very first round of the game. It plays a round of Mangos to Mangos,
//But also shuffles the decks beforehand and other things specific to the first round.
function startFirstRound() {
    shuffleCards(redCards);
    shuffleCards(greenCards);
    currentRed = 0;
    currentGreen = 0;
    for (var i = 0; i < players.length; i++) {
        players[i].score = 0; //set every player's score to 0 at the start of the game, set their hand to empty.
        players[i].hand = [];
        players[i].selectedCardIndex = -1; //set every player to not have selected a card
    }
    updateScore('players');
    judgeIndex = Math.floor(Math.random() * players.length);
    console.log('starting the first round');
    doNextRound();
}

//Function that handles if the judge did not submit a card
function noResponseFromJudge() {
    changeScreenTo('noCardsSubmittedByJudge');
    players[judgeIndex].score--;
    cleanUpAndPrepareAndDoNextRound();
}

function cleanUpAndPrepareAndDoNextRound() {
    removeUsedCards();
    setTimeout(prepareAndDoNextRound, millisecondsPerSecond * endRoundTime);
}

function prepareAndDoNextRound() {
    prepareForNextRound();
    doNextRound();
}

function prepareForNextRound() {
    judgeIndex = (judgeIndex + 1) % players.length;
    currentGreen++;
}

/* Only one stopwatch can be running at once. Args: 
    seconds the timer runs, the audio that plays as the timer tics, 
    and the function called at the end of the timer. */
function startStopWatch(seconds, audioTag, clockID, timerEndFunction) {
    document.getElementById(audioTag).currentTime = 0;
    document.getElementById(audioTag).play();
    secondsLeft = seconds;
    console.log('starting stopwatch');
    document.getElementById(clockID).textContent = secondsLeft;
    timerID = window.setInterval(displayTimeLeft, millisecondsPerSecond, timerEndFunction, audioTag, clockID);  
}

function displayTimeLeft(timerEndFunction, audioTag, clockID) {
    document.getElementById(clockID).textContent = --secondsLeft;
    if (secondsLeft == 0) {
        stopStopWatch(audioTag);
        console.log('timer stopped');
        timerEndFunction();
        if(numConsecTimeOuts == MAX_TIME_OUTS - 1) {
            //TODO: close game
        }
    }   
}

//Stops stopwatch. Can be called multiple times for a given turnPhase
function stopStopWatch(audioTag) {
    clearInterval(timerID);
    document.getElementById(audioTag).pause();
}

//This is called when all* cards have been submitted by players or if the inRound timer runs out
function inJudging() {
    stopStopWatch('clockTick');
    if (selectedCards.length == 0) {
        console.log('no cards were submitted at end of timer');
        changeScreenTo('noCardsSubmittedByPlayers');
        setTimeout(prepareAndDoNextRound, millisecondsPerSecond * endRoundTime);
    }
    else {
        changeScreenTo('inJudging');
        turnPhase = tpExpectingJudgeCard;
        startStopWatch(secondsInJudging, 'suspenseMusic', 'timeLeftJudge', noResponseFromJudge);
        document.getElementById('remindGreenCard').innerHTML = `The green card is:
                \"${greenCards[currentGreen].title}\" <br> ${greenCards[currentGreen].descrip}`;
        /* above display depreciated */
        str = '';

        for (var i = 0; i < selectedCards.length; i++) {
            str += `<div class="card border-danger bg-red"> <div class="card-body text-center"> 
            <img class="card-img-top" src="redapple.gif" alt="Red Apple image" 
            > <br/> <h4 class="card-title hand-head"> ${selectedCards[i].title} </h4>
            <p class="card-text hand-body"> ${selectedCards[i].descrip} </p></div></div>`;
        }
        document.getElementById('chosenCards').innerHTML = str;
        sendToPlayer(gameID, players[judgeIndex].username, 'clientCardsToJudge', selectedCards);
    }
}


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
    if(players.length < gameDescriptor.minPlayers || players.length > gameDescriptor.maxPlayers) {
        //console.log(players.length);
        document.getElementById('startError').innerHTML = `The number of players cannot be less than
        ${gameDescriptor.minPlayers} or greater than ${gameDescriptor.maxPlayers}.`
    }
    else {
        quickPickEnabled = document.getElementById('quickPickChoice').checked;
        document.getElementById('options').style.display = "none";
        document.getElementById('optionsButton').style.display = "none";
        document.getElementById('startError').style.display = "none";
        //document.getElementById('rules').style.display = "none";
        console.log('Game has been started!');
        socket.emit('serverGameStartRequested', gameID);
    }
}

//A function that sends data to all players when given the gameID, event that is being emitted, and the data you want to send
function sendToAllPlayers(gameID, event, message) {
    socket.emit('serverSendToAllPlayers', {gameID: gameID, event: event, clientMessage: message});
}

//A function that sends data to a single player when given the gameID, event that is being emitted, and the data you want to send
function sendToPlayer(gameID, username, event, message) {
    socket.emit('serverSendToPlayer', {gameID: gameID, username: username, event: event, clientMessage: message});
}


//This function completes a single round of mangos to mangos
function doNextRound() {
    console.log('entering doNextRound');
    changeScreenTo('inRound');
    document.getElementById('selectedCardNum').textContent = '0 cards have been submitted';
    document.getElementById('judgeDisplay').textContent = `This round's judge is: 
            ${players[judgeIndex].username}`;
    document.getElementById('greenCard').innerHTML = `<h4 class="card-title hand-head"> 
            ${greenCards[currentGreen].title} </h4> <p class="card-text"> 
            ${greenCards[currentGreen].descrip} </p>`;
    sendToAllPlayers(gameID, 'clientDeclareJudge', {judge: players[judgeIndex].username, round: currentGreen});
    sendToAllPlayers(gameID, 'clientRecieveGreenCard', greenCards[currentGreen]);
    for (var i = 0; i < players.length; i++) { //Fill each hand 
        fillHand(players[i].hand);
        sendToPlayer(gameID, players[i].username, 'clientUpdateHand', players[i].hand);
    }
    turnPhase = tpExpectingPlayerCards;
    startStopWatch(secondsInRound, 'clockTick', 'timeLeftPlayers', inJudging); //ADD FUNCTION AT TIMER END
}


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


function updateScore(tableName) {
    isThereScores = true;
    for(var i = 0; i < players.length; i++) {
        if(players[i].score !== undefined) {
            isThereScores = false;
            break;
        }
    }
    if(isThereScores) {
        str = '<tr><th>Username</th></tr>'
        for(var i = 0; i < players.length; i++) {
            str += `<tr><td>${players[i].username}</td></tr>`;
        }
    }
    else {
        str = '<tr><th>Username</th><th>Score</th></tr>';
        for (var i = 0; i < players.length; i++) {
            var score = (players[i].score == undefined) ? '0' : players[i].score;
            str += `<tr><td>${players[i].username}</td><td>${score}</td></tr>`;
        }
    }
    document.getElementById(tableName).innerHTML = str;
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


//Change the screen to an inputted screen, as long as it is in the screens array
function changeScreenTo(screen) {
    const screens = ['pageIntro', 'inRound', 'inJudging', 'endRound', 'endGame', 'noCardsSubmittedByPlayers', 'noCardsSubmittedByJudge'];
    for (var i = 0; i < screens.length; i++) {
        document.getElementById(screens[i]).style.display = (screens[i] === screen ? 'block' : 'none');
    }
}