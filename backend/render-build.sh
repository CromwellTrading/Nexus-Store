#!/usr/bin/env bash
set -o errexit

echo "--> Instalando dependencias de compilación..."
apt-get update
apt-get install -y python3 make g++

echo "--> Instalando dependencias de Node..."
npm install --production

echo "--> Construcción completada."
