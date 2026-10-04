document.addEventListener("DOMContentLoaded", function() {
    if(window.location.protocol === 'http:'){
        if (window.location.host === 'localhost'){
    
        }
        else if (window.location.host === '127.0.0.1'){
    
        }
        else{
            document.getElementById('teacher-setup-dialogs-container').disabled = true;
            document.getElementById('teacher-setup-dialogs-container').placeholder = 'proxy disabled! we are NOT on https.';
        }
    }
});