import { BACKEND_PORT } from './config.js';
// A helper you may want to use when uploading new images to the server.
import { fileToDataUrl } from './helpers.js';

const showScreen = (screenName) => {
    for (const screen of document.getElementsByClassName('screen')) {
        screen.style.display = 'none';
	}
	document.getElementById(`${screenName}-screen`).style.display = 'block';
}

const apiCall = (path, body) => {
    return new Promise((resolve, reject) => {
        fetch('http://localhost:' + BACKEND_PORT + `/${path}`, {
        method: 'POST',
        headers: {
            'Content-type': 'application/json',
        },
        body: JSON.stringify(body)
        })
        .then((response) => {
            if (response.ok) {
                return response.json();
            } else {
                throw new Error(response.status);
            }
        })
        .then((data) => {
            resolve(data);
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
    
})



showScreen('landing');
apiCall('auth/login', {
    "email": "mia@email.com",
    "password": "solongbouldercityv"
})
.then((data) => {
    const { token, userId } = data;
    console.log('SUCCESS ' + token + '::::::' + userId);
})
.catch((error) => {
    console.log('ERROR: ' + error)
})