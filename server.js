// server.js
import express from 'express';
import cors from 'cors';  // CORS allows your frontend to connect to your backend safely. even if they are running in different ports 
import { MongoClient, ObjectId } from 'mongodb';
import bcrypt from 'bcryptjs';  // hash / hide password securely
import jwt from 'jsonwebtoken'; //JWT allows authentication in your app. Token generator/validator ; User login auth system

const app = express();
const PORT = 5123;

const MONGO_URI = 'mongodb://localhost:27017';
const DB_NAME = 'expense-tracker';
const JWT_SECRET = 'expense_tracker_secret_2024';

app.use(cors());
app.use(express.json());

let db, usersCol, expensesCol;
const client = new MongoClient(MONGO_URI);

async function connectDB() {
  try {
    await client.connect();
    db = client.db(DB_NAME);
    usersCol = db.collection('users');
    expensesCol = db.collection('expenses');
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('MongoDB connection failed:', error);
    process.exit(1);
  }
}

connectDB();

// Auth Middleware
const auth = async (req, res, next) => {
  try {
    // in front-end == axios.defaults.headers.common['Authorization'] = `Bearer ${token}`; according to this token in backend given
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'No token provided' });

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await usersCol.findOne({ _id: new ObjectId(decoded.id) });
    if (!user) return res.status(401).json({ error: 'Invalid token' });

    req.user = { 
      id: user._id.toString(), 
      username: user.username,
      email: user.email 
    };
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// REGISTER
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const existingUser = await usersCol.findOne({
      $or: [{ email }, { username }]
    });

    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = {
      username,
      email,
      password: hashedPassword,
      createdAt: new Date()
    };

    const result = await usersCol.insertOne(user);
    const token = jwt.sign({ id: result.insertedId.toString() }, JWT_SECRET, {
      expiresIn: '30d'
    });

    res.status(201).json({
      _id: result.insertedId,
      username,
      email,
      token
    });
  } catch (error) {
    res.status(500).json({ error: 'Registration failed' });
  }
});

// LOGIN
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const user = await usersCol.findOne({
      $or: [{ username }, { email: username }]
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user._id.toString() }, JWT_SECRET, {
      expiresIn: '30d'
    });

    res.json({
      _id: user._id,
      username: user.username,
      email: user.email,
      token
    });
  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
});

// FIXED: Get expenses - Now returns username instead of user ID
app.get('/api/expenses', auth, async (req, res) => {
  try {
    // Get expenses that belong to this user (using userId)
    const items = await expensesCol.find({ userId: req.user.id }).sort({ createdAt: -1 }).toArray();
    
    // For expenses that still have old 'user' field instead of 'userId'
    const oldFormatItems = await expensesCol.find({ user: req.user.id }).sort({ createdAt: -1 }).toArray();
    
    // Combine both and ensure username is included
    const allExpenses = [...items, ...oldFormatItems];
    
    const expensesWithUsername = allExpenses.map(expense => ({
      ...expense,
      username: req.user.username, // Always include username
      userId: req.user.id // Ensure userId is set
    }));
    
    res.json(expensesWithUsername);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch expenses' });
  }
});

// FIXED: Create expense - Now stores username instead of user ID
app.post('/api/expenses', auth, async (req, res) => {
  try {
    const { amount, description, category, date } = req.body;
    
    if (!amount || !description || !category) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    let expenseDate;
    if (date) {
      const [year, month, day] = date.split('-');
      expenseDate = new Date(year, month - 1, day);
    } else {
      expenseDate = new Date();
    }

    // FIXED: Store username instead of user ID
    const expense = { 
      amount: parseFloat(amount),
      description, 
      category,
      date: expenseDate,
      userId: req.user.id,           // Store user ID for internal use
      username: req.user.username,   // Store username for display
      createdAt: new Date()
    };

    console.log('💾 Creating expense for user:', req.user.username);
    
    const result = await expensesCol.insertOne(expense);
    const created = await expensesCol.findOne({ _id: result.insertedId });
    res.status(201).json(created);
  } catch (error) {
    console.error('💥 Expense creation error:', error);
    res.status(500).json({ error: 'Failed to create expense' });
  }
});

// FIXED: Delete expense - Check both userId and user fields
app.delete('/api/expenses/:id', auth, async (req, res) => {
  try {
    const id = req.params.id;
    if (!ObjectId.isValid(id)) return res.status(400).json({ error: 'Invalid id' });
    
    // Check if expense belongs to user (check both userId and user fields)
    const expense = await expensesCol.findOne({ _id: new ObjectId(id) });
    if (!expense || (expense.userId !== req.user.id && expense.user !== req.user.id)) {
      return res.status(404).json({ error: 'Expense not found' });
    }
    
    await expensesCol.deleteOne({ _id: new ObjectId(id) });
    res.json({ message: 'Expense deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete expense' });
  }
});

// FIXED: Get expense summary - Check both userId and user fields
app.get('/api/expenses/summary', auth, async (req, res) => {
  try {
    const pipeline = [
      { 
        $match: { 
          $or: [
            { userId: req.user.id },
            { user: req.user.id }
          ]
        } 
      },
      {
        $group: {
          _id: '$category',
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { total: -1 } }
    ];

    const categorySummary = await expensesCol.aggregate(pipeline).toArray();
    
    const totalPipeline = [
      { 
        $match: { 
          $or: [
            { userId: req.user.id },
            { user: req.user.id }
          ]
        } 
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ];

    const totalResult = await expensesCol.aggregate(totalPipeline).toArray();

    res.json({
      categorySummary,
      total: totalResult[0]?.total || 0,
      count: totalResult[0]?.count || 0
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch summary' });
  }
});

// MIGRATION: Convert all existing user IDs to usernames
app.post('/api/migrate-to-usernames', auth, async (req, res) => {
  try {
    console.log('🔄 Migrating all expenses to use usernames...');
    
    // Get current user's expenses
    const userExpenses = await expensesCol.find({ 
      $or: [
        { userId: req.user.id },
        { user: req.user.id }
      ]
    }).toArray();
    
    let updatedCount = 0;
    
    for (const expense of userExpenses) {
      // Update each expense to use username and remove old user field
      await expensesCol.updateOne(
        { _id: expense._id },
        { 
          $set: { 
            username: req.user.username,
            userId: req.user.id
          },
          $unset: { user: "" } // Remove the old user field
        }
      );
      updatedCount++;
    }
    
    res.json({ 
      message: `Migration complete. Updated ${updatedCount} expenses.`,
      updated: updatedCount
    });
    
  } catch (error) {
    console.error('💥 Migration error:', error);
    res.status(500).json({ error: 'Migration failed' });
  }
});

// Get user profile
app.get('/api/auth/me', auth, async (req, res) => {
  try {
    const user = await usersCol.findOne(
      { _id: new ObjectId(req.user.id) },
      { projection: { password: 0 } }
    );
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

// Root route
app.get('/', (req, res) => {
  res.json({ message: 'Expense Tracker API is running!' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`👤 Now storing usernames instead of user IDs in expenses!`);
});