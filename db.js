const mongoose = require('mongoose');

const connectDB = async () => {
  const url = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.jnyakil.mongodb.net/language?retryWrites=true&w=majority`;
  try {
    const conn = await mongoose.connect(url, {});
    console.log(`MongoDB connected :${conn.connection.host}`);

    return conn;
  } catch (error) {
    console.error(`error${error}`);
    process.exit(1);
  }
};
exports.connectDB = connectDB
