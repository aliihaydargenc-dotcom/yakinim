#!/usr/bin/env python3
"""Inspect public source exports; retain aggregate evidence, not contributor data.

Uses official/public GitHub exports with normal TLS verification. No auth,
cookies, browser protection bypass, or application integration is involved.
"""
import concurrent.futures
import csv
import datetime
import hashlib
import io
import json
import pathlib
import subprocess
import zipfile


def fetch(url):
    return subprocess.run(
        ['curl', '--fail', '--silent', '--show-error', '--max-time', '30', url],
        check=True, capture_output=True,
    ).stdout


def get(url):
    return json.loads(fetch(url))


def head(repo):
    return get(f'https://api.github.com/repos/{repo}/commits?per_page=1')[0]['sha']


def raw(repo, commit, path):
    return f'https://raw.githubusercontent.com/{repo}/{commit}/{path}'


def tree(repo, commit):
    result = get(f'https://api.github.com/repos/{repo}/git/trees/{commit}?recursive=1')
    if result.get('truncated'):
        raise RuntimeError('Truncated tree: ' + repo)
    return result['tree']


def pool(fn, values):
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
        return list(executor.map(fn, values))


def charge_audit():
    repo = 'openchargemap/ocm-export'
    commit = head(repo)
    # Read country tree directly: GitHub contents listings stop at 1,000 files.
    country = get(f'https://api.github.com/repos/{repo}/contents/data/TR?ref={commit}')[0]
    # A full recursive export tree may exceed GitHub's response limit.
    directories = get(f'https://api.github.com/repos/{repo}/contents/data?ref={commit}')
    sha = next(d['sha'] for d in directories if d['name'] == 'TR')
    files = sorted(x['path'] for x in tree(repo, sha) if x['path'].endswith('.json'))
    assert country['path'].startswith('data/TR/') and len(files) > 0
    count = min(60, len(files))
    sampled = [files[i * (len(files)-1)//max(1, count-1)] for i in range(count)]
    records = pool(lambda p: get(raw(repo, commit, 'data/TR/' + p)), sampled)
    refs = get(raw(repo, commit, 'data/referencedata.json'))
    providers = {p['ID']: p for p in refs['DataProviders']}
    contributor = providers[1]
    fields = {
        'coordinates': lambda d: all(isinstance(d.get('AddressInfo', {}).get(k), (int, float)) for k in ['Latitude', 'Longitude']),
        'provider_id': lambda d: d.get('DataProviderID') is not None,
        'connection_type': lambda d: any(c.get('ConnectionTypeID') is not None for c in d.get('Connections', [])),
        'power_kw': lambda d: any(c.get('PowerKW') is not None for c in d.get('Connections', [])),
        'last_verified': lambda d: bool(d.get('DateLastVerified')),
        'contributor_cc_by': lambda d: d.get('DataProviderID') == 1,
    }
    return {
        'repository': repo, 'commit': commit, 'country_file_count': len(files),
        'sample_size': count, 'sampling': '60 evenly spaced filenames; not a random or representative sample',
        'sample_files': sampled,
        'field_counts': {name: sum(bool(test(d)) for d in records) for name, test in fields.items()},
        'providers': [{'id': provider_id, 'sample_count': sum(d.get('DataProviderID') == provider_id for d in records), 'title': providers.get(provider_id, {}).get('Title'), 'open_data_claim': providers.get(provider_id, {}).get('IsOpenDataLicensed'), 'license': providers.get(provider_id, {}).get('License')} for provider_id in sorted({d['DataProviderID'] for d in records if isinstance(d.get('DataProviderID'), int)})],
        'verification_year_counts': {year: sum(str(d.get('DateLastVerified', '')).startswith(year) for d in records) for year in sorted({str(d.get('DateLastVerified', ''))[:4] for d in records if d.get('DateLastVerified')})},
        'contributor_license': contributor.get('License'),
        'limits': ['Snapshot, not live occupancy', 'Each provider has its own license', 'Record date is not repository update date'],
    }


def transit_audit():
    repo = 'MobilityData/mobility-database-catalogs'
    commit = head(repo)
    paths = [x['path'] for x in tree(repo, commit) if '/tr-' in x['path'] and x['path'].endswith('.json')]
    records = pool(lambda p: get(raw(repo, commit, p)), paths)
    sources = []
    for path, d in zip(paths, records):
        if d.get('location', {}).get('country_code', 'TR') != 'TR':
            continue
        box = d.get('location', {}).get('bounding_box', {})
        lat = box.get('minimum_latitude')
        lng = box.get('minimum_longitude')
        suspicious = lat is not None and lng is not None and not (35 <= lat <= 43 and 25 <= lng <= 46)
        sources.append({'path': path, 'provider': d.get('provider'), 'type': d.get('data_type'), 'official_claim': d.get('is_official'), 'city': d.get('location', {}).get('subdivision_name'), 'url': d.get('urls', {}).get('direct_download'), 'license_url': d.get('urls', {}).get('license'), 'suspicious_catalog_bounds': suspicious})
    generated = 'Egezenn/kk-gtfs'
    generated_commit = head(generated)
    license_bytes = fetch(raw(generated, generated_commit, 'DATA_LICENSE'))
    assert b'CC0 1.0 Universal' in license_bytes
    examples = []
    for city in ['antalya', 'mugla']:
        archive = fetch(raw(generated, generated_commit, f'data/{city}.zip'))
        with zipfile.ZipFile(io.BytesIO(archive)) as z:
            def rows(name):
                return list(csv.DictReader(io.StringIO(z.read(name).decode('utf-8-sig'))))
            stops, routes, calendar = rows('stops.txt'), rows('routes.txt'), rows('calendar.txt')
            coords = [(float(r['stop_lat']), float(r['stop_lon'])) for r in stops if r.get('stop_lat') and r.get('stop_lon')]
            examples.append({'city': city, 'stop_count': len(stops), 'route_count': len(routes), 'bounds': {'south': min(c[0] for c in coords), 'north': max(c[0] for c in coords), 'west': min(c[1] for c in coords), 'east': max(c[1] for c in coords)}, 'service_start': min(r['start_date'] for r in calendar), 'service_end': max(r['end_date'] for r in calendar), 'sha256': hashlib.sha256(archive).hexdigest()})
    return {'repository': repo, 'commit': commit, 'catalog_count': len(sources), 'sources': sources, 'generated_repository': generated, 'generated_commit': generated_commit, 'declared_license': 'CC0 1.0; upstream rights still need review', 'examples': examples, 'limits': ['Catalogue discovery is not live feed validation', 'Third-party generated schedules are not live arrivals', 'Apache software license does not license every listed feed']}


def osm_audit():
    repo = 'openstreetmap/id-tagging-schema'
    commit = head(repo)
    paths = ['amenity/toilets', 'amenity/drinking_water', 'amenity/charging_station', 'leisure/playground', 'tourism/picnic_site', 'tourism/viewpoint', 'tourism/camp_site', 'amenity/recycling_container', 'amenity/veterinary']
    presets = pool(lambda p: get(raw(repo, commit, f'data/presets/{p}.json')), paths)
    return {'repository': repo, 'commit': commit, 'presets': [{'path': p, 'tags': d['tags'], 'fields': d.get('fields', []), 'more_fields': d.get('moreFields', [])} for p, d in zip(paths, presets)], 'limits': ['Schema verification only; no Turkey record counts', 'Map data ODbL conditions are separate from schema code license', 'Missing accessibility/opening-hours tags mean unknown']}


if __name__ == '__main__':
    report = {'checked_at': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'charge': charge_audit(), 'transit': transit_audit(), 'osm': osm_audit()}
    target = pathlib.Path(__file__).resolve().parents[1] / 'docs/research/public-data-audit.json'
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({'charge_files': report['charge']['country_file_count'], 'charge_sample': report['charge']['sample_size'], 'transit_catalog_entries': report['transit']['catalog_count'], 'osm_presets': len(report['osm']['presets'])}))
