const config = require('./config')
const express = require('express')
const basicAuth = require('express-basic-auth')

function getUnauthorizedResponse(req){
  return req.auth
        ? ('Credentials ' + req.auth.user + ':' + req.auth.password + ' rejected')
        : 'No credentials provided';
}

const oUser = { "testuser": "thisshouldbestoredsafelyelsewhere" };

module.exports = (app) => {
  app.use('/webchat', express.static("./Webchat/dist"));
  app.use('/', [basicAuth({ users: oUser, challenge: true, unauthorizedResponse: getUnauthorizedResponse }), express.static("./webcontent")]);

  app.post('/myWebhookRoute', basicAuth({ users: oUser }), (req, res) => {
    const sLang = req.body.conversation.language; // current conversation language
    const oMemory = req.body.conversation.memory; // bot memory - you can to maintain it, CAI will store requirements (collected entities) in it
		const aIntents = req.body.nlp.intents; // An array of the detected intents
		const aEntities = req.body.nlp.entities; // An object containing the recognized entites as properties
		const sSource = req.body.nlp.source; // the last user utterance / what the user just said
		const sSentiment = req.body.nlp.sentiment; // the sentiment according to the last user utterance

    res.send({
			replies: [
				{
					type: 'text',
					content: 'Hello World!'
				}
			],
			conversation: {
				memory: oMemory
			}
		});
  });
}
