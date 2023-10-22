import { BACKEND_PORT } from './config.js';
// A helper you may want to use when uploading new images to the server.
import { fileToDataUrl } from './helpers.js';

const showScreen = (screenName) => {
    for (const screen of document.getElementsByClassName('screen')) {
        screen.style.display = 'none';
	}
	document.getElementById(`${screenName}-screen`).style.display = 'block';
}

const apiCall = (path, body, authorizedBool) => {
    return new Promise((resolve, reject) => {
        fetch('http://localhost:' + BACKEND_PORT + `/${path}`, {
        method: 'POST',
        headers: {
            'Content-type': 'application/json',
            'Authorization': authorizedBool ? `Bearer ${token}` : undefined
        },
        body: JSON.stringify(body)
        })
        .then((response) => response.json())
        .then((data) => {
            if (data.error) {
                reject(data.error); 
            } else {
                resolve(data);
            }
        })
        .catch((error) => {
            reject('An unknown error occured!'); 
        });
    });
};


document.getElementById('login-button').addEventListener('click', () => showScreen('login'));
document.getElementById('register-button').addEventListener('click', () => showScreen('register'));

for (const backButton of document.getElementsByClassName('back-button')) {
    backButton.addEventListener('click', () => showScreen('landing'));
}

document.getElementById('login-submit').addEventListener('click', () => {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    apiCall('auth/login', {
        "email": email,
        "password": password,
    })
    .then((data) => {
        localStorage.setItem('token', data.token);
        showScreen('dashboard')
        
    })
    .catch((error) => {
        console.log('ERROR: ' + error)
    })
})

document.getElementById('logout-button').addEventListener('click', () => {
    // Still do api stuff
    localStorage.removeItem('token'); 
    showScreen('landing')
})

if (localStorage.getItem('token') === null) {
    showScreen('landing');
} else {
    showScreen('dashboard');
}