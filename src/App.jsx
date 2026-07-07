import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

const API_URL = 'http://localhost:5123/api';

function App() {
  const [user, setUser] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [summary, setSummary] = useState({ categorySummary: [], total: 0 });
  // expense - form
  const [formData, setFormData] = useState({
    amount: '',
    description: '',
    category: 'Food',
    // converts date object to string -- .split('t') [ t is the separator] = splits date and time and [0] takes only date 
    date: new Date().toISOString().split('T')[0]
  });
  // login form
  const [authData, setAuthData] = useState({
    username: '',
    email: '',
    password: ''
  });
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [profileOpen, setProfileOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  // if changes made in profile
  const [profileData, setProfileData] = useState({
    username: '',
    email: ''
  });
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'

  useEffect(() => {
    // localStorage = built-in browser object that store data permanently even refreshing
    // getItem = access the mentioned data
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    const savedViewMode = localStorage.getItem('viewMode') || 'grid';
    
    setDarkMode(savedDarkMode);
    setViewMode(savedViewMode);
    // executes if user logged in and data is present 
    if (token && userData) {
      const userObj = JSON.parse(userData);
      setUser(userObj);
      setProfileData({ username: userObj.username, email: userObj.email });
      // axios = http request ; default - object inside axios that stores default settings ; common = header should be applied to all http methods [ put,get...]
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchExpenses();  // loads all expenses of particular user
      fetchSummary(); // loads summary 
    }
  }, []);

  // dark mode 
  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
    localStorage.setItem('darkMode', darkMode.toString());
  }, [darkMode]);

  // view -- grid / list 
  useEffect(() => {
    localStorage.setItem('viewMode', viewMode);
  }, [viewMode]);

  const fetchExpenses = async () => {
    try {
      const response = await axios.get(`${API_URL}/expenses`);
      setExpenses(response.data);
    } catch (error) {
      console.error('Error fetching expenses:', error);
    }
  };

  const fetchSummary = async () => {
    // API_URL = http/https based on backend
    try {
      const response = await axios.get(`${API_URL}/expenses/summary`);
      setSummary(response.data);
    } catch (error) {
      console.error('Error fetching summary:', error);
    }
  };
  // performs on submitting login/register 
  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true); // react state updater function
    setError('');

    try {
      const endpoint = isLogin ? '/auth/login' : '/auth/register';
      
      // sends different for register and login options
      const payload = isLogin 
        ? { username: authData.username, password: authData.password }
        : authData;
      // post
      const response = await axios.post(`${API_URL}${endpoint}`, payload);
      
      const { token, ...userData } = response.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
      setProfileData({ username: userData.username, email: userData.email });
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      fetchExpenses();
      fetchSummary();
    } catch (error) {
      setError(error.response?.data?.error || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setExpenses([]);
    setSummary({ categorySummary: [], total: 0 });
    delete axios.defaults.headers.common['Authorization'];
    setProfileOpen(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Ensure date is properly formatted for backend
      const submitData = {
        ...formData,
        amount: parseFloat(formData.amount) // Ensure number type -- by defalut in string type
      };
      
      await axios.post(`${API_URL}/expenses`, submitData);
      setFormData({
        amount: '',
        description: '',
        category: 'Food',
        date: new Date().toISOString().split('T')[0]
      });
      fetchExpenses();
      fetchSummary();
    } catch (error) {
      console.error('Error adding expense:', error);
      alert('Error adding expense: ' + (error.response?.data?.error || 'Unknown error'));
    }
  };

  const deleteExpense = async (id) => {
    try {
      await axios.delete(`${API_URL}/expenses/${id}`);
      fetchExpenses();
      fetchSummary();
    } catch (error) {
      alert('Error deleting expense');
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.put(`${API_URL}/auth/profile`, profileData);
      setUser(response.data);
      setProfileData({ username: response.data.username, email: response.data.email });
      localStorage.setItem('user', JSON.stringify(response.data));
      setShowProfileModal(false);
      alert('Profile updated successfully!');
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to update profile');
    }
  };

  const showHelp = () => {
    alert(`Expense Tracker Help:
    
• Add Expense: Fill the form with amount, description, category, and date
• View Summary: See your total spending and category-wise breakdown
• Delete Expense: Click the delete button on any expense card
• Profile Settings: Update your username and email
• Dark Mode: Toggle between light and dark themes
• View Modes: Switch between Grid and List views
    
For more assistance, contact support.`);
    setProfileOpen(false);
  };
// login 
  if (!user) {
    return (
      <div className="App">
        <div className="auth-container">
          <h2>{isLogin ? 'Login to Expense Tracker' : 'Create Your Account'}</h2>
          
          {error && <div className="error-message">{error}</div>}
          
          <form onSubmit={handleAuth}>
            <div className="form-group">
              <input
                type="text"
                placeholder="Username"
                value={authData.username}
                onChange={(e) => setAuthData({...authData, username: e.target.value})}
                required
              />
            </div>
            
            {!isLogin && (
              <div className="form-group">
                <input
                  type="email"
                  placeholder="Email Address"
                  value={authData.email}
                  onChange={(e) => setAuthData({...authData, email: e.target.value})}
                  required
                />
              </div>
            )}
            
            <div className="form-group">
              <input
                type="password"
                placeholder="Password"
                value={authData.password}
                onChange={(e) => setAuthData({...authData, password: e.target.value})}
                required
              />
              {/* error if anything left blank */}
              {!isLogin && authData.password.length > 0 && authData.password.length < 6 && (
                <small className="password-hint">Password must be at least 6 characters</small>
              )}
            </div>
            
            <button 
              type="submit" 
              disabled={loading || (!isLogin && authData.password.length < 6)}
              className={loading ? 'loading' : ''}
            >
              {loading ? 'Please wait...' : (isLogin ? 'Login' : 'Sign Up')}
            </button>
          </form>
          
          <p className="auth-switch">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <span onClick={() => {setIsLogin(!isLogin); setError(''); setAuthData({username: '', email: '', password: ''});}} className="auth-toggle">
              {isLogin ? 'Sign Up' : 'Login'}
            </span>
          </p>
        </div>
      </div>
    );
  }
//  main dashboard
  return (
    <div className="App">
      <header className="app-header">
        <h1>Expense Tracker</h1>
        <div className="user-info">
          <span>Welcome, {user.username}!</span>
          
          {/* Profile Dropdown */}
          <div className="profile-container">
            <button 
              className="profile-btn"
              onClick={() => setProfileOpen(!profileOpen)}
            >
              👤 Profile
            </button>
            
            {profileOpen && (
              <div className="profile-dropdown">
                <div className="profile-header">
                  <strong>{user.username}</strong>
                  <br />
                  <small>{user.email}</small>
                </div>
                
                <div className="profile-options">
                  <button 
                    className="profile-option"
                    onClick={() => {
                      setShowProfileModal(true);
                      setProfileOpen(false);
                    }}
                  >
                    Edit Profile
                  </button>
                  
                  <button 
                    className="profile-option"
                    onClick={() => {
                      setDarkMode(!darkMode);
                      setProfileOpen(false);
                    }}
                  >
                    {darkMode ? 'Light Mode' : 'Dark Mode'}
                  </button>
                  
                  <button 
                    className="profile-option"
                    onClick={showHelp}
                  >
                    Help
                  </button>
                  
                  <button 
                    className="profile-option logout"
                    onClick={handleLogout}
                  >
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Profile Modal  for editing */}
      {showProfileModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>Edit Profile</h2>
            <form onSubmit={handleProfileUpdate}>
              <div className="form-group">
                <label>Username:</label>
                <input
                  type="text"
                  value={profileData.username}
                  onChange={(e) => setProfileData({...profileData, username: e.target.value})}
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Email:</label>
                <input
                  type="email"
                  value={profileData.email}
                  onChange={(e) => setProfileData({...profileData, email: e.target.value})}
                  required
                />
              </div>
              
              <div className="modal-actions">
                <button type="submit" className="save-btn">
                  Save Changes
                </button>
                <button 
                  type="button" 
                  className="cancel-btn"
                  onClick={() => setShowProfileModal(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* summary of expenses */}
      <div className="container">
        <div className="summary-section">
          <h2>Expense Summary</h2>
          <div className="total-expense">
            Total: ₹{summary.total.toFixed(2)}
          </div>
          <div className="category-summary">
            {summary.categorySummary.map(item => (
              <div key={item._id} className="category-item">
                <span>{item._id}:</span>
                <span>₹{item.total.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* add expense form */}
        <div className="expense-form">
          <h2>Add New Expense</h2>
          <form onSubmit={handleSubmit}>
            <input
              type="number"
              placeholder="Amount"
              value={formData.amount}
              onChange={(e) => setFormData({...formData, amount: e.target.value})}
              required
              step="0.01"
              min="0"
            />
            <input
              type="text"
              placeholder="Description"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              required
            />
            <select
              value={formData.category}
              onChange={(e) => setFormData({...formData, category: e.target.value})}
            >
              <option value="Food">Food</option>
              <option value="Travel">Travel</option>
              <option value="Shopping">Shopping</option>
              <option value="Entertainment">Entertainment</option>
              <option value="Bills">Bills</option>
              <option value="Healthcare">Healthcare</option>
              <option value="Education">Education</option>
              <option value="Other">Other</option>
            </select>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({...formData, date: e.target.value})}
              required
            />
            <button type="submit">Add Expense</button>
          </form>
        </div>
        
        {/* displaying all expenses */}
        <div className="expenses-list">
          <div className="expenses-header">
            <h2>Your Expenses ({expenses.length})</h2>
            <div className="view-toggle">
              <button 
                className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
                onClick={() => setViewMode('grid')}
                title="Grid View"
              >
                Grid
              </button>
              <button 
                className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
                onClick={() => setViewMode('list')}
                title="List View"
              >
                List
              </button>
            </div>
          </div>
          
          {expenses.length === 0 ? (
            <p>No expenses recorded yet. Add your first expense!</p>
          ) : viewMode === 'grid' ? (
            <div className="expenses-grid">
              {expenses.map(expense => (
                <div key={expense._id} className="expense-card">
                  <div className="expense-info">
                    <h3>{expense.description}</h3>
                    <p className="amount">₹{expense.amount}</p>
                    <p className="category">{expense.category}</p>
                    <p className="date">{new Date(expense.date).toLocaleDateString()}</p>
                  </div>
                  <button 
                    onClick={() => deleteExpense(expense._id)}
                    className="delete-btn"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="expenses-vertical">
              {expenses.map(expense => (
                <div key={expense._id} className="expense-item">
                  <div className="expense-main">
                    <div className="expense-details">
                      <h3 className="expense-title">{expense.description}</h3>
                      <div className="expense-meta">
                        <span className="category-badge">{expense.category}</span>
                        <span className="expense-date">{new Date(expense.date).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="expense-amount-section">
                      <span className="expense-amount">₹{expense.amount}</span>
                      <button 
                        onClick={() => deleteExpense(expense._id)}
                        className="delete-btn-small"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;