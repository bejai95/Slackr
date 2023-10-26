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

const showScreenChannel = (screenName) => {
    for (const screen of document.getElementsByClassName('screen-channel')) {
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

            // Only display public channels and private channels they have joined
            if (!channel.private || channel.members.includes(parseInt(localStorage.getItem('userId')))) {
                createChannelButton(channel.name, channel.id); 
            }
        }
    })
    .catch((error) => {
        // Deal with invalid token
        if (error === "Invalid token") {
            localStorage.removeItem('token');
            localStorage.removeItem('userId');
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

const createPageButton = (pageNumber, channelId) => {
    const newPageButton = document.getElementById('channel-page-button-template').cloneNode('true');
    newPageButton.removeAttribute('id');
    newPageButton.innerText = pageNumber;
    document.getElementById('channel-pages-container').appendChild(newPageButton);
    newPageButton.addEventListener('click', () => {
        loadChannelMessages(channelId, pageNumber);
    })
}

const loadChannel = (channelName, channelId) => {
    showScreenDashboard('channel');
    showScreenChannel('post-join-channel');
    document.getElementById('channel-title').innerText = channelName;
    document.getElementById('channel-screen').setAttribute('channelId', channelId);
    document.getElementById('channel-screen').setAttribute('channelName', channelName);
    
    document.getElementById('edit-channel-details').removeAttribute("disabled")
    document.getElementById('channel-name').setAttribute("disabled", "");
    document.getElementById('channel-description-edit').setAttribute("disabled", "");
    document.getElementById('confirm-edit-details').setAttribute("disabled", "");
    document.getElementById('cancel-edit-details').setAttribute("disabled", "");
    

    // Only proceed to load channel details and messages if the user is a member of the channel 
    // (if not they will be prompted to join the channnel instead)
    loadChannelDetails(channelId)
    .then((isMemberOfChannel) => {
        if (isMemberOfChannel) {
            loadChannelMessages(channelId, 1); 
            loadPageButtons(channelId);
        }
    })
    .catch((error) => {
        alert('ERROR: ' + error);
    })
}

// Load channel details if the user is a member of the channel, or prompt them to join the channel
// if they are not a member (see catch block)
const loadChannelDetails = (channelId) => {
    return new Promise((resolve, reject) => {
        apiCall(`channel/${channelId}`, 'GET', true, {})
        .then((data) => {
            document.getElementById('channel-name').value = data.name;
            document.getElementById('channel-description-edit').value = data.description ? data.description : 'No description given';
            document.getElementById('channel-visibility').innerText = data.private === false ? "Public" : "Private";
            document.getElementById('channel-creation-timestamp').innerText = formatTimestamp(data.createdAt);
            return data.creator;
        })
        .then((creatorId) => getNameFromId(creatorId))
        .then ((name) => {
            document.getElementById('channel-creator').innerText = name;
            resolve(true);
        })
        .catch((error) => {
            if ( error === "Authorised user is not a member of this channel") {
                showScreenChannel("pre-join-channel");
                resolve(false);
            } else {
                reject(error);
            }
        })
    })
}

const loadChannelMessages = (channelId, pageNumber) => {
    // Get rid of previously existing channel messages from DOM
    const container = document.getElementById('channel-messages-container');
    while(container.children.length > 1) {
        container.removeChild(container.lastChild);
    }

    document.getElementById('page-number').innerText = pageNumber;
    
    apiCall(`message/${channelId}?start=${(pageNumber - 1) * 25}`, 'GET', true, {})
    .then((data) => {
        const promises = []; 
        for (const message of data.messages) {
            const formattedTimeStamp = formatTimestamp(message.sentAt); 
            promises.push(
                getNameFromId(message.sender)
                .then((name) => {
                    return {
                        "message": message.message,
                        "formattedTimeStamp": formattedTimeStamp,
                        "sender": name,
                    }
                })
            ) 
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

const getAllMessages = (channelId) => {
    return new Promise((resolve, reject) => {
        const recursiveFunction = (channelId, index, allMessagesUntilNow) => {
            apiCall(`message/${channelId}?start=${index}`, 'GET', true, {})
            .then((data) => {
                if (data.messages.length === 0) {
                    resolve(allMessagesUntilNow);
                } else {
                    const newMessagesCombined = allMessagesUntilNow.concat(data.messages);
                    return recursiveFunction(channelId, index + 25, newMessagesCombined);
                }
            })
            .catch((error) => {
                reject(error);
            })
        }
    
        recursiveFunction(channelId, 0, []);
    })
}

const loadPageButtons = (channelId) => {
    // Get rid of previously existing page numbers from the DOM
    const container = document.getElementById('channel-pages-container');
    while(container.children.length > 1) {
        container.removeChild(container.lastChild);
    }

    getAllMessages(channelId)
    .then((data) => {
        const totalNumberOfMessages = data.length;
        let totalNumberOfPages = Math.ceil(totalNumberOfMessages / 25 );
        if (totalNumberOfPages === 0) {
            totalNumberOfPages = 1;
        }
        ;document.getElementById('total-pages').innerText = totalNumberOfPages; 
        for (let pageNumber = 1; pageNumber <= totalNumberOfPages; pageNumber++) {
            createPageButton(pageNumber, channelId);
        }
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
        localStorage.setItem('userId', data.userId); 
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
            localStorage.setItem('userId', data.userId); 
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
        localStorage.removeItem('userId'); 
        showScreenFull('landing');
    })
    .catch((error) => {
        alert(error);
    })
})

document.getElementById('create-channel-button').addEventListener('click', () => {
    showScreenDashboard('create-channel-form');
    loadDashboard
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

document.getElementById('message-send-button').addEventListener('click', () => {
    const channelId = document.getElementById('channel-screen').getAttribute('channelId');
    apiCall(`message/${channelId}`, 'POST', true, {
        "message": document.getElementById('message-box').value,
    })
    .then(() => {
        loadChannelMessages(channelId, 1);
        loadPageButtons(channelId);
    })
    .catch((error) => {
        alert(error);
    })
})

const showButton = document.getElementById('show-channel-details');
showButton.addEventListener('click', () => {
    document.getElementById('channel-details').style.display = 'block';
    showButton.style.display = 'none';
})

document.getElementById('hide-channel-details').addEventListener('click', () => {
    document.getElementById('channel-details').style.display = 'none';
    showButton.style.display = 'block';
})

document.getElementById('join-channel-button').addEventListener('click', () => {
    const channelId = document.getElementById('channel-screen').getAttribute('channelId');
    const channelName = document.getElementById('channel-screen').getAttribute('channelName');
    apiCall(`channel/${channelId}/join`, 'POST', true, {})
    .then(() => {
        loadChannel(channelName, channelId);
    })
    .catch((error) => {
        alert(error);
    })

})

document.getElementById('leave-channel-button').addEventListener('click', () => {
    const channelId = document.getElementById('channel-screen').getAttribute('channelId');
    apiCall(`channel/${channelId}/leave`, 'POST', true, {})
    .then(() => {
        loadDashboard('channel');
        showScreenChannel('pre-join-channel');
    })
    .catch((error) => {
        alert(error);
    })
})

/* document.getElementById('channel-name').setAttribute("disabled", "");
    document.getElementById('channel-description-edit').setAttribute("disabled", "");
    document.getElementById('confirm-edit-details').setAttribute("disabled", "");
    document.getElementById('cancel-edit-details').setAttribute("disabled", ""); */

const editButton = document.getElementById('edit-channel-details');
const cancelButton = document.getElementById('cancel-edit-details');
const confirmButton = document.getElementById('confirm-edit-details');
const name = document.getElementById('channel-name');
const description = document.getElementById('channel-description-edit'); 
editButton.addEventListener('click', () => {
    editButton.setAttribute("disabled", "");
    name.removeAttribute("disabled");
    description.removeAttribute("disabled");
    cancelButton.removeAttribute("disabled");
})

document.getElementById('channel-details').addEventListener('change', () => {
    confirmButton.removeAttribute("disabled");
})

cancelButton.addEventListener('click', () => {
    const channelName = document.getElementById('channel-screen').getAttribute('channelName');
    const channelId = document.getElementById('channel-screen').getAttribute('channelId');
    loadChannel(channelName, channelId);
})

confirmButton.addEventListener('click', () => {
    const channelId = document.getElementById('channel-screen').getAttribute('channelId');
    const newName = name.value;
    const newDescription = description.value;
    apiCall(`channel/${channelId}`, 'PUT', true, {
        "name": newName,
        "description": newDescription,
    })
    .then(() => {
        loadDashboard('channel');
        loadChannel(newName, channelId);
    })
})


if (localStorage.getItem('token') === null) {
    showScreenFull('landing');
} else {
    showScreenFull('dashboard');
    loadDashboard('welcome');
}