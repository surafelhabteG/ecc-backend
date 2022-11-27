const redis = require('redis');

const connection = () => {
  return {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'ecc'
  }
};

var redisClient;

(async () => {
  redisClient = redis.createClient();

  redisClient.on("error", (error) => console.error(`Error : ${error}`));

  await redisClient.connect();
})();


module.exports = connection();
module.exports = redisClient;
