var socket = io();
var gameID = sessionStorage.getItem('gameID');
var username = sessionStorage.getItem('username');
var round; 

socket.emit('serverClientRedirected', {gameID: gameID, username: username});

function sendToHost(gameID, event, message) {
    socket.emit('serverSendToHost', {gameID: gameID, event: event, hostMessage: message})
}

function sendAnswer() {
    sendToHost(gameID, 'hostCheckAnswer', {username: username, answer: document.getElementById("answerBox").value, round: round})
}

socket.on('clientMathProblem', function(message) { //message is the question, answer, and round
    round = message.round;
    document.getElementById('mathQuestion').textContent = message.question;
    document.getElementById('round').textContent = `Round: ${round}`; 
});

//EVENTS BELOW ARE FOR DEMONSTRATION PURPOSES ONLY
socket.on('clientWelcome', function(message) { // message is string to display
    document.getElementById('gameStatus').textContent = message;
    sendToHost(gameID, 'hostReceivedWelcome', `Player ${username} appreciates your welcome!`);
});

socket.on('clientPersonalMessage', function(message) { // message is string to display
    document.getElementById('personalMessage').textContent = message;
});