const ObservableSlim = require('observable-slim');
const fs = require('fs');
const rootPath = require('app-root-path');

function create (name = 'cubby', defaultObject = {}, batch = false) {
	const cubbyDir = `${rootPath}/.cubby`,
		cubbyFileName = name.replace(/[^A-Z]{1,}/ig, '-').replace(/^-|-$/g, ''),
		cubbyFilePath = `${cubbyDir}/${cubbyFileName}.json`;

	let cubbyObject;

	if (!fs.existsSync(cubbyDir)) {
		fs.mkdirSync(cubbyDir);
	}

	if (!fs.existsSync(cubbyFilePath)) {
		cubbyObject = JSON.parse(JSON.stringify(defaultObject));
		fs.writeFileSync(cubbyFilePath, JSON.stringify(defaultObject));
	} else {
		cubbyObject = JSON.parse(fs.readFileSync(cubbyFilePath, {encoding: 'utf8'}));
	}

	let saving = false;

	let observableCubbyObject = ObservableSlim.create(
		cubbyObject,
		false,
		() => {
			if (!saving) {
				saving = true;
				process.nextTick(() => {
					saving = false;
					fs.writeFileSync(cubbyFilePath, JSON.stringify(observableCubbyObject));
				});
			}
		}
	);

	return observableCubbyObject;
}

module.exports = create;