const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const payments = await prisma.payments.findMany();
  console.log('Payments:', JSON.stringify(payments, null, 2));
  
  const subscriptions = await prisma.subscription.findMany();
  console.log('Subscriptions:', JSON.stringify(subscriptions, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
