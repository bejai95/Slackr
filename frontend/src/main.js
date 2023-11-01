import { BACKEND_PORT } from './config.js';
// A helper you may want to use when uploading new images to the server.
import { fileToDataUrl, formatTimestamp } from './helpers.js';

const EMOJI_1 = '❤️';
const EMOJI_2 = '😂';
const EMOJI_3 = '😭';
const EMOJI_4 = '👍';
const EMOJI_5 = '💪';

let currentChannelId = null;
let currentChannelName = null;

// Extremely useful function which returns a promise fetching from the API. 
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

// Extremely useful function which displays the error modal with a given error 
const showErrorModal = (error) => {
    document.getElementById('error-modal').classList.add('is-active')
    document.getElementById('error-modal-content').innerText = error;
}

// Show a 'full screen', hide all other screens
const showScreenFull = (screenName) => {
    for (const screen of document.getElementsByClassName('screen-full')) {
        screen.classList.add('is-hidden');
	}
	document.getElementById(`${screenName}-screen`).classList.remove('is-hidden');
}

// Show a dashboard screen, hide all other screens
const showScreenDashboard = (screenName) => {
    for (const screen of document.getElementsByClassName('screen-dashboard')) {
        screen.classList.add('is-hidden');
	}
	document.getElementById(`${screenName}-screen`).classList.remove('is-hidden');
}

// Show a channel screen, hide all other screens
const showScreenChannel = (screenName) => {
    for (const screen of document.getElementsByClassName('screen-channel')) {
        screen.classList.add('is-hidden');
	}
	document.getElementById(`${screenName}-screen`).classList.remove('is-hidden');
}

const loadDashboard = (screenName) => {
    // Get rid of previously existing channel buttons from DOM 
    // (both private and public channel lists need to be cleared)
    const containerPublic = document.getElementById('public-channel-buttons-list');
    while(containerPublic.children.length > 1) {
        containerPublic.removeChild(containerPublic.lastChild);
    }
    const containerPrivate = document.getElementById('private-channel-buttons-list');
    while(containerPrivate.children.length > 1) {
        containerPrivate.removeChild(containerPrivate.lastChild);
    }
    
    showScreenDashboard(screenName);
    apiCall('channel', 'GET', true, {})
    .then(data => {
        for (const channel of data.channels) {

            // Only display public channels and private channels they have joined
            if (!channel.private || channel.members.includes(parseInt(localStorage.getItem('userId')))) {
                createChannelButton(channel.name, channel.id, channel.private); 
            }
        }
    })
    .catch((error) => {
        // Deal with invalid token
        if (error === "Invalid token") {
            localStorage.removeItem('token');
            localStorage.removeItem('userId');
            showScreenFull('login');
        
        } else {
            showErrorModal(error);
        }
    })
}

// Create a channel button
const createChannelButton = (channelName, channelId, privateBool) => {
    const newChannelButton = document.getElementById('channel-button-template').cloneNode(true);
    newChannelButton.removeAttribute('id');
    newChannelButton.querySelector('.content').innerText = channelName;
    
    if (privateBool) {
        document.getElementById('private-channel-buttons-list').appendChild(newChannelButton);
    } else {
        document.getElementById('public-channel-buttons-list').appendChild(newChannelButton);
    }
    
    newChannelButton.addEventListener('click', () => {
        loadChannel(channelName, channelId);
    })
}

