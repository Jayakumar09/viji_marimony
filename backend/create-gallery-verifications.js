const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createGalleryVerifications() {
  const userId = 'cmldjmdfv0000xmu9tn15fvfy';
  
  // Get user's photos JSON
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { photos: true, profilePhoto: true }
  });
  
  console.log('Profile Photo:', user?.profilePhoto);
  console.log('Gallery Photos JSON:', user?.photos);
  
  // Parse gallery photos
  let galleryPhotos = [];
  try {
    galleryPhotos = JSON.parse(user?.photos || '[]');
  } catch (e) {
    console.error('Error parsing photos JSON');
  }
  
  console.log('\nGallery photos count:', galleryPhotos.length);
  
  // Create PhotoVerification records for gallery photos
  for (const photoUrl of galleryPhotos) {
    // Check if already exists
    const existing = await prisma.photoVerification.findFirst({
      where: { userId, photoUrl }
    });
    
    if (existing) {
      console.log(`Already exists: ${photoUrl} - Status: ${existing.status}`);
    } else {
      // Create new record with APPROVED status since user is already verified
      const newRecord = await prisma.photoVerification.create({
        data: {
          userId,
          photoUrl,
          photoType: 'PHOTO_GALLERY',
          status: 'APPROVED',
          reviewedBy: 'admin_auto',
          reviewedAt: new Date()
        }
      });
      console.log(`Created APPROVED record: ${photoUrl}`);
    }
  }
  
  // Also check profile photo
  if (user?.profilePhoto) {
    const existingProfile = await prisma.photoVerification.findFirst({
      where: { userId, photoUrl: user.profilePhoto }
    });
    
    if (!existingProfile) {
      await prisma.photoVerification.create({
        data: {
          userId,
          photoUrl: user.profilePhoto,
          photoType: 'PROFILE',
          status: 'APPROVED',
          reviewedBy: 'admin_auto',
          reviewedAt: new Date()
        }
      });
      console.log('Created APPROVED record for profile photo');
    } else {
      console.log('Profile photo already has record:', existingProfile.status);
    }
  }
  
  console.log('\nDone!');
  await prisma.$disconnect();
}

createGalleryVerifications().catch(console.error);