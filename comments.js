// Create web server
const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const { randomBytes } = require('crypto'); // generate random id
const cors = require('cors');

const app = express();
app.use(bodyParser.json());
app.use(cors());

const commentsByPostId = {};

// Get comments by postId
app.get('/posts/:id/comments', (req, res) => {
  res.send(commentsByPostId[req.params.id] || []);
});

// Create comment
app.post('/posts/:id/comments', async (req, res) => {
  // Generate random id
  const commentId = randomBytes(4).toString('hex');
  const { content } = req.body;

  // Get comments to specific post
  const comments = commentsByPostId[req.params.id] || [];

  // Push new comment to comments
  comments.push({ id: commentId, content, status: 'pending' });

  // Update comments
  commentsByPostId[req.params.id] = comments;

  // Emit event to event-bus
  await axios.post('http://event-bus-srv:4005/events', {
    type: 'CommentCreated',
    data: {
      id: commentId,
      content,
      postId: req.params.id,
      status: 'pending',
    },
  });

  // Send response
  res.status(201).send(comments);
});

// Receive event from event-bus
app.post('/events', async (req, res) => {
  console.log('Event Received: ', req.body.type);

  const { type, data } = req.body;

  // Check event type
  if (type === 'CommentModerated') {
    // Get comments to specific post
    const comments = commentsByPostId[data.postId];

    // Find comment with specific id
    const comment = comments.find((comment) => {
      return comment.id === data.id;
    });

    // Update comment status
    comment.status = data.status;

    // Emit event to event-bus
    await axios.post('http://event-bus-srv:4005/events', {
      type: 'CommentUpdated',
      data: {
        id: data.id,
        content: data.content,
        postId: data.postId,
        status: data.status,
      },
    });
  }

  // Send response
  res.send({});
});