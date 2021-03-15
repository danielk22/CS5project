var socket = io();

function sendName() {
    console.log('Joining the game! (Button clicked)');
    var username = document.getElementById("name").value;
    var gameID = document.getElementById("gameID").value;
    socket.emit('serverRegisterNewClient', {username: username, gameID: gameID});
}

socket.on('clientRedirect', function(message) {//message is the url
    window.location = message;
}); 