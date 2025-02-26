const { app } = require('./src/app');
const dotenv = require('dotenv');

dotenv.config();


const port = process.env.PORT || 5000;
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'The service is up and running',
  });
});
app.listen(port, () => console.log(`Server running on port ${port}`));
