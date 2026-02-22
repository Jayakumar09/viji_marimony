const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Delete all pending payments and subscriptions
  const deletedSubs = await prisma.subscription.deleteMany({
    where: { status: 'PENDING' }
  });
  console.log('Deleted pending subscriptions:', deletedSubs.count);
  
  const deletedPayments = await prisma.payments.deleteMany({
    where: { paymentStatus: 'PENDING' }
  });
  console.log('Deleted pending payments:', deletedPayments.count);
  
  // Show remaining
  const payments = await prisma.payments.findMany();
  const subscriptions = await prisma.subscription.findMany();
  console.log('Remaining payments:', payments.length);
  console.log('Remaining subscriptions:', subscriptions.length);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
