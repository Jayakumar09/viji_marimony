const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUserPhotos() {
  const userId = 'cmldjmdfv0000xmu9tn15fvfy';
  
  // Get user details
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      isVerified: true,
      emailVerified: true,
      phoneVerified: true,
      photosVerified: true,
      profilePhoto: true,
      photos: true
    }
  });
  
  console.log('\n=== User Details ===');
  console.log('Name:', user?.firstName, user?.lastName);
  console.log('Email:', user?.email);
  console.log('isVerified:', user?.isVerified);
  console.log('emailVerified:', user?.emailVerified);
  console.log('phoneVerified:', user?.phoneVerified);
  console.log('photosVerified:', user?.photosVerified);
  console.log('profilePhoto:', user?.profilePhoto);
  console.log('photos JSON:', user?.photos);
  
  // Get photo verifications
  const photoVerifications = await prisma.photoVerification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' }
  });
  
  console.log('\n=== Photo Verifications ===');
  console.log('Count:', photoVerifications.length);
  photoVerifications.forEach((pv, i) => {
    console.log(`${i + 1}. Type: ${pv.photoType}, Status: ${pv.status}, ID: ${pv.id}`);
  });
  
  // Get user photos from new model
  const userPhotos = await prisma.userPhoto.findMany({
    where: { userId }
  });
  
  console.log('\n=== User Photos (New Model) ===');
  console.log('Count:', userPhotos.length);
  userPhotos.forEach((up, i) => {
    console.log(`${i + 1}. IsProfile: ${up.isProfilePhoto}, Approved: ${up.isApproved}`);
  });
  
  // Get gallery images
  const gallery = await prisma.userGalleryImage.findMany({
    where: { userId }
  });
  
  console.log('\n=== Gallery Images ===');
  console.log('Count:', gallery.length);
  
  await prisma.$disconnect();
}

checkUserPhotos().catch(console.error);