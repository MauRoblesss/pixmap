#!/bin/bash
# Rebuild and Restert pixelplanet

#folder for building the canvas (the git repository will get checkout there and the canvas will get buil thtere)
BUILDDIR="/home/pixelpla/pixelplanet-build"
#folder for dev canvas
DEVFOLDER="/home/pixelpla/pixelplanet-dev"
#folder for production canvas
PFOLDER="/home/pixelpla/pixelplanet"
#which branch to use
BRANCH="master"

should_reinstall () {
    local TMPFILE="${BUILDDIR}/package.json.${1}.tmp"
    local NODEDIR="${BUILDDIR}/node_modules"
    local ORFILE="${BUILDDIR}/package.json"
    [ -f "${TMPFILE}" ] && [ -d "${NODEDIR}" ] && diff -q  "${TMPFILE}" "${ORFILE}" && {
        echo "package.json stil the same, no need to rerun npm install."
        return 1
    }
    cp "${ORFILE}" "${TMPFILE}"
    echo "package.json changed, need to run npm install."
    return 0
}

npm_reinstall () {
    rm -rf node_modules
    rm package-lock.json 
    npm install
}

copy () {
  local TARGETDIR="${1}"
  local REINSTALL="${2}"
  cp -r "${BUILDDIR}"/dist/*.js "${TARGETDIR}/"
  cp -r "${BUILDDIR}"/dist/workers "${TARGETDIR}/"
  rm -rf "${TARGETDIR}/public/assets"
  cp -r "${BUILDDIR}"/dist/public "${TARGETDIR}/"
  cp -r "${BUILDDIR}"/dist/captchaFonts "${TARGETDIR}/"
  cp -r "${BUILDDIR}"/dist/package.json "${TARGETDIR}/"
  mkdir -p "${TARGETDIR}/log"
  cd "${TARGETDIR}"
  [ ${REINSTALL} -eq 0 ] && npm_reinstall
  cd -
}

cd "$BUILDDIR"
GIT_WORK_TREE="$BUILDDIR" GIT_DIR="${BUILDDIR}/.git" git fetch --all
echo "---UPDATING REPO ON PRODUCTION SERVER---"
GIT_WORK_TREE="$BUILDDIR" GIT_DIR="${BUILDDIR}/.git" git reset --hard "origin/${BRANCH}"
echo "---BUILDING pixelplanet---"
should_reinstall master
DO_REINSTALL=$?
[ $DO_REINSTALL -eq 0 ] && npm_reinstall
npm run build
echo "---RESTARTING CANVAS---"
cp dist/canvases.json ~/
cd "$PFOLDER"
pm2 stop ppfun-backups
pm2 stop ecosystem.config.js
copy "${PFOLDER}" "${DO_REINSTALL}"
pm2 start ecosystem-backup.yml
pm2 start ecosystem.config.js
