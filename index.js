const express = require('express')
const bodyParser = require('body-parser')
const helmet = require('helmet')

const app = express();
app.set('port', process.env.PORT || 5000);
app.use(bodyParser.json());
app.use(helmet());

require('./routes')(app);

app.listen(app.get('port'), () => {
  console.log("info", 'The node app is running on port ' + app.get('port'))
});
