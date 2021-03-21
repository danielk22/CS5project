var socket = io();
var gameID = sessionStorage.getItem('gameID');
var username = sessionStorage.getItem('username');

socket.emit('serverClientRedirected', {gameID: gameID, username: username});

function sendToHost(gameID, event, message) {
    socket.emit('serverSendToHost', {gameID: gameID, event: event, hostMessage: message})
}


//EVENTS BELOW ARE FOR DEMONSTRATION PURPOSES ONLY
socket.on('clientWelcome', function(message) { // message is string to display
    document.getElementById('gameStatus').textContent = message;
    sendToHost(gameID, 'hostReceivedWelcome', `Player ${username} appreciates your welcome!`);
});

socket.on('clientPersonalMessage', function(message) { // message is string to display
    document.getElementById('personalMessage').textContent = message;
});