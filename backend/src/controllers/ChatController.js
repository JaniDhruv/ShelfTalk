import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import Group from '../models/Group.js';
import path from 'path';

export const listConversations = async (req, res) => {
  try {
    const userId = req.params.userId;
    const conversations = await Conversation.find({ members: userId })
      .populate({
        path: 'members',
        select: 'username email profile',
        populate: { path: 'profile', select: 'fullName isOnline lastSeen' }
      })
      .populate('group', 'name')
      .populate({
        path: 'lastSender',
        select: 'username profile',
        populate: { path: 'profile', select: 'fullName' }
      });
    res.json(conversations);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getConversationMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const messages = await Message.find({ conversation: conversationId })
      .populate('sender', 'username')
      .sort({ createdAt: 1 });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { senderId, content, type } = req.body;
    const convo = await Conversation.findById(conversationId);
    if (!convo) return res.status(404).json({ message: 'Conversation not found' });
    if (convo.blockedBy && convo.blockedBy.length > 0) {
      return res.status(403).json({ message: 'Conversation is blocked' });
    }
    const msgType = type || 'text';
    const msg = await Message.create({
      conversation: conversationId,
      sender: senderId,
      content,
      type: msgType,
    });
    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessage: content,
      lastMessageAt: new Date(),
      lastMessageType: msgType,
      lastSender: senderId,
    });
    const populated = await msg.populate('sender', 'username');
    res.status(201).json(populated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

export const sendAttachment = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { senderId } = req.body;
    const file = req.file;
    if (!file) return res.status(400).json({ message: 'No file uploaded' });

    const convo = await Conversation.findById(conversationId);
    if (!convo) return res.status(404).json({ message: 'Conversation not found' });
    if (convo.blockedBy && convo.blockedBy.length > 0) {
      return res.status(403).json({ message: 'Conversation is blocked' });
    }

    const ext = path.extname(file.originalname).toLowerCase();
    const isImage = ['.png', '.jpg', '.jpeg', '.gif', '.webp'].includes(ext);
    const url = `/uploads/${file.filename}`;
    const msgType = isImage ? 'image' : 'file';
    const msg = await Message.create({
      conversation: conversationId,
      sender: senderId,
      content: url,
      type: msgType,
      fileName: file.originalname,
    });
    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessage: isImage ? 'Photo' : file.originalname,
      lastMessageAt: new Date(),
      lastMessageType: msgType,
      lastSender: senderId,
    });
    const populated = await msg.populate('sender', 'username');
    res.status(201).json(populated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

export const createDmConversation = async (req, res) => {
  try {
    const { participants } = req.body;
    if (!participants || participants.length !== 2) {
      return res.status(400).json({ message: 'Exactly 2 participants required for DM' });
    }
    
    const [userA, userB] = participants;
    
    // Check if conversation already exists
    let convo = await Conversation.findOne({ 
      type: 'dm', 
      members: { $all: [userA, userB], $size: 2 } 
    }).populate({
      path: 'members',
      select: 'username email profile',
      populate: { path: 'profile', select: 'fullName isOnline lastSeen' }
    });
    
    if (!convo) {
      convo = await Conversation.create({ 
        type: 'dm', 
        members: [userA, userB] 
      });
      convo = await convo.populate({
        path: 'members',
        select: 'username email profile',
        populate: { path: 'profile', select: 'fullName' }
      });
    }
    
    res.status(201).json(convo);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

export const blockConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { userId } = req.body;
    const convo = await Conversation.findById(conversationId);
    if (!convo) return res.status(404).json({ message: 'Conversation not found' });
    const isMember = convo.members.map(m => m.toString()).includes(userId);
    if (!isMember) return res.status(403).json({ message: 'Not authorized' });
    if (!convo.blockedBy) convo.blockedBy = [];
    if (!convo.blockedBy.map(id => id.toString()).includes(userId)) {
      convo.blockedBy.push(userId);
      await convo.save();
    }
    const populated = await convo.populate({
      path: 'members',
      select: 'username email profile',
      populate: { path: 'profile', select: 'fullName isOnline lastSeen' }
    });
    res.json(populated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

export const unblockConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { userId } = req.body;
    const convo = await Conversation.findById(conversationId);
    if (!convo) return res.status(404).json({ message: 'Conversation not found' });
    const isMember = convo.members.map(m => m.toString()).includes(userId);
    if (!isMember) return res.status(403).json({ message: 'Not authorized' });
    convo.blockedBy = (convo.blockedBy || []).filter(id => id.toString() !== userId);
    await convo.save();
    const populated = await convo.populate({
      path: 'members',
      select: 'username email profile',
      populate: { path: 'profile', select: 'fullName isOnline lastSeen' }
    });
    res.json(populated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// @desc Edit a message
// @route PUT /api/chat/messages/:messageId
export const editMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { content, senderId } = req.body;

    if (!content || !senderId) {
      return res.status(400).json({ 
        success: false,
        message: 'Content and senderId are required' 
      });
    }

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ 
        success: false,
        message: 'Message not found' 
      });
    }

    // Check if the user is the sender of the message
    if (message.sender.toString() !== senderId) {
      return res.status(403).json({ 
        success: false,
        message: 'You can only edit your own messages' 
      });
    }

    // Update the message content
    message.content = content;
    await message.save();

    // Populate sender data before sending response
    await message.populate('sender', 'username');

    res.status(200).json({
      success: true,
      data: message
    });
  } catch (error) {
    console.error('Edit message error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error editing message', 
      error: error.message 
    });
  }
};

