const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkPhotos() {
  try {
    // Find Dharsini Yuvaraj
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { firstName: { contains: 'Dharsini' } },
          { lastName: { contains: 'Yuvaraj' } }
        ]
      },
      include: {
        photoVerifications: true,
        userPhotos: true,
        userGallery: true
      }
    });

    if (!user) {
      console.log('User not found');
      return;
    }

    console.log('=== User Info ===');
    console.log('ID:', user.id);
    console.log('Name:', user.firstName, user.lastName);
    console.log('profilePhoto:', user.profilePhoto);
    
    console.log('\n=== Parsing photos from users.photos JSON ===');
    let userGalleryPhotos = [];
    try {
      if (user.photos) {
        const parsedPhotos = typeof user.photos === 'string' 
          ? JSON.parse(user.photos) 
          : user.photos;
        console.log('Parsed photos:', parsedPhotos);
        userGalleryPhotos = parsedPhotos.map((url, index) => ({
          id: `gallery_${index}`,
          url: url,
          isFromUsersTable: true
        }));
      }
    } catch (e) {
      console.error('Error parsing photos JSON:', e);
    }

    console.log('\n=== Combined Profile Photo ===');
    const usersProfilePhoto = user.profilePhoto ? {
      id: 'profile_from_users',
      url: user.profilePhoto,
      isFromUsersTable: true
    } : null;
    console.log('Profile Photo:', usersProfilePhoto);

    console.log('\n=== Combined Gallery Photos ===');
    console.log('Gallery from users.photos:', userGalleryPhotos.length);
    userGalleryPhotos.forEach((p, i) => {
      console.log(`  ${i + 1}:`, p.url);
    });

    console.log('\n=== Final Results ===');
    console.log('Final Profile Photo:', usersProfilePhoto ? usersProfilePhoto.url : 'None');
    console.log('Final Gallery Count:', userGalleryPhotos.length);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkPhotos();
