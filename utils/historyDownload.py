#!/usr/bin/python3

import PIL.Image
import sys, io, os
import datetime
import asyncio
import aiohttp

USER_AGENT = "ppfun historyDownload 1.0 " + ' '.join(sys.argv[1:])
PPFUN_URL = "https://pixelplanet.fun"
PPFUN_STORAGE_URL = "https://storage.pixelplanet.fun"

# how many frames to skip
#  1 means none
#  2 means that every second frame gets captured
#  3 means every third
#  [...]
frameskip = 1

async def fetchMe():
    url = f"{PPFUN_URL}/api/me"
    headers = {
      'User-Agent': USER_AGENT
    }
    async with aiohttp.ClientSession() as session:
        attempts = 0
        while True:
            try:
                async with session.get(url, headers=headers) as resp:
                    data = await resp.json()
                    return data
            except:
                if attempts > 3:
                    print(f"Could not get {url} in three tries, cancelling")
                    raise
                attempts += 1
                print(f"Failed to load {url}, trying again in 5s")
                await asyncio.sleep(5)
                pass
            
async def fetch(session, url, offx, offy, image, bkg, needed = False):
    attempts = 0
    headers = {
      'User-Agent': USER_AGENT
    }
    while True:
        try:
            async with session.get(url, headers=headers) as resp:
                if resp.status == 404:
                    if needed:
                        img = PIL.Image.new('RGB', (256, 256), color=bkg)
                        image.paste(img, (offx, offy))
                        img.close()
                    return
                if resp.status != 200:
                    if needed:
                        continue
                    return
                data = await resp.read()
                img = PIL.Image.open(io.BytesIO(data)).convert('RGBA')
                image.paste(img, (offx, offy), img)
                img.close()
                return
        except:
            if attempts > 3:
                raise
            attempts += 1
            pass

async def get_area(canvas_id, canvas, x, y, w, h, start_date, end_date):
    canvas_size = canvas["size"]
    bkg = tuple(canvas['colors'][0])

    delta = datetime.timedelta(days=1)
    end_date = end_date.strftime("%Y%m%d")
    iter_date = None
    cnt = 0
    #frames = []
    previous_day = PIL.Image.new('RGB', (w, h), color=bkg)
    while iter_date != end_date:
        iter_date = start_date.strftime("%Y%m%d")
        print('------------------------------------------------')
        print('Getting frames for date %s' % (iter_date))
        start_date = start_date + delta

        fetch_canvas_size = canvas_size
        if 'historicalSizes' in canvas:
            for ts in canvas['historicalSizes']:
                date = ts[0]
                size = ts[1]
                if iter_date <= date:
                    fetch_canvas_size = size

        offset = int(-fetch_canvas_size / 2)
        xc = (x - offset) // 256
        wc = (x + w - offset) // 256
        yc = (y - offset) // 256
        hc = (y + h - offset) // 256
        print("Load from %s / %s to %s / %s with canvas size %s" % (xc, yc, wc + 1, hc + 1, fetch_canvas_size))

        tasks = []
        async with aiohttp.ClientSession() as session:
            image = PIL.Image.new('RGBA', (w, h))
            for iy in range(yc, hc + 1):
                for ix in range(xc, wc + 1):
                    url = '%s/%s/%s/%s/%s/tiles/%s/%s.png' % (PPFUN_STORAGE_URL, iter_date[0:4], iter_date[4:6] , iter_date[6:], canvas_id, ix, iy)
                    offx = ix * 256 + offset - x
                    offy = iy * 256 + offset - y
                    tasks.append(fetch(session, url, offx, offy, image, bkg, True))
            await asyncio.gather(*tasks)
            print('Got start of day')
            # check if image is all just one color to lazily detect if whole full backup was 404
            clr = image.getcolors(1)
            if clr is not None:
                print("Got faulty full-backup frame, using last frame from previous day instead.")
                image = previous_day.copy()
            cnt += 1
            #frames.append(image.copy())
            image.save('./timelapse/t%s.png' % (cnt))
            headers = {
                'User-Agent': USER_AGENT
            }
            while True:
                async with session.get('%s/history?day=%s&id=%s' % (PPFUN_URL, iter_date, canvas_id), headers=headers) as resp:
                    try:
                        time_list = await resp.json()
                        break
                    except:
                        print('Couldn\'t decode json for day %s, trying again' % (iter_date))
            i = 0
            for time in time_list:
                i += 1
                if (i % frameskip) != 0:
                    continue
                if time == '0000':
                    # 0000 incremential backups are faulty
                    continue
                tasks = []
                image_rel = image.copy()
                for iy in range(yc, hc + 1):
                    for ix in range(xc, wc + 1):
                        url = '%s/%s/%s/%s/%s/%s/%s/%s.png' % (PPFUN_STORAGE_URL, iter_date[0:4], iter_date[4:6] , iter_date[6:], canvas_id, time, ix, iy)
                        offx = ix * 256 + offset - x
                        offy = iy * 256 + offset - y
                        tasks.append(fetch(session, url, offx, offy, image_rel, bkg))
                await asyncio.gather(*tasks)
                print('Got time %s' % (time))
                cnt += 1
                #frames.append(image.copy())
                image_rel.save('./timelapse/t%s.png' % (cnt))
                if time == time_list[-1]:
                    # if last element of day, copy it to previous_day to reuse it when needed
                    print("Remembering last frame of day.")
                    previous_day.close()
                    previous_day = image_rel.copy();
                image_rel.close()
            image.close()
    previous_day.close()
    # this would save a gif right out of the script, but giffs are huge and not good
    #frames[0].save('timelapse.png', save_all=True, append_images=frames[1:], duration=100, loop=0, default_image=False, blend=1)


