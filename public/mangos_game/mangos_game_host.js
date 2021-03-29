var socket = io();
var players;
var gameID;

const gameDescriptor = {
    minPlayers: 2,
    maxPlayers: 3,
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
    var lastPlayer = players[players.length - 1];    
    document.getElementById('players').innerHTML += `<tr><td>${lastPlayer.username}</td><td>0</td></tr>`; //Hard-code everyone's initial score to 0
    
});

function storeRed() {
    var iframeDoc = document.getElementById('redCards').contentWindow.document;
    var redCardsStr =  iframeDoc.getElementById('cardList').innerHTML;
}

function storeGreen() {
    var iframeDoc = document.getElementById('greenCards').contentWindow.document;
    var greenCardsStr = iframeDoc.getElementById('cardList').innerHTML;
}

function retrieveCardInfo(stringList) {
    var wordsByLine = stringList.split('\n');
    for (var i = 0; i < wordsByLine.length; i++) {
        
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
    for (var i = 0; i < players.length; i++) {
        players[i].score = 0; //set every player's score to 0 at the start of the game.
    }
    sendToAllPlayers(gameID, 'clientWelcome', 'Welcome to the game! - A message from the host');
});

//EVENT BELOW FOR DEMONSTRATION PURPOSES ONLY
socket.on('hostReceivedWelcome', function(message) { //message is the string to display
    document.getElementById("welcomeList").innerHTML += `<li> ${message} </li>`;
    //send an individualized welcome to each player
    for (var i = 0; i < players.length; i++) {
        sendToPlayer(gameID, players[i].username, 'clientPersonalMessage', 
                    `Hello ${players[i].username}! The server sent this message only to you.`);
    }   
});


