const express = require("express");
const { open } = require("sqlite");
const path = require("path");
const sqlite3 = require("sqlite3");
const axios = require("axios");
const cors = require('cors');

const dbPath = path.join(__dirname, 'transaction.db');
const app = express()
app.use(express.json())
app.use(cors());

let db = null;

const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(5005, () =>
      console.log('server running on http://localhost:5005')
    );
  } catch (error) {
    console.log(`Db Error ${error.message}`);
    process.exit(1);
  }
};
 
initializeDbAndServer();



// const fetchAndInsert = async () => {
//   const response = await axios.get(
//     "https://s3.amazonaws.com/roxiler.com/product_transaction.json"
//   );
//   const data = response.data;

//   for (let item of data) {
//     const queryData = `SELECT id FROM transactions WHERE id = ${item.id}`;
//     const existingData = await db.get(queryData);
//     if (existingData === undefined) {
//       const query = `
//    INSERT INTO transactions (id, title, price, description, category, image, sold, dateOfSale) 
//    VALUES (
//        ${item.id},
//        '${item.title.replace(/'/g, "''")}',
//        ${item.price},
//        '${item.description.replace(/'/g, "''")}',
//        '${item.category.replace(/'/g, "''")}',
//        '${item.image.replace(/'/g, "''")}',
//        ${item.sold},
//        '${item.dateOfSale.replace(/'/g, "''")}'
//    );
// `; /*The .replace(/'/g, "''") in the SQL query helps prevent SQL injection attacks by escaping single quotes.*/

//       await db.run(query);
//     }
//   }
//   console.log("Transactions added");
// };

// fetchAndInsert();
app.get('/', async (req, res) => {
  try {
    const { title = "", description = "", price = 0, month="03" } = req.query
    let getRes = null;
    if (month === "") {
        const searchRes = `SELECT * FROM transactions WHERE title LIKE '%${title}%' or description LIKE '%${description}%' or price LIKE ${price};`;
        getRes = await db.all(searchRes);
    } else {
        const paginationQuery = `
        SELECT *
        FROM transactions
        WHERE strftime('%m', dateOfSale) = '${month}';
    `;
      getRes = await db.all(paginationQuery);
    }

    res.status(200);
    res.send(getRes);
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
    
})


app.get('/months', async (req, res) => {
  try {
       const query = `
        SELECT strftime('%m', dateOfSale) AS month, COUNT(*) AS sold_count
        FROM transactions
        WHERE sold = 1
        GROUP BY month
        ORDER BY month;
    `;
    const getMonthsRes = await db.all(query);
    res.status(200);
    res.send(getMonthsRes);
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
})

app.get('/statistics', async (req, res) => {
  try {
    const soldItemQuery = `SELECT COUNT(*) AS sold_item FROM transactions WHERE sold = 1;`;
    const soldRes = await db.get(soldItemQuery);

    const unSoldItemQuery = `SELECT COUNT(*) AS unsold_item FROM transactions WHERE sold = 0;`;
    const unsoldRes = await db.get(unSoldItemQuery);

    const saleAmountQuery = `SELECT SUM(price) AS totalAmount FROM transactions WHERE sold = 1;`;
    const totalAmountRes = await db.get(saleAmountQuery);

    const statistics = [{
        soldRes: soldRes.sold_item,
        unsoldRes: unsoldRes.unsold_item,
        totalAmount: totalAmountRes.totalAmount || 0 // If no items were sold, the totalAmount will be null, so default to 0
    }];

    res.send({statistics });
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
    
});

app.get('/barchart', async (req, res) => {
  const { month="03" } = req.query;
  try {
    const getPriceRange = `
        SELECT 
            CASE 
                WHEN price BETWEEN 0 AND 100 THEN '0 - 100' 
                WHEN price BETWEEN 101 AND 200 THEN '101 - 200' 
                WHEN price BETWEEN 201 AND 300 THEN '201 - 300' 
                WHEN price BETWEEN 301 AND 400 THEN '301 - 400' 
                WHEN price BETWEEN 401 AND 500 THEN '401 - 500' 
                WHEN price BETWEEN 501 AND 600 THEN '501 - 600' 
                WHEN price BETWEEN 601 AND 700 THEN '601 - 700' 
                WHEN price BETWEEN 701 AND 800 THEN '701 - 800' 
                WHEN price BETWEEN 801 AND 900 THEN '801 - 900' 
                ELSE '901-above' 
            END AS price_range,
            COUNT(*) AS count
        FROM transactions 
        WHERE strftime('%m', dateOfSale) = '${month}'
        GROUP BY price_range
        ORDER BY price_range;
    `;
   const priceRangeRes = await db.all(getPriceRange);
  res.send(priceRangeRes);
  } catch (error) {
    res.status(500).send({ error: error.message });
  }

})

app.get('/piechart', async (req, res) => {
  try {
    const getCategoryQuery = `
      SELECT DISTINCT(category) AS category, COUNT(*) AS count_item FROM transactions GROUP BY category;
  `;
  const getCategory = await db.all(getCategoryQuery);
  res.send(getCategory);
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
})

app.get('/combinedData', async (req, res) => {
  const { month="03" } = req.query;
  try {
    const soldItemQuery = `SELECT COUNT(*) AS sold_item FROM transactions WHERE sold = 1;`;
    const soldRes = await db.get(soldItemQuery);

    const unSoldItemQuery = `SELECT COUNT(*) AS unsold_item FROM transactions WHERE sold = 0;`;
    const unsoldRes = await db.get(unSoldItemQuery);

    const saleAmountQuery = `SELECT SUM(price) AS totalAmount FROM transactions WHERE sold = 1;`;
    const totalAmountRes = await db.get(saleAmountQuery);

    const statistics = [{
        soldRes: soldRes.sold_item,
        unsoldRes: unsoldRes.unsold_item,
        totalAmount: totalAmountRes.totalAmount || 0 // If no items were sold, the totalAmount will be null, so default to 0
    }];
  const getPriceRange = `
        SELECT 
            CASE 
                WHEN price BETWEEN 0 AND 100 THEN '0 - 100' 
                WHEN price BETWEEN 101 AND 200 THEN '101 - 200' 
                WHEN price BETWEEN 201 AND 300 THEN '201 - 300' 
                WHEN price BETWEEN 301 AND 400 THEN '301 - 400' 
                WHEN price BETWEEN 401 AND 500 THEN '401 - 500' 
                WHEN price BETWEEN 501 AND 600 THEN '501 - 600' 
                WHEN price BETWEEN 601 AND 700 THEN '601 - 700' 
                WHEN price BETWEEN 701 AND 800 THEN '701 - 800' 
                WHEN price BETWEEN 801 AND 900 THEN '801 - 900' 
                ELSE '901-above' 
            END AS price_range,
            COUNT(*) AS count
        FROM transactions 
        WHERE strftime('%m', dateOfSale) = '${month}'
        GROUP BY price_range
        ORDER BY price_range;
    `;
    const priceRangeRes = await db.all(getPriceRange);
    
    const getCategoryQuery = `
      SELECT DISTINCT(category) AS category, COUNT(*) AS count_item FROM transactions GROUP BY category;
  `;
    const getCategory = await db.all(getCategoryQuery);
    
    const allApi = [{
      statistics: statistics,
      priceRange: priceRangeRes,
      category: getCategory
    }]

    res.send(allApi);
    
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});