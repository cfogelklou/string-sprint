#!/bin/bash
set -e
sftp -o IdentityFile="./id_rsa_sftp" -o "StrictHostKeyChecking=no" -b ./scripts/deploy_sftp.txt cfg90a6nm_ssh@ssh.cfg90a6nm.service.one
