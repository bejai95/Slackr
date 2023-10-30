import { BACKEND_PORT } from './config.js';
// A helper you may want to use when uploading new images to the server.
import { fileToDataUrl, formatTimestamp } from './helpers.js';

const EMOJI_1 = '❤️';
const EMOJI_2 = '😂';
const EMOJI_3 = '😭';
const EMOJI_4 = '👍';
const EMOJI_5 = '💪';

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

const createChannelMessage = (channelId, messageId, pageNumber, message, sender, formattedSentAt, editedBool, formattedEditedAt, reactCount, pinnedBool) => {

    const newChannelMessage = document.getElementById('channel-message-template').cloneNode(true); 
    newChannelMessage.removeAttribute('id');
    newChannelMessage.querySelector('.message-content').innerText = message;
    newChannelMessage.querySelector('.message-sender-name').innerText = sender;
    newChannelMessage.querySelector('.message-timestamp').innerText = formattedSentAt;
    newChannelMessage.querySelector('.message-edit-tools').style.display = 'none';
    document.getElementById('channel-messages-container').appendChild(newChannelMessage);

    if (editedBool === false) {
        newChannelMessage.querySelector('.message-edit-info').style.display = 'none';
    } else {
        newChannelMessage.querySelector('.message-edit-timestamp').innerText = formattedEditedAt;
    }

    // Set count and highlighting for each of the 5 reacts
    for (let i = 1; i <= 5; i++) {
        // Set the total number for this react
        const query = '.count-' + i; 
        const currentEmoji = eval(`EMOJI_${i}`); 
        let emojiCount = reactCount[currentEmoji];
        if (emojiCount === undefined) {
            emojiCount = 0;
        }
        newChannelMessage.querySelector(query).innerText = emojiCount; 

        // Highlight this button if the user has done this react
        if (reactCount.currentUserReacts.includes(currentEmoji)) {
            const query = '.react-' + i; 
            newChannelMessage.querySelector(query).classList.add("reacted");
        }
    }

    // If the message is pinned, set the pin/unpin button to unpin
    if (pinnedBool) {
        newChannelMessage.querySelector('.message-pin-or-unpin').innerText = 'Unpin';
    }

    newChannelMessage.querySelector('.message-delete-button').addEventListener('click', () => {
        apiCall(`message/${channelId}/${messageId}`, 'DELETE', true, {})
        .then(() => {
            loadChannelMessages(channelId, pageNumber);
            loadPageButtons(channelId);
        })
        .catch((error) => {
            alert('ERROR: ' + error);
        })
    })

    newChannelMessage.querySelector('.message-edit-button').addEventListener('click', () => {
        newChannelMessage.querySelector('.message-edit-button').setAttribute("disabled", "");
        newChannelMessage.querySelector('.message-content').style.display = 'none';
        newChannelMessage.querySelector('.message-edit-tools').style.display = 'block';
        newChannelMessage.querySelector('.message-edit-text').value = message;
    })

    newChannelMessage.querySelector('.message-edit-cancel').addEventListener('click', () => {
        newChannelMessage.querySelector('.message-edit-button').removeAttribute("disabled");
        newChannelMessage.querySelector('.message-edit-tools').style.display = 'none';
        newChannelMessage.querySelector('.message-content').style.display = 'block';

    })

    newChannelMessage.querySelector('.message-edit-confirm').addEventListener('click', () => {
        const regex = /^\s*$/; 
        const messageEdit = newChannelMessage.querySelector('.message-edit-text');

        if (regex.test(messageEdit.value)) {
            alert("You cannot update to an empty string or a message containing only whitespace");
        } else if (messageEdit.value === newChannelMessage.querySelector('.message-content').innerText) {
            alert("message is still the same as what it was before. Please update it first");
        } else {
            apiCall(`message/${channelId}/${messageId}`, 'PUT', true, {
                message: messageEdit.value,
            })
            .then(() => {
                loadChannelMessages(channelId, pageNumber);
            })
            .catch((error) => {
                alert(error);
            })  
        }
    })

    // Add event listeners for each of the 5 reacts
    for (let i = 1; i <=5; i++) {1
        newChannelMessage.querySelector(`.react-${i}`).addEventListener('click', () => {
            const query = '.react-' + i; 
            if (newChannelMessage.querySelector(query).classList.contains('reacted')) {
                callReactOrUnreact(channelId, messageId, pageNumber, i, 'unreact');
            } else {
                callReactOrUnreact(channelId, messageId, pageNumber, i, 'react');
            }
        })                    
    }

    newChannelMessage.querySelector('.message-pin-or-unpin').addEventListener('click', () => {
        if (pinnedBool) {
            callPinorUnpin(channelId, messageId, pageNumber, 'unpin');
        } else {
            callPinorUnpin(channelId, messageId, pageNumber, 'pin');
        }
    })
}

