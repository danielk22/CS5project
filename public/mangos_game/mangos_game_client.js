var socket = io();
var gameID = sessionStorage.getItem('gameID');
var username = sessionStorage.getItem('username');
var isJudge;

socket.emit('serverClientRedirected', {gameID: gameID, username: username});
changeScreenTo('pageIntro');

function sendToHost(gameID, event, message) {
    socket.emit('serverSendToHost', {gameID: gameID, event: event, hostMessage: message})
}


socket.on('clientPersonalMessage', function(message) { // message is string to display
    document.getElementById('personalMessage').textContent = message;
});

socket.on('clientDeclareJudge', function(message) { //message is judge username
    changeScreenTo('inRound');
    isJudge = (message == username);
    var role;
    if (isJudge) {
        role = 'judge';
        document.getElementById('hand').textContent = '';
    }
    else {
        role = 'player';
    }
    document.getElementById('role').textContent = role;
});

socket.on('clientRecieveGreenCard', function(message) { //message is the green card
    document.getElementById('greenCard').innerHTML = `${message.title} <br> ${message.descrip}`;
});

socket.on('clientUpdateHand', function(message) { //message is the player's hand
    str = '';
    var hand = message;
    if (!isJudge) {
       displayHand(hand);
    }
});

socket.on('clientCardsToJudge', function(message) { //message is an array of cards to judge
    var cards = message;
    displayHand(cards);
});


function displayHand(hand) {
    str = '';
    for (var i = 0; i < hand.length; i++) {
        str += `<li><a onclick = "chooseCard(${i})"> ${hand[i].title} <br> ${hand[i].descrip} </a></li>`; 
    }
    document.getElementById('hand').innerHTML = str;
}


function chooseCard(cardIndex) {
    if (!isJudge) {
        sendToHost(gameID, 'hostReceiveChosenCard', {username: username, selectedCardIndex: cardIndex});
        changeScreenTo('postSelect');
    }
    else {
        sendToHost(gameID, 'hostRecieveWinningCard', cardIndex);
    }
}

function changeScreenTo(screen) {
    const screens = ['pageIntro', 'postSelect', 'inRound'];
    for (var i = 0; i < screens.length; i++) {
        document.getElementById(screens[i]).style.display = (screens[i] === screen ? 'block' : 'none');
    }
}