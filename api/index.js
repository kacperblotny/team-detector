import cors from 'cors';
import express from 'express';

import dotenv from 'dotenv';
dotenv.config();

const app = express();
const port = 3001;

// Use CORS middleware
app.use(cors());

// Middleware to parse JSON and URL-encoded data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// const uploadVectorStoreRoutes = require('./routes/uploadVectorStore.routes');
// const uploadGameContentRoutes = require('./routes/uploadGameContent.routes');
// const manageStorageRoutes = require('./routes/storage.routes');
// const gamesRoutes = require('./routes/games.routes');
// const chatRoutes = require('./routes/chat.routes');

// app.use(uploadVectorStoreRoutes);
// app.use(uploadGameContentRoutes);
// app.use('/games', gamesRoutes);
// app.use('/storage', manageStorageRoutes);
// app.use('/chat', chatRoutes);\

import routes from './routes/routes.js';

app.use('/api', routes);

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
