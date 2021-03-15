const express = require('express');
const socketIO = require('socket.io');
const http = require('http');
const IDlength = 4;

var app = express();
var server = http.Server(app);
var io = socketIO(server);
var myGames = {};

const port = process.env.PORT || 8080;

app.use(express.static(__dirname + "/public"));

server.listen(port, function() {
    console.log(`The app is running on port ${port}`);
});

io.on('connection', function(socket) { 
    console.log(`Got a connection from: ${socket.id}`);

    socket.on('serverRegisterNewGame', function(message) { //message is the game descriptor
        console.log(`Got a serverRegisterNewGame event with the message ${message}`);
        var gameID = generateGameID(IDlength);
        myGames[gameID] = message; //MAKE SURE ONLY ONE GAME FOR EACH CODE
        message.players = [];
        socket.emit('hostRegisterNewGame', gameID); 
    });

    socket.on('serverRegisterNewClient', function(message) { //message is player's username and gameID
        console.log(`Got a serverRegisterNewClient event with the message ${message}`);
        myGames[message.gameID].players.push(message);
        console.log(myGames);
        socket.emit('clientRedirect', myGames[message.gameID].clientURL);
    });
});

function generateGameID(IDlength) {
    alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    ID = '';
    for (var i = 0; i < IDlength; i++){
        ID += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
    }
    return ID;
}