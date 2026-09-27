const express = require('express');
const router = express.Router();
const Task = require('../models/task');

// Fetch global task statistics
async function getStats() {
  const [total, pending, processing, completed] = await Promise.all([
    Task.countDocuments(),
    Task.countDocuments({ status: 'Pending' }),
    Task.countDocuments({ status: 'In Progress' }),
    Task.countDocuments({ status: 'Completed' })
  ]);
  return { total, pending, processing, completed };
}

// 1. Active Tasks
router.get('/', async (req, res) => {
  try {
    const stats = await getStats();
    const activeTasks = await Task.find({ status: { $ne: 'Completed' } }).sort({ dueDate: 1 });
    res.render('index', { tasks: activeTasks, stats, activeTab: 'active' });
  } catch (err) {
    res.status(500).send('Error loading tasks: ' + err.message);
  }
});

// 2. Completed Tasks
router.get('/completed', async (req, res) => {
  try {
    const stats = await getStats();
    const completedTasks = await Task.find({ status: 'Completed' }).sort({ dueDate: -1 });
    res.render('completed', { tasks: completedTasks, stats, activeTab: 'completed' });
  } catch (err) {
    res.status(500).send('Error loading completed tasks: ' + err.message);
  }
});

// 3. Analytics View
router.get('/analytics', async (req, res) => {
  try {
    const stats = await getStats();
    const staffMembers = await Task.distinct('assignedTo');
    const completionRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
    
    res.render('analytics', { stats, staffCount: staffMembers.length, completionRate, activeTab: 'analytics' });
  } catch (err) {
    res.status(500).send('Error loading analytics: ' + err.message);
  }
});

// Create New Task
router.post('/tasks/create', async (req, res) => {
  try {
    const { title, description, assignedTo, dueDate, status } = req.body;
    await Task.create({ title, description, assignedTo, dueDate, status });
    res.redirect('/');
  } catch (err) {
    res.status(400).send('Failed to create task: ' + err.message);
  }
});

// Update Status
router.post('/tasks/:id/status', async (req, res) => {
  try {
    const { status, redirectUrl } = req.body;
    await Task.findByIdAndUpdate(req.params.id, { status });
    res.redirect(redirectUrl || '/');
  } catch (err) {
    res.status(400).send('Failed to update status: ' + err.message);
  }
});

// Delete Task
router.post('/tasks/:id/delete', async (req, res) => {
  try {
    const { redirectUrl } = req.body;
    await Task.findByIdAndDelete(req.params.id);
    res.redirect(redirectUrl || '/');
  } catch (err) {
    res.status(400).send('Failed to delete task: ' + err.message);
  }
});

module.exports = router;