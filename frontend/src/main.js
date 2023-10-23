import { BACKEND_PORT } from './config.js';
// A helper you may want to use when uploading new images to the server.
import { fileToDataUrl, formatTimestamp } from './helpers.js';

const showScreenFull = (screenName) => {
    for (const screen of document.getElementsByClassName('screen-full')) {
        screen.style.display = 'none';
	}
	document.getElementById(`${screenName}-screen`).style.display = 'block';
}

const showScreenDashboard = (screenName) => {
    for (const screen of document.getElementsByClassName('screen-dashboard')) {
        screen.style.display = 'none';
	}
	document.getElementById(`${screenName}-screen`).style.display = 'block';
}

const apiCall = (path, method, authorizedBool, bodyBool, body) => {
    return new Promise((resolve, reject) => {
        fetch('http://localhost:' + BACKEND_PORT + '/' + path, {
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
    apiCall('channel', 'GET', true, false, {})
    .then(data => {
        for (const channel of data.channels) {
            // TODO Check if user has access to the channel 
            createChannelButton(channel.name, channel.id); 
        }
        showScreenDashboard('welcome');
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
    document.getElementById('channel-buttons-list').appendChild(newChannelButton);
    newChannelButton.addEventListener('click', () => {
        loadChannel(channelName, channelId);
    })
}

const loadChannel = (channelName, channelId) => {
    showScreenDashboard('channel');
    document.getElementById('channel-title').innerText = channelName;
    apiCall(`channel/${channelId}`, 'GET', true, false, {})
    .then((data) => {
        document.getElementById('channel-description').innerText = data.description ? data.description : 'No description given';
        document.getElementById('channel-visibility').innerText = data.private === false ? "Public" : "Private";
        document.getElementById('creation-timestamp').innerText = formatTimestamp(data.createdAt);

    }) // TODO catch block here
}

document.getElementById('login-button').addEventListener('click', () => showScreenFull('login'));
document.getElementById('register-button').addEventListener('click', () => showScreenFull('register'));

for (const backButton of document.getElementsByClassName('back-button')) {
    backButton.addEventListener('click', () => showScreenFull('landing'));
}

document.getElementById('login-submit').addEventListener('click', () => {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    apiCall('auth/login', 'POST', false, true, {
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
        apiCall('auth/register', 'POST', false, true, {
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
    apiCall('auth/logout', 'POST', true, false, {})
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
    showScreenDashboard('create-channel-form');
})

document.getElementById('create-channel-submit').addEventListener('click', () => {
    const name = document.getElementById('create-channel-name').value;
    const description = document.getElementById('create-channel-description').value;
    const privateBool = document.getElementById('create-channel-visibilty').value === 'private';

    if (name === '') {
        alert("Please enter a name for your channel");
    } else {
        apiCall('channel', 'POST', true, true, {
            "name": name,
            "private": privateBool,
            "description": description,
        })
        .then((data) => {
            createChannelButton(name, data.channelId);
            loadChannel(name, data.channelId);
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