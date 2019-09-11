#!/bin/bash
zip -r API.zip .
scp -i ~/p/main2.pem API.zip ec2-user@3.105.115.115:~
rm API.zip