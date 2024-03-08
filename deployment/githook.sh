#!/bin/bash
# This hook builds pixelplanet after a push to a development branch,
# and starts the dev-canvas
#
# To set up a server to use this, you have to go through the building steps manually first.
#
#folder for building the canvas (the git repository will get checkout there and the canvas will get built thtere)
BUILDDIR="/home/pixelpla/pixelplanet-build"
#folder for dev canvas
DEVFOLDER="/home/pixelpla/pixelplanet-dev"

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
  [ $REINSTALL -eq 0 ] && npm_reinstall
  pm2 start ecosystem.yml
  cd -
}

while read oldrev newrev refname
do
    GIT_WORK_TREE="$BUILDDIR" GIT_DIR="${BUILDDIR}/.git" git fetch --all
    cd "$BUILDDIR"
    branch=$(git rev-parse --symbolic --abbrev-ref $refname)
    if [ "test" == "$branch" ] || [ "devel" == "$branch" ]; then
        echo "---UPDATING REPO ON DEV SERVER---"
        pm2 stop ppfun-server-dev
        GIT_WORK_TREE="$BUILDDIR" GIT_DIR="${BUILDDIR}/.git" git reset --hard "origin/$branch"
        echo "---BUILDING pixelplanet---"
        should_reinstall dev
        DO_REINSTALL=$?
        [ $DO_REINSTALL -eq 0 ] && npm_reinstall
        nice -n 19 npm run build:dev
        echo "---RESTARTING CANVAS---"
        copy "${DEVFOLDER}" "${DO_REINSTALL}"
    fi
done
