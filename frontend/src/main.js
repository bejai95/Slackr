import { BACKEND_PORT } from './config.js';
// A helper you may want to use when uploading new images to the server.
import { fileToDataUrl } from './helpers.js';

const showScreen = (screenName) => {
    for (const screen of document.getElementsByClassName('screen')) {
        screen.style.display = 'none';
	}
	document.getElementById(`${screenName}-screen`).style.display = 'block';
    if (screenName === 'dashboard') {
        loadDashboardInitial();
    }
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

const loadDashboardInitial = () => {
    apiCall('channel', 'GET', '', true, false, {})
    .then(data => {
        for (const channel of data.channels) {
            const channelButton = document.getElementById('channel-button-template').cloneNode(true);
            channelButton.removeAttribute('id');
            channelButton.querySelector('.content').innerText = channel.name;
            document.getElementById('channel-buttons-list').appendChild(channelButton);
        }
    })
    .catch((error) => {
        if (error === "Invalid token") {
            localStorage.removeItem('token');
            showScreen('landing');
        } else {
            alert('ERROR: ' + error);
        }
    })
}

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

document.getElementById('register-submit').addEventListener('click', () => {
    const name = document.getElementById('register-name').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const confirmPassword = document.getElementById('register-password-confirm').value;

    if (password !== confirmPassword) {
        alert("Passwords do not match");
    } else {
        apiCall('auth/register', 'POST', '', false, true, {
            "email": email,
            "password": password,
            "name": name
        })
        .then((data) => {
            localStorage.setItem('token', data.token);
            showScreen('dashboard') 
        })
        .catch((error) => {
            alert('ERROR: ' + error);
        })
    }
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

document.getElementById('create-channel-button').addEventListener('click', () => {
    showScreen('create-channel-form');
})

document.getElementById('create-channel-cancel').addEventListener('click', () => {
    showScreen('dashboard');
})

document.getElementById('create-channel-submit').addEventListener('click', () => {
    const name = document.getElementById('create-channel-name').value;
    const description = document.getElementById('create-channel-description').value;
    const privateBool = document.getElementById('create-channel-type').value;

    if (name === '') {
        alert("Please enter a name for your channel")
    } else {
        apiCall('channel', 'POST', '', true, true, {
            "name": name,
            "private": privateBool,
            "description": description ? description: 'No description given',
        })
        .then((data) => {
            showScreen('dashboard');
        })
        .catch((error) => {
            alert(error);
        })
    }
})


if (localStorage.getItem('token') === null) {
    showScreen('landing');
} else {
    showScreen('dashboard');
}