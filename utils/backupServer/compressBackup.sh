#!/bin/bash
# Should be run as daily cron job
#
# Makes backup dirs smaller, first by hardlinking duplicate files of daily backups every day
#   (duplicates within the time folders (incremential backups) of the previous day,
#    and the tiles folder of current day (full backups) to tiles folder of previous day within the same month)
# second by archieving full months into read-only squashfs at the 1st of the next month
# Has to be run as root for the squashfs to be able to get mounted
#
# arguments:
#  NONE to take system date to decide what to do (run as daily cronjob)
#  or: 
#  $1 = Date in format YYYYMMDD

# CHANGE THIS TO YOUR PATH
BACKUPROOT="/home/backup/pixelplanet/canvas"
# mount options of created monthly squashfs images
MOUNT_OPTIONS="ro,defaults"

# NO CHANGE PAST THIS NEEDED

if [ "$1" != "" ]
  then
    set -e
    TODAY=`printf "%(%Y/%m/%d)T" \`date --utc --date "$1" +%s\``
    YESTERDAY=`printf "%(%Y/%m/%d)T" $(( $(date --utc --date "$1" +%s) - 24*3600 ))`
    set +e
  else
    TODAY=`printf "%(%Y/%m/%d)T" -1`
    YESTERDAY=`printf "%(%Y/%m/%d)T" $(( $(printf "%(%s)T" -1) - 24*3600 ))`
fi

echo $TODAY $YESTERDAY

echo "---Resolve duplicates in incremental backups for ${YESTERDAY}---"
DIR="${BACKUPROOT}/${YESTERDAY}"
if [ -w "${DIR}" ]; then
  for CAN_DIR in `ls ${DIR}`; do
    echo "-Canvas ${CAN_DIR}-"
    shopt -s nullglob;
    TIMEDIRS=("${DIR}"/"${CAN_DIR}"/*/);
    shopt -u nullglob;
    CNT=$[${#TIMEDIRS[@]}-2]
    IT=0
    while [ $IT -lt $CNT ]; do
      DIRF="${TIMEDIRS[${IT}]}"
      IT=$[${IT}+1]
      DIRS="${TIMEDIRS[${IT}]}"
      for COL in `ls ${DIRS}`; do
        if [ -d "${DIRF}${COL}" ] && [ -d "${DIRS}${COL}" ]; then
          echo /usr/bin/hardlink --respect-name --ignore-time --ignore-owner --maximize "${DIRF}${COL}" "${DIRS}${COL}"
          /usr/bin/hardlink --respect-name --ignore-time --ignore-owner --maximize "${DIRF}${COL}" "${DIRS}${COL}"
        fi
      done
    done
  done
fi

# if beginning of month
if [ `echo "${TODAY}" | sed 's/.*\///'` == "01" ]
  then
    echo "---mksquashfs previous month---"
    PREV_YEAR=`echo "${YESTERDAY}" | sed 's/\/.*//'`
    PREV_MONTH=`echo "${YESTERDAY}" | sed 's/[^\/]*\///' | sed 's/\/.*//'`
    SQUASH_FILE="${BACKUPROOT}/${PREV_YEAR}/${PREV_MONTH}.sqsh.gz"
    if [ ! -f "${SQUASH_FILE}" ]; then
      echo "doing ${SQUASH_FILE}"
      set -e
      echo "mksquashfs ${BACKUPROOT}/${PREV_YEAR}/${PREV_MONTH} ${SQUASH_FILE} -b 8192 -no-xattrs -progress -no-exports"
      /usr/sbin/mksquashfs "${BACKUPROOT}/${PREV_YEAR}/${PREV_MONTH}" ${SQUASH_FILE} -b 8192 -no-xattrs -progress -no-exports
      if [ -f "${SQUASH_FILE}" ]; then
        echo "Mount ${SQUASH_FILE}"
        mv "${BACKUPROOT}/${PREV_YEAR}/${PREV_MONTH}" "${BACKUPROOT}/${PREV_YEAR}/rem"
        mkdir "${BACKUPROOT}/${PREV_YEAR}/${PREV_MONTH}"
        echo "${SQUASH_FILE} ${BACKUPROOT}/${PREV_YEAR}/${PREV_MONTH} squashfs ${MOUNT_OPTIONS} 0 0" >> /etc/fstab
        /usr/bin/mount "${BACKUPROOT}/${PREV_YEAR}/${PREV_MONTH}"
        echo "cleaning up old files... this might take a while"
        rm -rf "${BACKUPROOT}/${PREV_YEAR}/rem"
      fi
      set +e
    else
      echo "${SQUASH_FILE} already exists. Don't do mksquashfs."
    fi
  else
    DIR="${BACKUPROOT}/${YESTERDAY}"
    PREV_DIR="${BACKUPROOT}/${TODAY}"
    echo "---Resolve duplicates to full backup to previous day---"
    if [ -w "${DIR}" ]; then
      for CAN_DIR in `ls ${DIR}`; do
        if [ -d "${DIR}/${CAN_DIR}/tiles" ] && [ -d "${PREV_DIR}/${CAN_DIR}/tiles" ]; then
          for COL in `ls ${DIR}/${CAN_DIR}/tiles`; do
            WDIR="${CAN_DIR}/tiles/${COL}"
            echo "----${CAN_DIR} / ${COL}----"
            if [ -d "${DIR}/${WDIR}" ] && [ -d "${PREV_DIR}/${WDIR}" ]; then
              echo /usr/bin/hardlink --respect-name --ignore-time --ignore-owner -maximize "${DIR}/${WDIR}" "${PREV_DIR}/${WDIR}"
              /usr/bin/hardlink --respect-name --ignore-time --ignore-owner --maximize "${DIR}/${WDIR}" "${PREV_DIR}/${WDIR}"
            fi
          done
        fi
      done
    fi
fi

exit 0
