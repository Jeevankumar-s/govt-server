const express = require('express');
const cors = require('cors');  // Import the cors module
const app = express();
const { sequelize } = require('./models');

app.use(cors());  // Enable CORS for all origins

app.use(express.json());
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/outpass', require('./routes/outpassRoutes'));

app.get('/helloworld', (req, res) => {
  res.send("Hello World");
});

// Sync database and start server
sequelize.sync({ alter: true }).then(() => {
  app.listen(3000, () => console.log('Server is running on port 3000'));
});
