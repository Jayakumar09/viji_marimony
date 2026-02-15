const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkInterests() {
  try {
    const interests = await prisma.interest.findMany({
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
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
        },
        receiver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
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
    
    console.log('Total interests:', interests.length);
    console.log(JSON.stringify(interests, null, 2));
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkInterests();
