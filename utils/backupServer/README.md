# Scripts and notes for backup (historical view) server

## backupSync.sh
shell script that can be launched with backup.js to sync to a storage server after every backup. It uses rsync which is much faster than ftp, sftp or any other methode.

## Notes

Historical view and backups are best to be stored on a different server.
Backups do generate lots of files. Every day one full backup is made with png files for every single tile/chunks - and incremential backups all 15min into png files with just the changed pixels since the last full backup set.
If the filesystem has a limit on inodes, this is very likely to be hit within a year or so by the amount of small files.

We can mitigate this issue by turning duplicates into hardlinks (a file with multiple filenames/paths) and by compressing every month into a squshfs image. squashfs also compresses inodes. However, mksquashfs needs to parse all inodes, which takes lots of RAM (at least 256 bytes per inode - we got millions of files). We use the arguments `-b 8192 -no-xattrs -no-exports -progress`, where no-export is neccessary in order to not hit memory limit when mounting multiple images later.
We do all of this in:

## compressBackup.sh

Shell script that compresses the size of the backups with hardlink and squashfs. It is supposed to run as a daily cron script.
Look into it's source for a comment what it does and set BACKUPROOT within it.

This uses the hardlink_0.3 util from https://jak-linux.org/projects/hardlink/ which ships with current debian and ubuntu, but in a different version on other distributions.

