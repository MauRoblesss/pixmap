#!/bin/bash
TMPDIR="/tmp/backup"

DATE_TODAY=`printf "%(%Y/%m/%d)T" -1`
DATE_YESTERDAY=`printf "%(%Y/%m/%d)T" $(( $(printf "%(%s)T" -1) - 24*3600 ))`

#delete older daily backup folders from local filesystem if exist
if [ -d "${TMPDIR}/${DATE_YESTERDAY}" ]
  then
    echo "Deleting past day from tmp-folder ${DATE_YESTERDAY}"
    rm -rf "${TMPDIR}/${DATE_YESTERDAY}"
fi

set -e
rsync -r ${TMPDIR}/ backup@ayylmao:/backup/pixelplanet/canvas

#clear current daily folder
#we do NOT delete the daily folder itself, because the backup script would create
#a new full backup if its missing
rm -rf ${TMPDIR}/${DATE_TODAY}/*
