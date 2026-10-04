let webSocket;
function getprotocol(){
    if (window.location.protocol === 'http:'){
        return 'ws://'
    }
    else{
        return 'wss://'
    }
}

function connectWebSocket() {
    webSocket = new WebSocket(getprotocol() + window.location.host + '/api/announcements/');

    webSocket.onmessage = function(event) {
        const message = event.data;
        displayMessage(message);
    };

    webSocket.onclose = function(event) {
        console.warn(`WebSocket closed. Reconnecting in 5 seconds...`, event);
        setTimeout(connectWebSocket, 5000);
    };

    webSocket.onerror = function(error) {
        console.error(`WebSocket error:`, error);
        webSocket.close();
    };
}

function displayMessage(message) {
    const messageBox = document.getElementById('messageBox');
    messageBox.textContent = message;
    messageBox.style.display = 'block';

    setTimeout(function() {
        messageBox.style.display = 'none';
    }, 10000);
}

connectWebSocket();
console.log(`
·▄▄▄▄▄▄         ▄▄ • ▪  ▄▄▄ ..▄▄ ·  ▄▄▄· ▄▄▄   ▄▄·  ▄▄▄· ·▄▄▄▄  ▄▄▄ .   ▄▄▌ ▐ ▄▌▪   ▐ ▄ 
▐▄▄·▀▄ █·▪     ▐█ ▀ ▪██ ▀▄.▀·▐█ ▀. ▐█ ▀█ ▀▄ █·▐█ ▌▪▐█ ▀█ ██▪ ██ ▀▄.▀·   ██· █▌▐███ •█▌▐█
██▪ ▐▀▀▄  ▄█▀▄ ▄█ ▀█▄▐█·▐▀▀▪▄▄▀▀▀█▄▄█▀▀█ ▐▀▀▄ ██ ▄▄▄█▀▀█ ▐█· ▐█▌▐▀▀▪▄   ██▪▐█▐▐▌▐█·▐█▐▐▌
██▌.▐█•█▌▐█▌.▐▌▐█▄▪▐█▐█▌▐█▄▄▌▐█▄▪▐█▐█ ▪▐▌▐█•█▌▐███▌▐█ ▪▐▌██. ██ ▐█▄▄▌   ▐█▌██▐█▌▐█▌██▐█▌
▀▀▀ .▀  ▀ ▀█▄▀▪·▀▀▀▀ ▀▀▀ ▀▀▀  ▀▀▀▀  ▀  ▀ .▀  ▀·▀▀▀  ▀  ▀ ▀▀▀▀▀•  ▀▀▀  ▀  ▀▀▀▀ ▀▪▀▀▀▀▀ █▪                                                                                                                             
    `)