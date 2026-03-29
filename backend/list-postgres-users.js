// List ALL users from PostgreSQL database
const { PrismaClient } = require('@prisma/client');

// Use PostgreSQL connection from environment
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || "postgresql://vijiadmindb:PyhMzM8g!tY_4Pp@viji-postgres-db.czmeo4s8s2e.ap-south-2.rds.amazonaws.com:5432/postgres?ssl=true"
    }
  }
});

async function listAllUsersPostgres() {
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
        subCaste: true,
        profilePhoto: true,
        isPremium: true,
        subscriptionTier: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });
    
    console.log('Total users in PostgreSQL database:', users.length);
    console.log('\n=== ALL USERS FROM POSTGRESQL ===\n');
    
    // Group by customId to find duplicates
    const customIdMap = {};
    users.forEach(user => {
      if (user.customId) {
        if (!customIdMap[user.customId]) {
          customIdMap[user.customId] = [];
        }
        customIdMap[user.customId].push(user);
      }
    });
    
    // Show all users
    users.forEach((user, i) => {
      console.log(`User ${i + 1}:`);
      console.log('  id:', user.id);
      console.log('  customId:', user.customId);
      console.log('  name:', user.firstName, user.lastName);
      console.log('  email:', user.email);
      console.log('  phone:', user.phone);
      console.log('  DOB:', user.dateOfBirth);
      console.log('  gender:', user.gender);
      console.log('  maritalStatus:', user.maritalStatus);
      console.log('  community:', user.community);
      console.log('  subCaste:', user.subCaste);
      console.log('  isPremium:', user.isPremium);
      console.log('  subscriptionTier:', user.subscriptionTier);
      console.log('  createdAt:', user.createdAt);
      console.log('---');
    });
    
    // Check for duplicate customIds
    console.log('\n=== CHECKING FOR DUPLICATE CUSTOM IDs ===');
    const duplicates = Object.entries(customIdMap).filter(([id, users]) => users.length > 1);
    
    if (duplicates.length > 0) {
      console.log('FOUND DUPLICATES:');
      duplicates.forEach(([customId, dupUsers]) => {
        console.log(`\ncustomId: ${customId} (${dupUsers.length} users)`);
        dupUsers.forEach(u => {
          console.log(`  - ${u.firstName} ${u.lastName}, email: ${u.email}, phone: ${u.phone}, DOB: ${u.dateOfBirth}`);
        });
      });
    } else {
      console.log('No duplicate customIds found');
    }
    
    // Find JAYAKUMAR users specifically
    console.log('\n=== JAYAKUMAR USERS ===');
    const jayakumarUsers = users.filter(u => 
      u.customId?.includes('JAYAKUMAR') || 
      u.firstName?.toLowerCase().includes('jayakumar')
    );
    console.log(`Found ${jayakumarUsers.length} JAYAKUMAR users`);
    jayakumarUsers.forEach(u => {
      console.log(`  - ${u.customId}: ${u.firstName} ${u.lastName}, DOB: ${u.dateOfBirth}, maritalStatus: ${u.maritalStatus}`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

listAllUsersPostgres();