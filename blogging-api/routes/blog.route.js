const express = require('express');
const router = express.Router();
const {
  getBlogs,
  getMyBlogs,
  getBlog,
  createBlog,
  updateBlog,
  deleteBlog,
} = require('../controllers/blog.controller');
const { protect } = require('../middleware/auth');
const paginateResults = require('../utils/paginate');
const Blog = require('../models/blog.model');

// Public routes
router.get('/', paginateResults(Blog), getBlogs);
router.get('/my-blogs',protect, getMyBlogs);

router.get('/:id', getBlog);

// Protected routes
router.post('/', protect, createBlog)
router.put('/:id', protect, updateBlog)
router.delete('/:id', protect, deleteBlog);

module.exports = router;