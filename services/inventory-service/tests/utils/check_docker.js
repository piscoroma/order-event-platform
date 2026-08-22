const { execSync } = require('child_process');

function checkDocker() {
    try {
        execSync('docker info', {
            stdio: 'ignore'
        });
    } catch {
        throw new Error(
            'Integration tests require a working Docker runtime. ' +
            'Please install Docker and make sure the Docker daemon is running.'
        );
    }
}

module.exports = { checkDocker }