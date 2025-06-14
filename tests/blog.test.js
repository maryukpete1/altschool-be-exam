const request = require('supertest');
const { createApp } = require('../app');
const app = createApp();
const Blog = require('../models/blog.model');
const User = require('../models/user.model');
const mongoose = require('mongoose');

let authToken;
let userId;
let testBlogId;

describe('Blog API', () => {
  beforeAll(async () => {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    // Clear existing data
    await User.deleteMany({});
    await Blog.deleteMany({});

    // Register test user
    const user = await request(app)
      .post('/api/auth/register')
      .send({
        first_name: 'Test',
        last_name: 'User',
        email: 'test@example.com',
        password: 'password123',
      });

    authToken = user.body.token;
    userId = user.body._id;
  }, 15000); // 15s timeout for setup

  afterAll(async () => {
    // Cleanup database
    await Blog.deleteMany({});
    await User.deleteMany({});
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

      testBlogId = res.body.data._id;

      expect(res.statusCode).toEqual(201);
      expect(res.body.data.state).toEqual('draft');
      expect(res.body.data.reading_time).toBeGreaterThan(0);
      expect(res.body.data.author).toEqual(userId);
    }, 10000);

    it('should require authentication', async () => {
      const res = await request(app)
        .post('/api/blogs')
        .send({
          title: 'Unauthorized Blog',
          body: 'Should fail'
        });

      expect(res.statusCode).toEqual(401);
    }, 5000);
  });

  describe('GET /api/blogs', () => {
    beforeAll(async () => {
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
    }, 10000);

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
      const blog = await Blog.create({
        title: 'Unauthorized Update',
        body: 'Content',
        state: 'draft',
        author: new mongoose.Types.ObjectId() // Different author
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
      const blog = await Blog.create({
        title: 'Protected Blog',
        body: 'Content',
        state: 'published',
        author: new mongoose.Types.ObjectId() // Different author
      });

      const res = await request(app)
        .delete(`/api/blogs/${blog._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toEqual(401);
    }, 5000);
  });

  describe('GET /api/blogs/my-blogs', () => {
    it('should get current user blogs', async () => {
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

      const res = await request(app)
        .get('/api/blogs/my-blogs')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);
      expect(res.body.data.every(blog => blog.author._id === userId)).toBe(true);
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