async def main():
    apime = await fetchMe()

    if len(sys.argv) != 5 and len(sys.argv) != 6:
        print("Download history of an area of pixelplanet - useful for timelapses")
        print("")
        print("Usage:    historyDownload.py canvasID startX_startY endX_endY start_date [end_date]")
        print("")
        print("→start_date and end_date are in YYYY-MM-dd formate")
        print("→user R key on pixelplanet to copy coordinates)")
        print("→images will be saved into timelapse folder)")
        print("canvasID: ", end='')
        for canvas_id, canvas in apime['canvases'].items():
            if 'v' in canvas and canvas['v']:
                continue
            print(f"{canvas_id} = {canvas['title']}", end=', ')
        print()
        print("-----------")
        print("You can create a timelapse from the resulting files with ffmpeg like that:")
        print("ffmpeg -framerate 15 -f image2 -i timelapse/t%d.png -c:v libvpx-vp9 -pix_fmt yuva420p output.webm")
        print("or lossless example:")
        print("ffmpeg -framerate 15 -f image2 -i timelapse/t%d.png -c:v libvpx-vp9 -pix_fmt yuv444p -qmin 0 -qmax 0 -lossless 1 -an output.webm")
        return

    canvas_id = sys.argv[1]

    if canvas_id not in apime['canvases']:
        print("Invalid canvas selected")
        return

    canvas = apime['canvases'][canvas_id]

    if 'v' in canvas and canvas['v']:
        print("Can\'t get area for 3D canvas")
        return

    start = sys.argv[2].split('_')
    end = sys.argv[3].split('_')
    start_date = datetime.date.fromisoformat(sys.argv[4])
    if len(sys.argv) == 6:
        end_date = datetime.date.fromisoformat(sys.argv[5])
    else:
        end_date = datetime.date.today()
    x = int(start[0])
    y = int(start[1])
    w = int(end[0]) - x + 1
    h = int( end[1]) - y + 1
    if not os.path.exists('./timelapse'):
        os.mkdir('./timelapse')
    await get_area(canvas_id, canvas, x, y, w, h, start_date, end_date)
    print("Done!")
    print("to create a timelapse from it:")
    print("ffmpeg -framerate 15 -f image2 -i timelapse/t%d.png -c:v libvpx-vp9 -pix_fmt yuva420p output.webm")
    print("example with scaling *3 and audio track:")
    print("ffmpeg -i ./audio.mp3 -framerate 8 -f image2 -i timelapse/t%d.png -map 0:a -map 1:v -vf scale=iw*3:-1 -shortest -c:v libvpx-vp9 -c:a libvorbis -pix_fmt yuva420p output.webm")
    print("lossless example:")
    print("ffmpeg -framerate 15 -f image2 -i timelapse/t%d.png -c:v libvpx-vp9 -pix_fmt yuv444p -qmin 0 -qmax 0 -lossless 1 -an output.webm")

if __name__ == "__main__":
    asyncio.run(main())
