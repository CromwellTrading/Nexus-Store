// server.js
require('dotenv').config();
const app = require('./app');
const PORT = process.env.PORT || 6000;

app.listen(PORT, () => {
  console.log(`🚀 Servidor backend corriendo en el puerto ${PORT}`);
});
