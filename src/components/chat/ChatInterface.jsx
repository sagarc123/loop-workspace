import React, { useState, useEffect, useRef } from 'react';
import { 
  PaperAirplaneIcon, 
  FaceSmileIcon
} from '@heroicons/react/24/outline';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import useAuthStore from '../../store/authStore';
import toast from 'react-hot-toast';
import EmojiPicker from 'emoji-picker-react';

const ChatInterface = ({ teamId, userId }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [chatInfo, setChatInfo] = useState(null);
  const messagesEndRef = useRef(null);
  const { userProfile } = useAuthStore();

  // Determine if this is a team chat or direct message
  const isTeamChat = !!teamId;
  const isDirectChat = !!userId;

  useEffect(() => {
    if (teamId || userId) {
      fetchMessages();
      fetchChatInfo();
    }
  }, [teamId, userId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchChatInfo = async () => {
    try {
      if (isDirectChat && userId) {
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (userDoc.exists()) {
          setChatInfo(userDoc.data());
        }
      } else if (isTeamChat && teamId) {
        const teamDoc = await getDoc(doc(db, 'teams', teamId));
        if (teamDoc.exists()) {
          setChatInfo(teamDoc.data());
        }
      }
    } catch (error) {
      console.error('Error fetching chat info:', error);
    }
  };

  const getConversationId = () => {
    if (isTeamChat) return teamId;
    if (isDirectChat && userProfile?.uid && userId) {
      return [userProfile.uid, userId].sort().join('_');
    }
    return null;
  };

  const fetchMessages = () => {
    const conversationId = getConversationId();
    if (!conversationId) return;

    let messagesRef;
    if (isTeamChat) {
      messagesRef = collection(db, 'teams', teamId, 'messages');
    } else {
      messagesRef = collection(db, 'directMessages', conversationId, 'messages');
    }

    const q = query(messagesRef, orderBy('timestamp', 'asc'));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const messagesData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setMessages(messagesData);
    });

    return unsubscribe;
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    
    if (!newMessage.trim()) return;

    setLoading(true);
    try {
      const conversationId = getConversationId();
      if (!conversationId) {
        toast.error('Unable to send message');
        return;
      }

      let messagesRef;
      if (isTeamChat) {
        messagesRef = collection(db, 'teams', teamId, 'messages');
      } else {
        messagesRef = collection(db, 'directMessages', conversationId, 'messages');
      }

      await addDoc(messagesRef, {
        text: newMessage.trim(),
        sender: userProfile.uid,
        senderName: userProfile.name,
        senderPhoto: userProfile.photoURL || '',
        timestamp: serverTimestamp(),
        chatType: isTeamChat ? 'team' : 'direct'
      });

      setNewMessage('');
      setShowEmojiPicker(false);
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  const onEmojiClick = (emojiObject) => {
    setNewMessage(prev => prev + emojiObject.emoji);
    setShowEmojiPicker(false);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (!teamId && !userId) {
    return (
      <div className="flex flex-col h-full bg-white dark:bg-dark-800">
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              Select a chat
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Choose a team or user to start chatting
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-dark-800">
      {/* Chat Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-dark-700">
        <div className="flex items-center space-x-3">
          {isDirectChat && chatInfo?.photoURL && (
            <img
              src={chatInfo.photoURL}
              alt={chatInfo.name}
              className="w-8 h-8 rounded-full"
            />
          )}
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
              {isTeamChat ? 'Team Chat' : 'Direct Chat'}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {chatInfo?.name || (isTeamChat ? 'Loading team...' : 'Loading user...')} • {messages.length} messages
            </p>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                No messages yet
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Start the conversation by sending a message
              </p>
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.sender === userProfile?.uid ? 'justify-end' : 'justify-start'}`}
            >
              <div className="max-w-xs lg:max-w-md">
                {message.sender !== userProfile?.uid && (
                  <div className="flex items-center mb-1">
                    {message.senderPhoto ? (
                      <img
                        src={message.senderPhoto}
                        alt={message.senderName}
                        className="w-6 h-6 rounded-full mr-2"
                      />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-gray-300 dark:bg-gray-600 mr-2 flex items-center justify-center">
                        <span className="text-xs text-gray-600 dark:text-gray-400">
                          {message.senderName?.charAt(0)}
                        </span>
                      </div>
                    )}
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {message.senderName}
                    </span>
                  </div>
                )}
                
                <div className={`rounded-lg px-3 py-2 ${
                  message.sender === userProfile?.uid
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 dark:bg-dark-700 text-gray-900 dark:text-gray-100'
                }`}>
                  {message.text && (
                    <p className="text-sm">{message.text}</p>
                  )}
                  
                  <div className="text-xs opacity-75 mt-1">
                    {formatTime(message.timestamp)}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="p-4 border-t border-gray-200 dark:border-dark-700">
        <form onSubmit={sendMessage} className="flex items-center space-x-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-dark-700 dark:text-gray-100"
              disabled={loading}
            />
            
            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-primary-600 dark:hover:text-primary-400"
            >
              <FaceSmileIcon className="h-5 w-5" />
            </button>
            
            {showEmojiPicker && (
              <div className="absolute bottom-full right-0 mb-2">
                <EmojiPicker onEmojiClick={onEmojiClick} />
              </div>
            )}
          </div>
          
          <button
            type="submit"
            disabled={loading || !newMessage.trim()}
            className="p-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <PaperAirplaneIcon className="h-5 w-5" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatInterface; 