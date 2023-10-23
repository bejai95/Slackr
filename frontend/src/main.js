import { BACKEND_PORT } from './config.js';
// A helper you may want to use when uploading new images to the server.
import { fileToDataUrl } from './helpers.js';

const showScreenFull = (screenName) => {
    for (const screen of document.getElementsByClassName('screen-full')) {
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

const loadDashboardInitial = () => {
    apiCall('channel', 'GET', '', true, false, {})
    .then(data => {
        for (const channel of data.channels) {
            // Check if user has access to the channel 
            createChannelButton(channel.name, channel.id); 
        }
    })
    .catch((error) => {
        // Deal with invalid token
        if (error === "Invalid token") {
            localStorage.removeItem('token');
            showScreenFull('landing');
        
        } else {
            alert('ERROR: ' + error);
        }
    })
}

const createChannelButton = (channelName, channelId) => {
    const newChannelButton = document.getElementById('channel-button-template').cloneNode(true);
    newChannelButton.removeAttribute('id');
    newChannelButton.querySelector('.content').innerText = channelName;
    newChannelButton.setAttribute('channelId', channelId);
    document.getElementById('channel-buttons-list').appendChild(newChannelButton);
    newChannelButton.addEventListener('click', () => {
        console.log("Channel button pressed");
    })
}

document.getElementById('login-button').addEventListener('click', () => showScreenFull('login'));
document.getElementById('register-button').addEventListener('click', () => showScreenFull('register'));

for (const backButton of document.getElementsByClassName('back-button')) {
    backButton.addEventListener('click', () => showScreenFull('landing'));
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
        showScreenFull('dashboard');
        loadDashboardInitial();
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
            showScreenFull('dashboard');
            loadDashboardInitial();
        })
        .catch((error) => {
            alert('ERROR: ' + error);
        })
    }
})

document.getElementById('logout-button').addEventListener('click', () => {
    apiCall('auth/logout', 'POST', '', true, false, {})
    .then(() => {
        
        // Get rid of the channel buttons
        const container = document.getElementById('channel-buttons-list');
        while(container.children.length > 1) {
            container.removeChild(container.lastChild);
        }
        
        localStorage.removeItem('token'); 
        showScreenFull('landing');
    })
    .catch((error) => {
        alert(error);
    })
    
})

document.getElementById('create-channel-button').addEventListener('click', () => {
    showScreenFull('create-channel-form');
})

document.getElementById('create-channel-cancel').addEventListener('click', () => {
    showScreenFull('dashboard');
})

document.getElementById('create-channel-submit').addEventListener('click', () => {
    const name = document.getElementById('create-channel-name').value;
    const description = document.getElementById('create-channel-description').value;
    const privateBool = document.getElementById('create-channel-type').value;

    if (name === '') {
        alert("Please enter a name for your channel");
    } else {
        apiCall('channel', 'POST', '', true, true, {
            "name": name,
            "private": privateBool,
            "description": description ? description: 'No description given',
        })
        .then((data) => {
            createChannelButton(name, data.channelId);
            showScreenFull('dashboard');
        })
        .catch((error) => {
            alert(error);
        })
    }
})


if (localStorage.getItem('token') === null) {
    showScreenFull('landing');
} else {
    showScreenFull('dashboard');
    loadDashboardInitial();
}