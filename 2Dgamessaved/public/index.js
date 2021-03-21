var socket = io();

function sendName() {
    console.log('Joining the game! (Button clicked)');
    var username = document.getElementById("name").value;
    var gameID = document.getElementById("gameID").value;
    socket.emit('serverRegisterNewClient', {username: username, gameID: gameID});
}

socket.on('clientRedirect', function(message) {//message is the url
    sessionStorage.setItem("gameID", message.gameID);
    sessionStorage.setItem("username", message.username);
    window.location = message.clientURL;
}); 

socket.on('clientGameDoesNotExist', function() {
    window.alert('Unknown GameID!');
});

socket.on('clientGameAlreadyStarted', function() {
    window.alert('That game has started already!');
});

socket.on('clientGameFull', function() {
    console.log('The game is full and you should get a window alert');
    window.alert('The game is full!');
});