const paginateResults = (model) => async (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  // Build query
  const query = { state: 'published' };

  if (req.query.search) {
    const searchRegex = new RegExp(req.query.search, 'i');
    query.$or = [
      { title: searchRegex },
      { description: searchRegex },
      { tags: searchRegex },
    ];
  }

  if (req.query.author) {
    query.author = req.query.author;
  }

  if (req.query.state) {
    query.state = req.query.state;
  }

  // Build sort
  let sort = { createdAt: -1 }; // Default sort by newest

  if (req.query.sortBy) {
    const sortFields = req.query.sortBy.split(',');
    sort = sortFields.reduce((acc, field) => {
      let sortOrder = 1;
      if (field.startsWith('-')) {
        sortOrder = -1;
        field = field.substring(1);
      }
      acc[field] = sortOrder;
      return acc;
    }, {});
  }

  try {
    const results = await model
      .find(query)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate('author', 'first_name last_name email');

    const total = await model.countDocuments(query);

    res.paginatedResults = {
      success: true,
      count: results.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: results,
    };

    next();
  } catch (err) {
    next(err);
  }
};

module.exports = paginateResults;