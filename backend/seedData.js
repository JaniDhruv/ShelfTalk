import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

// Import all models
import User from './models/User.js';
import Profile from './models/Profile.js';
import Group from './models/Group.js';
import Post from './models/Post.js';
import Comment from './models/Comment.js';
import Conversation from './models/Conversation.js';
import Message from './models/Message.js';
import Notification from './models/Notification.js';

dotenv.config();

const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/shelftalk';

// Sample data arrays
const sampleUsers = [
  {
    username: 'bookworm_sarah',
    email: 'sarah@example.com',
    password: 'password123',
    bio: 'Avid reader and fantasy enthusiast. Currently obsessed with Brandon Sanderson!'
  },
  {
    username: 'classic_reader_mike',
    email: 'mike@example.com',
    password: 'password123',
    bio: 'Love classic literature and philosophy. Always down for a good book discussion.'
  },
  {
    username: 'mystery_maven_jen',
    email: 'jen@example.com',
    password: 'password123',
    bio: 'Mystery and thriller addict. Give me a good whodunit any day!'
  },
  {
    username: 'scifi_sam',
    email: 'sam@example.com',
    password: 'password123',
    bio: 'Science fiction is my passion. From Asimov to Liu Cixin, I read it all.'
  },
  {
    username: 'romance_riley',
    email: 'riley@example.com',
    password: 'password123',
    bio: 'Romance novel enthusiast. Happily ever afters are my favorite endings!'
  },
  {
    username: 'nonfiction_nick',
    email: 'nick@example.com',
    password: 'password123',
    bio: 'Biographies, history, and self-help. I prefer my books based in reality.'
  },
  {
    username: 'young_adult_yara',
    email: 'yara@example.com',
    password: 'password123',
    bio: 'YA fiction forever! Currently re-reading Harry Potter for the 10th time.'
  },
  {
    username: 'horror_henry',
    email: 'henry@example.com',
    password: 'password123',
    bio: 'Horror and thriller fan. Stephen King is my hero!'
  },
  {
    username: 'poetry_petra',
    email: 'petra@example.com',
    password: 'password123',
    bio: 'Poetry lover and occasional poet. Words are my paintbrush.'
  },
  {
    username: 'audiobook_alex',
    email: 'alex@example.com',
    password: 'password123',
    bio: 'Audiobook enthusiast. I listen while commuting, exercising, and doing chores!'
  }
];


const sampleGroups = [
  {
    name: 'Fantasy Book Club',
    description: 'For lovers of epic fantasy, urban fantasy, and everything magical! Currently reading The Stormlight Archive series.',
    visibility: 'public'
  },
  {
    name: 'Classic Literature Society',
    description: 'Diving deep into the classics that have shaped literature. Monthly discussions on timeless works.',
    visibility: 'public'
  },
  {
    name: 'Mystery & Thriller Enthusiasts',
    description: 'Who done it? We love a good mystery! Join us for spine-tingling discussions.',
    visibility: 'public'
  },
  {
    name: 'Science Fiction Explorers',
    description: 'Exploring the future, space, and technology through the lens of science fiction.',
    visibility: 'public'
  },
  {
    name: 'Contemporary Fiction Readers',
    description: 'Modern stories that reflect our world today. Book of the month discussions.',
    visibility: 'public'
  },
  {
    name: 'Non-Fiction Knowledge Seekers',
    description: 'Learning and growing through non-fiction. Biographies, history, science, and more!',
    visibility: 'public'
  },
  {
    name: 'Young Adult Adventures',
    description: 'YA fiction for all ages! Coming-of-age stories and young heroes saving the world.',
    visibility: 'public'
  },
  {
    name: 'Horror & Dark Fantasy',
    description: 'For those who love a good scare. Horror novels, dark fantasy, and psychological thrillers.',
    visibility: 'private'
  }
];

