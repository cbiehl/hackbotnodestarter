const agent = require('superagent');

// Base64 encoding
function btoa(str) {
	return new Buffer(str).toString('base64');
};

// Base64 decoding
function atob(str){
	return new Buffer(str, 'base64').toString();
}

/*
	You can perform http requests to an on premise backend service
	using a destination and the Cloud Connector / connectivity service
	using the following code snippet. The function takes the destination name
	on SCP as parameter. Feel free to modify the function and ask questions.
	This requires the destination and connectivity services on SCP
	to be bound to your application and it requires a configuration
	in the SAP Cloud Connector (on-premise side).
*/
function callOnPremOData(destinationName){
	return new Promise((resolve, reject) => {
		// First we will get the destination details from SCP Cloud Foundry
		const vcap_services = JSON.parse(process.env.VCAP_SERVICES);
		if(!vcap_services.destination || vcap_services.destination.length === 0){
			console.error("You need an instance of the destination service on SCP.");
			console.error("Please make sure you bound the destination service to your app.");
			return reject("No destination service instance available");
		}
		if(!vcap_services.connectivity || vcap_services.connectivity.length === 0){
			console.error("You need an instance of the connectivity service on SCP.");
			console.error("Please make sure you bound the connectivity service to your app.");
			return reject("No connectivity service instance available");
		}

		const oDestination = vcap_services.destination[0].credentials;
		const oConnectivity = vcap_services.connectivity[0].credentials;

		// Get an oAuth token for accessing the destination service
		agent.post(oDestination.url + '/oauth/token')
			.set('Authorization', 'Basic ' + btoa(oDestination.clientid + ":" + oDestination.clientsecret))
			.send('client_id=' + oDestination.clientid)
			.send('grant_type=client_credentials')
			.then(res => {
				const token = res.body.access_token;

				// Get the destination configuration
				return agent.get(oDestination.uri + '/destination-configuration/v1/destinations/' + destinationName)
					.set('Authorization', 'Bearer ' + token)
					.send()
					.then(response => {
						return response.body.destinationConfiguration;
					})
					.catch(err => {
						return reject(err);
					})

			})
			.then(oDestinationConfig => {
				// Next we will get a connectivity token for using the connectivity service
				// The connectivity service is the SCP service connecting to the Cloud Connector
				return agent.post(oConnectivity.url + '/oauth/token')
					.set('Authorization', 'Basic ' + btoa(oConnectivity.clientid + ":" + oConnectivity.clientsecret))
					.send('client_id=' + oConnectivity.clientid)
		      .send('grant_type=client_credentials')
					.then(res => {
						return {
							oDest: oDestinationConfig,
							sConnectivityToken: res.body.access_token
						};
					})
					.catch(err => {
						return reject(err);
					})
			})
			.then(oRequestConfig => {
				// Perform the actual request with basic authentication (a technical user)
				// Change the URL endpoints according to your needs

				// First we might need to get a CSRF token
				agent.get(oRequestConfig.oDest.URL + "/sap/ZZ_MY_ODATA_SERVICE/")
					.set("Proxy-Authorization", "Bearer " + oRequestConfig.sConnectivityToken)
					.proxy("http://" + oConnectivity.onpremise_proxy_host + ":" + oConnectivity.onpremise_proxy_port)
					.set("Authorization", "Basic " + btoa(oRequestConfig.oDest.User + ":" + oRequestConfig.oDest.Password))
					.set("accept", "application/json")
					.set("Content-Type", "application/json; charset=utf-8")
					.set("X-CSRF-Token", "Fetch")
					.then(response => {
						const xcsrf_token =  response.header["x-csrf-token"];
						const cookies =  response.header["set-cookie"];

						// Perform the actual request (in this case a POST request)
						agent.post(oRequestConfig.oDest.URL + "/sap/ZZ_MY_ODATA_SERVICE/MyEntitySet?$format=json")
							.set("Proxy-Authorization", "Bearer " + oRequestConfig.sConnectivityToken)
							.proxy("http://" + oConnectivity.onpremise_proxy_host + ":" + oConnectivity.onpremise_proxy_port)
							.set("Authorization", "Basic " + btoa(oRequestConfig.oDest.User + ":" + oRequestConfig.oDest.Password))
							.set("accept", "application/json")
							.set("Content-Type", "application/json; charset=utf-8")
							.set("X-CSRF-Token", xcsrf_token)
							.set("Cookie", cookies)
							.send(oBody)
							.then(res => {
								// Resolve the promise returned by the function,
								// i.e. return the request body
								return resolve(res.body);
							})
							.catch(err => {
								console.error(err);
								return reject(err);
							})
					})
					.catch(err => {
						console.error(err);
						return reject(err);
					})
			})
			.catch(err => {
				return reject(err);
			})
	});
}

module.exports = {
	callOnPremOData
}
