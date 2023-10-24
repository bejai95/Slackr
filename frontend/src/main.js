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

const loadDashboard = (screenName) => {
    // Get rid of previously existing channel buttons from DOM
    const container = document.getElementById('channel-buttons-list');
    while(container.children.length > 1) {
        container.removeChild(container.lastChild);
    }
    
    showScreenDashboard(screenName);
    apiCall('channel', 'GET', true, {})
    .then(data => {
        for (const channel of data.channels) {
            // TODO Check if user has access to the channel 
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
    document.getElementById('message-send-button').setAttribute('channelId', channelId);
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
    .then((creatorId) => getNameFromId(creatorId))
    .then ((name) => {
        document.getElementById('channel-creator').innerText = name;
    })
    .catch((error) => {
        alert('ERROR: ' + error);
    })
}
const loadChannelMessages = (channelId) => {
    // Get rid of previously existing channel messages from DOM
    const container = document.getElementById('channel-messages-container');
    while(container.children.length > 1) {
        container.removeChild(container.lastChild);
    }
    
    apiCall(`message/${channelId}?start=0`, 'GET', true, {})
    .then((data) => {
        const promises = []; 
        for (const message of data.messages.reverse()) {
            promises.push(getMessageTimeandSender(message.message, message.sentAt, message.sender)); 
        }
        return Promise.all(promises);
    })
    .then((messagesTimesandSenders) => {
        for (const object of messagesTimesandSenders) {
            createChannelMessage(object.message, object.sender, object.formattedTimeStamp);
        }
    })
    .catch((error) => {
        alert('ERROR: ' + error);
    })
}

const getNameFromId = (id) => {
    return new Promise((resolve, reject) => {
        apiCall(`user/${id}`, 'GET', true, {})
        .then((data) => {
            resolve(data.name); 
        })
        .catch((error) => {
            reject(error);
        })
    })
};

const getMessageTimeandSender = (message, isoString, senderId) => {
    return new Promise((resolve, reject) => {
        const formattedTimeStamp = formatTimestamp(isoString); 
        getNameFromId(senderId)
        .then((name) => {
            resolve ({
                "message": message,
                "formattedTimeStamp": formattedTimeStamp,
                "sender": name
            })
        })
        .catch((error) => {
            reject(error);
        })
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
    apiCall('auth/login', 'POST', false, {
        "email": email,
        "password": password,
    })
    .then((data) => {
        localStorage.setItem('token', data.token);
        showScreenFull('dashboard');
        loadDashboard('welcome');
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
            loadDashboard('welcome');
        })
        .catch((error) => {
            alert('ERROR: ' + error);
        })
    }
})

document.getElementById('logout-button').addEventListener('click', () => {
    apiCall('auth/logout', 'POST', true, {})
    .then(() => {
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
            loadDashboard('channel');
            loadChannel(name, data.channelId);
        })
        .catch((error) => {
            alert(error);
        })
    }
})

const sendButton = document.getElementById('message-send-button');
sendButton.addEventListener('click', () => {
    const channelId = sendButton.getAttribute('channelId');
    apiCall(`message/${channelId}`, 'POST', true, {
        "message": document.getElementById('message-box').value,
    })
    .then(() => {
        loadChannelMessages(channelId);
    })
    .catch((error) => {
        alert(error);
    })
})


if (localStorage.getItem('token') === null) {
    showScreenFull('landing');
} else {
    showScreenFull('dashboard');
    loadDashboard('welcome');
}