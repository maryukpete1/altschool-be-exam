const request = require('supertest');
const app = require('../app');
const Blog = require('../models/blog.model');
const User = require('../models/user.model');
const mongoose = require('mongoose');

let authToken;
let userId;

describe('Blog API', () => {
  beforeAll(async () => {
    await User.deleteMany({});
    await Blog.deleteMany({});

    // Register a test user
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
      expect(res.body.data.state).toEqual('draft');
      expect(res.body.data.reading_time).toBeGreaterThan(0);
    });
  });

  describe('GET /api/blogs', () => {
    it('should get all published blogs', async () => {
      // Create a published blog
      await Blog.create({
        title: 'Published Blog',
        description: 'Published Description',
        tags: ['published'],
        body: 'Published content.',
        state: 'published',
        author: userId,
      });

      const res = await request(app).get('/api/blogs');

      expect(res.statusCode).toEqual(200);
      expect(res.body.data.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/blogs/:id', () => {
    it('should get a single blog and increment read count', async () => {
      const blog = await Blog.create({
        title: 'Single Blog',
        description: 'Single Description',
        tags: ['single'],
        body: 'Single content.',
        state: 'published',
        author: userId,
      });

      const res = await request(app).get(`/api/blogs/${blog._id}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.data.read_count).toEqual(1);
    });
  });

  describe('PUT /api/blogs/:id', () => {
    it('should update a blog', async () => {
      const blog = await Blog.create({
        title: 'Update Blog',
        description: 'Update Description',
        tags: ['update'],
        body: 'Update content.',
        state: 'draft',
        author: userId,
      });

      const res = await request(app)
        .put(`/api/blogs/${blog._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          state: 'published',
        });

      expect(res.statusCode).toEqual(200);
      expect(res.body.data.state).toEqual('published');
    });
  });

describe('DELETE /api/blogs/:id', () => {
  it('should delete a blog', async () => {
    // Create a blog to delete
    const blog = await Blog.create({
      title: 'Delete Blog',
      description: 'Delete Description',
      tags: ['delete'],
      body: 'Delete content.',
      state: 'draft',
      author: userId,
    });

    const res = await request(app)
      .delete(`/api/blogs/${blog._id}`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);

    // Verify blog is deleted
    const deletedBlog = await Blog.findById(blog._id);
    expect(deletedBlog).toBeNull();
  });
});
});

afterAll(async () => {
    await Blog.deleteMany({});
    await mongoose.connection.close();
});