async function seedDatabase() {
  try {
    console.log('🌱 Connecting to MongoDB...');
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to MongoDB');

    // Clear existing data
    console.log('🧹 Clearing existing data...');
    await User.deleteMany({});
    await Profile.deleteMany({});
  // Removed Book model and data
    await Group.deleteMany({});
    await Post.deleteMany({});
    await Comment.deleteMany({});
    await Conversation.deleteMany({});
    await Message.deleteMany({});
    await Notification.deleteMany({});
    console.log('✅ Existing data cleared');

    // Create users with hashed passwords
    console.log('👥 Creating users...');
    const users = [];
    for (let userData of sampleUsers) {
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      const user = new User({
        ...userData,
        password: hashedPassword
      });
      await user.save();
      users.push(user);
    }
    console.log(`✅ Created ${users.length} users`);

    // Create profiles for each user
    console.log('📋 Creating profiles...');
    const profiles = [];
    const locations = ['New York, NY', 'Los Angeles, CA', 'Chicago, IL', 'Boston, MA', 'Seattle, WA', 'Austin, TX', 'Denver, CO', 'Portland, OR', 'Miami, FL', 'Atlanta, GA'];
    const genres = ['Fantasy', 'Science Fiction', 'Mystery', 'Romance', 'Horror', 'Contemporary Fiction', 'Classic Literature', 'Non-Fiction', 'Young Adult', 'Poetry'];
    const authors = ['Brandon Sanderson', 'Stephen King', 'Agatha Christie', 'Isaac Asimov', 'Jane Austen', 'Toni Morrison', 'Haruki Murakami', 'Margaret Atwood', 'Neil Gaiman', 'Octavia Butler'];
    const languages = ['English', 'Spanish', 'French', 'German', 'Italian', 'Portuguese', 'Chinese', 'Japanese', 'Korean', 'Russian'];

    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      const profile = new Profile({
        user: user._id,
        fullName: `${['Sarah', 'Mike', 'Jennifer', 'Sam', 'Riley', 'Nick', 'Yara', 'Henry', 'Petra', 'Alex'][i]} ${['Johnson', 'Smith', 'Williams', 'Brown', 'Davis', 'Miller', 'Wilson', 'Moore', 'Taylor', 'Anderson'][i]}`,
        bio: user.bio,
        location: locations[i],
        website: i % 3 === 0 ? `https://blog.${user.username}.com` : '',
        isOnline: Math.random() > 0.5,
        lastSeen: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000), // Random within last week
        languagesSpoken: [languages[i], languages[(i + 1) % languages.length]].slice(0, Math.floor(Math.random() * 3) + 1),
        favoriteGenres: [
          { name: genres[i], count: Math.floor(Math.random() * 50) + 10 },
          { name: genres[(i + 2) % genres.length], count: Math.floor(Math.random() * 30) + 5 },
          { name: genres[(i + 4) % genres.length], count: Math.floor(Math.random() * 20) + 3 }
        ],
        favoriteAuthors: [authors[i], authors[(i + 1) % authors.length], authors[(i + 3) % authors.length]].slice(0, Math.floor(Math.random() * 3) + 2),
        socialStats: {
          followers: Math.floor(Math.random() * 500) + 50,
          following: Math.floor(Math.random() * 300) + 30,
          bookClubs: Math.floor(Math.random() * 5) + 1,
          discussions: Math.floor(Math.random() * 100) + 10,
          posts: Math.floor(Math.random() * 200) + 20,
          likes: Math.floor(Math.random() * 1000) + 100
        }
      });
      await profile.save();
      profiles.push(profile);
      
      // Update user with profile reference
      user.profile = profile._id;
      await user.save();
    }
    console.log(`✅ Created ${profiles.length} profiles`);

    // Removed books seeding

    // Create groups
    console.log('🏛️ Creating groups...');
    const groups = [];
    for (let i = 0; i < sampleGroups.length; i++) {
      const groupData = sampleGroups[i];
      const creator = users[i % users.length];
      const memberCount = Math.floor(Math.random() * 8) + 3; // 3-10 members
      const members = [creator._id];
      
      // Add random members
      while (members.length < memberCount) {
        const randomUser = users[Math.floor(Math.random() * users.length)];
        if (!members.includes(randomUser._id)) {
          members.push(randomUser._id);
        }
      }

      const group = new Group({
        ...groupData,
        createdBy: creator._id,
        members: members,
        moderators: [creator._id, members[1]] // Creator + one random member as moderators
      });
      await group.save();
      groups.push(group);

      // Update users' groups
      for (let memberId of members) {
        const user = users.find(u => u._id.toString() === memberId.toString());
        if (user) {
          user.groups.push(group._id);
          await user.save();
        }
      }
    }
    console.log(`✅ Created ${groups.length} groups`);

    // Create posts
    console.log('📝 Creating posts...');
    const samplePostContents = [
      "Just finished reading 'The Way of Kings' and I'm absolutely blown away! Brandon Sanderson's world-building is incredible. Has anyone else read the Stormlight Archive series?",
      "Looking for recommendations for classic literature. I've read most of the popular ones, but I'm sure there are hidden gems I'm missing!",
      "That plot twist in Gone Girl... did NOT see that coming! Gillian Flynn is a master at psychological manipulation.",
      "Project Hail Mary had me crying and laughing at the same time. Andy Weir really knows how to blend science with emotion.",
      "Currently reading Dune for the first time. 100 pages in and I'm still confused but intrigued. Does it get easier to follow?",
      "Book club meeting tonight! We're discussing 'The Midnight Library'. What did everyone think about the premise of infinite lives?",
      "Just discovered audiobooks and my commute has never been better! Any recommendations for great narrators?",
      "Poetry recommendation thread: Drop your favorite poets and collections below! I need to expand my poetry shelf.",
      "Horror fans: What's the scariest book you've ever read? I'm looking for something that will keep me up at night!",
      "Non-fiction lovers, what's the most life-changing book you've read? I'm looking for something inspiring.",
      "YA book recommendations for my teenage niece? She loves fantasy and strong female protagonists.",
      "Book vs. Movie debate: Which adaptation actually improved on the source material?",
      "Reading goal update: 45 books down, 5 to go for my yearly goal of 50! What's your reading goal this year?",
      "Library vs. buying books - what's your preference and why? I can't decide if I'm a collector or a borrower.",
      "Bookstore recommendation: Just discovered an amazing independent bookstore downtown. Supporting local businesses feels so good!"
    ];

    const posts = [];
    for (let i = 0; i < 25; i++) {
      const author = users[Math.floor(Math.random() * users.length)];
      const content = samplePostContents[Math.floor(Math.random() * samplePostContents.length)];
      const group = Math.random() > 0.3 ? groups[Math.floor(Math.random() * groups.length)] : null; // 70% chance of being in a group
      
      const post = new Post({
        content: content,
        author: author._id,
        group: group ? group._id : null,
        likes: users.slice(0, Math.floor(Math.random() * 5) + 1).map(u => u._id) // Random likes
      });
      await post.save();
      posts.push(post);
    }
    console.log(`✅ Created ${posts.length} posts`);

    // Create comments
    console.log('💬 Creating comments...');
    const sampleComments = [
      "I completely agree! This book changed my perspective.",
      "Thanks for the recommendation, adding to my TBR list!",
      "I had the opposite reaction, but I can see why you liked it.",
      "Have you read the sequel? It's even better!",
      "This author is amazing, everything they write is gold.",
      "I DNF'd this one, couldn't get into it. Maybe I'll try again later.",
      "Great review! You convinced me to pick this up.",
      "I'm currently reading this too! No spoilers please 😅",
      "The audiobook version is fantastic, highly recommend!",
      "This is now on my must-read list for this year.",
      "I read this years ago and still think about it.",
      "Perfect timing, I was just looking for something like this!",
      "Your review is spot on. Couldn't have said it better myself.",
      "I need to reread this one, I think I missed some details.",
      "Thanks for sharing! Always love discovering new books."
    ];

    for (let i = 0; i < 50; i++) {
      const post = posts[Math.floor(Math.random() * posts.length)];
      const author = users[Math.floor(Math.random() * users.length)];
      const text = sampleComments[Math.floor(Math.random() * sampleComments.length)];
      
      const comment = new Comment({
        text: text,
        author: author._id,
        post: post._id,
        likes: users.slice(0, Math.floor(Math.random() * 3)).map(u => u._id) // Random likes
      });
      await comment.save();
    }
    console.log('✅ Created 50 comments');

    // Create conversations and messages
    console.log('💌 Creating conversations and messages...');
    const conversations = [];
    
    // Create some DM conversations
    for (let i = 0; i < 15; i++) {
      const user1 = users[Math.floor(Math.random() * users.length)];
      let user2 = users[Math.floor(Math.random() * users.length)];
      while (user2._id.toString() === user1._id.toString()) {
        user2 = users[Math.floor(Math.random() * users.length)];
      }
      
      const conversation = new Conversation({
        type: 'dm',
        members: [user1._id, user2._id],
        lastMessage: 'Hey! Have you read any good books lately?',
        lastMessageAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000)
      });
      await conversation.save();
      conversations.push(conversation);
    }

    // Create group conversations
    for (let group of groups.slice(0, 5)) { // First 5 groups get conversations
      const conversation = new Conversation({
        type: 'group',
        name: `${group.name} Chat`,
        members: group.members,
        group: group._id,
        lastMessage: 'Welcome to the group chat!',
        lastMessageAt: new Date(Date.now() - Math.random() * 3 * 24 * 60 * 60 * 1000)
      });
      await conversation.save();
      conversations.push(conversation);
    }

    // Create messages for conversations
    const sampleMessages = [
      "Hey! Have you read any good books lately?",
      "I just finished the most amazing novel!",
      "Looking for recommendations in the sci-fi genre",
      "That book club meeting was so insightful",
      "I can't put this book down!",
      "What did you think of the ending?",
      "Adding this to my reading list right now",
      "The plot twist completely caught me off guard",
      "This author never disappoints",
      "Perfect for a rainy day read"
    ];

    for (let conversation of conversations) {
      const messageCount = Math.floor(Math.random() * 8) + 2; // 2-9 messages per conversation
      for (let i = 0; i < messageCount; i++) {
        const sender = conversation.members[Math.floor(Math.random() * conversation.members.length)];
        const message = new Message({
          conversation: conversation._id,
          sender: sender,
          content: sampleMessages[Math.floor(Math.random() * sampleMessages.length)],
          readBy: [sender] // Sender always reads their own message
        });
        await message.save();
      }
    }
    console.log(`✅ Created ${conversations.length} conversations with messages`);

    // Create notifications
    console.log('🔔 Creating notifications...');
    const notificationTypes = ['like', 'comment', 'mention', 'group_invite'];
    const notificationMessages = {
      like: 'liked your post',
      comment: 'commented on your post',
      mention: 'mentioned you in a post',
      group_invite: 'invited you to join a group'
    };

    for (let i = 0; i < 30; i++) {
      const user = users[Math.floor(Math.random() * users.length)];
      const type = notificationTypes[Math.floor(Math.random() * notificationTypes.length)];
      const fromUser = users[Math.floor(Math.random() * users.length)];
      
      const notification = new Notification({
        user: user._id,
        type: type,
        message: `${fromUser.username} ${notificationMessages[type]}`,
        isRead: Math.random() > 0.6, // 40% chance of being read
        relatedPost: type === 'like' || type === 'comment' ? posts[Math.floor(Math.random() * posts.length)]._id : null,
        relatedGroup: type === 'group_invite' ? groups[Math.floor(Math.random() * groups.length)]._id : null
      });
      await notification.save();
    }
    console.log('✅ Created 30 notifications');

    console.log('🎉 Database seeded successfully!');
    console.log('📊 Summary:');
    console.log(`   Users: ${users.length}`);
    console.log(`   Profiles: ${profiles.length}`);
  // Books removed
    console.log(`   Groups: ${groups.length}`);
    console.log(`   Posts: ${posts.length}`);
    console.log(`   Comments: 50`);
    console.log(`   Conversations: ${conversations.length}`);
    console.log(`   Notifications: 30`);

  } catch (error) {
    console.error('❌ Error seeding database:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

// Run the seeding
seedDatabase();