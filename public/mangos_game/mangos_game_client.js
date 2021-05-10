var socket = io(); //The socket connection to the server
var gameID = sessionStorage.getItem('gameID'); //The gameID
var username = sessionStorage.getItem('username'); //The client's username
var isJudge; //Whether or not the player is the judge or not in a given round
var round; //Integer round number so that that messages sent to host can be tagged with round for validation


//Send an event to the server that the client has been redirected.
socket.emit('serverClientRedirected', {gameID: gameID, username: username});
//Change the screen to the intro screen.
changeScreenTo('pageIntro');

//FOR 
socket.on('clientPersonalMessage', function(message) { // message is string to display
    document.getElementById('personalMessage').textContent = message;
});

socket.on('clientDeclareJudge', function(message) { //message is {judge: username,  round: number}
    console.log('got to the clientDeclareJudge handler');
    round = message.round;
    changeScreenTo('inRound');
    isJudge = (message.judge == username);
    var role;
    if (isJudge) {
        role = 'judge';
        document.getElementById('hand').textContent = ''; //works weird with displayHand()
    }
    else {
        role = 'player';
    }
    document.getElementById('role').textContent = `${username}'s role is: ${role}`;
});

socket.on('clientRecieveGreenCard', function(message) { //message is the green card
    document.getElementById('greenCard').innerHTML = `<h4 class="card-title hand-head"> ${message.title}
            </h4> <p class="card-text"> ${message.descrip} </p>`;
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

//currently only called when no card selected (correlates to when message = true)
socket.on('clientPostSelect', function(message) {
    if(!(document.getElementById('inRound').style.display == 'none')) { //if in round
        changeScreenTo('noSelect');
    }
    else {

    }
});

//Send an event to the host along with a message and the gameID
function sendToHost(gameID, event, message) {
    socket.emit('serverSendToHost', {gameID: gameID, event: event, hostMessage: message})
}

function displayHand(hand) {
    str = '';
    for (var i = 0; i < hand.length; i++) {
        str += `<div class="card bg-red"> <div class="card-body text-center" onClick = 
                "chooseCard(${i})"> <img class="card-img-top" src="redapple.gif" alt="Red Apple image" 
                > <br/> <h4 class="card-title hand-head"> ${hand[i].title} </h4>
                <p class="card-text hand-body"> ${hand[i].descrip} </p></div></div>`; 
    }
    document.getElementById('hand').innerHTML = str;
}


function chooseCard(cardIndex) {
    if (!isJudge) {
        changeScreenTo('postSelect');
        sendToHost(gameID, 'hostReceiveChosenCard', {username: username, selectedCardIndex: cardIndex, round: round});
    }
    else {
        changeScreenTo('postJudging');
        sendToHost(gameID, 'hostReceiveWinningCard', {cardIndex: cardIndex, round: round});
    }
}

function changeScreenTo(screen) {
    const screens = ['pageIntro', 'postSelect', 'inRound', 'postJudging'];
    for (var i = 0; i < screens.length; i++) {
        document.getElementById(screens[i]).style.display = (screens[i] === screen ? 'block' : 'none');
    }
}

