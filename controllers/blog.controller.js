const asyncHandler = require('express-async-handler');
const Blog = require('../models/blog.model');
const calculateReadingTime = require('../utils/calculateReadingTime');

const getBlogs = asyncHandler(async (req, res) => {
  res.status(200).json(res.paginatedResults);
});

const getMyBlogs = asyncHandler(async (req, res) => {
  const { state } = req.query;
  const query = { author: req.user._id };

  if (state) {
    query.state = state;
  }

  const blogs = await Blog.find(query).populate(
    'author',
    'first_name last_name email'
  );
  res.status(200).json({ success: true, count: blogs.length, data: blogs });
});

const getBlog = asyncHandler(async (req, res) => {
  const blog = await Blog.findById(req.params.id).populate(
    'author',
    'first_name last_name email'
  );

  if (!blog) {
    return res.status(404).json({ success: false, message: 'Blog not found' });
  }

  // Only return published blogs to non-owners
  if (blog.state !== 'published' && (!req.user || !blog.author._id.equals(req.user._id))) {
    return res.status(403).json({
      success: false,
      message: 'You do not have permission to view this blog',
    });
  }

  // Increment read count if blog is published
  if (blog.state === 'published') {
    blog.read_count += 1;
    await blog.save();
  }

  res.status(200).json({ success: true, data: blog });
});

const createBlog = asyncHandler(async (req, res) => {
  const { title, description, tags, body } = req.body;

  if (!title || !body) {
    return res.status(400).json({
      success: false,
      message: 'Title and body are required',
    });
  }

  const reading_time = calculateReadingTime(body);

  const blog = await Blog.create({
    title,
    description,
    tags,
    body,
    reading_time,
    author: req.user._id,
  });

  res.status(201).json({ success: true, data: blog });
});

const updateBlog = asyncHandler(async (req, res) => {
  let blog = await Blog.findById(req.params.id);

  if (!blog) {
    return res.status(404).json({ success: false, message: 'Blog not found' });
  }

  // Check if user is the owner of the blog
  if (!blog.author.equals(req.user._id)) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to update this blog',
    });
  }

  const { title, description, tags, body, state } = req.body;

  // Update fields if they exist in the request
  if (title) blog.title = title;
  if (description) blog.description = description;
  if (tags) blog.tags = tags;
  if (body) {
    blog.body = body;
    blog.reading_time = calculateReadingTime(body);
  }
  if (state) blog.state = state;

  const updatedBlog = await blog.save();

  res.status(200).json({ success: true, data: updatedBlog });
});

const deleteBlog = asyncHandler(async (req, res) => {
  const blog = await Blog.findById(req.params.id);

  if (!blog) {
    return res.status(404).json({ 
      success: false,
      error: 'Blog not found' 
    });
  }

  if (!blog.author.equals(req.user._id)) {
    return res.status(401).json({ 
      success: false,
      error: 'Not authorized to delete this blog' 
    });
  }

  await Blog.deleteOne({ _id: blog._id });

  return res.status(200).json({ 
    success: true, 
    data: {} 
  });
});

module.exports = {
  getBlogs,
  getMyBlogs,
  getBlog,
  createBlog,
  updateBlog,
  deleteBlog,
};