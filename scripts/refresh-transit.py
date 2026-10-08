"""Refresh the Antalya stop catalog from the public Kentkart route service."""
import concurrent.futures
import datetime
import json
import pathlib
import urllib.parse
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[1]
BASE = 'https://service.kentkart.com/rl1/'

def request(path, **params):
    params.update(region='026', lang='tr')
    with urllib.request.urlopen(BASE + path + '?' + urllib.parse.urlencode(params), timeout=12) as response:
        data = json.load(response)
    if int(data.get('result', {}).get('code', -1)) == 3 and path == 'web/pathInfo':
        # Some services have no reverse path. This is a verified empty direction.
        return data
    if int(data.get('result', {}).get('code', -1)) != 0:
        raise ValueError('Kentkart response error')
    return data

def fetch_route(job):
    code, direction = job
    try:
        data = request('web/pathInfo', displayRouteCode=code, direction=direction, resultType='001000')
        return job, data.get('pathList', []), None
    except Exception as error:
        return job, [], str(error)

if __name__ == '__main__':
    index = request('web/nearest/find')
    codes = sorted({r['displayRouteCode'] for r in index['routeList']})
    jobs = [(code, direction) for code in codes for direction in (0, 1)]
    stops = {}
    failed = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
        for job, paths, error in pool.map(fetch_route, jobs):
            if error:
                failed.append(job)
            for path in paths:
                for stop in path.get('busStopList', []):
                    try:
                        lat, lng = float(stop['lat']), float(stop['lng'])
                        if not (35.5 < lat < 38 and 29 < lng < 33):
                            continue
                        sid = str(stop['stopId'])
                        if not sid.isdigit():
                            continue
                        routes = set(filter(None, str(stop.get('routes', '')).split(','))) | {job[0]}
                        if sid in stops:
                            routes.update(stops[sid]['routes'])
                        stops[sid] = dict(id=sid, name=stop.get('stopName', sid), lat=lat, lng=lng, routes=sorted(routes))
                    except (KeyError, ValueError, TypeError):
                        continue
    if not stops:
        raise SystemExit('No stops found; existing catalog preserved.')
    data = dict(source='Kentkart / Antalyakart', sourceUrl=BASE+'web/nearest/find?region=026&lang=tr', updatedAt=datetime.datetime.now(datetime.timezone.utc).isoformat(), coverage=codes, partial=bool(failed), failed=failed, stops=sorted(stops.values(), key=lambda s: s['id']))
    (ROOT / 'lib/antalya-stops.json').write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':'))+'\n')
    print(json.dumps(dict(routes=len(codes), stops=len(stops), failed=len(failed), tonguc=[s for s in data['stops'] if 'TONGU' in s['name'].upper()]), ensure_ascii=False))
