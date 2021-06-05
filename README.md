# Jackbox-Like Game Server and Game
#### Authors: Daniel and Dylan, Lakeside School 

## Introduction
This game server is a node.js based infrastructure for building web-based games. The server is similar
to Jackbox games in that it can host multiple games of different types at once. A host browser which 
runs all the server-side game logic connects to the game server which also communicates with every 
client browser. 

## How To Install the Game Server and Game
1. Download or git clone this project's code from GitHub. 

2. Download and install node.js from [nodejs.org](https://nodejs.org). 

3. Open a terminal/shell window and cd into the downloaded project folder. 

4. Run the following line in the terminal/shell:
    ``` 
    npm install
    ```

## How to Run the Game Server and Game Locally
1. In a terminal/shell window cd'ed to the project directory, run the following line:
    ```
    node app.js
    ```
2. Open a browser and navigate to [localhost:8080](http://localhost:8080/).

3. Select 'Host Mangos to Mangos Game'

4. Friends on your local network (firewall permitting) can join your game at the same link: 
    [localhost:8080](http://localhost:8080/) with the Game ID shown on the host's screen. 

5. When all players have joined, press 'Start Game!' on the host screen.

6. Play! 

## How to Run the Code From the 2Dgames.fun Host

1. Open a browser and navigate to [2Dgames.fun](https://2dgames.fun).

2. Select 'Host Mangos to Mangos Game'

3. Friends can join your game at the same link: 
    [2Dgames.fun](https://2dgames.fun) with the Game ID shown on the host's screen. 

4. When all players have joined, press 'Start Game!' on the host screen.

5. Play! 

## How To Add Your Own Game
To add a new game, you need to write a host.js/host.html and client.js/client.html. Please put these 
in a new folder under public.

The host.js requires:
1. At the beginning of your host.js you should include the following lines:
    ```
    var socket = io(); //The socket connection to the server
    server.emit('serverRegisterNewGame', gameDescriptor); 
    ```
    
    The io() call is required by socket.io which handles the communications between the game server and the 
    host/clients. The gameDescriptor is a json of {minPlayers: n, maxPlayers: m, clientURL: /folder/client.html}
    where folder is the name of the game folder under public, and client.html is the name of the game's 
    client URL relative to, but omitting, public.

2. The host must handle the 'hostRegisterNewGame' event, where the game server tells the host the 
    gameID (a four character all caps identifier for the game)
    ```
    socket.on('hostRegisterNewGame', function(message) { //message is the gameID
    // event handling code goes here. 
    }
    ```
    
3. The host can handle the 'hostNewPlayerList' event, where the game server tells the host the current
    players in the game after a new player has joined. 
    ```
    socket.on('hostNewPlayerList', function(message) { 
    // message is the list of players where players is an array of json objects. Each player has the form:
    // {username: string, score: n}
    // event handling code goes here. 
    }
    ```

4. When you are ready to start the game (for example when a start game button is pressed), your 
    host.js must emit the following event:
    ```
    socket.emit('serverGameStartRequested', gameID); // where gameID was recieved from
                                                     // 'hostRegisterNewGame'
    ```

5. The host must handle the 'hostGameStart' event which is a message from the game server to start the
    game.
    ```
    socket.on('hostGameStart', function () {
    //event handling code goes here. 
    }
    ```

6. From now on, all communications from the host to the clients are sent through the following two
    functions. We recommend copying these two functions into your host.js. 
    ```
    //A function that sends data to all players when given the gameID, event that is being emitted, 
    //and the data you want to send
    function sendToAllPlayers(gameID, event, message) {
        socket.emit('serverSendToAllPlayers', {gameID: gameID, event: event, clientMessage: message});
    }

    //A function that sends data to a single player when given the gameID, event that is being emitted, 
    //and the data you want to send
    function sendToPlayer(gameID, username, event, message) {
        socket.emit('serverSendToPlayer', 
	           {gameID: gameID, username: username, event: event, clientMessage: message});
    }
    ```


The client.js requires: 
1. At the beginning of your client.js, you should add the following lines: 
    ```
    var socket = io(); //The socket connection to the server
    var gameID = sessionStorage.getItem('gameID'); //The gameID
    var username = sessionStorage.getItem('username'); //The client's username 
    socket.emit('serverClientRedirected', {gameID: gameID, username: username});
    ```

    The io() call is required by socket.io which handles the communications between the game server and the 
    host/clients. The variables gameID and username are stored in the browser's sessionStorage so that they
    are available after the redirect. The 'serverClientRedirected' event tells the game server that the 
    browser has successfully redirected to the client.js. 

2. From now on, all communications from the client to the host is through the following function and
    event. We recommend copying the code below into your client.js:
    ```
    //Send an event to the host along with a message and the gameID
    function sendToHost(gameID, event, message) {
        socket.emit('serverSendToHost', {gameID: gameID, event: event, hostMessage: message})
    }
    ```