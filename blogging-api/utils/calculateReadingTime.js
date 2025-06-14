const calculateReadingTime = (text) => {
  const wordsPerMinute = 200; // Average reading speed
  const wordCount = text.split(/\s+/).length;
  const readingTime = Math.ceil(wordCount / wordsPerMinute);
  return readingTime;
};

module.exports = calculateReadingTime;