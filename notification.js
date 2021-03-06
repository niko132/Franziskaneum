var CRC32 = require('crc-32');
var request = require('request');
var xml2js = require('xml2js');
const {Client} = require('pg');

function hasCourse(searchString, courses) {
	for (var i = 0; i < courses.length; i++) {
		var course = courses[i];

		if (searchString.indexOf(course) > -1) {
			return true;
		}
	}

	return false;
}

var main = function () {
	var start = Date.now();
	
	var username = "FranzApp";
	var password = "Franz2018";
	var url = "http://franziskaneum.de/vplan/vplank.xml";
	var auth = "Basic " + new Buffer(username + ":" + password).toString("base64");

	request({
		url: url,
		headers: {
			"Authorization": auth
		}
	},
		function (error, response, body) {
		var parser = new xml2js.Parser();
		parser.parseString(body, function (err, result) {
			var haupt = result.vp.haupt[0];

			// TODO: gucken ob Vertretungsplan neu ist

			const pgClient = new Client({
					connectionString: process.env.DATABASE_URL,
				});
			pgClient.connect();
			
			var queryPromises = [];

			pgClient.query("SELECT * FROM users", (err, res) => {
				for (var i = 0; i < res.rows.length; i++) {
					var user = res.rows[i];

					if (!user.show_notifications) {
						continue;
					}

					var userNotifications = [];

					var userNot = '';
					var userNotCount = 0;

					if (user.is_teacher) {
						console.log('teacher user');

						var shortcut = user.teacher_shortcut;

						if (shortcut) {
							for (var j = 0; j < haupt.aktion.length; j++) {
								var aktion = haupt.aktion[j];
								var searchString = aktion.lehrer[0] + ' ' + aktion.info[0];

								if (searchString.indexOf(shortcut) > -1) {
									userNotifications.push(aktion.stunde[0] + '. St. ' + aktion.fach[0] + ' ' + aktion.klasse[0] + ' ' + aktion.raum[0] + ' ' + aktion.info[0]);

									userNot += aktion.stunde[0] + '. St. ' + aktion.fach[0] + ' ' + aktion.klasse[0] + ' ' + aktion.raum[0] + ' ' + aktion.info[0];
									userNot += '\n';

									userNotCount += 1;
								}
							}
						}
					} else {
						var schoolClass = user.school_class;

						if (schoolClass >= 11) {
							console.log('sek2 user');

							var courses = user.courses;

							if (courses.length > 0) {
								for (var j = 0; j < haupt.aktion.length; j++) {
									var aktion = haupt.aktion[j];

									if (aktion.klasse[0].indexOf(schoolClass) > -1 && hasCourse(aktion.klasse[0], courses)) {
										userNotifications.push(aktion.stunde[0] + '. St. ' + aktion.fach[0] + ' ' + aktion.lehrer[0] + ' ' + aktion.raum[0] + ' ' + aktion.info[0]);

										userNot += aktion.stunde[0] + '. St. ' + aktion.fach[0] + ' ' + aktion.lehrer[0] + ' ' + aktion.raum[0] + ' ' + aktion.info[0];
										userNot += '\n';

										userNotCount += 1;
									}
								}
							}
						} else if (schoolClass >= 5) { // default value von 0 vermeiden
							console.log('sek1 user');

							var schoolClassIndex = user.school_class_index;

							if (schoolClassIndex > 0) {
								var schoolClassString = schoolClass + '/' + schoolClassIndex;

								for (var j = 0; j < haupt.aktion.length; j++) {
									var aktion = haupt.aktion[j];

									if (aktion.klasse[0].indexOf(schoolClassString) > -1) {
										userNotifications.push(aktion.stunde[0] + '. St. ' + aktion.fach[0] + ' ' + aktion.lehrer[0] + ' ' + aktion.raum[0] + ' ' + aktion.info[0]);

										userNot += aktion.stunde[0] + '. St. ' + aktion.fach[0] + ' ' + aktion.lehrer[0] + ' ' + aktion.raum[0] + ' ' + aktion.info[0];
										userNot += '\n';

										userNotCount += 1;
									}
								}
							}
						}
					}

					var userNotificationHashes = [];
					var newNotificationIndices = [];

					for (var j = 0; j < userNotifications.length; j++) {
						var hash = CRC32.str(userNotifications[j]);
						userNotificationHashes.push(hash);

						console.log(hash);

						if (user.notification_hashes.indexOf(hash) <= -1) { // this hash wasn't already presented
							newNotificationIndices.push(j);
						}
					}
					
					var hashesString = userNotificationHashes.join(",");

					console.log("NEW NOTIFICATIONS: " + newNotificationIndices.length);

					// insert 'userNotificationHashes' in database
					console.log("query: " + hashesString);
					queryPromises.push(new Promise(function(resolve, reject) {
						pgClient.query("UPDATE users SET notification_hashes = '{" + hashesString + "}' WHERE token = '" + user.token + "'", (err, res) => {
							resolve();
						});
					}));

					if (newNotificationIndices.length > 0) { // new notifications -> request fcm
						var notificationCount = newNotificationIndices.length;

						var body = {
							to: user.token,
							notification: {
								body: notificationCount + ' Änderungen '
							}
						}

						console.log(JSON.stringify(body));

						request({
							url: 'https://fcm.googleapis.com/fcm/send',
							method: 'POST',
							body: JSON.stringify(body),
							headers: {
								"Content-Type": "application/json",
								"Authorization": "key=AIzaSyDCVVrr4nA3Pd6LmOWO7i0m95ASCTusw68"
							}
						},
							function (error, response, body) {
							console.log(body);

							// TODO: Handle "InvalidRegistration" -> Delete Row
						});
					}
				}
				
				Promise.all(queryPromises).then(function() {
					pgClient.end();
					console.log("Elapsed Time: " + (Date.now() - start) + "ms");
				});
			});
		});
	});
}

main();

module.exports = {
	start: main
};