// @desc Delete a message
// @route DELETE /api/chat/messages/:messageId
export const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { senderId } = req.body;

    if (!senderId) {
      return res.status(400).json({ 
        success: false,
        message: 'SenderId is required' 
      });
    }

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ 
        success: false,
        message: 'Message not found' 
      });
    }

    // Check if the user is the sender of the message
    if (message.sender.toString() !== senderId) {
      return res.status(403).json({ 
        success: false,
        message: 'You can only delete your own messages' 
      });
    }

    await Message.findByIdAndDelete(messageId);

    res.status(200).json({
      success: true,
      message: 'Message deleted successfully'
    });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error deleting message', 
      error: error.message 
    });
  }
};

// @desc Create or get group conversation
// @route POST /api/chat/groups/:groupId/conversation
export const createGroupConversation = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { userId } = req.body;

    // Check if group exists
    const group = await Group.findById(groupId).populate('members', 'username');
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Check if user is a member of the group
    const isMember = group.members.some(member => 
      (member._id || member).toString() === userId
    );
    if (!isMember) {
      return res.status(403).json({ message: 'You must be a member to access group chat' });
    }

    // Check if group conversation already exists
    let conversation = await Conversation.findOne({ 
      type: 'group', 
      group: groupId 
    }).populate({
      path: 'members',
      select: 'username email profile',
      populate: { path: 'profile', select: 'fullName isOnline lastSeen' }
    });

    if (!conversation) {
      // Create new group conversation with all group members
      conversation = await Conversation.create({ 
        type: 'group', 
        name: `${group.name} Chat`,
        members: group.members.map(member => member._id || member),
        group: groupId
      });
      
      // Populate the conversation
      conversation = await conversation.populate({
        path: 'members',
        select: 'username email profile',
        populate: { path: 'profile', select: 'fullName isOnline lastSeen' }
      });
    }

    res.status(200).json(conversation);
  } catch (error) {
    console.error('Create group conversation error:', error);
    res.status(500).json({ 
      message: 'Error creating group conversation', 
      error: error.message 
    });
  }
};

// @desc Get group conversation messages
// @route GET /api/chat/groups/:groupId/messages
export const getGroupMessages = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { userId } = req.query;

    // Check if group exists and user is a member
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    const isMember = group.members.some(member => 
      member.toString() === userId
    );
    if (!isMember) {
      return res.status(403).json({ message: 'You must be a member to access group chat' });
    }

    // Find group conversation
    const conversation = await Conversation.findOne({ 
      type: 'group', 
      group: groupId 
    });

    if (!conversation) {
      return res.json([]); // No messages yet
    }

    // Get messages for this conversation
    const messages = await Message.find({ conversation: conversation._id })
      .populate('sender', 'username')
      .sort({ createdAt: 1 });

    res.json(messages);
  } catch (error) {
    console.error('Get group messages error:', error);
    res.status(500).json({ 
      message: 'Error fetching group messages', 
      error: error.message 
    });
  }
};

// @desc Send message to group
// @route POST /api/chat/groups/:groupId/messages
export const sendGroupMessage = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { senderId, content, type = 'text' } = req.body;

    if (!content || !senderId) {
      return res.status(400).json({ message: 'Content and senderId are required' });
    }

    // Check if group exists and user is a member
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    const isMember = group.members.some(member => 
      member.toString() === senderId
    );
    if (!isMember) {
      return res.status(403).json({ message: 'You must be a member to send messages' });
    }

    // Find or create group conversation
    let conversation = await Conversation.findOne({ 
      type: 'group', 
      group: groupId 
    });

    if (!conversation) {
      // Create group conversation if it doesn't exist
      conversation = await Conversation.create({ 
        type: 'group', 
        name: `${group.name} Chat`,
        members: group.members,
        group: groupId
      });
    }

    // Create the message
    const message = await Message.create({
      conversation: conversation._id,
      sender: senderId,
      content,
      type
    });

    // Update conversation's last message
    await Conversation.findByIdAndUpdate(conversation._id, {
      lastMessage: content,
      lastMessageAt: new Date(),
      lastSender: senderId
    });

    // Populate sender data before sending response
    await message.populate('sender', 'username');

    res.status(201).json(message);
  } catch (error) {
    console.error('Send group message error:', error);
    res.status(500).json({ 
      message: 'Error sending message', 
      error: error.message 
    });
  }
};