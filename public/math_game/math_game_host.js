var socket = io();
var players;
var gameID;
var round = 1;
var mathProblem;


const gameDescriptor = {
    minPlayers: 2,
    maxPlayers: 10,
    clientURL: 'math_game/math_game_client.html'
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
    var lastPlayer = players[players.length - 1];    
    document.getElementById('players').innerHTML += `<tr><td>${lastPlayer.username}</td><td>0</td></tr>`; //Hard-code everyone's initial score to 0
    
});

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
    document.getElementById('pageIntro').style.display = 'none'; //Hide welcome screen
    document.getElementById('gameScreen').style.display = 'block'; //Show game screen
    for (var i = 0; i < players.length; i++) {
        players[i].score = 0; //set every player's score to 0 at the start of the game.
    }
    doNextRound();
});

socket.on('hostCheckAnswer', function(message) { //message has username, answer, and round #
    if (message.round == round && message.answer == mathProblem.answer) {
        getPlayerByUsername(message.username).score++;
        round++;
        updateScoreDisplay();
        if (round <= 5) {
            doNextRound();
        }
    }
});

//EVENT BELOW FOR DEMONSTRATION PURPOSES ONLY
socket.on('hostReceivedWelcome', function(message) { //message is the string to display
    document.getElementById('welcomeList').innerHTML += `<li> ${message} </li>`;
    //send an individualized welcome to each player
    for (var i = 0; i < players.length; i++) {
        sendToPlayer(gameID, players[i].username, 'clientPersonalMessage', 
                    `Hello ${players[i].username}! The server sent this message only to you.`);
    }   
});

function makeMathProblem() {
    var firstTerm = Math.floor(Math.random() * 100);
    var secondTerm = Math.floor(Math.random() * 100);
    return {question: `What is ${firstTerm} + ${secondTerm}?`, answer: (firstTerm + secondTerm)};
}

function getPlayerByUsername(name) {
    for (var i = 0; i < players.length; i++) {
        if (name === players[i].username) {
            return players[i];
        }
    }
    return undefined;
}

function updateScoreDisplay() {
    var str = '';
    for (var i = 0; i < players.length; i++) {
       str += `<tr><td>${players[i].username}</td><td>${players[i].score}</td></tr>`
    }
    document.getElementById('players2').innerHTML = str;
}

function doNextRound() {
    mathProblem = makeMathProblem();
    sendToAllPlayers(gameID, 'clientMathProblem', {question: mathProblem.question, round: round});
}