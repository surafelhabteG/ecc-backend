const redis = require('redis');
const QueryBuilder = require('node-querybuilder');

const connection = {
  host: 'localhost',
  user: 'root',
  password: 'Abcd@5304',
  database: 'ecc'
};

const pool = new QueryBuilder(connection, 'mysql', 'pool');

var redisClient;

(async () => {
  redisClient = redis.createClient();

  redisClient.on("error", (error) => console.error(`Error : ${error}`));

  await redisClient.connect();
})();

module.exports = { pool, redisClient };