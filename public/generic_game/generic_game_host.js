var socket = io();

const gameDescriptor = {
    minPlayers: 2,
    maxPlayers: 3,
    clientURL: 'generic_game/generic_game_client.html'
};

console.log('executing javascript in generic_game_host.js!');

socket.emit('serverRegisterNewGame', gameDescriptor);

socket.on('hostRegisterNewGame', function(message) {
    console.log(`The code is ${message}`);
    document.getElementById("gameID").textContent = `Your Game ID is ${message}`;
});