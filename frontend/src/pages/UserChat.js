import React, { useState, useEffect, useRef } from 'react';
import {
  Box, Container, Paper, Typography, TextField, IconButton, Avatar,
  CircularProgress, Divider, Badge, AppBar, Toolbar
} from '@mui/material';
import {
  Send as SendIcon, SupportAgent, ArrowBack, Delete as DeleteIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';
import toast from 'react-hot-toast';

const UserChat = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const initialLoadDone = useRef(false);

  // Fetch messages
  const fetchMessages = async () => {
    try {
      const response = await api.get('/chat/user/messages');
      // API returns { messages: [...], pagination: {...} }
      const messagesData = response.data?.messages || response.messages || [];
      setMessages(messagesData);
    } catch (error) {
      console.error('Error fetching messages:', error);
      // Don't show toast on polling errors to avoid spam
      if (loading) {
        toast.error('Failed to load messages');
      }
    } finally {
      setLoading(false);
    }
  };

  // Fetch unread count
  const fetchUnreadCount = async () => {
    try {
      const response = await api.get('/chat/user/unread-count');
      const count = response.data?.unreadCount || response.unreadCount || 0;
      setUnreadCount(count);
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  // Scroll to bottom of messages (only when user sends a message)
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    fetchMessages();
    fetchUnreadCount();
  }, []);

  // No automatic scrolling - user controls scroll position

  // Poll for new messages every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchMessages();
      fetchUnreadCount();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Send message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!newMessage.trim()) return;

    const messageText = newMessage.trim();
    setSending(true);
    
    // Clear input immediately for better UX
    setNewMessage('');
    
    try {
      const response = await api.post('/chat/user/send', {
        message: messageText
      });
      
      // The API returns { message: '...', data: chatMessage }
      const newMsg = response.data?.data || response.data;
      
      // Add the new message to the list
      if (newMsg && newMsg.id) {
        setMessages(prev => {
          // Check if message already exists (from polling)
          const exists = prev.some(m => m.id === newMsg.id);
          if (!exists) {
            // Mark that we should scroll after this update
            shouldScrollRef.current = true;
            return [...prev, newMsg];
          }
          return prev;
        });
      } else {
        // If no valid message returned, refresh from server
        fetchMessages();
      }
      
      inputRef.current?.focus();
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
      // Restore the message text on error
      setNewMessage(messageText);
    } finally {
      setSending(false);
    }
  };

  // Delete message
  const handleDeleteMessage = async (messageId) => {
    try {
      await api.delete(`/chat/message/${messageId}`);
      // Remove message from local state
      setMessages(prev => prev.filter(m => m.id !== messageId));
      toast.success('Message deleted');
    } catch (error) {
      console.error('Error deleting message:', error);
      toast.error('Failed to delete message');
    }
  };

  // Format time
  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    }
  };

  // Group messages by date
  const groupMessagesByDate = (messages) => {
    const groups = [];
    let currentDate = null;

    messages.forEach((message) => {
      const messageDate = new Date(message.createdAt).toDateString();
      if (messageDate !== currentDate) {
        currentDate = messageDate;
        groups.push({ type: 'date', date: message.createdAt });
      }
      groups.push({ type: 'message', ...message });
    });

    return groups;
  };

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  const groupedMessages = groupMessagesByDate(messages);

  return (
    <Container maxWidth="md" sx={{ mt: 2, mb: 4 }}>
      {/* Header */}
      <Paper elevation={3} sx={{ mb: 2 }}>
        <AppBar position="static" color="default" elevation={0}>
          <Toolbar>
            <IconButton edge="start" onClick={() => navigate('/dashboard')} sx={{ mr: 2 }}>
              <ArrowBack />
            </IconButton>
            <Avatar sx={{ bgcolor: '#8B5CF6', mr: 2 }}>
              <SupportAgent />
            </Avatar>
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="h6" fontWeight="bold">
                Support Chat
              </Typography>
              <Typography variant="caption" color="textSecondary">
                Chat with our admin team
              </Typography>
            </Box>
            {unreadCount > 0 && (
              <Badge badgeContent={unreadCount} color="error">
                <Typography variant="body2">New messages</Typography>
              </Badge>
            )}
          </Toolbar>
        </AppBar>
      </Paper>

      {/* Chat Container */}
      <Paper elevation={3} sx={{ height: '70vh', display: 'flex', flexDirection: 'column' }}>
        {/* Messages Area */}
        <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2, bgcolor: '#f5f5f5' }}>
          {messages.length === 0 ? (
            <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" height="100%">
              <Avatar sx={{ width: 80, height: 80, bgcolor: '#8B5CF6', mb: 2 }}>
                <SupportAgent sx={{ fontSize: 40 }} />
              </Avatar>
              <Typography variant="h6" gutterBottom>
                Welcome to Support Chat!
              </Typography>
              <Typography variant="body2" color="textSecondary" align="center">
                Have questions or need assistance? Start a conversation with our admin team.
              </Typography>
            </Box>
          ) : (
            groupedMessages.map((item, index) => {
              if (item.type === 'date') {
                return (
                  <Box key={`date-${index}-${item.date}`} sx={{ textAlign: 'center', my: 2 }}>
                    <Typography
                      variant="caption"
                      sx={{
                        bgcolor: '#e0e0e0',
                        px: 2,
                        py: 0.5,
                        borderRadius: 10
                      }}
                    >
                      {formatDate(item.date)}
                    </Typography>
                  </Box>
                );
              }

              const isUser = item.senderType === 'USER';
              return (
                <Box
                  key={item.id || `msg-${index}`}
                  sx={{
                    display: 'flex',
                    justifyContent: isUser ? 'flex-end' : 'flex-start',
                    mb: 2,
                    alignItems: 'flex-start',
                    gap: 0.5
                  }}
                >
                  {!isUser && (
                    <Avatar sx={{ bgcolor: '#8B5CF6', mr: 1, width: 32, height: 32 }}>
                      <SupportAgent sx={{ fontSize: 18 }} />
                    </Avatar>
                  )}
                  <Box
                    sx={{
                      maxWidth: '70%',
                      bgcolor: isUser ? '#8B5CF6' : 'white',
                      color: isUser ? 'white' : 'text.primary',
                      borderRadius: 2,
                      p: 1.5,
                      boxShadow: 1,
                      position: 'relative'
                    }}
                  >
                    <Typography variant="body2">{item.message}</Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        display: 'block',
                        textAlign: 'right',
                        mt: 0.5,
                        opacity: 0.7
                      }}
                    >
                      {formatTime(item.createdAt)}
                    </Typography>
                  </Box>
                  {/* Delete button - only show for user's own messages */}
                  {isUser && (
                    <IconButton
                      size="small"
                      onClick={() => handleDeleteMessage(item.id)}
                      sx={{
                        opacity: 0.5,
                        '&:hover': { opacity: 1, color: 'error.main' },
                        mt: 0.5
                      }}
                      title="Delete message"
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  )}
                </Box>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </Box>

        <Divider />

        {/* Input Area */}
        <Box
          component="form"
          onSubmit={handleSendMessage}
          sx={{
            p: 2,
            bgcolor: 'white',
            display: 'flex',
            gap: 1
          }}
        >
          <TextField
            inputRef={inputRef}
            fullWidth
            placeholder="Type your message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            disabled={sending}
            multiline
            maxRows={3}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 3
              }
            }}
          />
          <IconButton
            type="submit"
            color="primary"
            disabled={!newMessage.trim() || sending}
            sx={{
              bgcolor: '#8B5CF6',
              color: 'white',
              '&:hover': { bgcolor: '#7C3AED' },
              '&.Mui-disabled': { bgcolor: '#e0e0e0', color: '#9e9e9e' }
            }}
          >
            {sending ? <CircularProgress size={24} color="inherit" /> : <SendIcon />}
          </IconButton>
        </Box>
      </Paper>
    </Container>
  );
};

export default UserChat;
