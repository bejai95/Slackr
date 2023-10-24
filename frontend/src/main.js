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

const apiCall = (path, method, authorizedBool, body) => {
    return new Promise((resolve, reject) => {
        fetch('http://localhost:' + BACKEND_PORT + '/' + path, {
            method: method,
            body: Object.keys(body).length !== 0 ? JSON.stringify(body) : undefined,
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
    apiCall('channel', 'GET', true, {})
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

const createChannelMessage = (message, sender, timestamp) => {
    const newChannelMessage = document.getElementById('channel-message-template').cloneNode(true); 
    newChannelMessage.removeAttribute('id');
    newChannelMessage.querySelector('.message-content').innerText = message;
    newChannelMessage.querySelector('.message-sender-name').innerText = sender;
    newChannelMessage.querySelector('.message-timestamp').innerText = timestamp;
    document.getElementById('channel-messages-container').appendChild(newChannelMessage);
}

const loadChannel = (channelName, channelId) => {
    showScreenDashboard('channel');
    loadChannelDetails(channelName, channelId); // TODO later make it so only the name is visible at first until click on details
    loadChannelMessages(channelId);
    // TODO 2.2.3
}

const loadChannelDetails = (channelName, channelId) => {
    document.getElementById('channel-title').innerText = channelName;
    apiCall(`channel/${channelId}`, 'GET', true, {})
    .then((data) => {
        document.getElementById('channel-description').innerText = data.description ? data.description : 'No description given';
        document.getElementById('channel-visibility').innerText = data.private === false ? "Public" : "Private";
        document.getElementById('channel-creation-timestamp').innerText = formatTimestamp(data.createdAt);
        return data.creator;
    })
    .then (getNameFromId)
    .then ((dataNew) => {
        document.getElementById('channel-creator').innerText = dataNew.name;
    })
    .catch((error) => {
        alert('ERROR: ' + error);
    })
}

const loadChannelMessages = (channelId) => {
    apiCall(`message/${channelId}?start=0`, 'GET', true, {})
    .then((data) => {
        for (const message of data.messages) {
            const timestamp = formatTimestamp(message.sentAt);
            getNameFromId(message.sender)
            .then((data) => {
                createChannelMessage(message.message, data.name, timestamp);
            })
        }
    })
}

const getNameFromId = (id) => apiCall(`user/${id}`, 'GET', true, {}); 

document.getElementById('login-button').addEventListener('click', () => showScreenFull('login'));
document.getElementById('register-button').addEventListener('click', () => showScreenFull('register'));

for (const backButton of document.getElementsByClassName('back-button')) {
    backButton.addEventListener('click', () => showScreenFull('landing'));
}

document.getElementById('login-submit').addEventListener('click', () => {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    apiCall('auth/login', 'POST', false, {
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
        apiCall('auth/register', 'POST', false, {
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
    apiCall('auth/logout', 'POST', true, {})
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
        apiCall('channel', 'POST', true, {
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