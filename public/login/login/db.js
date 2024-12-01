var mysql = require('mysql2');
var db = mysql.createConnection({
    host: '',
    user: '',
    password: '',
    database: ''
});
db.connect();

module.exports = db;