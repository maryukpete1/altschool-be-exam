const request = require('supertest');
const { createApp } = require('../app');
const app = createApp();
const Blog = require('../models/blog.model');
const User = require('../models/user.model');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

let authToken;
let userId;
let testBlogId;

// Helper function to clean up database
const cleanupDatabase = async () => {
  await User.deleteMany({});
  await Blog.deleteMany({});
};

// Helper function to create test user and get token
const createTestUser = async () => {
  const user = await User.create({
    first_name: 'Test',
    last_name: 'User',
    email: 'test@example.com',
    password: 'password123',
  });

  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '30d',
  });

  return { user, token };
};

describe('Blog API', () => {
  beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_URI);
    await cleanupDatabase();
    const { user, token } = await createTestUser();
    authToken = token;
    userId = user._id;
  }, 15000);

  beforeEach(async () => {
    await cleanupDatabase();
    const { user, token } = await createTestUser();
    authToken = token;
    userId = user._id;
  });

  afterAll(async () => {
    await cleanupDatabase();
    await mongoose.connection.close();
  });

  describe('POST /api/blogs', () => {
    it('should create a new blog in draft state', async () => {
      const res = await request(app)
        .post('/api/blogs')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Test Blog',
          description: 'Test Description',
          tags: ['test', 'blog'],
          body: 'This is a test blog post body content.',
        });

      expect(res.statusCode).toEqual(201);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data.state).toEqual('draft');
      expect(res.body.data.author.toString()).toEqual(userId.toString());
      
      // Store the created blog ID for later tests
      testBlogId = res.body.data._id;
    }, 10000);
  });
  
  describe('GET /api/blogs', () => {
    beforeEach(async () => {
      // Create sample published blogs
      await Blog.create([
        {
          title: 'Published Blog 1',
          body: 'Content 1',
          state: 'published',
          author: userId
        },
        {
          title: 'Published Blog 2',
          body: 'Content 2',
          state: 'published',
          author: userId
        }
      ]);
    });

    it('should get all published blogs', async () => {
      const res = await request(app)
        .get('/api/blogs');

      expect(res.statusCode).toEqual(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);
      expect(res.body.data.every(blog => blog.state === 'published')).toBe(true);
    }, 5000);

    it('should support pagination', async () => {
      const res = await request(app)
        .get('/api/blogs?page=1&limit=1');

      expect(res.statusCode).toEqual(200);
      expect(res.body.data.length).toEqual(1);
      expect(res.body.pages).toBeGreaterThan(1);
    }, 5000);

    it('should filter by state', async () => {
      await Blog.create({
        title: 'Draft Blog',
        body: 'Draft content',
        state: 'draft',
        author: userId
      });

      const res = await request(app)
        .get('/api/blogs?state=draft');

      expect(res.statusCode).toEqual(200);
      expect(res.body.data.every(blog => blog.state === 'draft')).toBe(true);
    }, 5000);
  });

  describe('GET /api/blogs/:id', () => {
    it('should get a single blog', async () => {
      const blog = await Blog.create({
        title: 'Single Blog',
        body: 'Single content',
        state: 'published',
        author: userId
      });

      const res = await request(app)
        .get(`/api/blogs/${blog._id}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.data._id).toEqual(blog._id.toString());
      expect(res.body.data.read_count).toEqual(1);
    }, 5000);

    it('should increment read count', async () => {
      const blog = await Blog.create({
        title: 'Read Count Blog',
        body: 'Read count content',
        state: 'published',
        author: userId
      });

      await request(app).get(`/api/blogs/${blog._id}`);
      await request(app).get(`/api/blogs/${blog._id}`);

      const updatedBlog = await Blog.findById(blog._id);
      expect(updatedBlog.read_count).toEqual(2);
    }, 5000);
  });

  describe('PUT /api/blogs/:id', () => {
    it('should update a blog', async () => {
      const blog = await Blog.create({
        title: 'Update Test',
        body: 'Original content',
        state: 'draft',
        author: userId
      });

      const res = await request(app)
        .put(`/api/blogs/${blog._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Updated Title',
          state: 'published'
        });

      expect(res.statusCode).toEqual(200);
      expect(res.body.data.title).toEqual('Updated Title');
      expect(res.body.data.state).toEqual('published');
    }, 5000);

    it('should prevent unauthorized updates', async () => {
      // Create a different user for this test
      const otherUser = await User.create({
        first_name: 'Other',
        last_name: 'User',
        email: 'other@example.com',
        password: 'password123'
      });

      const blog = await Blog.create({
        title: 'Unauthorized Update',
        body: 'Content',
        state: 'draft',
        author: otherUser._id
      });

      const res = await request(app)
        .put(`/api/blogs/${blog._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Hacked' });

      expect(res.statusCode).toEqual(401);
    }, 5000);
  });

  describe('DELETE /api/blogs/:id', () => {
    it('should delete a blog', async () => {
      const blog = await Blog.create({
        title: 'Delete Test',
        body: 'Delete content',
        state: 'published',
        author: userId
      });

      const res = await request(app)
        .delete(`/api/blogs/${blog._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);

      const deletedBlog = await Blog.findById(blog._id);
      expect(deletedBlog).toBeNull();
    }, 5000);

    it('should prevent unauthorized deletion', async () => {
      // Create a different user for this test
      const otherUser = await User.create({
        first_name: 'Other',
        last_name: 'User',
        email: 'other2@example.com', // Changed email to avoid duplicate key error
        password: 'password123'
      });

      const blog = await Blog.create({
        title: 'Protected Blog',
        body: 'Content',
        state: 'published',
        author: otherUser._id
      });

      const res = await request(app)
        .delete(`/api/blogs/${blog._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toEqual(401);
    }, 5000);
  });

  describe('GET /api/blogs/my-blogs', () => {
    beforeEach(async () => {
      await Blog.create([
        {
          title: 'My Blog 1',
          body: 'Content 1',
          state: 'draft',
          author: userId
        },
        {
          title: 'My Blog 2',
          body: 'Content 2',
          state: 'published',
          author: userId
        }
      ]);
    });

    it('should get current user blogs', async () => {
      const res = await request(app)
        .get('/api/blogs/my-blogs')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);
      expect(res.body.data.every(blog => blog.author._id.toString() === userId.toString())).toBe(true);
    }, 5000);

    it('should filter by state', async () => {
      const res = await request(app)
        .get('/api/blogs/my-blogs?state=draft')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.data.every(blog => blog.state === 'draft')).toBe(true);
    }, 5000);
  });
});