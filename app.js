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
        var gameID;
        do {
            gameID = generateGameID(IDlength);
            console.log(`GameID = ${gameID} and myGames[gameID] = ${myGames[gameID]}`);
        } while (myGames[gameID] !== undefined);
		myGames[gameID] = message; 
        myGames[gameID].hostSocketID = socket.id;
        myGames[gameID].hasStarted = false;
        message.players = [];
        socket.emit('hostRegisterNewGame', gameID); 
    });

    socket.on('serverRegisterNewClient', function(message) { //message is player's username and gameID
        console.log(`Got a serverRegisterNewClient event with the message ${message}`);
        if (myGames[message.gameID] === undefined) {
            socket.emit('clientGameDoesNotExist');
        }
        else if (myGames[message.gameID].hasStarted) {
            socket.emit('clientGameAlreadyStarted');
        }
        else if (myGames[message.gameID].players.length >= myGames[message.gameID].maxPlayers) {
            console.log('The game is full');
            socket.emit('clientGameFull');
        }
        else{ 
            message.username = makeUniqueName(message.username, message.gameID);
            myGames[message.gameID].players.push(message);
            console.log(myGames);
            message.clientURL = myGames[message.gameID].clientURL;
            console.log(`The unique name is ${message.username}`);
            socket.emit('clientRedirect', message);
        }
        
    });

    socket.on('serverClientRedirected', function(message) { //message is player's username and gameID
        var player = getPlayerByName(message.username, message.gameID);
        player.socketID = socket.id;
        console.log(`Received serverClientRedirected event: ${socket.id}`);
        console.log(`Sending to socketID ${myGames[message.gameID].hostSocketID}`);
        io.to(myGames[message.gameID].hostSocketID).emit('hostNewPlayerList', myGames[message.gameID].players);
    });

    socket.on('serverClientReconnected', function(message) { //message is player's username and gameID
        console.log('Got a serverClientReconnected');
        var player = getPlayerByName(message.username, message.gameID);
        player.socketID = socket.id;
        console.log(`${player.username} has a new socketID: ${player.socketID}`);
    })

    socket.on('serverGameStartRequested', function(message) { // message is gameID
        myGames[message].hasStarted = true; 
        socket.emit('hostGameStart');
    });


    socket.on('serverSendToAllPlayers', function(message) { //message has gameID, event, and clientMessage
        var game = myGames[message.gameID];
        for (var i = 0; i < game.players.length; i++) {
            io.to(game.players[i].socketID).emit(message.event, message.clientMessage);
        }
    });

    socket.on('serverSendToPlayer', function(message) { //message has gameID, username, event, and clientMessage
        var playerSocket = getPlayerByName(message.username, message.gameID).socketID; 
        io.to(playerSocket).emit(message.event, message.clientMessage);
    });

    socket.on('serverSendToHost', function(message) { //message has gameID, event, and hostMessage
        var hostSocket = myGames[message.gameID].hostSocketID;
        io.to(hostSocket).emit(message.event, message.hostMessage);
    });

    socket.on('disconnect', function() {
        var hostSocket = "";
        for(const game in myGames) {
            if(game.players.includes(socket)) {
                hostSocket = game.hostSocketID;
                break;
            }
        }
        console.log(`${socket.id} disconnected!`);
        io.to(hostSocket).emit('playerDisconnect', disconnUser = socket.id);
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

function makeUniqueName(oldName, gameID) {
   if (oldName.trim() === '') {
        oldName = 'Anonymous';
   }
   if (isUniqueName(oldName, gameID)){
       return oldName;
   }
   var num = 2; // start with #2 for the first repeated name
   do { 
        var newName = `${oldName} #${num}`;
        num++;
   } while (!(isUniqueName(newName, gameID)));
   return newName;
}

function isUniqueName(oldName, gameID) {
    for (var i = 0; i < myGames[gameID].players.length; i++) {
        if (oldName ===  myGames[gameID].players[i].username) {
            return false;
        } 
    }
    return true;
}

function getPlayerByName(name, gameID) {
    for (var i = 0; i < myGames[gameID].players.length; i++) {
        if (name === myGames[gameID].players[i].username) {
            return myGames[gameID].players[i];
        }
    }
    return undefined;
}