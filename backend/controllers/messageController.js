const { prisma } = require('../utils/database');

const sendMessage = async (req, res) => {
  try {
    const { receiverId, content } = req.body;
    const senderId = req.user.id;

    if (senderId === receiverId) {
      return res.status(400).json({ error: 'Cannot send message to yourself' });
    }

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Message content is required' });
    }

    // Check if receiver exists
    const receiver = await prisma.user.findUnique({
      where: { id: receiverId },
      select: { id: true, isActive: true }
    });

    if (!receiver || !receiver.isActive) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if there's an accepted interest between these users
    const acceptedInterest = await prisma.interest.findFirst({
      where: {
        OR: [
          { senderId, receiverId },
          { senderId: receiverId, receiverId: senderId }
        ],
        status: 'ACCEPTED'
      }
    });

    if (!acceptedInterest) {
      return res.status(403).json({ 
        error: 'Can only send messages to users with accepted interests' 
      });
    }

    // Create message
    const message = await prisma.message.create({
      data: {
        senderId,
        receiverId,
        content: content.trim()
      },
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePhoto: true
          }
        },
        receiver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePhoto: true
          }
        }
      }
    });

    // Mark all previous messages from receiver as read
    await prisma.message.updateMany({
      where: {
        senderId: receiverId,
        receiverId: senderId,
        isRead: false
      },
      data: {
        isRead: true
      }
    });

    res.status(201).json({
      message: 'Message sent successfully',
      data: message
    });

  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getConversations = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get all users with whom there are messages
    const conversations = await prisma.$queryRaw`
      WITH last_messages AS (
        SELECT DISTINCT ON (
          CASE 
            WHEN "senderId" = ${userId} THEN "receiverId"
            ELSE "senderId"
          END
        )
        CASE 
          WHEN "senderId" = ${userId} THEN "receiverId"
          ELSE "senderId"
        END as other_user_id,
        content,
        "isRead",
        "createdAt",
        CASE 
          WHEN "senderId" = ${userId} THEN 'sent'
          ELSE 'received'
        END as message_type
        FROM messages
        WHERE "senderId" = ${userId} OR "receiverId" = ${userId}
        ORDER BY 
          CASE 
            WHEN "senderId" = ${userId} THEN "receiverId"
            ELSE "senderId"
          END,
          "createdAt" DESC
      )
      SELECT 
        lm.other_user_id as "userId",
        u."firstName",
        u."lastName",
        u."profilePhoto",
        u."isVerified",
        u."isPremium",
        lm.content as "lastMessage",
        lm."isRead",
        lm."createdAt" as "lastMessageTime",
        lm.message_type,
        (
          SELECT COUNT(*)::int 
          FROM messages 
          WHERE "senderId" = lm.other_user_id 
          AND "receiverId" = ${userId} 
          AND "isRead" = false
        ) as "unreadCount"
      FROM last_messages lm
      JOIN users u ON u.id = lm.other_user_id
      WHERE u."isActive" = true
      ORDER BY lm."createdAt" DESC
    `;

    res.json({ conversations });

  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getMessages = async (req, res) => {
  try {
    const { userId: otherUserId } = req.params;
    const currentUserId = req.user.id;
    const { page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Verify there's an accepted interest
    const acceptedInterest = await prisma.interest.findFirst({
      where: {
        OR: [
          { senderId: currentUserId, receiverId: otherUserId },
          { senderId: otherUserId, receiverId: currentUserId }
        ],
        status: 'ACCEPTED'
      }
    });

    if (!acceptedInterest) {
      return res.status(403).json({ 
        error: 'Not authorized to view messages with this user' 
      });
    }

    const [messages, totalCount] = await Promise.all([
      prisma.message.findMany({
        where: {
          OR: [
            { senderId: currentUserId, receiverId: otherUserId },
            { senderId: otherUserId, receiverId: currentUserId }
          ]
        },
        include: {
          sender: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              profilePhoto: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit)
      }),
      prisma.message.count({
        where: {
          OR: [
            { senderId: currentUserId, receiverId: otherUserId },
            { senderId: otherUserId, receiverId: currentUserId }
          ]
        }
      })
    ]);

    // Mark messages as read
    await prisma.message.updateMany({
      where: {
        senderId: otherUserId,
        receiverId: currentUserId,
        isRead: false
      },
      data: {
        isRead: true
      }
    });

    res.json({
      messages: messages.reverse(), // Reverse to show oldest first
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / parseInt(limit)),
        totalMessages: totalCount,
        hasNext: skip + messages.length < totalCount,
        hasPrev: parseInt(page) > 1
      }
    });

  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const markMessagesAsRead = async (req, res) => {
  try {
    const { userId: otherUserId } = req.params;
    const currentUserId = req.user.id;

    await prisma.message.updateMany({
      where: {
        senderId: otherUserId,
        receiverId: currentUserId,
        isRead: false
      },
      data: {
        isRead: true
      }
    });

    res.json({ message: 'Messages marked as read' });

  } catch (error) {
    console.error('Mark messages as read error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user.id;

    const unreadCount = await prisma.message.count({
      where: {
        receiverId: userId,
        isRead: false
      }
    });

    res.json({ unreadCount });

  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  sendMessage,
  getConversations,
  getMessages,
  markMessagesAsRead,
  getUnreadCount
};