const callReactOrUnreact = (channelId, messageId, pageNumber, emojiIndex, reactOrUnreact) => {
    apiCall(`message/${reactOrUnreact}/${channelId}/${messageId}`, 'POST', true, {
        react: eval(`EMOJI_${emojiIndex}`),
    })
    .then(() => {
        loadChannelMessages(channelId, pageNumber);
    })
    .catch((error) => {
        alert(error);
    })
}

const callPinorUnpin = (channelId, messageId, pageNumber, pinOrUnpin) => {
    apiCall(`message/${pinOrUnpin}/${channelId}/${messageId}`, 'POST', true, {})
    .then(() => {
        loadChannelMessages(channelId, pageNumber);
    })
    .catch((error) => {
        alert(error);
    })
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
    document.getElementById('details-edit').style.display = 'none';
    document.getElementById('details-non-edit').style.display = 'block';
    document.getElementById('edit-channel-details').removeAttribute("disabled");
    document.getElementById('confirm-edit-details').setAttribute("disabled", "");
    document.getElementById('cancel-edit-details').setAttribute("disabled", "");

    document.getElementById('default-or-pinned').addEventListener('change', () => {
        loadChannelMessages(channelId, 1)
    })
    

    // Only proceed to load channel details and messages if the user is a member of the channel 
    // (if not they will be prompted to join the channnel instead)
    loadChannelDetails(channelId)
    .then((isMemberOfChannel) => {
        if (isMemberOfChannel) {
            loadChannelMessages(channelId, 1); // 1 because we load the first page by default
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
            document.getElementById('channel-name-show').innerText = data.name;
            document.getElementById('channel-description-show').innerText = data.description ? data.description : 'No description given';
            document.getElementById('channel-visibility').innerText = data.private === false ? "Public" : "Private";
            document.getElementById('channel-creation-timestamp').innerText = formatTimestamp(data.createdAt);
            return data.creator;
        })
        .then((creatorId) => getNameFromId(creatorId))
        .then ((creatorName) => {
            document.getElementById('channel-creator').innerText = creatorName;
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

    document.getElementById('message-box').value = "";
    document.getElementById('message-box').focus(); // Auto-focus on the message input box so user can start typing immediately
    document.getElementById('page-number').innerText = pageNumber;

    // If the pinned option is selected, need to load the messages differently
    const pinnedView = (document.getElementById('default-or-pinned').value === 'pinned-view');
    if (pinnedView) {
        document.getElementById('page-numbers-container').style.display = 'none';
    } else {
        document.getElementById('page-numbers-container').style.display = 'block';
    }
    
    getChannelMessages(channelId, pageNumber, pinnedView)
    .then((messages) => {
        const promises = []; 
        for (const message of messages) { 
            if (pinnedView && !message.pinned) {
                continue;
            }
            promises.push(
                getNameFromId(message.sender)
                .then((name) => {
                    return {
                        "id": message.id,
                        "message": message.message,
                        "formattedSentAt": formatTimestamp(message.sentAt),
                        "sender": name,
                        "edited": message.edited,
                        "formattedEditedAt": formatTimestamp(message.editedAt),
                        "reacts": countReactTypes(message.reacts),
                        "pinned": message.pinned,
                    }
                })
            ) 
        }
        return Promise.all(promises);
    })
    .then((details) => {
        for (const object of details) {
            createChannelMessage(
                channelId, 
                object.id, 
                pageNumber, 
                object.message, 
                object.sender, 
                object.formattedSentAt,
                object.edited,
                object.formattedEditedAt,
                object.reacts,
                object.pinned
            );           
        }
    })
    .catch((error) => {
        alert('ERROR: ' + error);
    })
}

const countReactTypes = (reacts) => {
    const ret = {};
    ret.currentUserReacts = [];
    for (const react of reacts) {
        const emoji = react.react;
        if (react.user === parseInt(localStorage.getItem('userId'))) {
            ret.currentUserReacts.push(emoji);
        }
        ret[emoji] = ret[emoji] ? ret[emoji] + 1 : 1;
    }
    return ret;
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

// Returns a promise that will return messages in an array, all channel messages if pinnedView is true, 
// (useful for showing all pinned messages) or otherwise just the 25 messages on page pageNumber
const getChannelMessages = (channelId, pageNumber, pinnedView) => {
    if (pinnedView) {
        return getAllMessages(channelId);
    } else {
        return (
            apiCall(`message/${channelId}?start=${(pageNumber - 1) * 25}`, 'GET', true, {}).then((data) => data.messages)
        ) 
        
    }
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
        document.getElementById('total-pages').innerText = totalNumberOfPages; 
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

const handleMessageSend = () => {
    const regex = /^\s*$/; 
    const message = document.getElementById('message-box').value.trim();

    if (regex.test(message)) {
        alert("You cannot send an empty string or a message containing only whitespace");
    } else {
        const channelId = document.getElementById('channel-screen').getAttribute('channelId');
        apiCall(`message/${channelId}`, 'POST', true, {
            "message": message,
        })
        .then(() => {
            loadChannelMessages(channelId, 1);
            loadPageButtons(channelId);
        })
        .catch((error) => {
            alert(error);
        })
    }
}

document.getElementById('message-send-button').addEventListener('click', handleMessageSend);
document.getElementById('message-box').addEventListener('keyup', (event) => {
    if (event.key === 'Enter') {
        handleMessageSend();
    }
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

const showButton = document.getElementById('show-channel-details');
showButton.addEventListener('click', () => {
    document.getElementById('channel-details').style.display = 'block';
    showButton.style.display = 'none';
})

document.getElementById('hide-channel-details').addEventListener('click', () => {
    document.getElementById('channel-details').style.display = 'none';
    showButton.style.display = 'inline-block';
})

const editButton = document.getElementById('edit-channel-details');
const cancelButton = document.getElementById('cancel-edit-details');
const confirmButton = document.getElementById('confirm-edit-details');
const channelNameEdit = document.getElementById('channel-name-edit');
const channelDescriptionEdit = document.getElementById('channel-description-edit'); 
editButton.addEventListener('click', () => {
    editButton.setAttribute("disabled", "");
    cancelButton.removeAttribute("disabled");
    confirmButton.removeAttribute("disabled");
    document.getElementById('details-non-edit').style.display = 'none';
    document.getElementById('details-edit').style.display = 'block';
    document.getElementById('channel-name-edit').value = document.getElementById('channel-name-show').innerText;
    document.getElementById('channel-description-edit').value = document.getElementById('channel-description-show').innerText;
})

cancelButton.addEventListener('click', () => {
    editButton.removeAttribute("disabled");
    cancelButton.setAttribute("disabled", "");
    confirmButton.setAttribute("disabled", ""); 
    document.getElementById('details-non-edit').style.display = 'block';
    document.getElementById('details-edit').style.display = 'none';
})

confirmButton.addEventListener('click', () => {
    const channelId = document.getElementById('channel-screen').getAttribute('channelId');
    const newChannelName = channelNameEdit.value;
    const newChannelDescription = channelDescriptionEdit.value;
    apiCall(`channel/${channelId}`, 'PUT', true, {
        "name": newChannelName,
        "description": newChannelDescription,
    })
    .then(() => {
        loadDashboard('channel');
        loadChannel(newChannelName, channelId);
    })
})


if (localStorage.getItem('token') === null) {
    showScreenFull('landing');
} else {
    showScreenFull('dashboard');
    loadDashboard('welcome');
}