Note: only works in bash environment (i.e. Mac/Linux)

1. ./deploy.sh

This zips up the project directory and sends it to the server.

2. ssh -i ./ec2.pem ec2-user@3.105.115.115

This logs you in to the server.

Once in the server:

1. sudo su

This gives you super user permissions

2. ps -e -f | grep node build/server.js

This gives you the process ID of the current node process.
The process ID will be in the second column.

3. kill -KILL [process ID]

This ends the node process to free up the port so we can start it again with the new version

3. ./extract.sh

This extracts the API that was sent the server, installs the required NPM dependencies, and starts the server.

---

This deployment process is very basic; most of it would be automated if this was an actual product in industry :)