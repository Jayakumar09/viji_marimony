// List ALL users in the database
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function listAllUsers() {
  try {
    // Get ALL users with key fields
    const users = await prisma.user.findMany({
      select: {
        id: true,
        customId: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        dateOfBirth: true,
        gender: true,
        maritalStatus: true,
        community: true,
        profilePhoto: true,
        isPremium: true,
        subscriptionTier: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    });
    
    console.log('Total users in database:', users.length);
    console.log('\n=== ALL USERS ===\n');
    
    users.forEach((user, i) => {
      console.log(`User ${i + 1}:`);
      console.log('  id:', user.id);
      console.log('  customId:', user.customId);
      console.log('  name:', user.firstName, user.lastName);
      console.log('  email:', user.email);
      console.log('  phone:', user.phone);
      console.log('  DOB:', user.dateOfBirth);
      console.log('  age:', user.age);
      console.log('  gender:', user.gender);
      console.log('  maritalStatus:', user.maritalStatus);
      console.log('  community:', user.community);
      console.log('  isPremium:', user.isPremium);
      console.log('  subscriptionTier:', user.subscriptionTier);
      console.log('  createdAt:', user.createdAt);
      console.log('---');
    });
    
    // Check for duplicate customIds
    console.log('\n=== CHECKING FOR DUPLICATES ===');
    const customIds = users.map(u => u.customId).filter(Boolean);
    const uniqueIds = [...new Set(customIds)];
    console.log('Total users with customId:', customIds.length);
    console.log('Unique customIds:', uniqueIds.length);
    
    if (customIds.length !== uniqueIds.length) {
      console.log('WARNING: Duplicate customIds found!');
      const counts = {};
      customIds.forEach(id => {
        counts[id] = (counts[id] || 0) + 1;
      });
      console.log('Duplicates:', JSON.stringify(counts, null, 2));
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

listAllUsers();