const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = new PrismaClient();

async function testLogin() {
  try {
    const email = 'vijayalakshmi2061979@gmail.com';
    
    const user = await prisma.user.findUnique({
      where: { email }
    });
    
    if (!user) {
      console.log('User not found');
      return;
    }
    
    console.log('User found:', user.firstName, user.lastName, 'ID:', user.id);
    
    // Generate token directly
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET || 'boyar-matrimony-super-secret-key-change-in-production-2024',
      { expiresIn: '7d' }
    );
    console.log('\nGenerated token:', token);
    
    // Test received interests
    const receivedInterests = await prisma.interest.findMany({
      where: { receiverId: user.id },
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            age: true,
            gender: true,
            city: true,
            state: true,
            profession: true,
            education: true,
            profilePhoto: true,
            isVerified: true,
            isPremium: true
          }
        }
      }
    });
    
    console.log('\n=== RECEIVED INTERESTS ===');
    console.log('Count:', receivedInterests.length);
    receivedInterests.forEach(i => {
      console.log(`From: ${i.sender.firstName} ${i.sender.lastName} (${i.sender.age}, ${i.sender.city})`);
      console.log(`Status: ${i.status}`);
      console.log(`Message: ${i.message || 'No message'}`);
      console.log('---');
    });
    
    // Test sent interests
    const sentInterests = await prisma.interest.findMany({
      where: { senderId: user.id },
      include: {
        receiver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            age: true,
            gender: true,
            city: true,
            state: true,
            profession: true,
            education: true,
            profilePhoto: true,
            isVerified: true,
            isPremium: true
          }
        }
      }
    });
    
    console.log('\n=== SENT INTERESTS ===');
    console.log('Count:', sentInterests.length);
    sentInterests.forEach(i => {
      console.log(`To: ${i.receiver.firstName} ${i.receiver.lastName} (${i.receiver.age}, ${i.receiver.city})`);
      console.log(`Status: ${i.status}`);
      console.log(`Message: ${i.message || 'No message'}`);
      console.log('---');
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testLogin();