// Create a channel message
const createChannelMessage = (messageId, pageNumber, message, sender, formattedSentAt, editedBool, formattedEditedAt, reactCount, pinnedBool) => {

    const newChannelMessage = document.getElementById('channel-message-template').cloneNode(true); 
    newChannelMessage.removeAttribute('id');
    newChannelMessage.querySelector('.message-content').innerText = message;
    newChannelMessage.querySelector('.message-sender-name').innerText = sender;
    newChannelMessage.querySelector('.message-timestamp').innerText = formattedSentAt;
    newChannelMessage.querySelector('.message-edit-tools').classList.add('is-hidden');
    document.getElementById('channel-messages-container').appendChild(newChannelMessage);

    if (editedBool === false) {
        newChannelMessage.querySelector('.message-edit-info').classList.add('is-hidden');
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

    // Event listener for if delete is pressed on this button
    newChannelMessage.querySelector('.message-delete-button').addEventListener('click', () => {
        apiCall(`message/${currentChannelId}/${messageId}`, 'DELETE', true, {})
        .then(() => {
            loadChannelMessages(pageNumber);
            loadPageButtons(pageNumber);
        })
        .catch((error) => {
            showErrorModal(error);
        })
    })

    // Event listener for if edit is pressed on this button
    newChannelMessage.querySelector('.message-edit-button').addEventListener('click', () => {
        newChannelMessage.querySelector('.message-edit-button').setAttribute("disabled", "");
        newChannelMessage.querySelector('.message-content').classList.add('is-hidden');
        newChannelMessage.querySelector('.message-edit-tools').classList.remove('is-hidden');
        newChannelMessage.querySelector('.message-edit-text').value = message;
    })

    // Cancel edit
    newChannelMessage.querySelector('.message-edit-cancel').addEventListener('click', () => {
        newChannelMessage.querySelector('.message-edit-button').removeAttribute("disabled");
        newChannelMessage.querySelector('.message-edit-tools').classList.add('is-hidden');;
        newChannelMessage.querySelector('.message-content').classList.remove('is-hidden');

    })

    // Confirm edit
    newChannelMessage.querySelector('.message-edit-confirm').addEventListener('click', () => {
        const regex = /^\s*$/; 
        const messageEdit = newChannelMessage.querySelector('.message-edit-text');

        if (regex.test(messageEdit.value)) {
            showErrorModal("You cannot update to an empty string or a message containing only whitespace");
        } else if (messageEdit.value === newChannelMessage.querySelector('.message-content').innerText) {
            showErrorModal("Message is still the same as what it was before. Please update it first");
        } else {
            apiCall(`message/${currentChannelId}/${messageId}`, 'PUT', true, {
                message: messageEdit.value,
            })
            .then(() => {
                loadChannelMessages(pageNumber);
            })
            .catch((error) => {
                showErrorModal(error);
            })  
        }
    })

    // Add event listeners for each of the 5 reacts
    for (let i = 1; i <=5; i++) {1
        newChannelMessage.querySelector(`.react-${i}`).addEventListener('click', () => {
            const query = '.react-' + i; 
            if (newChannelMessage.querySelector(query).classList.contains('reacted')) {
                callReactOrUnreact(messageId, pageNumber, i, 'unreact');
            } else {
                callReactOrUnreact(messageId, pageNumber, i, 'react');
            }
        })                    
    }

    // Event listener for if pin or unpin is pressed on this message
    newChannelMessage.querySelector('.message-pin-or-unpin').addEventListener('click', () => {
        if (pinnedBool) {
            callPinorUnpin(messageId, pageNumber, 'unpin');
        } else {
            callPinorUnpin(messageId, pageNumber, 'pin');
        }
    })
}

// Wrapper function
const callReactOrUnreact = (messageId, pageNumber, emojiIndex, reactOrUnreact) => {
    apiCall(`message/${reactOrUnreact}/${currentChannelId}/${messageId}`, 'POST', true, {
        react: eval(`EMOJI_${emojiIndex}`),
    })
    .then(() => {
        loadChannelMessages(pageNumber);
    })
    .catch((error) => {
        showErrorModal(error);
    })
}

// Wrapper function
const callPinorUnpin = (messageId, pageNumber, pinOrUnpin) => {
    apiCall(`message/${pinOrUnpin}/${currentChannelId}/${messageId}`, 'POST', true, {})
    .then(() => {
        loadChannelMessages(pageNumber);
    })
    .catch((error) => {
        showErrorModal(error);
    })
}

// Create a new page button which can be pressed to go to that page of messages
const createPageButton = (pageNumber) => {
    const newPageButton = document.getElementById('channel-page-button-template').cloneNode('true');
    newPageButton.removeAttribute('id');
    newPageButton.querySelector('.page-number').id = (`page-${pageNumber}-button`);
    newPageButton.querySelector('.page-number').innerText = pageNumber;
    document.getElementById('channel-pages-container').appendChild(newPageButton);
    newPageButton.addEventListener('click', () => {
        loadChannelMessages(pageNumber);
        loadPageButtons(pageNumber);
    })
}

// Create a new checkbox with a person's name attached, used for inviting users to chanels
const createInviteCheckbox = (userName, userId) => {
    const newInviteCheckbox = document.getElementById('invite-user-checkbox-template').cloneNode('true');
    newInviteCheckbox.removeAttribute('id');
    newInviteCheckbox.querySelector('.name').innerText = userName;
    newInviteCheckbox.setAttribute("userId", userId);
    document.getElementById('invite-user-checkbox-container').appendChild(newInviteCheckbox);
}

// Extremely important function, loads a channel
const loadChannel = (channelName, channelId) => {
    showScreenDashboard('channel');
    showScreenChannel('post-join-channel');

    document.getElementById('channel-title').innerText = channelName;
    document.getElementById('details-edit').classList.add('is-hidden');
    document.getElementById('details-non-edit').classList.remove('is-hidden');
    document.getElementById('edit-channel-details').classList.remove('is-hidden');
    document.getElementById('confirm-edit-details').classList.add('is-hidden');
    document.getElementById('cancel-edit-details').classList.add('is-hidden');

    currentChannelId = channelId; // Setting global functions
    currentChannelName = channelName;
    
    // Only proceed to load channel details and messages if the user is a member of the channel 
    // (if not they will be prompted to join the channel instead)
    loadChannelDetails(channelId)
    .then((isMemberOfChannel) => {
        if (isMemberOfChannel) {
            loadChannelMessages(1); // 1 because we load the first page by default
            loadPageButtons(1);
        }
    })
    .catch((error) => {
        showErrorModal(error);
    })
}

// Load channel details if the user is a member of the channel, or prompt them to join the channel
// if they are not a member (see catch block)
const loadChannelDetails = () => {
    return new Promise((resolve, reject) => {
        apiCall(`channel/${currentChannelId}`, 'GET', true, {})
        .then((data) => {
            document.getElementById('channel-name-show').innerText = data.name;
            document.getElementById('channel-description-show').innerText = data.description ? data.description : 'No description given';
            document.getElementById('channel-visibility').innerText = data.private === false ? "Public" : "Private";
            document.getElementById('channel-creation-timestamp').innerText = formatTimestamp(data.createdAt);
            return data.creator;
        })
        .then((creatorId) => getNameFromId(creatorId))
        .then ((creator) => {
            document.getElementById('channel-creator').innerText = creator.name;
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

// Load the messages in a channel (extremely important function)
const loadChannelMessages = (pageNumber) => {
    
    // Get rid of previously existing channel messages from DOM
    const container = document.getElementById('channel-messages-container');
    while(container.children.length > 1) {
        container.removeChild(container.lastChild);
    }

    document.getElementById('message-box').value = "";
    document.getElementById('message-box').focus(); // Auto-focus on the message input box so user can start typing immediately

    // If the pinned option is selected, need to load the messages differently
    const pinnedView = (document.getElementById('default-or-pinned').value === 'pinned-view');
    if (pinnedView) {
        document.getElementById('page-numbers-container').classList.add('is-hidden');
    } else {
        document.getElementById('page-numbers-container').classList.remove('is-hidden');
    }
    
    getChannelMessages(pageNumber, pinnedView)
    .then((messages) => {
        const promises = []; 
        for (const message of messages) { 
            if (pinnedView && !message.pinned) {
                continue;
            }
            promises.push(
                getNameFromId(message.sender)
                .then((result) => {
                    return {
                        "id": message.id,
                        "message": message.message,
                        "formattedSentAt": formatTimestamp(message.sentAt),
                        "sender": result.name,
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
        showErrorModal(error);
    })
}

// Simple function to count the number of each type of react
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

// 'Recursive promise calling' function which gets all of the messages combined
const getAllMessages = () => {
    return new Promise((resolve, reject) => {
        const recursiveFunction = (index, allMessagesUntilNow) => {
            apiCall(`message/${currentChannelId}?start=${index}`, 'GET', true, {})
            .then((data) => {
                if (data.messages.length === 0) {
                    resolve(allMessagesUntilNow);
                } else {
                    const newMessagesCombined = allMessagesUntilNow.concat(data.messages);
                    return recursiveFunction(index + 25, newMessagesCombined);
                }
            })
            .catch((error) => {
                reject(error);
            })
        }
    
        recursiveFunction(0, []);
    })
}

// Returns a promise that will return messages in an array, all channel messages if pinnedView is true, 
// (useful for showing all pinned messages) or otherwise just the 25 messages on page pageNumber
const getChannelMessages = (pageNumber, pinnedView) => {
    if (pinnedView) {
        return getAllMessages();
    } else {
        return (
            apiCall(`message/${currentChannelId}?start=${(pageNumber - 1) * 25}`, 'GET', true, {}).then((data) => data.messages)
        ) 
        
    }
}

// Function to load the page buttons
const loadPageButtons = (pageNumber) => {
    // Get rid of previously existing page numbers from the DOM
    const container = document.getElementById('channel-pages-container');
    while(container.children.length > 1) {
        container.removeChild(container.lastChild);
    }

    getAllMessages()
    .then((data) => {
        const totalNumberOfMessages = data.length;
        let totalNumberOfPages = Math.ceil(totalNumberOfMessages / 25 );
        if (totalNumberOfPages === 0) {
            totalNumberOfPages = 1;
        }
        for (let pageNumber = 1; pageNumber <= totalNumberOfPages; pageNumber++) {
            createPageButton(pageNumber);
        }

        document.getElementById(`page-${pageNumber}-button`).classList.add('is-current');
    })
}


// Given an id, get the associated name
const getNameFromId = (id) => {
    return new Promise((resolve, reject) => {
        apiCall(`user/${id}`, 'GET', true, {})
        .then((data) => {
            resolve({
                name: data.name,
                id: id,
            }); 
        })
        .catch((error) => {
            reject(error);
        })
    })
};

const getUsersToInvite = () => {
     
    // Get rid of previously existing invite buttons from DOM
    const container = document.getElementById('invite-user-checkbox-container');
    while(container.children.length > 1) {
        container.removeChild(container.lastChild);
    }
    
    apiCall('user', 'GET', true, {})
    .then((allUsers) => {
        return getUsersNotInChannel(allUsers.users);  
    })
    .then((usersNotInChannel) => {
        const promises = [];
        for (const user of usersNotInChannel) {
            promises.push(getNameFromId(user))
        }
        return Promise.all(promises);
    })
    .then((data) => {
        
        // Used help from https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/sort
        const alphabeticallySortedData = data.sort((a, b) => {
            const nameA = a.name.toUpperCase(); // ignore upper and lowercase
            const nameB = b.name.toUpperCase(); // ignore upper and lowercase
            if (nameA < nameB) {
                return -1;
            } else if (nameA > nameB) {
                return 1;
            } else { // names must be equal
                return 0;
            }
        });

        for (const nameandId of alphabeticallySortedData) {
            createInviteCheckbox(nameandId.name, nameandId.id);
        }
    })
    .catch((error) => {
        showErrorModal(error);
    })
}

// Get get all the users who are not in the current channel
const getUsersNotInChannel = (allUsers) => {
    return new Promise((resolve, reject) => {
        let usersNotInChannel = [];
        
        apiCall(`channel/${currentChannelId}`, 'GET', true, {})
        .then((data) => {
            for (const user of allUsers) {
                if (!data.members.includes(user.id)) {
                    usersNotInChannel.push(user.id)
                }
            }
            resolve(usersNotInChannel);
        })
        .catch((error) => {
            reject(error);
        })
        
    })
}

document.getElementById('login-link').addEventListener('click', () => showScreenFull('login'));
document.getElementById('register-link').addEventListener('click', () => showScreenFull('register'));

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
        showErrorModal(error);
    })
})

document.getElementById('register-submit').addEventListener('click', () => {
    const name = document.getElementById('register-name').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const confirmPassword = document.getElementById('register-password-confirm').value;

    if (password !== confirmPassword) {
        showErrorModal("Passwords do not match");
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
            showErrorModal(error);
        })
    }
})

document.getElementById('error-modal-close').addEventListener('click', () => {
    document.getElementById('error-modal').classList.remove('is-active')
})

document.getElementById('logout-button').addEventListener('click', () => {
    apiCall('auth/logout', 'POST', true, {})
    .then(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('userId'); 
        showScreenFull('login');
    })
    .catch((error) => {
        showErrorModal(error);
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
        showErrorModal("Please enter a name for your channel");
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
            showErrorModal(error);
        })
    }
})

const handleMessageSend = () => {
    const regex = /^\s*$/; 
    const message = document.getElementById('message-box').value.trim();

    if (regex.test(message)) {
        showErrorModal("You cannot send an empty string or a message containing only whitespace");
    } else {
        apiCall(`message/${currentChannelId}`, 'POST', true, {
            "message": message,
        })
        .then(() => {
            loadChannelMessages(1);
            loadPageButtons(1);
        })
        .catch((error) => {
            showErrorModal(error);
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
    apiCall(`channel/${currentChannelId}/join`, 'POST', true, {})
    .then(() => {
        loadChannel(currentChannelName, currentChannelId);

    })
    .catch((error) => {
        showErrorModal(error);
    })
})

document.getElementById('leave-channel-button').addEventListener('click', () => {
    apiCall(`channel/${currentChannelId}/leave`, 'POST', true, {})
    .then(() => {
        loadDashboard('channel');
        showScreenChannel('pre-join-channel');
    })
    .catch((error) => {
        showErrorModal(error);
    })
})

const showButton = document.getElementById('show-channel-details');
showButton.addEventListener('click', () => {
    document.getElementById('channel-details').classList.add('is-active');
})

document.getElementById('hide-channel-details').addEventListener('click', () => {
    document.getElementById('channel-details').classList.remove('is-active');
})

document.getElementById('default-or-pinned').addEventListener('change', () => {
    loadChannelMessages(1) // Load the first page of messages
    loadPageButtons(1);
})

document.getElementById('show-invite-users').addEventListener('click', () => {
    document.getElementById('invite-users').classList.add('is-active');
    getUsersToInvite(); 
});

document.getElementById('hide-invite-users').addEventListener('click', () => {
    document.getElementById('invite-users').classList.remove('is-active');
})

document.getElementById('invite-submit').addEventListener('click', () => {
    for (const element of document.getElementById('invite-user-checkbox-container').children) {
        if (element.querySelector('.checkbox').checked) {
            apiCall(`channel/${currentChannelId}/invite`, 'POST', true, {
                "userId": parseInt(element.getAttribute("userId")),
            })
            .then(() => {
                document.getElementById('invite-users').classList.remove('is-active');
                loadChannel(currentChannelName, currentChannelId);
            })
            .catch((error) => {
                showErrorModal(error);
            })
        }
    }
})

const editButton = document.getElementById('edit-channel-details');
const cancelButton = document.getElementById('cancel-edit-details');
const confirmButton = document.getElementById('confirm-edit-details');
const channelNameEdit = document.getElementById('channel-name-edit');
const channelDescriptionEdit = document.getElementById('channel-description-edit'); 
editButton.addEventListener('click', () => {
    editButton.classList.add('is-hidden');
    cancelButton.classList.remove('is-hidden');
    confirmButton.classList.remove('is-hidden');
    document.getElementById('details-non-edit').classList.add('is-hidden');
    document.getElementById('details-edit').classList.remove('is-hidden');
    document.getElementById('channel-name-edit').value = document.getElementById('channel-name-show').innerText;
    document.getElementById('channel-description-edit').value = document.getElementById('channel-description-show').innerText;
})

cancelButton.addEventListener('click', () => {
    editButton.classList.remove('is-hidden');
    cancelButton.classList.add('is-hidden');
    confirmButton.classList.add('is-hidden'); 
    document.getElementById('details-non-edit').classList.remove('is-hidden');
    document.getElementById('details-edit').classList.add('is-hidden');
})

confirmButton.addEventListener('click', () => {
    const newChannelName = channelNameEdit.value;
    const newChannelDescription = channelDescriptionEdit.value;
    apiCall(`channel/${currentChannelId}`, 'PUT', true, {
        "name": newChannelName,
        "description": newChannelDescription,
    })
    .then(() => {
        document.getElementById('channel-details').classList.remove('is-active');
        loadDashboard('channel');
        loadChannel(newChannelName, currentChannelId);
    })
    .catch((error) => {
        showErrorModal(error);
    })
})

if (localStorage.getItem('token') === null) {
    showScreenFull('login');
} else {
    showScreenFull('dashboard');
    loadDashboard('welcome');
}