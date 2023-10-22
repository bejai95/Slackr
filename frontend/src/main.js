import { BACKEND_PORT } from './config.js';
// A helper you may want to use when uploading new images to the server.
import { fileToDataUrl } from './helpers.js';

const showScreen = (screenName) => {
    for (const screen of document.getElementsByClassName('screen')) {
        screen.style.display = 'none';
	}
	document.getElementById(`${screenName}-screen`).style.display = 'block';
}

const apiCall = (path, method, paramString, authorizedBool, bodyBool, body) => {
    return new Promise((resolve, reject) => {
        fetch('http://localhost:' + BACKEND_PORT + `/${path + paramString}`, {
            method: method,
            body: bodyBool ? JSON.stringify(body) : undefined,
            headers: {
                'Content-type': 'application/json',
                'Authorization': authorizedBool ? `Bearer ${localStorage.getItem('token')}` : undefined,
            },
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
            reject(error); 
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
    apiCall('auth/login', 'POST', '', false, true, {
        "email": email,
        "password": password,
    })
    .then((data) => {
        localStorage.setItem('token', data.token);
        showScreen('dashboard') 
    })
    .catch((error) => {
        alert('ERROR: ' + error);
    })
})

document.getElementById('logout-button').addEventListener('click', () => {
    apiCall('auth/logout', 'POST', '', true, false, {})
    .then(() => {
        localStorage.removeItem('token'); 
        showScreen('landing')
    })
    .catch((error) => {
        alert(error);
    })
    
})

if (localStorage.getItem('token') === null) {
    showScreen('landing');
} else {
    showScreen('dashboard');
}