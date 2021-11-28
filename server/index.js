dotenv = require("dotenv");
express = require("express");
fs = require("fs");
axios = require("axios");
path = require("path");
dotenv.config();
util = require("./util.js");
require("./global.js");


(async () => {
  const PORT = process.env.PORT || 3001;
  const app = express();
  
  app.use(express.urlencoded());
  app.use(express.json());
  console.log("NODE_ENV", process.env.NODE_ENV);
  if (process.env.NODE_ENV != 'develop')
  { 
    app.use(express.static(path.join(__dirname, '../client/build')));
    app.get('/*', (req, res) => {
      res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`server is listenng on ${PORT}`);
  });

  app.post("/token_by_id", (req, res) => {
    let id = req.body.id;
    let ret = {};
    console.log("toekn by id", id);
    ret.success = item ? true : false;
    res.json(ret);
  });

})();
