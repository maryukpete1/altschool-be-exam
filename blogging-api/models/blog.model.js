const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const blogSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please provide a title for the blog'],
      unique: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    state: {
      type: String,
      enum: ['draft', 'published'],
      default: 'draft',
    },
    read_count: {
      type: Number,
      default: 0,
    },
    reading_time: {
      type: Number,
    },
    tags: {
      type: [String],
    },
    body: {
      type: String,
      required: [true, 'Please provide content for the blog'],
    },
  },
  { timestamps: true }
);

// Add pagination plugin
blogSchema.plugin(mongoosePaginate);

const Blog = mongoose.model('Blog', blogSchema);

module.exports = Blog;