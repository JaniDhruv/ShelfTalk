import Group from '../models/Group.js';
import User from '../models/User.js';

// Create a new group
export const createGroup = async (req, res) => {
  try {
    const { name, description, createdBy, visibility } = req.body;

    if (!name || !createdBy) {
      return res.status(400).json({ message: 'Name and creator are required' });
    }

    const newGroup = new Group({
      name,
      description,
      createdBy,
      members: [createdBy], // creator is first member
      visibility: visibility === 'private' ? 'private' : 'public',
      joinRequests: [],
      invites: []
    });

    await newGroup.save();
    res.status(201).json(newGroup);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all groups
export const getGroups = async (req, res) => {
  try {
    const groups = await Group.find()
      .populate({
        path: 'members',
        select: 'username email profile',
        populate: { path: 'profile', select: 'fullName isOnline lastSeen' }
      })
      .populate({
        path: 'createdBy',
        select: 'username email profile',
        populate: { path: 'profile', select: 'fullName isOnline lastSeen' }
      })
      .populate({
        path: 'moderators',
        select: 'username email profile',
        populate: { path: 'profile', select: 'fullName isOnline lastSeen' }
      })
      .populate({
        path: 'joinRequests',
        select: 'username email profile',
        populate: { path: 'profile', select: 'fullName isOnline lastSeen' }
      })
      .populate({
        path: 'invites.to',
        select: 'username email profile',
        populate: { path: 'profile', select: 'fullName isOnline lastSeen' }
      })
      .populate({
        path: 'invites.from',
        select: 'username email profile',
        populate: { path: 'profile', select: 'fullName isOnline lastSeen' }
      });
    res.status(200).json(groups);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get single group
export const getGroupById = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id)
      .populate({
        path: 'members',
        select: 'username email profile',
        populate: { path: 'profile', select: 'fullName isOnline lastSeen' }
      })
      .populate({
        path: 'createdBy',
        select: 'username email profile',
        populate: { path: 'profile', select: 'fullName isOnline lastSeen' }
      })
      .populate({
        path: 'moderators',
        select: 'username email profile',
        populate: { path: 'profile', select: 'fullName isOnline lastSeen' }
      })
      .populate({
        path: 'joinRequests',
        select: 'username email profile',
        populate: { path: 'profile', select: 'fullName isOnline lastSeen' }
      })
      .populate({
        path: 'invites.to',
        select: 'username email profile',
        populate: { path: 'profile', select: 'fullName isOnline lastSeen' }
      })
      .populate({
        path: 'invites.from',
        select: 'username email profile',
        populate: { path: 'profile', select: 'fullName isOnline lastSeen' }
      });
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }
    res.status(200).json(group);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update group
export const updateGroup = async (req, res) => {
  try {
    const { name, description } = req.body;
    const updatedGroup = await Group.findByIdAndUpdate(
      req.params.id,
      { name, description },
      { new: true }
    );
    if (!updatedGroup) {
      return res.status(404).json({ message: 'Group not found' });
    }
    res.status(200).json(updatedGroup);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete group
export const deleteGroup = async (req, res) => {
  try {
    const deletedGroup = await Group.findByIdAndDelete(req.params.id);
    if (!deletedGroup) {
      return res.status(404).json({ message: 'Group not found' });
    }
    res.status(200).json({ message: 'Group deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Add member to group
export const addMember = async (req, res) => {
  try {
  const { userId, newOwnerId } = req.body;
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ message: 'Group not found' });
    // Public groups: immediate join
    if (group.visibility === 'public') {
      if (!group.members.includes(userId)) {
        group.members.push(userId);
        // Clean any stale join request
        group.joinRequests = (group.joinRequests || []).filter(id => id.toString() !== userId);
        await group.save();
      }
      return res.status(200).json({ message: 'Joined', group });
    }
    // Private groups: create join request
    group.joinRequests = group.joinRequests || [];
    if (!group.joinRequests.find(id => id.toString() === userId)) {
      group.joinRequests.push(userId);
      await group.save();
    }
    return res.status(202).json({ message: 'Request sent to group owner', group });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Remove member from group
export const removeMember = async (req, res) => {
  try {
    // userId = the member initiating leave / being removed
    // newOwnerId (optional) = moderator explicitly chosen to become new owner when owner leaves
    const { userId, newOwnerId } = req.body;
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ message: 'Group not found' });
    const isOwnerLeaving = group.createdBy.toString() === userId;
    if (isOwnerLeaving) {
      const memberIds = group.members.map(mem => mem.toString());
      const validModerators = (group.moderators || []).filter(m => m.toString() !== userId && memberIds.includes(m.toString()));
      if (validModerators.length === 0) {
        return res.status(400).json({ message: 'Owner cannot leave: add a moderator first to transfer ownership.' });
      }

      let chosenOwner;
      if (newOwnerId) {
        const match = validModerators.find(m => m.toString() === newOwnerId);
        if (!match) {
          return res.status(400).json({ message: 'Selected new owner is not a valid moderator.' });
        }
        chosenOwner = match;
      } else {
        chosenOwner = validModerators[0];
      }
      group.createdBy = chosenOwner;
      group.moderators = group.moderators.filter(m => m.toString() !== chosenOwner.toString());
    }
    group.members = group.members.filter(member => member.toString() !== userId);
    group.moderators = (group.moderators || []).filter(m => m.toString() !== userId);
    await group.save();
    // Re-populate to return updated relational fields (so frontend instantly reflects moderator removal & new owner)
    const populatedGroup = await Group.findById(req.params.id)
      .populate({
        path: 'members',
        select: 'username email profile',
        populate: { path: 'profile', select: 'fullName isOnline lastSeen' }
      })
      .populate({
        path: 'createdBy',
        select: 'username email profile',
        populate: { path: 'profile', select: 'fullName isOnline lastSeen' }
      })
      .populate({
        path: 'moderators',
        select: 'username email profile',
        populate: { path: 'profile', select: 'fullName isOnline lastSeen' }
      })
      .populate({
        path: 'joinRequests',
        select: 'username email profile',
        populate: { path: 'profile', select: 'fullName isOnline lastSeen' }
      })
      .populate({
        path: 'invites.to',
        select: 'username email profile',
        populate: { path: 'profile', select: 'fullName isOnline lastSeen' }
      })
      .populate({
        path: 'invites.from',
        select: 'username email profile',
        populate: { path: 'profile', select: 'fullName isOnline lastSeen' }
      });
    res.status(200).json({
      message: isOwnerLeaving ? 'Owner left; ownership transferred.' : 'Member removed',
      newOwner: isOwnerLeaving ? populatedGroup.createdBy : undefined,
      group: populatedGroup
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Approve a join request (creator only)
export const approveJoin = async (req, res) => {
  try {
    const { requesterId } = req.body;
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ message: 'Group not found' });
    if (group.createdBy.toString() !== req.body.actorId) {
      return res.status(403).json({ message: 'Only group creator can approve' });
    }
    group.joinRequests = (group.joinRequests || []).filter(id => id.toString() !== requesterId);
    if (!group.members.includes(requesterId)) group.members.push(requesterId);
    await group.save();
    res.status(200).json({ message: 'Request approved', group });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Decline a join request (creator only)
export const declineJoin = async (req, res) => {
  try {
    const { requesterId } = req.body;
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ message: 'Group not found' });
    if (group.createdBy.toString() !== req.body.actorId) {
      return res.status(403).json({ message: 'Only group creator can decline' });
    }
    group.joinRequests = (group.joinRequests || []).filter(id => id.toString() !== requesterId);
    await group.save();
    res.status(200).json({ message: 'Request declined', group });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Invite a user (creator only)
export const inviteUser = async (req, res) => {
  try {
    const { toUserId, actorId } = req.body;
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ message: 'Group not found' });

    // Allow both owner and moderators to invite
    const isOwner = group.createdBy.toString() === actorId;
    const isModerator = group.moderators.map(m => m.toString()).includes(actorId);
    if (!isOwner && !isModerator) {
      return res.status(403).json({ message: 'Only group creator or moderators can invite' });
    }

    group.invites = group.invites || [];
    const exists = group.invites.find(i => i.to.toString() === toUserId);
    if (!exists) group.invites.push({ to: toUserId, from: actorId });
    await group.save();
    res.status(200).json({ message: 'Invite sent', group });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
// Respond to invite (recipient)
export const respondInvite = async (req, res) => {
  try {
    const { actorId, accept } = req.body;
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ message: 'Group not found' });
    group.invites = (group.invites || []).filter(i => i.to.toString() !== actorId);
    if (accept) {
      if (!group.members.includes(actorId)) group.members.push(actorId);
    }
    await group.save();
    res.status(200).json({ message: accept ? 'Invite accepted' : 'Invite declined', group });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Add moderator (creator only)
export const addModerator = async (req, res) => {
  try {
    const { userId, actorId } = req.body;
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ message: 'Group not found' });
    if (group.createdBy.toString() !== actorId) {
      return res.status(403).json({ message: 'Only group creator can add moderators' });
    }
    if (!group.members.includes(userId)) {
      return res.status(400).json({ message: 'User must be a member first' });
    }
    if (!group.moderators.includes(userId)) {
      group.moderators.push(userId);
      await group.save();
    }
    res.status(200).json({ message: 'Moderator added', group });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Remove moderator (creator only)
export const removeModerator = async (req, res) => {
  try {
    const { userId, actorId } = req.body;
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ message: 'Group not found' });
    if (group.createdBy.toString() !== actorId) {
      return res.status(403).json({ message: 'Only group creator can remove moderators' });
    }
    group.moderators = group.moderators.filter(id => id.toString() !== userId);
    await group.save();
    res.status(200).json({ message: 'Moderator removed', group });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
