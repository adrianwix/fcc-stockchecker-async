var MongoClient = require("mongodb");
var mongoose = require("mongoose");
var Schema = mongoose.Schema;

const stockSchema = new Schema({
  stock: {
    type: String,
    required: true
  },
  likes: {
    type: [String],
    default: []
  }
});

const Stock = mongoose.model("Stock", stockSchema);

module.exports = Stock;
