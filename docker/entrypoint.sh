#!/bin/sh
set -eu

if [ ! -f ./conf.json ]; then
  cp ./conf.json.example ./conf.json
fi

exec ./ragemp-server
