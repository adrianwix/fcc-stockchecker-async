/*
*
*
*       Complete the API routing below
*
*
*/

"use strict";

require("dotenv").config();
/* eslint-disable no-unused-vars */
const expect = require("chai").expect;
const MongoClient = require("mongodb");
/* eslint-enable no-unused-vars */
const mongoose = require("mongoose");
const Stock = require("../models/Stock");
const fetch = require("node-fetch");
const fakeResponse = require("./fakeResponse.json");

/* eslint-disable no-console */

mongoose.connect(
	process.env.DB,
	function(err, db) {
		if (err) {
			console.log(err);
		} else {
			console.log("MongoDB connected");
		}
	}
);

function alphaVantage(stock) {
	if (process.env.NODE_ENV == "testing") {
		return fakeResponse[stock];
	} else {
		return (
			"https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&symbol=" +
			stock +
			"&interval=5min&outputsize=compact&apikey=" +
			process.env.ALPHA_VANTAGE
		);
	}
}

module.exports = function(app) {
	app.route("/api/stock-prices").get(async function(req, res) {
		let { stock, like } = req.query;
		// Handle one stock
		// let ip = req.ip + Math.random() * 100;
		let ip = req.ip;
		try {
			if (typeof stock == "string") {
				let dbStock = await Stock.findOne({ stock });
				// Stock dont exist
				if (!dbStock) {
					let stockData = await createStockAndResponse(stock);
					return res.json({ stockData });
				} /* Stock exist */ else {
					// Like
					let stockData = await createResponse(dbStock);
					return res.json({ stockData });
				}
			} /* 2 stocks in array */ else {
				try {
					let dbStocks = await Stock.find({ stock: { $in: [...stock] } });
					// Paths depend of the presence of the stocks in the DB
					if (dbStocks.length == 2) {
						let stockData0 = await createResponse(dbStocks[0]);
						let stockData1 = await createResponse(dbStocks[1]);
						return res.json({ stockData: [stockData0, stockData1] });
					} else if (dbStocks.length == 1) {
						let missingStock = stock.filter(
							stock => stock != dbStocks[0].stock
						);
						let stockData0 = await createResponse(dbStocks[0]);
						let stockData1 = await createStockAndResponse(missingStock);
						return res.json({ stockData: [stockData0, stockData1] });
					} else {
						let stockData0 = await createStockAndResponse(stock[0]);
						let stockData1 = await createStockAndResponse(stock[1]);
						return res.json({ stockData: [stockData0, stockData1] });
					}
				} catch (error) {
					res.status(404).json(error);
				}
			}
		} catch (error) {
			console.log(error);
			res.status(404).json(error);
		}

		/**
		 * @description This function fetch the Stock data a return an object
		 * @param {*} stock Mongoose query object
		 */
		async function stockResObj(stock) {
			try {
				let stockName = stock.stock;
				let stockNameUP = stockName.toUpperCase();
				let url = alphaVantage(stockNameUP);
				let alphaVStock;
				if (process.env.NODE_ENV == "testing") {
					alphaVStock = url;
				} else {
					let response = await fetch(url).catch(err =>
						res.status(404).json(err)
					);
					alphaVStock = await response.json();
				}
				return {
					stock: stockName,
					likes: stock.likes.length,
					price:
						alphaVStock["Time Series (5min)"][
							alphaVStock["Meta Data"]["3. Last Refreshed"]
						]
				};
			} catch (error) {
				console.log(error);
			}
		}

		async function createResponse(dbStock) {
			try {
				if (like && dbStock.likes.indexOf(ip) === -1) {
					dbStock.likes.unshift(ip);
					let savedStock = await dbStock.save();
					let stockData = await stockResObj(savedStock);
					return stockData;
				} else {
					let stockData = await stockResObj(dbStock);
					return stockData;
				}
			} catch (error) {
				res.status(404).json(error);
			}
		}

		async function createStockAndResponse(stock) {
			try {
				let newStock = new Stock({ stock });
				// Like
				if (like) {
					newStock.likes = [ip];
				}
				let savedStock = await newStock.save();
				let stockResponse = await stockResObj(savedStock);
				return stockResponse;
			} catch (error) {
				res.status(404).json(error);
			}
		}
	});
};
