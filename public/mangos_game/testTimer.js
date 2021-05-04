const millisecondsPerSecond = 1000;
var timerID;
var secondsLeft;

function myClick() {
    startStopWatch(10, 'clockTick', () => {console.log('the timer has ended!')});
}


//Only one stopwatch can be running at once. Args: seconds the timer runs, the audio that plays as the timer tics, and the function called at the end of the timer. 
function startStopWatch(seconds, audioTag, timerEndFunction) {
    document.getElementById(audioTag).play();
    secondsLeft = seconds;
    console.log('starting stopwatch');
    document.getElementById('secondsLeft').textContent = secondsLeft;
    timerID = window.setInterval(displayTimeLeft, millisecondsPerSecond, timerEndFunction, audioTag);  
}

function displayTimeLeft(timerEndFunction, audioTag) {
    document.getElementById('secondsLeft').textContent = --secondsLeft;
    if (secondsLeft == 0) {
        clearInterval(timerID);
        console.log('timer stopped');
        document.getElementById(audioTag).pause();
        timerEndFunction();
    }
       
}

