import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Modal } from '../../components/ui/modal';
import { useAuthStore } from '../../store/auth-store';
import { mockMessages, mockStudents, mockStaff } from '../../store/mock-data';
import { Message } from '../../types';
import { 
  MessageCircle, Plus, Send, Search, Paperclip, Smile, MoreVertical, 
  Phone, Video, Star, Sparkles, Heart, ThumbsUp, Image as ImageIcon,
  Mic, Camera, Gift, MapPin, Calendar
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../../lib/utils';

export function MessagesPage() {
  const user = useAuthStore((state) => state.user);
  const [isComposeModalOpen, setIsComposeModalOpen] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [composeData, setComposeData] = useState({
    receiverId: '',
    subject: '',
    content: '',
  });

  // Get all users for recipient selection
  const allUsers = [
    ...mockStudents.map(s => ({ id: s.userId, name: s.name, email: s.email, type: 'student', avatar: s.profileImage })),
    ...mockStaff.map(s => ({ id: s.userId, name: s.name, email: s.email, type: 'staff', avatar: s.profileImage })),
  ].filter(u => u.id !== user?.id);

  // Get user messages
  const userMessages = mockMessages.filter(
    msg => msg.senderId === user?.id || msg.receiverId === user?.id
  );

  // Group messages by conversation
  const conversations = userMessages.reduce((acc, message) => {
    const otherUserId = message.senderId === user?.id ? message.receiverId : message.senderId;
    if (!acc[otherUserId]) {
      acc[otherUserId] = [];
    }
    acc[otherUserId].push(message);
    return acc;
  }, {} as Record<string, Message[]>);

  // Sort conversations by latest message
  const sortedConversations = Object.entries(conversations).sort(([, a], [, b]) => {
    const latestA = Math.max(...a.map(msg => new Date(msg.timestamp).getTime()));
    const latestB = Math.max(...b.map(msg => new Date(msg.timestamp).getTime()));
    return latestB - latestA;
  });

  const getUserInfo = (userId: string) => {
    const student = mockStudents.find(s => s.userId === userId);
    if (student) return { name: student.name, email: student.email, type: 'student', avatar: student.profileImage };
    
    const staff = mockStaff.find(s => s.userId === userId);
    if (staff) return { name: staff.name, email: staff.email, type: 'staff', avatar: staff.profileImage };
    
    return { name: 'Unknown User', email: '', type: 'unknown', avatar: null };
  };

  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedConversation) return;

    const message: Message = {
      id: Date.now().toString(),
      senderId: user?.id || '',
      receiverId: selectedConversation,
      content: newMessage,
      timestamp: new Date().toISOString(),
      read: false,
      messageType: 'direct',
      priority: 'normal'
    };

    mockMessages.push(message);
    setNewMessage('');
    toast.success('Message sent! ✨');
  };

  const handleComposeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const message: Message = {
      id: Date.now().toString(),
      senderId: user?.id || '',
      receiverId: composeData.receiverId,
      content: composeData.content,
      subject: composeData.subject,
      timestamp: new Date().toISOString(),
      read: false,
      messageType: 'direct',
      priority: 'normal'
    };

    mockMessages.push(message);
    setIsComposeModalOpen(false);
    setComposeData({ receiverId: '', subject: '', content: '' });
    toast.success('Message sent successfully! 🚀');
  };

  const markAsRead = (messageId: string) => {
    const message = mockMessages.find(m => m.id === messageId);
    if (message && message.receiverId === user?.id) {
      message.read = true;
    }
  };

  const getLatestMessage = (messages: Message[]) => {
    return messages.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
  };

  const getUnreadCount = (messages: Message[]) => {
    return messages.filter(msg => msg.receiverId === user?.id && !msg.read).length;
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 168) { // 7 days
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const addReaction = (messageId: string, reaction: string) => {
    // Mock reaction functionality
    toast.success(`Added ${reaction} reaction!`);
  };

  return (
    <div className="space-y-6">
      {/* Enhanced header with gradient background */}
      <div className="relative rounded-2xl bg-gradient-to-br from-primary-600 via-primary-700 to-primary-800 p-6 text-white overflow-hidden shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-r from-black/10 to-transparent"></div>
        <div className="absolute inset-0 bg-pattern-dots opacity-30"></div>
        
        <div className="relative flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="rounded-full bg-white/20 p-3 backdrop-blur-sm border border-white/30">
              <MessageCircle className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold mb-1">Messages</h1>
              <p className="text-primary-100 text-lg">Stay connected with your community</p>
            </div>
          </div>
          
          <Button 
            onClick={() => setIsComposeModalOpen(true)} 
            className="bg-white/20 hover:bg-white/30 text-white border-white/30 hover:border-white/50 backdrop-blur-sm shadow-xl hover:shadow-2xl"
          >
            <Plus className="mr-2 h-4 w-4" />
            New Message
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Enhanced conversations list */}
        <div className="lg:col-span-1">
          <Card className="h-[650px] flex flex-col bg-gradient-to-br from-white via-gray-50/50 to-white dark:from-card dark:via-card/80 dark:to-card border-2 border-gray-200 dark:border-gray-700">
            <CardHeader className="pb-4 bg-gradient-to-r from-primary-50 to-secondary-50 dark:from-primary-900/20 dark:to-secondary-900/20 border-b border-primary-200 dark:border-primary-800">
              <CardTitle className="text-xl font-bold flex items-center space-x-2">
                <Sparkles className="h-5 w-5 text-primary-600" />
                <span>Conversations</span>
              </CardTitle>
              <div className="relative">
                <Input
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-white/80 dark:bg-card/80 border-2 border-primary-200 dark:border-primary-800"
                />
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary-500" />
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-0">
              <div className="space-y-2 p-3">
                {sortedConversations.map(([userId, messages]) => {
                  const userInfo = getUserInfo(userId);
                  const latestMessage = getLatestMessage(messages);
                  const unreadCount = getUnreadCount(messages);
                  
                  if (searchQuery && !userInfo.name.toLowerCase().includes(searchQuery.toLowerCase())) {
                    return null;
                  }

                  return (
                    <div
                      key={userId}
                      className={cn(
                        'cursor-pointer rounded-xl p-4 transition-all duration-300 hover:bg-gradient-to-r hover:from-accent hover:to-accent/80 hover:shadow-lg hover:scale-[1.02] group border border-transparent hover:border-primary-200',
                        selectedConversation === userId && 'bg-gradient-to-r from-primary-50 to-primary-100 border-2 border-primary-300 shadow-lg scale-[1.02] dark:from-primary-900/30 dark:to-primary-800/30 dark:border-primary-700'
                      )}
                      onClick={() => {
                        setSelectedConversation(userId);
                        messages.forEach(msg => markAsRead(msg.id));
                      }}
                    >
                      <div className="flex items-center space-x-3">
                        {/* Enhanced avatar */}
                        <div className="relative">
                          {userInfo.avatar ? (
                            <img
                              src={userInfo.avatar}
                              alt={userInfo.name}
                              className="h-14 w-14 rounded-full object-cover border-3 border-white shadow-lg group-hover:shadow-xl transition-all duration-300"
                            />
                          ) : (
                            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-primary-100 via-primary-200 to-primary-300 text-primary-700 font-bold text-lg border-3 border-white shadow-lg group-hover:shadow-xl transition-all duration-300">
                              {userInfo.name.charAt(0)}
                            </div>
                          )}
                          {/* Enhanced online indicator */}
                          <div className="absolute bottom-0 right-0 h-4 w-4 rounded-full bg-gradient-to-r from-success-500 to-success-600 border-2 border-white shadow-lg animate-pulse"></div>
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="font-bold text-sm truncate group-hover:text-primary-700 transition-colors">
                              {userInfo.name}
                            </h4>
                            <div className="flex items-center space-x-2">
                              {unreadCount > 0 && (
                                <span className="rounded-full bg-gradient-to-r from-primary-600 to-primary-700 px-2 py-1 text-xs text-white font-bold shadow-lg animate-pulse">
                                  {unreadCount}
                                </span>
                              )}
                              <span className="text-xs text-muted-foreground font-medium">
                                {formatTime(latestMessage.timestamp)}
                              </span>
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground capitalize mb-1 font-semibold">
                            {userInfo.type} • Online
                          </p>
                          <p className="text-sm text-muted-foreground truncate">
                            {latestMessage.senderId === user?.id ? '✓ You: ' : ''}
                            {latestMessage.content}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
                
                {sortedConversations.length === 0 && (
                  <div className="py-16 text-center text-muted-foreground">
                    <div className="mx-auto mb-6 h-24 w-24 rounded-full bg-gradient-to-br from-primary-100 to-secondary-100 flex items-center justify-center shadow-xl">
                      <MessageCircle className="h-12 w-12 text-primary-600" />
                    </div>
                    <p className="text-lg font-bold mb-2">No conversations yet</p>
                    <p className="text-sm">Start a new conversation to connect with others</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Enhanced chat area */}
        <div className="lg:col-span-3">
          {selectedConversation ? (
            <Card className="h-[650px] flex flex-col bg-gradient-to-br from-white via-gray-50/30 to-white dark:from-card dark:via-card/80 dark:to-card border-2 border-gray-200 dark:border-gray-700 overflow-hidden">
              {/* Enhanced chat header */}
              <CardHeader className="border-b bg-gradient-to-r from-primary-50 via-white to-secondary-50 dark:from-primary-900/20 dark:via-card dark:to-secondary-900/20 border-primary-200 dark:border-primary-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    {(() => {
                      const userInfo = getUserInfo(selectedConversation);
                      return (
                        <>
                          <div className="relative">
                            {userInfo.avatar ? (
                              <img
                                src={userInfo.avatar}
                                alt={userInfo.name}
                                className="h-12 w-12 rounded-full object-cover border-3 border-white shadow-lg"
                              />
                            ) : (
                              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-primary-100 via-primary-200 to-primary-300 text-primary-700 font-bold border-3 border-white shadow-lg">
                                {userInfo.name.charAt(0)}
                              </div>
                            )}
                            <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-gradient-to-r from-success-500 to-success-600 border-2 border-white animate-pulse"></div>
                          </div>
                          <div>
                            <CardTitle className="text-xl font-bold bg-gradient-to-r from-primary-600 to-primary-800 bg-clip-text text-transparent">
                              {userInfo.name}
                            </CardTitle>
                            <p className="text-sm text-muted-foreground capitalize font-semibold flex items-center space-x-1">
                              <span>{userInfo.type}</span>
                              <span>•</span>
                              <span className="text-success-600">Online</span>
                              <span className="h-2 w-2 rounded-full bg-success-500 animate-pulse"></span>
                            </p>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button variant="ghost" size="icon" title="Voice call" className="hover:bg-success-100 hover:text-success-700">
                      <Phone className="h-5 w-5" />
                    </Button>
                    <Button variant="ghost" size="icon" title="Video call" className="hover:bg-primary-100 hover:text-primary-700">
                      <Video className="h-5 w-5" />
                    </Button>
                    <Button variant="ghost" size="icon" title="More options" className="hover:bg-secondary-100 hover:text-secondary-700">
                      <MoreVertical className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
              </CardHeader>

              {/* Enhanced messages area */}
              <CardContent className="flex-1 overflow-y-auto p-0 bg-gradient-to-b from-gray-50/30 to-white dark:from-gray-900/30 dark:to-card">
                <div className="p-6 space-y-6">
                  {conversations[selectedConversation]
                    ?.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
                    .map((message, index, array) => {
                      const isOwnMessage = message.senderId === user?.id;
                      const showAvatar = index === 0 || array[index - 1].senderId !== message.senderId;
                      const userInfo = getUserInfo(message.senderId);
                      
                      return (
                        <div
                          key={message.id}
                          className={cn(
                            'flex items-end space-x-3 group',
                            isOwnMessage ? 'justify-end' : 'justify-start'
                          )}
                        >
                          {!isOwnMessage && showAvatar && (
                            <div className="flex-shrink-0">
                              {userInfo.avatar ? (
                                <img
                                  src={userInfo.avatar}
                                  alt={userInfo.name}
                                  className="h-10 w-10 rounded-full object-cover border-2 border-white shadow-lg"
                                />
                              ) : (
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-secondary-100 via-secondary-200 to-secondary-300 text-secondary-700 text-sm font-bold border-2 border-white shadow-lg">
                                  {userInfo.name.charAt(0)}
                                </div>
                              )}
                            </div>
                          )}
                          
                          <div
                            className={cn(
                              'max-w-[75%] rounded-2xl px-5 py-3 shadow-lg relative transition-all duration-300 hover:shadow-xl group-hover:scale-[1.02]',
                              isOwnMessage
                                ? 'bg-gradient-to-r from-primary-600 via-primary-700 to-primary-800 text-white rounded-br-md border border-primary-500/20'
                                : 'bg-gradient-to-r from-white via-gray-50 to-white text-gray-900 rounded-bl-md border border-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 dark:text-white dark:border-gray-600'
                            )}
                          >
                            {/* Enhanced message content */}
                            {message.subject && (
                              <p className="text-sm font-bold mb-2 opacity-90 flex items-center space-x-1">
                                <Star className="h-3 w-3" />
                                <span>{message.subject}</span>
                              </p>
                            )}
                            <p className="text-sm leading-relaxed font-medium">{message.content}</p>
                            
                            {/* Enhanced timestamp and reactions */}
                            <div className="flex items-center justify-between mt-3">
                              <p className={cn(
                                'text-xs font-medium',
                                isOwnMessage ? 'text-primary-100' : 'text-muted-foreground'
                              )}>
                                {formatTime(message.timestamp)}
                              </p>
                              
                              {/* Message reactions */}
                              <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button 
                                  onClick={() => addReaction(message.id, '👍')}
                                  className="hover:scale-125 transition-transform"
                                  title="Like"
                                >
                                  <ThumbsUp className="h-3 w-3" />
                                </button>
                                <button 
                                  onClick={() => addReaction(message.id, '❤️')}
                                  className="hover:scale-125 transition-transform"
                                  title="Love"
                                >
                                  <Heart className="h-3 w-3" />
                                </button>
                              </div>
                            </div>
                            
                            {/* Enhanced message status indicator */}
                            {isOwnMessage && (
                              <div className="absolute bottom-1 right-1">
                                <div className="h-2 w-2 rounded-full bg-white/60"></div>
                              </div>
                            )}
                          </div>
                          
                          {isOwnMessage && showAvatar && (
                            <div className="flex-shrink-0">
                              {user?.profileImage ? (
                                <img
                                  src={user.profileImage}
                                  alt={user.name}
                                  className="h-10 w-10 rounded-full object-cover border-2 border-white shadow-lg"
                                />
                              ) : (
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary-100 via-primary-200 to-primary-300 text-primary-700 text-sm font-bold border-2 border-white shadow-lg">
                                  {user?.name.charAt(0)}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              </CardContent>

              {/* Enhanced message input area */}
              <div className="border-t bg-gradient-to-r from-gray-50 via-white to-gray-50 dark:from-gray-800 dark:via-gray-900 dark:to-gray-800 p-4 border-primary-200 dark:border-primary-800">
                <div className="flex items-end space-x-3">
                  {/* Enhanced action buttons */}
                  <div className="flex space-x-1">
                    <Button variant="ghost" size="icon" title="Attach file" className="hover:bg-primary-100 hover:text-primary-700">
                      <Paperclip className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" title="Send image" className="hover:bg-secondary-100 hover:text-secondary-700">
                      <ImageIcon className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" title="Voice message" className="hover:bg-success-100 hover:text-success-700">
                      <Mic className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="flex-1 relative">
                    <Input
                      placeholder="Type your message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSendMessage())}
                      className="pr-12 resize-none min-h-[48px] rounded-2xl bg-white/80 dark:bg-card/80 border-2 border-primary-200 dark:border-primary-800 focus:border-primary-400 shadow-lg"
                    />
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="absolute right-2 top-1/2 -translate-y-1/2 hover:bg-warning-100 hover:text-warning-700"
                      title="Add emoji"
                    >
                      <Smile className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <Button 
                    onClick={handleSendMessage} 
                    disabled={!newMessage.trim()}
                    className="rounded-full h-12 w-12 p-0 bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 shadow-xl hover:shadow-2xl hover:scale-110 transition-all duration-300"
                    title="Send message"
                  >
                    <Send className="h-5 w-5" />
                  </Button>
                </div>
                
                <div className="flex items-center justify-between mt-3">
                  <p className="text-xs text-muted-foreground font-medium">
                    Press Enter to send • Shift+Enter for new line
                  </p>
                  <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                    <span>Enhanced messaging</span>
                    <Sparkles className="h-3 w-3 text-primary-500 animate-pulse" />
                  </div>
                </div>
              </div>
            </Card>
          ) : (
            <Card className="h-[650px] flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-secondary-50 dark:from-primary-900/10 dark:via-card dark:to-secondary-900/10 border-2 border-primary-200 dark:border-primary-800">
              <div className="text-center text-muted-foreground">
                <div className="mx-auto mb-8 h-32 w-32 rounded-full bg-gradient-to-br from-primary-100 via-primary-200 to-secondary-200 flex items-center justify-center shadow-2xl">
                  <MessageCircle className="h-16 w-16 text-primary-600" />
                </div>
                <h3 className="text-2xl font-bold mb-3 bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
                  Welcome to Enhanced Messages
                </h3>
                <p className="text-lg mb-2">Select a conversation to start messaging</p>
                <p className="text-sm flex items-center justify-center space-x-1">
                  <span>or create a new conversation</span>
                  <Sparkles className="h-4 w-4 text-primary-500 animate-pulse" />
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Enhanced compose message modal */}
      <Modal
        isOpen={isComposeModalOpen}
        onClose={() => setIsComposeModalOpen(false)}
        title="Compose New Message"
        size="lg"
      >
        <form onSubmit={handleComposeSubmit} className="space-y-6">
          <div className="rounded-2xl bg-gradient-to-r from-primary-50 via-white to-secondary-50 p-6 dark:from-primary-900/20 dark:via-card dark:to-secondary-900/20 border-2 border-primary-200 dark:border-primary-800 shadow-lg">
            <div className="flex items-center space-x-3">
              <div className="rounded-full bg-gradient-to-r from-primary-600 to-secondary-600 p-2">
                <MessageCircle className="h-6 w-6 text-white" />
              </div>
              <div>
                <h4 className="font-bold text-lg text-primary-800 dark:text-primary-200">New Message</h4>
                <p className="text-sm text-primary-700 dark:text-primary-300">Send a message to any user in the system</p>
              </div>
            </div>
          </div>

          <div>
            <label className="mb-3 block text-sm font-bold">To</label>
            <select
              className="w-full rounded-xl border-2 border-input bg-gradient-to-r from-background to-background/80 px-4 py-4 text-sm transition-all duration-300 hover:border-primary-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 shadow-lg hover:shadow-xl"
              value={composeData.receiverId}
              onChange={(e) => setComposeData(prev => ({ ...prev, receiverId: e.target.value }))}
              required
            >
              <option value="">Select recipient</option>
              {allUsers.map(user => (
                <option key={user.id} value={user.id}>
                  {user.name} ({user.type})
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Subject (Optional)"
            value={composeData.subject}
            onChange={(e) => setComposeData(prev => ({ ...prev, subject: e.target.value }))}
            placeholder="Message subject"
            className="shadow-lg"
          />

          <div>
            <label className="mb-3 block text-sm font-bold">Message</label>
            <textarea
              className="w-full rounded-xl border-2 border-input bg-gradient-to-r from-background to-background/80 px-4 py-4 text-sm transition-all duration-300 hover:border-primary-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 resize-none shadow-lg hover:shadow-xl"
              rows={5}
              value={composeData.content}
              onChange={(e) => setComposeData(prev => ({ ...prev, content: e.target.value }))}
              placeholder="Type your message here..."
              required
            />
          </div>

          {/* Enhanced action buttons */}
          <div className="flex justify-end space-x-3 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setIsComposeModalOpen(false)}
              className="hover:scale-[1.02] transition-transform"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="bg-gradient-to-r from-primary-600 via-primary-700 to-primary-800 hover:from-primary-700 hover:via-primary-800 hover:to-primary-900 shadow-xl hover:shadow-2xl hover:scale-[1.02] transition-all duration-300"
            >
              <Send className="mr-2 h-4 w-4" />
              Send Message
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}