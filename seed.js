// Run this once to populate your database with test data:
// node seed.js

require('dotenv').config();
const mongoose = require('mongoose');
const Client = require('./models/Client');

const sampleClients = [
  {
    username: 'rohan',
    name: 'Rohan Sharma',
    bio: 'Freelance designer & photographer based in Kathmandu 📷',
    theme: 'minimal',
    links: [
      { label: 'My Portfolio', url: 'https://example.com', icon: 'globe', order: 1 },
      { label: 'Instagram',    url: 'https://instagram.com', icon: 'instagram', order: 2 },
      { label: 'Contact Me',   url: 'mailto:rohan@example.com', icon: 'mail', order: 3 },
    ]
  },
  {
    username: 'sita',
    name: 'Sita Devi',
    bio: 'Entrepreneur · Handmade crafts · Bhaktapur',
    theme: 'modern',
    links: [
      { label: 'My Online Shop', url: 'https://example.com', icon: 'shopping-bag', order: 1 },
      { label: 'Facebook Page',  url: 'https://facebook.com', icon: 'facebook', order: 2 },
      { label: 'WhatsApp',       url: 'https://wa.me/9771234567890', icon: 'message-circle', order: 3 },
    ]
  },
  {
    username: 'ram',
    name: 'Ram Bahadur',
    bio: 'Real estate consultant | 10+ years experience | Lalitpur',
    theme: 'business',
    links: [
      { label: 'View Properties', url: 'https://example.com', icon: 'home', order: 1 },
      { label: 'Call Now',        url: 'tel:+9779801234567', icon: 'phone', order: 2 },
      { label: 'Email',           url: 'mailto:ram@example.com', icon: 'mail', order: 3 },
      { label: 'LinkedIn',        url: 'https://linkedin.com', icon: 'linkedin', order: 4 },
    ]
  }
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    await Client.deleteMany({}); // clear existing
    const created = await Client.insertMany(sampleClients);

    console.log(`✅ Seeded ${created.length} sample clients:`);
    created.forEach(c => console.log(`   → http://localhost:3000/${c.username}`));

    await mongoose.disconnect();
    console.log('\n🎉 Done! Run: npm run dev');
  } catch (err) {
    console.error('❌ Seed failed:', err.message);
    process.exit(1);
  }
}

seed();